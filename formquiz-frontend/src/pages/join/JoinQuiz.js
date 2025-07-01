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
  const [selectedEmoji, setSelectedEmoji] = useState('😀');
  const [lobbyParticipants, setLobbyParticipants] = useState([]);
  const [showFinalLeaderboard, setShowFinalLeaderboard] = useState(false);
  const [quizPhase, setQuizPhase] = useState('waiting');
  const [currentQuestion, setCurrentQuestion] = useState(null);

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
        .from('participants')
        .select('id, name, emoji')
        .eq('session_code', roomCode)
        .eq('status', 'waiting');
      setLobbyParticipants(data || []);
    };
    channel = supabase
      .channel('lobby-participants-' + roomCode)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `session_code=eq.${roomCode},status=eq.waiting` }, fetchLobbyParticipants)
      .subscribe();
    fetchLobbyParticipants();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [roomCode]);

  // Insert participant record (if not already present)
  const registerParticipant = async () => {
    if (!roomCode || !username.trim()) return;
    // Check for duplicate in participants table
    const { data: existing, error: existingError } = await supabase
      .from('participants')
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
      const { data: inserted, error: insertError } = await supabase.from('participants').insert([
        {
          session_code: roomCode,
          name: username.trim(),
          status: 'waiting',
          score: 0,
          emoji: selectedEmoji,
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

  const handleSubmit = async () => {
    if (selectedOption == null || isLocked || submitted || !username.trim()) return;
    setIsLocked(true);
    setSubmitted(true);
    if (!slides[currentIndex]) return;

    // Check if correct
    const isCorrect = selectedOption === slides[currentIndex].correct_answer_index;
    const points = isCorrect ? 1 : 0; // or your custom scheme

    // Save response to DB
    await supabase.from('live_responses').insert([
      {
        participantId, // get from your participant state
        quizRoomId: roomCode,
        questionId: slides[currentIndex].id,
        answer: selectedOption,
        isCorrect,
        points,
        timestamp: new Date().toISOString(),
      },
    ]);

    // Update participant score
    if (participantId) {
      await supabase.from('participants')
        .update({ score: supabase.raw('score + ?', [points]) })
        .eq('id', participantId);
    }

    // Show feedback
    setFeedback({
      isCorrect,
      correctAnswer: slides[currentIndex].options?.[slides[currentIndex].correct_answer_index],
      feedbackText: isCorrect ? 'Correct! +1 point' : 'Wrong! 0 points',
    });

    // If last question, show leaderboard
    if (currentIndex >= slides.length - 1) {
      setTimeout(() => setFinished(true), 1200);
    }
  };

  // Subscribe to own participant row for status updates
  useEffect(() => {
    if (!participantId) return;
    const channel = supabase
      .channel('participant-' + participantId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `id=eq.${participantId}` }, (payload) => {
        setParticipantStatus(payload.new.status);
      })
      .subscribe();
    // Initial fetch
    const fetchStatus = async () => {
      const { data } = await supabase.from('participants').select('status').eq('id', participantId).single();
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
          .from('participants')
          .select('name, score')
          .eq('session_code', roomCode)
          .order('score', { ascending: false });
        setFinalLeaderboard(data || []);
      };
      fetchLeaderboard();
    }
  }, [liveQuiz, roomCode]);

  // Subscribe to quiz state after joining
  useEffect(() => {
    if (!joined || !liveQuiz) return;
    // Listen to live_quiz_state for this session
    const quizStateSub = supabase
      .from(`live_quiz_state:session_code=eq.${roomCode}`)
      .on('UPDATE', payload => {
        const { phase, current_question_id } = payload.new;
        setQuizPhase(phase);
        if (phase === 'question') {
          // Fetch question from live_quiz_slides
          fetchQuestion(current_question_id);
        }
      })
      .subscribe();
    // Initial fetch
    fetchQuizState();
    return () => {
      supabase.removeSubscription(quizStateSub);
    };
  }, [joined, liveQuiz]);

  const fetchQuizState = async () => {
    const { data } = await supabase
      .from('live_quiz_state')
      .select('*')
      .eq('session_code', roomCode)
      .single();
    if (data) {
      setQuizPhase(data.phase);
      if (data.phase === 'question') {
        fetchQuestion(data.current_question_id);
      }
    }
  };

  const fetchQuestion = async (questionId) => {
    const { data } = await supabase
      .from('live_quiz_slides')
      .select('*')
      .eq('id', questionId)
      .single();
    setCurrentQuestion(data);
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
    const emojiOptions = ['😀','😎','🤩','🥳','🦄','🐱','🐶','🐼','🐸','🐵','👾','👻','🦊','🐯','🐙','🐧','🐤','🦁','🐻','🐨','🐰','🐹','🐭','🐮','🐷','🐸','🐵','🦋','🐝','🐞'];
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f5f7fa 0%, #e0e7ff 100%)' }}>
        <div style={{ background: '#fff', borderRadius: 22, boxShadow: '0 8px 32px rgba(60,60,100,0.13)', padding: 36, minWidth: 320, maxWidth: 400, width: '100%', border: '2px solid #e0e7ff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontWeight: 900, fontSize: 28, color: '#2563eb', marginBottom: 18, letterSpacing: '-1px', textAlign: 'center' }}>Join Quiz</h2>
          <input value={roomCode} onChange={e => setRoomCode(e.target.value)} placeholder="Room Code" style={{ padding: 12, borderRadius: 10, border: '2px solid #c7d2fe', fontSize: 17, width: '100%', marginBottom: 16, background: '#f1f5f9' }} maxLength={8} />
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Your Name" style={{ padding: 12, borderRadius: 10, border: '2px solid #c7d2fe', fontSize: 17, width: '100%', marginBottom: 16, background: '#f1f5f9' }} maxLength={32} />
          <div style={{ marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#374151', marginBottom: 8 }}>Pick your emoji:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {emojiOptions.map((emoji) => (
                <button key={emoji} type="button" onClick={() => setSelectedEmoji(emoji)} style={{ fontSize: 24, padding: 6, borderRadius: '50%', border: selectedEmoji === emoji ? '2.5px solid #2563eb' : '2px solid #e0e7ff', background: selectedEmoji === emoji ? '#dbeafe' : '#f1f5f9', cursor: 'pointer', outline: 'none', transition: 'all 0.18s' }}>{emoji}</button>
              ))}
            </div>
          </div>
          <button onClick={handleJoin} style={{ padding: '12px 0', fontSize: 18, borderRadius: 10, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 800, width: '100%' }}>Join</button>
          {error && <div style={{ color: 'red', marginTop: 12, textAlign: 'center' }}>{error}</div>}
        </div>
      </div>
    );
  }
  if (joined && (!liveQuiz?.is_live || liveQuiz.phase === 'lobby')) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f5f7fa 0%, #e0e7ff 100%)' }}>
        <div style={{ background: '#fff', borderRadius: 22, boxShadow: '0 8px 32px rgba(60,60,100,0.13)', padding: 44, minWidth: 320, maxWidth: 420, width: '100%', border: '2px solid #e0e7ff', textAlign: 'center' }}>
          <h2 style={{ fontWeight: 900, fontSize: 28, color: '#2563eb', marginBottom: 18 }}>Waiting for host to start the quiz...</h2>
          <div style={{ fontSize: 18, color: '#374151', marginBottom: 12 }}>Room Code: <b style={{ color: '#2563eb' }}>{roomCode}</b></div>
          <div style={{ fontSize: 18, color: '#374151' }}>Name: <b style={{ color: '#2563eb' }}>{username}</b></div>
        </div>
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
};

export default JoinQuiz;
