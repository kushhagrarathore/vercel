import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { generateLiveLink } from '../../utils/generateLiveLink';
import Leaderboard from '../livequiz/Leaderboard';
import { QRCodeCanvas } from 'qrcode.react';
// TODO: Import TimerBar, Leaderboard, LiveAudienceView, etc.

const PHASES = {
  LOBBY: 'lobby',
  QUESTION: 'question',
  LEADERBOARD: 'leaderboard',
  TRANSITION: 'transition',
  ENDED: 'ended',
  FINAL_LEADERBOARD: 'final_leaderboard',
  ANSWER_REVEAL: 'answer_reveal',
};

// Spiral layout calculation for revolving bubbles
const spiralCoords = (idx, total, centerX, centerY, radius = 120, spacing = 40) => {
  const angle = (2 * Math.PI * idx) / Math.max(1, total);
  const distance = radius + (spacing * idx);
  return {
    left: centerX + distance * Math.cos(angle),
    top: centerY + distance * Math.sin(angle),
  };
};

const PresentQuizPage = () => {
  const { quizId } = useParams();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [slides, setSlides] = useState([]);
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [phase, setPhase] = useState(PHASES.LOBBY);
  const [leaderboardTopN, setLeaderboardTopN] = useState(3);
  const [leaderboardShowScores, setLeaderboardShowScores] = useState(true);
  const [leaderboardShowAvatars, setLeaderboardShowAvatars] = useState(true);
  const [transitionCountdown, setTransitionCountdown] = useState(2);
  const cardRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timer, setTimer] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isHost = true; // This is the host page
  const timerInterval = useRef(null);
  const [showQR, setShowQR] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');
  const navigate = useNavigate();
  const [channel, setChannel] = useState(null);
  const [answerStats, setAnswerStats] = useState([]);
  const [correctOption, setCorrectOption] = useState(null);

  // Fetch slides for this quiz
  useEffect(() => {
    const fetchSlides = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('live_quiz_slides').select('*').eq('quiz_id', quizId).order('slide_index');
      if (error) setError('Failed to load slides');
      else setSlides(data || []);
      setLoading(false);
    };
    fetchSlides();
  }, [quizId]);

  // Create a session on mount
  useEffect(() => {
    const createSession = async () => {
      setLoading(true);
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await supabase.from('sessions').delete().eq('code', quizId);
      const { error: insertError } = await supabase.from('sessions').insert([{
        quiz_id: quizId,
        code: code,
        quiz_status: PHASES.LOBBY,
        current_slide_index: null,
        timer_end: null,
        is_live: false,
      }]);
      if (insertError) {
        setError('Failed to start live quiz: ' + (insertError.message || insertError.details || 'Unknown error'));
        setLoading(false);
        return;
      }
      setRoomCode(code);
      setLoading(false);
    };
    createSession();
  }, [quizId]);

  // Subscribe to live_quiz_state for this room
  useEffect(() => {
    if (!roomCode) return;
    const ch = supabase.channel(`quiz_${roomCode}`);
    setChannel(ch);
    return () => { ch.unsubscribe && ch.unsubscribe(); };
  }, [roomCode]);

  // Subscribe to session_participants for this room
  useEffect(() => {
    if (!roomCode) return;
    const fetchParticipants = async () => {
      const { data } = await supabase
        .from('session_participants')
        .select('*')
        .eq('session_code', roomCode)
        .order('created_at', { ascending: true });
      setParticipants(data || []);
      setLeaderboard((data || []).sort((a, b) => b.score - a.score));
    };
    const channel = supabase
      .channel('session_participants_' + roomCode)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_participants', filter: `session_code=eq.${roomCode}` }, fetchParticipants)
      .subscribe();
    fetchParticipants();
    return () => { supabase.removeChannel(channel); };
  }, [roomCode]);

  // Timer logic (just locks answers, does not auto-advance)
  useEffect(() => {
    if (phase !== PHASES.QUESTION || !timer) return;
    setTimeLeft(timer);
    if (timerInterval.current) clearInterval(timerInterval.current);
    timerInterval.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerInterval.current);
          // Do NOT call handleEndOfQuestion or advance
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerInterval.current);
  }, [phase, timer, currentIndex]);

  // Host: Lock answers and show answer reveal
  const handleLockAnswers = async () => {
    const slide = slides[currentIndex];
    // Fetch all answers for this question
    const { data: answers } = await supabase
      .from('session_participant_answers')
      .select('answer')
      .eq('session_code', roomCode)
      .eq('question_id', slide.id);
    // Count votes for each option
    const stats = Array(slide.options.length).fill(0);
    (answers || []).forEach(a => {
      if (typeof a.answer === 'number' && stats[a.answer] !== undefined) stats[a.answer]++;
    });
    setAnswerStats(stats);
    setCorrectOption(slide.correct_option);
    setPhase(PHASES.ANSWER_REVEAL);
    await supabase.from('sessions').update({
      phase: PHASES.ANSWER_REVEAL
    }).eq('code', roomCode);
    console.log('[HOST] Locked answers, showing answer reveal.');
  };

  // Host: Move to next question (manual only)
  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setPhase(PHASES.QUESTION);
      setAnswerStats([]);
      setCorrectOption(null);
      const slide = slides[nextIndex];
      await supabase.from('sessions').update({
        current_slide_index: slide.slide_index,
        phase: PHASES.QUESTION
      }).eq('code', roomCode);
      console.log('[HOST] Updated session to next question:', slide.slide_index);
    } else {
      setPhase(PHASES.FINAL_LEADERBOARD);
      await supabase.from('sessions').update({
        phase: PHASES.FINAL_LEADERBOARD
      }).eq('code', roomCode);
      console.log('[HOST] Quiz ended, showing final leaderboard.');
    }
  };

  // Start quiz handler
  const handleStartQuiz = async () => {
    if (!slides.length) {
      setError('No slides found for this quiz.');
      return;
    }
    await supabase
      .from('sessions')
      .update({ is_live: true, quiz_status: 'question' })
      .eq('code', roomCode);
    handleSendQuestion(0);
  };

  const handleSendQuestion = async (slideIdx) => {
    const slide = slides[slideIdx];
    await supabase
      .from('sessions')
      .update({
        current_slide_index: slide.slide_index,
        timer_start: new Date().toISOString(),
        timer_end: new Date(Date.now() + slide.timer * 1000).toISOString()
      })
      .eq('code', roomCode);
    safeSend({
      type: 'broadcast',
      event: 'new_question',
      payload: {
        question: slide.question,
        options: slide.options,
        slide_index: slide.slide_index,
        timer: slide.timer
      }
    });
    setCurrentIndex(slideIdx);
    setTimer(slide.timer);
    setTimeLeft(slide.timer);
    setPhase(PHASES.QUESTION);
  };

  // Auto-advance timer for host (only in question phase)
  useEffect(() => {
    if (status !== 'live' || !timer || !currentIndex || phase !== 'question') return;
    const timer = setInterval(() => {
      const now = Date.now();
      const end = new Date(timer).getTime();
      setTimeLeft(Math.max(0, Math.ceil((end - now) / 1000)));
      if (end <= now) {
        clearInterval(timer);
        handleNext();
      }
    }, 500);
    return () => clearInterval(timer);
  }, [status, timer, currentIndex, phase]);

  // Host: End Quiz
  const handleEnd = async () => {
    if (!timer) return;
    await supabase.from('sessions').update({
      quiz_status: 'ended',
      timer_end: null,
    }).eq('code', roomCode);
    setStatus('ended');
  };

  // Update transition countdown during 'transition' phase
  useEffect(() => {
    if (phase !== PHASES.TRANSITION) return;
    setTransitionCountdown(2);
    const interval = setInterval(() => {
      setTransitionCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Fullscreen handlers
  const handleEnterFullscreen = () => {
    if (cardRef.current) {
      const fsElement = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
      if (fsElement) return; // Already in fullscreen
      try {
        if (cardRef.current.requestFullscreen) {
          cardRef.current.requestFullscreen();
        } else if (cardRef.current.webkitRequestFullscreen) {
          cardRef.current.webkitRequestFullscreen();
        } else if (cardRef.current.mozRequestFullScreen) {
          cardRef.current.mozRequestFullScreen();
        } else if (cardRef.current.msRequestFullscreen) {
          cardRef.current.msRequestFullscreen();
        }
        setIsFullscreen(true);
      } catch (e) {
        // Ignore or show a message if needed
        console.warn('Fullscreen request failed:', e);
      }
    }
  };
  useEffect(() => {
    const onFullscreenChange = () => {
      const fsElement = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
      setIsFullscreen(!!fsElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange', onFullscreenChange);
    document.addEventListener('MSFullscreenChange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.removeEventListener('mozfullscreenchange', onFullscreenChange);
      document.removeEventListener('MSFullscreenChange', onFullscreenChange);
    };
  }, []);

  // Add responsive styles for the main card
  const cardStyle = {
    background: '#fff',
    borderRadius: isFullscreen ? 0 : 22,
    boxShadow: isFullscreen ? 'none' : '0 8px 32px rgba(60,60,100,0.13)',
    padding: isFullscreen ? 64 : 44,
    minWidth: isFullscreen ? 0 : 340,
    maxWidth: isFullscreen ? '100vw' : 480,
    width: '100%',
    border: '2px solid #e0e7ff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 18,
    fontSize: isFullscreen ? 32 : 18,
    transition: 'all 0.2s',
    position: 'relative',
  };
  // Responsive tweaks for mobile
  if (window.innerWidth < 600) {
    cardStyle.padding = isFullscreen ? 24 : 18;
    cardStyle.minWidth = 0;
    cardStyle.maxWidth = '98vw';
    cardStyle.fontSize = isFullscreen ? 22 : 15;
    cardStyle.gap = 10;
  }

  // Ensure phase transitions always happen, even after refresh
  useEffect(() => {
    if (status !== 'live' || !slides.length) return;
    if (phase === PHASES.LEADERBOARD) {
      const timeout = setTimeout(async () => {
        await supabase.from('sessions').update({ phase: PHASES.TRANSITION }).eq('code', roomCode);
        setPhase(PHASES.TRANSITION);
      }, 3500);
      return () => clearTimeout(timeout);
    }
    if (phase === PHASES.TRANSITION) {
      const currentIdx = slides.findIndex(s => s.id === currentIndex);
      const next = currentIdx + 1;
      const timeout = setTimeout(async () => {
        if (next < slides.length) {
          const timer = slides[next]?.timer || 20;
          const timerEnd = new Date(Date.now() + timer * 1000).toISOString();
          await supabase.from('sessions').update({
            current_slide_index: next,
            timer_end: timerEnd,
            phase: PHASES.QUESTION,
          }).eq('code', roomCode);
          setPhase(PHASES.QUESTION);
        } else {
          setShowLeaderboard(true);
        }
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [status, phase, currentIndex, slides, roomCode]);

  // If in 'question' phase and timer is 0, auto-advance
  useEffect(() => {
    if (status === 'live' && phase === 'question' && timeLeft === 0 && slides.length > 0) {
      handleNext();
    }
  }, [status, phase, timeLeft, slides]);

  // Host broadcasts timer every second
  useEffect(() => {
    if (phase !== PHASES.QUESTION || !timer || !roomCode) return;
    if (!isHost) return;
    let interval = setInterval(async () => {
      if (timer > 0) {
        await supabase.from('live_quiz_state').update({ timer_value: timer - 1 }).eq('quiz_room_id', roomCode);
      } else {
        // Show leaderboard first
        await supabase.from('live_quiz_state').update({ quiz_status: PHASES.LEADERBOARD }).eq('quiz_room_id', roomCode);
        
        // After 3.5s, show transition
        setTimeout(async () => {
          await supabase.from('live_quiz_state').update({ quiz_status: PHASES.TRANSITION }).eq('quiz_room_id', roomCode);
          
          // After 2s, move to next question or end
          setTimeout(async () => {
            const nextIdx = slides.findIndex(s => s.id === currentIndex) + 1;
            if (nextIdx < slides.length) {
              await supabase.from('live_quiz_state').update({
                current_slide_index: nextIdx,
                timer_value: 20,
                quiz_status: PHASES.QUESTION
              }).eq('quiz_room_id', roomCode);
            } else {
              await supabase.from('live_quiz_state').update({ quiz_status: PHASES.ENDED }).eq('quiz_room_id', roomCode);
            }
          }, 2000);
        }, 3500);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, timer, roomCode, isHost, slides]);

  // Show leaderboard after question ends
  useEffect(() => {
    if (phase === PHASES.LEADERBOARD) {
      setShowLeaderboard(true);
      setTimeout(() => {
        setShowLeaderboard(false);
      }, 3500);
    }
  }, [phase]);

  // Subscribe to live_responses for this room (optional, for live stats)
  useEffect(() => {
    if (!roomCode) return;
    const channel = supabase
      .channel('live_responses_' + roomCode)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_participant_answers', filter: `session_code=eq.${roomCode}` }, () => {
        // Optionally fetch live responses or update UI
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomCode]);

  const joinLink = generateLiveLink(roomCode);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinLink);
    setCopySuccess('Copied!');
    setTimeout(() => setCopySuccess(''), 1500);
  };

  // After the last question, add a button to end the quiz and show the final leaderboard
  const handleShowFinalLeaderboard = () => {
    setPhase(PHASES.FINAL_LEADERBOARD);
  };

  // Send event to channel with error handling
  const safeSend = (eventObj) => {
    try {
      channel.send(eventObj);
    } catch (err) {
      setError('Failed to send event: ' + err.message);
    }
  };

  // Timer expiration: auto-lock answers
  useEffect(() => {
    if (phase !== PHASES.QUESTION || !timer) return;
    const timeout = setTimeout(() => {
      handleLockAnswers();
    }, timer * 1000);
    return () => clearTimeout(timeout);
  }, [phase, timer]);

  // Add debug output for all state changes
  useEffect(() => {
    console.log('[HOST] Phase:', phase, 'Current Index:', currentIndex, 'Room:', roomCode);
  }, [phase, currentIndex, roomCode]);

  if (status === 'ended') {
    return (
      <div className="present-quiz-layout" style={{ maxWidth: 600, margin: '0 auto', padding: 32 }}>
        <h1 style={{ fontWeight: 700, marginBottom: 16 }}>Live Quiz Host Panel</h1>
        <div style={{ color: 'red', fontWeight: 600, fontSize: 18 }}>Quiz Ended</div>
      </div>
    );
  }

  if (showLeaderboard) {
    return (
      <div className="present-quiz-layout" style={{ maxWidth: 600, margin: '0 auto', padding: 32 }}>
        <h1 style={{ fontWeight: 700, marginBottom: 16 }}>Live Quiz Host Panel</h1>
        <Leaderboard players={leaderboard} showScores={leaderboardShowScores} topN={leaderboardTopN} showAvatars={leaderboardShowAvatars} />
      </div>
    );
  }

  if (slides.length === 0 && !error) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: 32 }}>
        <h1 style={{ fontWeight: 700, marginBottom: 16 }}>Live Quiz Host Panel</h1>
        <div style={{ color: 'red', fontWeight: 600, fontSize: 18 }}>
          No questions found for this quiz. Please add questions and publish again.
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #e0e7ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: window.innerWidth < 600 ? 8 : 0 }}>
      <div ref={cardRef} style={cardStyle}>
        <button onClick={handleEnterFullscreen} aria-label="Present Fullscreen" style={{ position: 'absolute', top: 10, right: 10, zIndex: 10, padding: window.innerWidth < 600 ? '6px 12px' : '8px 18px', fontSize: isFullscreen ? 22 : (window.innerWidth < 600 ? 14 : 16), borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 700, boxShadow: '0 2px 8px rgba(60,60,100,0.10)', cursor: 'pointer' }}>{isFullscreen ? 'Fullscreen' : 'Present'}</button>
        <h1 style={{ fontWeight: 900, fontSize: 30, color: '#2563eb', marginBottom: 8, letterSpacing: '-1px', textAlign: 'center' }}>Live Quiz Host Panel</h1>
        {phase === PHASES.LOBBY && (
          <>
            <div style={{ marginBottom: 6, fontWeight: 700, fontSize: 18, color: '#374151' }}>
              Room Code: <span style={{ fontFamily: 'monospace', fontSize: 22, color: '#2563eb' }}>{roomCode}</span>
            </div>
            <div style={{ marginBottom: 6, fontWeight: 600, fontSize: 16 }}>
              Join Link: <a href={joinLink} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', wordBreak: 'break-all', fontSize: 15 }}>{joinLink}</a>
              <button onClick={handleCopyLink} style={{ marginLeft: 8, padding: '2px 10px', fontSize: 14, borderRadius: 6, background: '#e0e7ff', color: '#2563eb', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Copy Link</button>
              <button onClick={() => setShowQR(true)} style={{ marginLeft: 8, padding: '2px 10px', fontSize: 14, borderRadius: 6, background: '#e0e7ff', color: '#2563eb', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Show QR</button>
              {copySuccess && <span style={{ marginLeft: 8, color: '#059669', fontWeight: 600 }}>{copySuccess}</span>}
            </div>
            <div style={{ marginBottom: 6, background: '#f1f5f9', borderRadius: 10, padding: '8px 16px', boxShadow: '0 2px 8px rgba(60,60,100,0.07)', fontWeight: 700, fontSize: 17 }}>
              Participants in Lobby: {participants.length}
            </div>
            {participants.length > 0 && (
              <div style={{ maxHeight: 90, overflowY: 'auto', background: '#f8fafc', borderRadius: 8, padding: '8px 14px', marginBottom: 6, width: 220, boxShadow: '0 1px 4px rgba(60,60,100,0.04)' }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#2563eb', marginBottom: 4 }}>Participants:</div>
                {participants.map((p, idx) => (
                  <div key={p.id || idx} style={{ fontSize: 15, color: '#374151', padding: '2px 0', borderBottom: idx !== participants.length - 1 ? '1px solid #e5e7eb' : 'none' }}>{p.name || 'Anonymous'}</div>
                ))}
              </div>
            )}
            <button onClick={handleStartQuiz} style={{ padding: '14px 36px', fontSize: 19, borderRadius: 10, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 800, marginBottom: 8, width: '100%' }} disabled={loading || !slides.length}>
              {loading ? 'Loading...' : 'Start Quiz'}
            </button>
            {showQR && (
              <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowQR(false)}>
                <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 8px 32px rgba(60,60,100,0.13)', display: 'flex', flexDirection: 'column', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                  <QRCodeCanvas value={joinLink} size={200} />
                  <div style={{ marginTop: 16, fontWeight: 700, color: '#2563eb', fontSize: 18 }}>{joinLink}</div>
                  <button onClick={() => setShowQR(false)} style={{ marginTop: 18, padding: '8px 24px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 700, fontSize: 16 }}>Close</button>
                </div>
              </div>
            )}
          </>
        )}
        {loading && <div>Loading questions...</div>}
        {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
        {(!roomCode && !loading) ? (
          <button onClick={handleStartQuiz} style={{ padding: '14px 36px', fontSize: 19, borderRadius: 10, background: '#4a6bff', color: '#fff', border: 'none', fontWeight: 800, marginBottom: 8, width: '100%' }} disabled={loading || !slides.length}>
            {loading ? 'Starting...' : 'Start Quiz'}
          </button>
        ) : status === 'waiting' ? (
          <button
            onClick={handleStartQuiz}
            style={{ padding: '14px 36px', fontSize: 19, borderRadius: 10, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 800, marginBottom: 8, width: '100%' }}
            disabled={loading || !slides.length}
          >
            {loading ? 'Starting...' : 'Start Quiz'}
          </button>
        ) : null}
        {/* Phase-based UI for live quiz */}
        {(() => {
          if (phase === PHASES.QUESTION && slides[currentIndex]) {
            return (
              <div style={{
                background: '#fff',
                borderRadius: 18,
                boxShadow: '0 8px 32px rgba(60,60,100,0.10)',
                padding: '32px 24px',
                minWidth: 320,
                maxWidth: 520,
                width: '100%',
                margin: '0 0 18px 0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                transition: 'box-shadow 0.2s',
                border: '2px solid #e0e7ff',
              }}>
                <div style={{ fontWeight: 800, fontSize: 24, color: '#2563eb', marginBottom: 10 }}>Q{currentIndex + 1} / {slides.length}</div>
                <div style={{ color: '#23272f', fontWeight: 700, fontSize: 22, margin: '0 0 18px 0', textAlign: 'center', letterSpacing: '-0.5px' }}>{slides[currentIndex]?.question}</div>
                <div style={{ width: '100%', marginTop: 8 }}>
                  {(slides[currentIndex]?.options || []).map((opt, idx) => (
                    <button
                      key={idx}
                      disabled
                      style={{
                        display: 'block',
                        width: '100%',
                        margin: '10px 0',
                        padding: '16px 0',
                        borderRadius: 12,
                        background: '#f3f4f6',
                        color: '#23272f',
                        border: '2px solid #e0e0e0',
                        fontWeight: 700,
                        fontSize: 18,
                        boxShadow: 'none',
                        cursor: 'not-allowed',
                        outline: 'none',
                        transition: 'all 0.18s',
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <div style={{ margin: '18px 0', background: '#e0e7ff', borderRadius: 12, padding: '14px 0', fontWeight: 800, fontSize: 22, color: '#2563eb', textAlign: 'center', boxShadow: '0 2px 8px rgba(60,60,100,0.07)', width: '100%' }}>
                  Time Left: {timeLeft}s
                </div>
                {phase === PHASES.QUESTION && slides[currentIndex] && (
                  <button onClick={handleLockAnswers} style={{ marginTop: 24, padding: '12px 32px', borderRadius: 10, background: '#f59e42', color: '#fff', border: 'none', fontWeight: 700, fontSize: 18 }}>Lock Answers</button>
                )}
              </div>
            );
          } else if (phase === PHASES.LEADERBOARD) {
            return (
              <>
                <div style={{ marginBottom: 18, display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center' }}>
                  <label style={{ fontWeight: 600, fontSize: 15 }}>
                    Top:
                    <select value={leaderboardTopN} onChange={e => setLeaderboardTopN(Number(e.target.value))} style={{ marginLeft: 6, padding: '2px 8px', borderRadius: 6 }}>
                      <option value={3}>Top 3</option>
                      <option value={10}>Top 10</option>
                      <option value={participants.length}>All</option>
                    </select>
                  </label>
                  <label style={{ fontWeight: 600, fontSize: 15 }}>
                    <input type="checkbox" checked={leaderboardShowScores} onChange={e => setLeaderboardShowScores(e.target.checked)} style={{ marginRight: 4 }} /> Show Scores
                  </label>
                  <label style={{ fontWeight: 600, fontSize: 15 }}>
                    <input type="checkbox" checked={leaderboardShowAvatars} onChange={e => setLeaderboardShowAvatars(e.target.checked)} style={{ marginRight: 4 }} /> Show Avatars
                  </label>
                </div>
                <div style={{ margin: '18px 0', background: '#f1f5f9', borderRadius: 14, padding: '32px 0', fontWeight: 800, fontSize: 24, color: '#2563eb', textAlign: 'center', boxShadow: '0 2px 8px rgba(60,60,100,0.07)', width: '100%' }}>
                  <div>Leaderboard</div>
                  <Leaderboard players={leaderboard} showScores={leaderboardShowScores} topN={leaderboardTopN} showAvatars={leaderboardShowAvatars} />
                  <div style={{ marginTop: 18, color: '#888', fontWeight: 500, fontSize: 16 }}>Next question in a moment...</div>
                </div>
              </>
            );
          } else if (phase === PHASES.TRANSITION) {
            return (
              <div style={{ margin: '18px 0', background: '#e0e7ff', borderRadius: 14, padding: '32px 0', fontWeight: 800, fontSize: 24, color: '#2563eb', textAlign: 'center', boxShadow: '0 2px 8px rgba(60,60,100,0.07)', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ marginBottom: 16, animation: 'pulse 1s infinite' }}>Get ready for the next question...</div>
                <div style={{ fontSize: 40, fontWeight: 900, color: '#2563eb', animation: 'bounce 1s infinite' }}>{transitionCountdown}</div>
                <style>{`
                  @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
                  @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
                `}</style>
              </div>
            );
          } else if (phase === PHASES.ANSWER_REVEAL && slides[currentIndex]) {
            return (
              <div style={{
                background: '#fff',
                borderRadius: 18,
                boxShadow: '0 8px 32px rgba(60,60,100,0.10)',
                padding: '32px 24px',
                minWidth: 320,
                maxWidth: 520,
                width: '100%',
                margin: '0 0 18px 0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                transition: 'box-shadow 0.2s',
                border: '2px solid #e0e7ff',
              }}>
                <div style={{ fontWeight: 800, fontSize: 24, color: '#2563eb', marginBottom: 10 }}>Q{currentIndex + 1} / {slides.length}</div>
                <div style={{ color: '#23272f', fontWeight: 700, fontSize: 22, margin: '0 0 18px 0', textAlign: 'center', letterSpacing: '-0.5px' }}>{slides[currentIndex]?.question}</div>
                <div style={{ width: '100%', marginTop: 8 }}>
                  {(slides[currentIndex]?.options || []).map((opt, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      margin: '10px 0',
                      padding: '16px 0',
                      borderRadius: 12,
                      background: idx === correctOption ? '#bbf7d0' : '#f3f4f6',
                      color: '#23272f',
                      border: idx === correctOption ? '2.5px solid #059669' : '2px solid #e0e0e0',
                      fontWeight: 700,
                      fontSize: 19,
                      width: '100%',
                      justifyContent: 'space-between',
                    }}>
                      <span>{opt}</span>
                      <span style={{ color: '#2563eb', fontWeight: 800 }}>{answerStats[idx] || 0} votes</span>
                    </div>
                  ))}
                </div>
                <button onClick={handleNext} style={{ marginTop: 24, padding: '12px 32px', borderRadius: 10, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 700, fontSize: 18 }}>Next</button>
              </div>
            );
          }
          return null;
        })()}
        {phase === PHASES.ENDED && (
          <div style={{ width: '100%', textAlign: 'center' }}>
            <h2 style={{ fontWeight: 800, fontSize: 28, color: '#2563eb', marginBottom: 12 }}>Quiz Ended</h2>
            <button onClick={handleShowFinalLeaderboard} style={{ margin: '18px 0', padding: '12px 32px', borderRadius: 10, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 700, fontSize: 18 }}>Show Leaderboard</button>
          </div>
        )}
        {phase === PHASES.FINAL_LEADERBOARD && (
          <div style={{ width: '100%', textAlign: 'center', padding: 32 }}>
            <h2 style={{ fontWeight: 800, fontSize: 32, color: '#2563eb', marginBottom: 24 }}>🏆 Final Leaderboard</h2>
            {/* Podium for top 3 */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', marginBottom: 32, gap: 32 }}>
              {[1, 0, 2].map((pos, idx) => {
                const user = leaderboard[pos];
                if (!user) return <div key={idx} style={{ width: 80 }} />;
                const colors = ['#C0C0C0', '#FFD700', '#CD7F32'];
                const heights = [100, 140, 80];
                return (
                  <div key={user.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
              {leaderboard.slice(3).map((user, idx) => (
                <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: idx !== leaderboard.length - 4 ? '1px solid #e5e7eb' : 'none' }}>
                  <span style={{ fontWeight: 700, color: '#374151', fontSize: 18 }}>{idx + 4}.</span>
                  <span style={{ fontWeight: 700, color: '#374151', fontSize: 18 }}>{user.name}</span>
                  <span style={{ fontWeight: 700, color: '#059669', fontSize: 18 }}>{user.score} pts</span>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/dashboard')} style={{ marginTop: 32, padding: '12px 32px', borderRadius: 10, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 700, fontSize: 18 }}>Back to Dashboard</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PresentQuizPage;