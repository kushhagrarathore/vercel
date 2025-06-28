import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { generateLiveLink } from '../utils/generateLiveLink';
import Leaderboard from '../components/quiz/Leaderboard';
// TODO: Import TimerBar, Leaderboard, LiveAudienceView, etc.

function randomRoomCode() {
  return Math.random().slice(2, 8);
}

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
  const [liveQuiz, setLiveQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const channelRef = useRef(null);
  const [participants, setParticipants] = useState([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [phase, setPhase] = useState('question');
  const [leaderboardTopN, setLeaderboardTopN] = useState(3);
  const [leaderboardShowScores, setLeaderboardShowScores] = useState(true);
  const [leaderboardShowAvatars, setLeaderboardShowAvatars] = useState(true);
  const [transitionCountdown, setTransitionCountdown] = useState(2);
  const cardRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lobbyCount, setLobbyCount] = useState(0);
  const [showFinishQuiz, setShowFinishQuiz] = useState(false);
  const [quizState, setQuizState] = useState(null);
  const [timer, setTimer] = useState(0);
  const [currentQuestionId, setCurrentQuestionId] = useState(null);
  const isHost = true; // This is the host page

  // Fetch slides for this quiz
  useEffect(() => {
    const fetchSlides = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('slides').select('*').eq('quiz_id', quizId).order('slide_index');
      if (error) setError('Failed to load slides');
      else setSlides(data || []);
      setLoading(false);
    };
    fetchSlides();
  }, [quizId]);

  // Subscribe to sessions for this room
  useEffect(() => {
    if (!roomCode) return;
    const subscribe = async () => {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', roomCode)
        .single();
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

  // Subscribe to quiz_state for this room
  useEffect(() => {
    if (!roomCode) return;
    const channel = supabase
      .channel('quiz_state_' + roomCode)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_state', filter: `quiz_room_id=eq.${roomCode}` }, payload => {
        setQuizState(payload.new);
        setTimer(payload.new?.timer_value ?? 0);
        setPhase(payload.new?.quiz_status ?? 'question');
        setCurrentQuestionId(payload.new?.current_question_id ?? null);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomCode]);

  // Subscribe to participants for this room
  useEffect(() => {
    if (!roomCode) return;
    const channel = supabase
      .channel('participants_' + roomCode)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `session_code=eq.${roomCode}` }, () => {
        fetchParticipants();
      })
      .subscribe();
    fetchParticipants();
    return () => { supabase.removeChannel(channel); };
  }, [roomCode]);

  // Fetch participants
  const fetchParticipants = async () => {
    const { data } = await supabase
      .from('participants')
      .select('*')
      .eq('session_code', roomCode)
      .order('created_at', { ascending: true });
    setParticipants(data || []);
    setParticipantCount(data?.length || 0);
    
    // Also set leaderboard data
    const sortedData = data?.sort((a, b) => b.score - a.score) || [];
    setLeaderboard(sortedData);
  };

  // Initial fetch
  useEffect(() => {
    if (roomCode) {
      fetchParticipants();
    }
  }, [roomCode]);

  // Subscribe to lobby participants (status: 'waiting') for this room
  useEffect(() => {
    if (!roomCode) return;
    let channel;
    const fetchLobbyCount = async () => {
      const { data } = await supabase
        .from('participants')
        .select('id')
        .eq('session_code', roomCode)
        .eq('status', 'waiting');
      setLobbyCount(data ? data.length : 0);
    };
    channel = supabase
      .channel('lobby-' + roomCode)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `session_code=eq.${roomCode},status=eq.waiting` }, fetchLobbyCount)
      .subscribe();
    fetchLobbyCount();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [roomCode]);

  // Auto-advance timer for host (only in question phase)
  useEffect(() => {
    if (status !== 'live' || !liveQuiz?.timer_end || !liveQuiz?.current_question_id || phase !== 'question') return;
    const timer = setInterval(() => {
      const now = Date.now();
      const end = new Date(liveQuiz.timer_end).getTime();
      setTimeLeft(Math.max(0, Math.ceil((end - now) / 1000)));
      if (end <= now) {
        clearInterval(timer);
        handleNext();
      }
    }, 500);
    return () => clearInterval(timer);
  }, [status, liveQuiz, phase]);

  // Host: Start Live Quiz (create sessions row)
  const handleStart = async () => {
    setLoading(true);
    setError(null);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // Remove any previous session for this quizId
    await supabase.from('sessions').delete().eq('quiz_id', quizId);
    const { error: insertError } = await supabase.from('sessions').insert([{
      quiz_id: quizId,
      code: code,
      is_live: false,
      current_question_id: null,
      timer_end: null,
    }]);
    if (insertError) {
      console.error('Supabase insert error:', insertError);
      setError('Failed to start live quiz: ' + (insertError.message || insertError.details || 'Unknown error'));
      setLoading(false);
      return;
    }
    // Fetch the new session row to ensure it's available for joiners
    const { data: newLiveQuiz, error: fetchError } = await supabase
      .from('sessions')
      .select('*')
      .eq('code', code)
      .single();
    if (fetchError || !newLiveQuiz) {
      setError('Failed to fetch live quiz after creation.');
      setLoading(false);
      return;
    }
    setRoomCode(code);
    setLiveQuiz(newLiveQuiz);
    setLoading(false);
    setStatus('waiting');
  };

  // Host: Start Quiz (set is_live, current_question_id, timer_end, phase, and update all participants to 'active')
  const handleStartQuiz = async () => {
    if (!liveQuiz || !slides.length) return;
    const firstQuestionId = slides[0]?.id;
    await supabase.from('participants').update({ status: 'active' }).eq('session_code', roomCode).eq('status', 'waiting');
    await supabase.from('quiz_state').upsert({
      quiz_room_id: roomCode,
      timer_value: 20,
      current_question_id: firstQuestionId,
      quiz_status: 'question'
    });
    setTimer(20);
    setPhase('question');
    setCurrentQuestionId(firstQuestionId);
    setStatus('live');
  };

  // Sync host view with sessions changes
  useEffect(() => {
    if (liveQuiz && status === 'live' && liveQuiz.current_question_id != null) {
      // Show the current question and timer to the host
      // (UI below will use liveQuiz.current_question_id and timer_end)
    }
  }, [liveQuiz, status]);

  // Host: Next Question (now handles phase)
  const handleNext = async () => {
    if (!liveQuiz || !slides.length) return;
    const currentIdx = slides.findIndex(s => s.id === liveQuiz.current_question_id);
    const next = currentIdx + 1;
    if (next < slides.length) {
      // Show leaderboard phase first
      await supabase.from('sessions').update({ phase: 'leaderboard' }).eq('code', roomCode);
      setPhase('leaderboard');
      setTimeout(async () => {
        // Show transition phase
        await supabase.from('sessions').update({ phase: 'transition' }).eq('code', roomCode);
        setPhase('transition');
        setTimeout(async () => {
          // Move to next question
          const timer = slides[next]?.timer || 20;
          const timerEnd = new Date(Date.now() + timer * 1000).toISOString();
          await supabase.from('sessions').update({
            current_question_id: slides[next]?.id,
            timer_end: timerEnd,
            phase: 'question',
          }).eq('code', roomCode);
          setPhase('question');
        }, 2000); // 2s transition
      }, 3500); // 3.5s leaderboard
    } else {
      // Show Finish Quiz button
      setShowFinishQuiz(true);
    }
  };

  // Host: End Quiz
  const handleEnd = async () => {
    if (!liveQuiz) return;
    await supabase.from('sessions').update({
      is_live: false,
      timer_end: null,
    }).eq('code', roomCode);
    setStatus('ended');
  };

  // Update transition countdown during 'transition' phase
  useEffect(() => {
    if (phase !== 'transition') return;
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

  const handleFinishQuiz = async () => {
    if (!liveQuiz) return;
    await supabase.from('sessions').update({ phase: 'ended' }).eq('code', roomCode);
    setPhase('ended');
  };

  // Ensure phase transitions always happen, even after refresh
  useEffect(() => {
    if (status !== 'live' || !liveQuiz || !slides.length) return;
    if (phase === 'leaderboard') {
      const timeout = setTimeout(async () => {
        await supabase.from('sessions').update({ phase: 'transition' }).eq('code', roomCode);
        setPhase('transition');
      }, 3500);
      return () => clearTimeout(timeout);
    }
    if (phase === 'transition') {
      const currentIdx = slides.findIndex(s => s.id === liveQuiz.current_question_id);
      const next = currentIdx + 1;
      const timeout = setTimeout(async () => {
        if (next < slides.length) {
          const timer = slides[next]?.timer || 20;
          const timerEnd = new Date(Date.now() + timer * 1000).toISOString();
          await supabase.from('sessions').update({
            current_question_id: slides[next]?.id,
            timer_end: timerEnd,
            phase: 'question',
          }).eq('code', roomCode);
          setPhase('question');
        } else {
          setShowFinishQuiz(true);
        }
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [status, phase, liveQuiz, slides, roomCode]);

  // If in 'question' phase and timer is 0, auto-advance
  useEffect(() => {
    if (status === 'live' && phase === 'question' && timeLeft === 0 && liveQuiz && slides.length > 0) {
      handleNext();
    }
  }, [status, phase, timeLeft, liveQuiz, slides]);

  // Host broadcasts timer every second
  useEffect(() => {
    if (phase !== 'question' || !quizState || !roomCode) return;
    if (!isHost) return;
    let interval = setInterval(async () => {
      if (timer > 0) {
        await supabase.from('quiz_state').update({ timer_value: timer - 1 }).eq('quiz_room_id', roomCode);
      } else {
        // Show leaderboard first
        await supabase.from('quiz_state').update({ quiz_status: 'leaderboard' }).eq('quiz_room_id', roomCode);
        
        // After 3.5s, show transition
        setTimeout(async () => {
          await supabase.from('quiz_state').update({ quiz_status: 'transition' }).eq('quiz_room_id', roomCode);
          
          // After 2s, move to next question or end
          setTimeout(async () => {
            const nextIdx = slides.findIndex(s => s.id === quizState.current_question_id) + 1;
            if (nextIdx < slides.length) {
              await supabase.from('quiz_state').update({
                current_question_id: slides[nextIdx].id,
                timer_value: 20,
                quiz_status: 'question'
              }).eq('quiz_room_id', roomCode);
            } else {
              await supabase.from('quiz_state').update({ quiz_status: 'ended' }).eq('quiz_room_id', roomCode);
            }
          }, 2000);
        }, 3500);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, quizState, timer, roomCode, isHost, slides]);

  // Show leaderboard after question ends
  useEffect(() => {
    if (quizState?.quiz_status === 'leaderboard') {
      setShowLeaderboard(true);
      setTimeout(() => {
        setShowLeaderboard(false);
      }, 3500);
    }
  }, [quizState?.quiz_status]);

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
        {roomCode && (
          <>
            <div style={{ marginBottom: 6, fontWeight: 700, fontSize: 18, color: '#374151' }}>
              Room Code: <span style={{ fontFamily: 'monospace', fontSize: 22, color: '#2563eb' }}>{roomCode}</span>
            </div>
            <div style={{ marginBottom: 6, fontWeight: 600, fontSize: 16 }}>
              Join Link: <a href={generateLiveLink(roomCode)} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', wordBreak: 'break-all', fontSize: 15 }}>{generateLiveLink(roomCode)}</a>
            </div>
            <div style={{ marginBottom: 6, background: '#f1f5f9', borderRadius: 10, padding: '8px 16px', boxShadow: '0 2px 8px rgba(60,60,100,0.07)', fontWeight: 700, fontSize: 17 }}>
              Participants in Lobby: {lobbyCount}
            </div>
            {participants.length > 0 && (
              <div style={{ maxHeight: 90, overflowY: 'auto', background: '#f8fafc', borderRadius: 8, padding: '8px 14px', marginBottom: 6, width: 220, boxShadow: '0 1px 4px rgba(60,60,100,0.04)' }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#2563eb', marginBottom: 4 }}>Participants:</div>
                {participants.map((p, idx) => (
                  <div key={p.id || idx} style={{ fontSize: 15, color: '#374151', padding: '2px 0', borderBottom: idx !== participants.length - 1 ? '1px solid #e5e7eb' : 'none' }}>{p.name || 'Anonymous'}</div>
                ))}
              </div>
            )}
            <div style={{ margin: '10px 0', background: '#e0e7ff', borderRadius: 12, padding: '12px 0', fontWeight: 800, fontSize: 20, color: '#2563eb', textAlign: 'center', boxShadow: '0 2px 8px rgba(60,60,100,0.07)', width: '100%' }}>
              {status === 'waiting' ? 'Waiting to start...' : status === 'live' ? `Time Left: ${timeLeft}s` : 'Timer: --'}
            </div>
          </>
        )}
        {loading && <div>Loading questions...</div>}
        {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
        {(!roomCode && !loading) ? (
          <button onClick={handleStart} style={{ padding: '14px 36px', fontSize: 19, borderRadius: 10, background: '#4a6bff', color: '#fff', border: 'none', fontWeight: 800, marginBottom: 8, width: '100%' }} disabled={loading}>
            {loading ? 'Starting...' : 'Start Live Quiz'}
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
        {status === 'live' && liveQuiz && slides.length > 0 && liveQuiz.current_question_id != null ? (
          phase === 'question' ? (
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
              <div style={{ fontWeight: 800, fontSize: 24, color: '#2563eb', marginBottom: 10 }}>Q{slides.findIndex(s => s.id === liveQuiz.current_question_id) + 1} / {slides.length}</div>
              <div style={{ color: '#23272f', fontWeight: 700, fontSize: 22, margin: '0 0 18px 0', textAlign: 'center', letterSpacing: '-0.5px' }}>{slides.find(s => s.id === liveQuiz.current_question_id)?.question}</div>
              <div style={{ width: '100%', marginTop: 8 }}>
                {(slides.find(s => s.id === liveQuiz.current_question_id)?.options || []).map((opt, idx) => (
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
            </div>
          ) : phase === 'leaderboard' ? (
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
          ) : phase === 'transition' ? (
            <div style={{ margin: '18px 0', background: '#e0e7ff', borderRadius: 14, padding: '32px 0', fontWeight: 800, fontSize: 24, color: '#2563eb', textAlign: 'center', boxShadow: '0 2px 8px rgba(60,60,100,0.07)', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ marginBottom: 16, animation: 'pulse 1s infinite' }}>Get ready for the next question...</div>
              <div style={{ fontSize: 40, fontWeight: 900, color: '#2563eb', animation: 'bounce 1s infinite' }}>{transitionCountdown}</div>
              <style>{`
                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
                @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
              `}</style>
            </div>
          ) : null
        ) : null}
        {showFinishQuiz && (
          <button onClick={handleFinishQuiz} style={{ padding: '14px 36px', fontSize: 19, borderRadius: 10, background: '#e11d48', color: '#fff', border: 'none', fontWeight: 800, marginTop: 18 }}>
            Finish Quiz
          </button>
        )}
      </div>
      {/* Live Participant Count and List */}
      <div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-50">
        <div className="text-center mb-2">
          <div className="text-2xl font-bold text-blue-600">{participantCount}</div>
          <div className="text-sm text-gray-600">Participants</div>
        </div>
        <div className="max-h-40 overflow-y-auto">
          {participants.map((participant) => (
            <div key={participant.id} className="flex items-center space-x-2 py-1">
              <span className="text-lg">{participant.emoji}</span>
              <span className="text-sm font-medium truncate">{participant.name}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Animated Revolving Bubbles */}
      {participants.length > 0 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-6 z-40">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Live Participants</h3>
          </div>
          <div className="relative w-80 h-80 mx-auto">
            {participants.map((participant, idx) => {
              const { left, top } = spiralCoords(idx, participants.length, 160, 160);
              return (
                <div
                  key={participant.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    animation: `revolve ${8 + idx * 0.5}s linear infinite`,
                    animationDelay: `${idx * 0.2}s`,
                  }}
                >
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-2xl shadow-lg animate-pulse">
                      {participant.emoji}
                    </div>
                    <div className="mt-1 text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded-full shadow-sm">
                      {participant.name}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
      <style jsx>{`
        @keyframes revolve {
          from {
            transform: translate(-50%, -50%) rotate(0deg) translateX(0px) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(360deg) translateX(0px) rotate(-360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default PresentQuizPage; 