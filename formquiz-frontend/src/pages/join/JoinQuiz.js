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
  const [timeLeft, setTimeLeft] = useState(0);
  const [joining, setJoining] = useState(false);
  const [phase, setPhase] = useState('question');
  const [participantId, setParticipantId] = useState(null);
  const [participantStatus, setParticipantStatus] = useState('waiting');
  const [finalLeaderboard, setFinalLeaderboard] = useState([]);
  const [lobbyParticipants, setLobbyParticipants] = useState([]);
  const [showFinalLeaderboard, setShowFinalLeaderboard] = useState(false);
  const [quizPhase, setQuizPhase] = useState('waiting');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [joinAttempted, setJoinAttempted] = useState(false);

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
      setPhase(data?.phase || 'question');
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = supabase
        .channel('live-quiz-' + roomCode)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `code=eq.${roomCode}` }, (payload) => {
          setLiveQuiz(payload.new);
          setPhase(payload.new?.phase || 'question');
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
    if (liveQuiz && liveQuiz.current_slide_index != null && slides.length > 0) {
      setCurrentIndex(liveQuiz.current_slide_index);
      setSelectedOption(null);
      setFeedback(null);
      setIsLocked(false);
      setSubmitted(false);
    }
    // Reset lock and submission on new question phase
    if (liveQuiz && liveQuiz.phase === 'question') {
      setIsLocked(false);
      setSubmitted(false);
      // Recalculate timer
      if (liveQuiz.timer_end) {
        const end = new Date(liveQuiz.timer_end).getTime();
        const now = Date.now();
        setTimeLeft(Math.max(0, Math.ceil((end - now + 500) / 1000))); // add 0.5s buffer
      }
    }
    if (liveQuiz && liveQuiz.phase === 'ended' && joined) {
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
    if (!liveQuiz?.timer_end || liveQuiz.phase !== 'question') return;
    const end = new Date(liveQuiz.timer_end).getTime();
    const now = Date.now();
    if (end <= now) setIsLocked(true);
    else {
      const timeout = setTimeout(() => setIsLocked(true), end - now + 500); // add 0.5s buffer
      return () => clearTimeout(timeout);
    }
  }, [liveQuiz?.timer_end, liveQuiz?.phase]);

  // Timer for countdown display
  useEffect(() => {
    if (!liveQuiz?.timer_end || liveQuiz.phase !== 'question') return;
    const interval = setInterval(() => {
      const end = new Date(liveQuiz.timer_end).getTime();
      const now = Date.now();
      setTimeLeft(Math.max(0, Math.ceil((end - now + 500) / 1000)));
    }, 200);
    return () => clearInterval(interval);
  }, [liveQuiz?.timer_end, liveQuiz?.phase]);

  // Subscribe to all participants in the lobby (status: 'waiting') for this room
  useEffect(() => {
    if (!roomCode) return;
    let channel;
    const fetchLobbyParticipants = async () => {
      const { data } = await supabase
        .from('session_participants')
        .select('id, name')
        .eq('session_code', roomCode)
        .eq('status', 'waiting');
      setLobbyParticipants(data || []);
    };
    channel = supabase
      .channel('lobby-participants-' + roomCode)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_participants', filter: `session_code=eq.${roomCode},status=eq.waiting` }, fetchLobbyParticipants)
      .subscribe();
    fetchLobbyParticipants();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [roomCode]);

  // Insert participant record (if not already present)
  const registerParticipant = async () => {
    if (!roomCode || !username.trim()) return;
    // Check for duplicate in session_participants table
    const { data: existing, error: existingError } = await supabase
      .from('session_participants')
      .select('id, status')
      .eq('session_code', roomCode)
      .eq('name', username.trim());
    if (existingError) {
      setError('Supabase error: ' + existingError.message);
      return;
    }
    if (existing && existing.length > 0) {
      setParticipantId(existing[0].id);
      setParticipantStatus(existing[0].status);
      return existing[0].id;
    } else {
      const { data: inserted, error: insertError } = await supabase.from('session_participants').insert([
        {
          session_code: roomCode,
          name: username.trim(),
          status: 'waiting',
          score: 0,
        }
      ]).select();
      if (insertError) {
        setError('Supabase error: ' + insertError.message);
        return;
      }
      if (inserted && inserted.length > 0) {
        setParticipantId(inserted[0].id);
        setParticipantStatus('waiting');
        return inserted[0].id;
      }
    }
  };

  const handleJoin = async () => {
    setJoinAttempted(true);
    setError(null);
    if (!username.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!roomCode) {
      setError('Please enter a room code.');
      return;
    }
    setJoining(true);
    // Use the correct column for room code
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_code', roomCode)
      .single();
    if (error || !data) {
      setError('Invalid room code.');
      setLiveQuiz(null);
      setJoining(false);
      return;
    }
    // Register participant immediately, even if quiz not started
    const pid = await registerParticipant();
    if (!pid) {
      setJoining(false);
      return;
    }
    setParticipantId(pid);
    setLiveQuiz(data);
    setJoined(true);
    setJoining(false);
  };

  const handleAnswer = async (optionIdx) => {
    if (answerSubmitted) return;
    setSelectedOption(optionIdx);
    // Submit answer to backend (adjust table/columns as needed)
    await supabase.from('session_participant_answers').insert([
      {
        session_code: roomCode,
        participant_id: participantId,
        question_id: currentQuestion.id,
        answer: optionIdx,
      },
    ]);
    setAnswerSubmitted(true);
  };

  // Subscribe to own participant row for status updates
  useEffect(() => {
    if (!participantId) return;
    const channel = supabase
      .channel('participant-' + participantId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_participants', filter: `id=eq.${participantId}` }, (payload) => {
        setParticipantStatus(payload.new.status);
      })
      .subscribe();
    // Initial fetch
    const fetchStatus = async () => {
      const { data } = await supabase.from('session_participants').select('status').eq('id', participantId).single();
      if (data) setParticipantStatus(data.status);
    };
    fetchStatus();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [participantId]);

  // Fetch leaderboard only when phase is 'ended'
  useEffect(() => {
    if (liveQuiz && liveQuiz.phase === 'ended') {
      const fetchLeaderboard = async () => {
        const { data } = await supabase
          .from('session_participants')
          .select('name, score')
          .eq('session_code', roomCode)
          .order('score', { ascending: false });
        setFinalLeaderboard(data || []);
      };
      fetchLeaderboard();
    }
  }, [liveQuiz, roomCode]);

  // Subscribe to quiz state after joining
  let quizStateChannel = null;
  useEffect(() => {
    if (!joined || !liveQuiz) return;
    quizStateChannel = supabase
      .channel('live_quiz_state_' + roomCode)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_quiz_state', filter: `quiz_room_id=eq.${roomCode}` }, (payload) => {
        const { phase, current_question_id } = payload.new;
        setQuizPhase(phase);
        if (phase === 'question') {
          fetchQuestion(current_question_id);
        }
      })
      .subscribe();
    // Initial fetch
    fetchQuizState();
    return () => {
      if (quizStateChannel) supabase.removeChannel(quizStateChannel);
    };
  }, [joined, liveQuiz]);

  const fetchQuizState = async () => {
    const { data } = await supabase
      .from('live_quiz_state')
      .select('*')
      .eq('quiz_room_id', roomCode)
      .single();
    console.log('[fetchQuizState] data:', data);
    if (data) {
      setQuizPhase(data.phase);
      if (data.phase === 'question') {
        fetchQuestion(data.current_question_id);
      }
    }
  };

  const fetchQuestion = async (questionIdOrIndex) => {
    console.log('[fetchQuestion] called with:', questionIdOrIndex, 'liveQuiz:', liveQuiz);
    // Try to fetch by id first
    let { data } = await supabase
      .from('live_quiz_slides')
      .select('*')
      .eq('id', questionIdOrIndex)
      .single();
    console.log('[fetchQuestion] by id result:', data);
    // If not found, try by index (slide_index)
    if (!data && liveQuiz?.quiz_id != null) {
      const { data: slides } = await supabase
        .from('live_quiz_slides')
        .select('*')
        .eq('quiz_id', liveQuiz.quiz_id)
        .order('slide_index');
      console.log('[fetchQuestion] slides by quiz_id:', slides);
      if (slides && slides.length > 0 && typeof questionIdOrIndex === 'number' && slides[questionIdOrIndex]) {
        data = slides[questionIdOrIndex];
      }
    }
    setCurrentQuestion(data);
    console.log('[fetchQuestion] setCurrentQuestion:', data);
  };

  if (joining) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f5f7fa 0%, #e0e7ff 100%)' }}>
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(60,60,100,0.10)', padding: 36, minWidth: 320, maxWidth: 420, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="spinner" style={{ width: 48, height: 48, border: '5px solid #e0e7ff', borderTop: '5px solid #2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 18 }} />
          <div style={{ fontWeight: 700, fontSize: 20, color: '#2563eb' }}>Joining...</div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }
  if (!joined) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f5f7fa 0%, #e0e7ff 100%)' }}>
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(60,60,100,0.10)', padding: 32, minWidth: 320, maxWidth: 350, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontWeight: 800, fontSize: 26, color: '#2563eb', marginBottom: 20, letterSpacing: '-1px', textAlign: 'center' }}>Join Quiz</h2>
          <input
            type="text"
            placeholder="Room code"
            value={roomCode}
            onChange={e => setRoomCode(e.target.value)}
            style={{ padding: 12, borderRadius: 8, border: '1.5px solid #c7d2fe', fontSize: 16, width: '100%', marginBottom: 16, background: '#f1f5f9' }}
            maxLength={8}
          />
          <input
            type="text"
            placeholder="Your name"
            value={username}
            onChange={e => setUsername(e.target.value)}
            style={{ padding: 12, borderRadius: 8, border: '1.5px solid #c7d2fe', fontSize: 16, width: '100%', marginBottom: 20, background: '#f1f5f9' }}
            maxLength={32}
          />
          <button onClick={handleJoin} style={{ padding: '12px 0', fontSize: 17, borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 700, width: '100%', marginBottom: 8, cursor: 'pointer', boxShadow: '0 2px 8px #e0e7ff' }}>Join</button>
          {joinAttempted && error && <div style={{ color: 'red', marginTop: 8, fontSize: 15 }}>{error}</div>}
        </div>
      </div>
    );
  }
  if (quizPhase === 'waiting') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <h2>Waiting for host to start the quiz...</h2>
      </div>
    );
  }
  if (quizPhase === 'question' && currentQuestion) {
    return (
      <div style={{ maxWidth: 400, margin: '40px auto', padding: 24, background: 'white', borderRadius: 12, boxShadow: '0 2px 12px #eee' }}>
        <div style={{ fontWeight: 600, fontSize: 20, marginBottom: 16 }}>{currentQuestion.question_text || currentQuestion.question}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {currentQuestion.options && currentQuestion.options.map((opt, idx) => (
            <button
              key={idx}
              style={{ padding: 12, borderRadius: 8, border: '1px solid #ddd', background: selectedOption === idx ? '#dbeafe' : '#f9f9f9', cursor: answerSubmitted ? 'not-allowed' : 'pointer' }}
              disabled={answerSubmitted}
              onClick={() => handleAnswer(idx)}
            >
              {opt}
            </button>
          ))}
        </div>
        {answerSubmitted && <div style={{ marginTop: 18, color: '#2563eb', fontWeight: 600 }}>Answer submitted! Waiting for next question...</div>}
      </div>
    );
  }
  if (finished) return <Leaderboard players={leaderboard} roomCode={roomCode} />;
  if (!liveQuiz?.is_live) return <div style={{ padding: 32, color: '#888', fontWeight: 600 }}>Waiting for host to start the quiz...</div>;
  if (!slides[currentIndex]) return <div style={{ padding: 32 }}>Loading question...</div>;

  // Show different UI based on phase
  if (liveQuiz.phase === 'transition') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f5f7fa 0%, #e0e7ff 100%)' }}>
        <div style={{ background: '#e0e7ff', borderRadius: 18, boxShadow: '0 8px 32px rgba(60,60,100,0.10)', padding: 48, minWidth: 320, maxWidth: 420, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 26, color: '#2563eb', marginBottom: 12 }}>Get ready for the next question...</div>
        </div>
      </div>
    );
  }
  if (liveQuiz.phase === 'leaderboard') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f5f7fa 0%, #e0e7ff 100%)' }}>
        <div style={{ background: '#e0e7ff', borderRadius: 18, boxShadow: '0 8px 32px rgba(60,60,100,0.10)', padding: 48, minWidth: 320, maxWidth: 420, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 26, color: '#2563eb', marginBottom: 12 }}>Leaderboard updating...</div>
        </div>
      </div>
    );
  }
  if (liveQuiz.phase === 'ended') {
    if (!showFinalLeaderboard) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f5f7fa 0%, #e0e7ff 100%)' }}>
          <div style={{ background: '#fff', borderRadius: 22, boxShadow: '0 8px 32px rgba(60,60,100,0.13)', padding: '44px 32px 36px 32px', minWidth: 320, maxWidth: 520, width: '100%', margin: '0 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', transition: 'box-shadow 0.2s', border: '2px solid #e0e7ff' }}>
            <h2 style={{ fontWeight: 900, fontSize: 32, color: '#2563eb', marginBottom: 24, letterSpacing: '-1px', textAlign: 'center' }}>Quiz Ended</h2>
            <button onClick={() => setShowFinalLeaderboard(true)} style={{ margin: '18px 0', padding: '12px 32px', borderRadius: 10, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 700, fontSize: 18 }}>Show Leaderboard</button>
          </div>
        </div>
      );
    } else {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f5f7fa 0%, #e0e7ff 100%)' }}>
          <div style={{ background: '#fff', borderRadius: 22, boxShadow: '0 8px 32px rgba(60,60,100,0.13)', padding: 44, minWidth: 320, maxWidth: 520, width: '100%', border: '2px solid #e0e7ff', textAlign: 'center' }}>
            <h2 style={{ fontWeight: 800, fontSize: 32, color: '#2563eb', marginBottom: 24 }}>🏆 Final Leaderboard</h2>
            {/* Podium for top 3 */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', marginBottom: 32, gap: 32 }}>
              {[1, 0, 2].map((pos, idx) => {
                const user = finalLeaderboard[pos];
                if (!user) return <div key={idx} style={{ width: 80 }} />;
                const colors = ['#C0C0C0', '#FFD700', '#CD7F32'];
                const heights = [100, 140, 80];
                return (
                  <div key={user.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: 22, color: '#2563eb', marginBottom: 8 }}>{['2nd', '1st', '3rd'][idx]}</div>
                    <div style={{ width: 80, height: heights[idx], background: colors[idx], borderRadius: 12, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', boxShadow: '0 4px 16px rgba(60,60,100,0.10)' }}>
                      <span style={{ fontWeight: 900, fontSize: 28, color: '#fff', marginBottom: 8 }}>{user.name}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: '#374151', marginTop: 8 }}>{user.score} pts</div>
                  </div>
                );
              })}
            </div>
            {/* List for the rest */}
            <div style={{ maxWidth: 400, margin: '0 auto', textAlign: 'left' }}>
              {finalLeaderboard.slice(3).map((user, idx) => (
                <div key={user.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: idx !== finalLeaderboard.length - 4 ? '1px solid #e5e7eb' : 'none' }}>
                  <span style={{ fontWeight: 700, color: '#374151', fontSize: 18 }}>{idx + 4}.</span>
                  <span style={{ fontWeight: 700, color: '#374151', fontSize: 18 }}>{user.name}</span>
                  <span style={{ fontWeight: 700, color: '#059669', fontSize: 18 }}>{user.score} pts</span>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/dashboard')} style={{ marginTop: 32, padding: '12px 32px', borderRadius: 10, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 700, fontSize: 18 }}>Back to Dashboard</button>
          </div>
        </div>
      );
    }
  }
};

export default JoinQuiz;
