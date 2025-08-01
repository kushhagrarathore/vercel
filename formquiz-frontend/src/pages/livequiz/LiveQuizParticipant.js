import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { supabase } from '../../supabase';
import Leaderboard from './Leaderboard';

const LiveQuizParticipant = () => {
  const { roomCode, participantId } = useParams();
  const location = useLocation();
  const { username, emoji } = location.state || {};
  const [slides, setSlides] = useState([]);
  const [liveQuiz, setLiveQuiz] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [finalLeaderboard, setFinalLeaderboard] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const channelRef = useRef(null);
  const [quizState, setQuizState] = useState(null);
  const [timer, setTimer] = useState(0);
  const [currentQuestionId, setCurrentQuestionId] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [phase, setPhase] = useState('question');
  const [channel, setChannel] = useState(null);

  // Debug logging utility
  const debug = (...args) => { if (process.env.NODE_ENV !== 'production') console.log('[Participant]', ...args); };

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

  // Subscribe to live_quiz_state for this room
  useEffect(() => {
    if (!roomCode) return;
    const channel = supabase
      .channel('live_quiz_state_' + roomCode)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_quiz_state', filter: `quiz_room_id=eq.${roomCode}` }, payload => {
        debug('live_quiz_state update:', payload.new);
        setQuizState(payload.new);
        setTimer(payload.new?.timer_value ?? 0);
        setCurrentQuestionId(payload.new?.current_slide_index ?? null);
        setPhase(payload.new?.quiz_status ?? 'question');
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
    if (liveQuiz && liveQuiz.phase === 'ended') {
      setFinished(true); // Quiz ended
    }
  }, [liveQuiz, slides]);

  // Fetch slides for this quiz
  useEffect(() => {
    if (!liveQuiz?.quiz_id) return;
    const fetchSlides = async () => {
      const { data, error } = await supabase.from('live_quiz_slides').select('*').eq('quiz_id', liveQuiz.quiz_id).order('slide_index');
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

  // Subscribe to own participant row for status updates
  useEffect(() => {
    if (!participantId) return;
    const channel = supabase
      .channel('session_participant-' + participantId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_participants', filter: `id=eq.${participantId}` }, (payload) => {
        // Could use for status/score updates if needed
      })
      .subscribe();
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

  // Subscribe to participants for leaderboard
  useEffect(() => {
    if (!roomCode) return;
    const channel = supabase
      .channel('session_participants_leaderboard_' + roomCode)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_participants', filter: `session_code=eq.${roomCode}` }, payload => {
        fetchLeaderboard();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomCode]);

  // Fetch leaderboard
  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('session_participants')
      .select('name, score')
      .eq('session_code', roomCode)
      .order('score', { ascending: false });
    setLeaderboard(data || []);
  };

  // Initial fetch
  useEffect(() => {
    if (roomCode) {
      fetchLeaderboard();
    }
  }, [roomCode]);

  // Show leaderboard after question ends
  useEffect(() => {
    if (quizState?.quiz_status === 'leaderboard') {
      setShowLeaderboard(true);
      setTimeout(() => {
        setShowLeaderboard(false);
      }, 3500);
    }
  }, [quizState?.quiz_status]);

  // Answer submission
  const handleSubmit = async () => {
    if (selectedOption == null || isLocked || submitted) return;
    setIsLocked(true);
    setSubmitted(true);
    const slide = slides[currentIndex];
    if (!slide) return;
    try {
      await supabase.from('session_participant_answers').insert({
        session_code: roomCode,
        participant_id: participantId,
        question_id: slide.id,
        answer: selectedOption
      });
    } catch (err) {
      // Optionally show error to user
    }
  };

  // Timer lock (locks UI if timer expires)
  useEffect(() => {
    if (!timer || phase !== 'question') return;
    const timeout = setTimeout(() => setIsLocked(true), timer * 1000);
    return () => clearTimeout(timeout);
  }, [timer, phase]);

  useEffect(() => {
    if (!roomCode) return;
    const ch = supabase.channel(`quiz_${roomCode}`);
    setChannel(ch);
    ch
      .on('broadcast', { event: 'start_quiz' }, () => {
        setPhase('question');
      })
      .on('broadcast', { event: 'new_question' }, ({ payload }) => {
        setCurrentIndex(payload.slide_index);
        setTimer(payload.timer);
        setTimeLeft(payload.timer);
        setPhase('question');
        setSelectedOption(null);
        setFeedback(null);
        setIsLocked(false);
        setSubmitted(false);
      })
      .on('broadcast', { event: 'lock_answers' }, ({ payload }) => {
        setIsLocked(true);
        setFeedback({
          isCorrect: selectedOption === payload.correctAnswerIndex,
          correctAnswer: payload.correctAnswerIndex,
          stats: payload.stats
        });
        setPhase('leaderboard');
      })
      .on('broadcast', { event: 'show_leaderboard' }, ({ payload }) => {
        setPhase('final_leaderboard');
        setLeaderboard(payload.scores);
      })
      .subscribe();
    return () => { ch.unsubscribe && ch.unsubscribe(); };
  }, [roomCode]);

  if (finished) return <Leaderboard players={finalLeaderboard} roomCode={roomCode} />;
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
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f5f7fa 0%, #e0e7ff 100%)' }}>
        <div style={{ background: '#fff', borderRadius: 22, boxShadow: '0 8px 32px rgba(60,60,100,0.13)', padding: '44px 32px 36px 32px', minWidth: 320, maxWidth: 520, width: '100%', margin: '0 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', transition: 'box-shadow 0.2s', border: '2px solid #e0e7ff' }}>
          <h2 style={{ fontWeight: 900, fontSize: 32, color: '#2563eb', marginBottom: 24, letterSpacing: '-1px', textAlign: 'center' }}>Final Leaderboard</h2>
          <ul style={{ width: '100%', padding: 0, margin: 0 }}>
            {finalLeaderboard.map((p, idx) => (
              <li key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: idx !== finalLeaderboard.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                <span style={{ fontWeight: 700, color: idx === 0 ? '#2563eb' : '#374151', fontSize: 20 }}>{idx + 1}.</span>
                <span style={{ fontWeight: 700, color: '#374151', fontSize: 18 }}>{p.name}</span>
                <span style={{ fontWeight: 700, color: '#059669', fontSize: 18 }}>{p.score} pts</span>
              </li>
            ))}
          </ul>
          <button onClick={() => window.location.reload()} style={{ marginTop: 24, padding: '12px 32px', fontSize: 18, borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 700 }}>Back to Quiz</button>
        </div>
      </div>
    );
  }
  if (liveQuiz.phase === 'question') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #e0e7ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 22, boxShadow: '0 8px 32px rgba(60,60,100,0.13)', padding: '44px 32px 36px 32px', minWidth: 320, maxWidth: 520, width: '100%', margin: '0 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', transition: 'box-shadow 0.2s', border: '2px solid #e0e7ff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: 18 }}>
            <div style={{ fontWeight: 900, fontSize: 30, color: '#2563eb', letterSpacing: '-1px' }}>Quiz Arena</div>
            <div style={{ fontWeight: 600, color: '#888', fontSize: 18 }}>Q{currentIndex + 1} / {slides.length}</div>
          </div>
          <div style={{ margin: '18px 0', background: '#e0e7ff', borderRadius: 12, padding: '14px 0', fontWeight: 800, fontSize: 22, color: '#2563eb', textAlign: 'center', boxShadow: '0 2px 8px rgba(60,60,100,0.07)', width: '100%' }}>
            Time Left: {timeLeft}s
          </div>
          <div style={{ color: '#23272f', fontWeight: 800, fontSize: 24, margin: '0 0 18px 0', textAlign: 'center', letterSpacing: '-0.5px' }}>{slides[currentIndex].question}</div>
          <div style={{ width: '100%', marginTop: 8 }}>
            {(slides[currentIndex].options || []).map((opt, idx) => (
              <button
                key={idx}
                disabled={isLocked || submitted}
                onClick={() => setSelectedOption(idx)}
                style={{
                  display: 'block',
                  width: '100%',
                  margin: '10px 0',
                  padding: '16px 0',
                  borderRadius: 12,
                  background: selectedOption === idx ? '#dbeafe' : '#f3f4f6',
                  color: '#23272f',
                  border: selectedOption === idx ? '2.5px solid #2563eb' : '2px solid #e0e0e0',
                  fontWeight: 700,
                  fontSize: 19,
                  boxShadow: 'none',
                  cursor: isLocked || submitted ? 'not-allowed' : 'pointer',
                  outline: 'none',
                  transition: 'all 0.18s',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
          <button
            onClick={handleSubmit}
            disabled={isLocked || submitted || selectedOption == null}
            style={{ padding: '13px 34px', borderRadius: 10, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 800, fontSize: 18, marginTop: 18, width: '100%' }}
          >
            Submit Answer
          </button>
          {submitted && (
            <div style={{ marginTop: 18, color: '#2563eb', fontWeight: 700, fontSize: 18 }}>
              Waiting for host to move to the next question...
            </div>
          )}
          {feedback && (
            <div style={{ marginTop: 18, color: feedback.isCorrect ? '#059669' : '#e11d48', fontWeight: 700, fontSize: 18 }}>
              {feedback.feedbackText} <br />
              <span style={{ color: '#2563eb', fontWeight: 600 }}>Correct Answer: {feedback.correctAnswer}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Leaderboard
  if (showLeaderboard) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h2 className="text-2xl font-bold text-center mb-4">Leaderboard</h2>
          <div className="space-y-2">
            {leaderboard.map((participant, index) => (
              <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <span className="text-lg mr-2">{participant.emoji}</span>
                  <span className="font-medium">{participant.name}</span>
                </div>
                <span className="text-lg font-bold text-blue-600">{participant.score} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* ... existing code ... */}
      
      {/* Leaderboard */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-center mb-4">Leaderboard</h2>
            <div className="space-y-2">
              {leaderboard.map((participant, index) => (
                <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <span className="text-lg mr-2">{participant.emoji}</span>
                    <span className="font-medium">{participant.name}</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{participant.score} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* ... existing code ... */}
    </div>
  );
};

export default LiveQuizParticipant; 