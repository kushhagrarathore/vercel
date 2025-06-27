import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import QuestionTimer from '../../components/quiz/QuestionTimer';
import AnswerFeedback from '../../components/quiz/AnswerFeedback';
import Leaderboard from '../../components/quiz/Leaderboard';

const JoinQuiz = () => {
  const params = useParams();
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState(params.roomCode || '');
  const [joined, setJoined] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState(null);
  const [slides, setSlides] = useState([]);
  const [liveQuiz, setLiveQuiz] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const channelRef = useRef(null);

  // Subscribe to sessions for this room (always keep in sync)
  useEffect(() => {
    if (!roomCode) return;
    const subscribe = async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', roomCode)
        .single();
      if (error || !data) {
        setError('Invalid room code.');
        setLiveQuiz(null);
        return;
      }
      setLiveQuiz(data);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = supabase
        .channel('live-quiz-' + roomCode)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `code=eq.${roomCode}` }, (payload) => {
          setLiveQuiz(payload.new);
        })
        .subscribe();
    };
    subscribe();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [roomCode]);

  // When liveQuiz changes, update currentIndex and reset state
  useEffect(() => {
    if (liveQuiz && liveQuiz.current_question_id != null && slides.length > 0) {
      setCurrentIndex(slides.findIndex(s => s.id === liveQuiz.current_question_id));
      setSelectedOption(null);
      setFeedback(null);
      setIsLocked(false);
      setSubmitted(false);
    }
    if (liveQuiz && !liveQuiz.is_live && joined) {
      setFinished(true); // Quiz ended
    }
  }, [liveQuiz, joined, slides]);

  // Fetch slides for this quiz
  useEffect(() => {
    if (!liveQuiz?.quiz_id) return;
    const fetchSlides = async () => {
      const { data, error } = await supabase.from('slides').select('*').eq('quiz_id', liveQuiz.quiz_id).order('slide_index');
      if (!error) setSlides(data || []);
    };
    fetchSlides();
  }, [liveQuiz?.quiz_id]);

  // Timer lock
  useEffect(() => {
    if (!liveQuiz?.timer_end) return;
    const end = new Date(liveQuiz.timer_end).getTime();
    const now = Date.now();
    if (end <= now) setIsLocked(true);
    else {
      const timeout = setTimeout(() => setIsLocked(true), end - now);
      return () => clearTimeout(timeout);
    }
  }, [liveQuiz?.timer_end]);

  // Insert participant record (if not already present)
  const registerParticipant = async () => {
    if (!roomCode || !username.trim()) return;
    // Optionally, you can have a participants table, or just rely on responses for leaderboard
    // Here, we just check for duplicate username in this room
    const { data: existing } = await supabase
      .from('live_responses')
      .select('username')
      .eq('code', roomCode)
      .eq('username', username.trim());
    if (!existing || existing.length === 0) {
      // Insert a dummy response to register (or use a participants table if you have one)
      // If you want a dedicated participants table, create and insert here
    }
  };

  const handleJoin = async () => {
    setError(null);
    if (!username.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!roomCode) {
      setError('Please enter a room code.');
      return;
    }
    // Always re-fetch the sessions row on join attempt
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('code', roomCode)
      .single();
    if (error || !data) {
      setError('Invalid room code.');
      setLiveQuiz(null);
      return;
    }
    if (!data.is_live) {
      setError('Quiz has not started yet.');
      setLiveQuiz(data);
      return;
    }
    setLiveQuiz(data);
    setJoined(true);
    await registerParticipant();
  };

  const handleSubmit = async () => {
    if (selectedOption == null || isLocked || submitted || !username.trim()) return;
    setIsLocked(true);
    setSubmitted(true);
    if (!slides[currentIndex]) return;
    // Save response to DB
    await supabase.from('live_responses').insert([
      {
        quiz_id: liveQuiz.quiz_id,
        code: roomCode,
        question_id: slides[currentIndex].id,
        username: username.trim(),
        selected_option: selectedOption,
        submitted_at: new Date().toISOString(),
      },
    ]);
    // Show feedback
    const isCorrect = selectedOption === slides[currentIndex].correct_answer_index;
    setFeedback({
      isCorrect,
      correctAnswer: slides[currentIndex].options?.[slides[currentIndex].correct_answer_index],
      feedbackText: isCorrect ? 'Great job!' : 'Better luck next time!',
    });
    // If last question, show leaderboard
    if (currentIndex >= slides.length - 1) {
      setTimeout(() => setFinished(true), 1200);
    }
  };

  if (!joined) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f5f7fa 0%, #e0e7ff 100%)' }}>
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(60,60,100,0.10)', padding: 36, minWidth: 320, maxWidth: 420, width: '100%' }}>
          <h2 style={{ fontWeight: 800, fontSize: 28, color: '#2563eb', marginBottom: 18 }}>Join Live Quiz</h2>
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="roomcode" style={{ fontWeight: 600, fontSize: 16 }}>Room Code:</label>
            <input id="roomcode" value={roomCode} onChange={e => { setRoomCode(e.target.value); setError(null); }} placeholder="Enter room code" style={{ padding: 10, borderRadius: 8, border: '1.5px solid #c7d2fe', marginLeft: 12, fontSize: 16, width: 120 }} maxLength={8} />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="username" style={{ fontWeight: 600, fontSize: 16 }}>Your Name:</label>
            <input id="username" value={username} onChange={e => { setUsername(e.target.value); setError(null); }} placeholder="Enter your name" style={{ padding: 10, borderRadius: 8, border: '1.5px solid #c7d2fe', marginLeft: 12, fontSize: 16, width: 180 }} maxLength={32} />
          </div>
          <button onClick={handleJoin} style={{ padding: '12px 32px', fontSize: 18, borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 700, marginBottom: 12 }}>Join Quiz</button>
          {error && <div style={{ color: 'red', marginTop: 10 }}>{error} {error === 'Invalid room code.' && <button onClick={() => window.location.reload()} style={{ marginLeft: 8, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>}</div>}
        </div>
      </div>
    );
  }
  if (finished) return <Leaderboard players={leaderboard} roomCode={roomCode} />;
  if (!liveQuiz?.is_live) return <div style={{ padding: 32, color: '#888', fontWeight: 600 }}>Waiting for host to start the quiz...</div>;
  if (!slides[currentIndex]) return <div style={{ padding: 32 }}>Loading question...</div>;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #e0e7ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(60,60,100,0.10)', padding: '38px 28px 32px 28px', minWidth: 320, maxWidth: 520, width: '100%', margin: '0 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', transition: 'box-shadow 0.2s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: 18 }}>
          <div style={{ fontWeight: 800, fontSize: 28, color: '#2563eb', letterSpacing: '-1px' }}>Quiz Arena</div>
          <div style={{ fontWeight: 500, color: '#888', fontSize: 17 }}>Q{currentIndex + 1} / {slides.length}</div>
        </div>
        <div style={{ color: '#23272f', fontWeight: 700, fontSize: 22, margin: '0 0 18px 0', textAlign: 'center', letterSpacing: '-0.5px' }}>{slides[currentIndex].question}</div>
        <div style={{ width: '100%', marginTop: 8 }}>
          {(slides[currentIndex].options || []).map((opt, idx) => (
            <button
              key={idx}
              disabled={isLocked || submitted}
              style={{
                display: 'block',
                width: '100%',
                margin: '10px 0',
                padding: '16px 0',
                borderRadius: 12,
                background: selectedOption === idx ? '#2563eb' : '#f3f4f6',
                color: selectedOption === idx ? '#fff' : '#23272f',
                border: selectedOption === idx ? '2.5px solid #2563eb' : '2px solid #e0e0e0',
                fontWeight: 700,
                fontSize: 18,
                boxShadow: selectedOption === idx ? '0 2px 12px rgba(74,107,255,0.10)' : 'none',
                cursor: isLocked || submitted ? 'not-allowed' : 'pointer',
                outline: selectedOption === idx ? '2px solid #a5b4fc' : 'none',
                transition: 'all 0.18s',
              }}
              onClick={() => setSelectedOption(idx)}
            >
              {opt}
            </button>
          ))}
        </div>
        <QuestionTimer seconds={slides[currentIndex].timer || 20} onExpire={() => setIsLocked(true)} isLocked={isLocked} />
        <button
          onClick={handleSubmit}
          disabled={isLocked || submitted || selectedOption == null}
          style={{ marginTop: 16, padding: '10px 24px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 700, fontSize: 17, cursor: isLocked || submitted ? 'not-allowed' : 'pointer', opacity: isLocked || submitted ? 0.7 : 1 }}
        >
          Submit Answer
        </button>
        {/* Section grid for progress */}
        <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
          {slides.map((_, idx) => (
            <div key={idx} style={{ width: 22, height: 22, borderRadius: 4, background: idx === currentIndex ? '#2563eb' : '#e0e7ff', border: idx === currentIndex ? '2px solid #2563eb' : '1.5px solid #c7d2fe', display: 'inline-block', margin: 2 }} />
          ))}
        </div>
        {feedback && <AnswerFeedback {...feedback} />}
      </div>
    </div>
  );
};

export default JoinQuiz;
