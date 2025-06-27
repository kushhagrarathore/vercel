import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { generateLiveLink } from '../utils/generateLiveLink';
import Leaderboard from '../components/quiz/Leaderboard';
// TODO: Import TimerBar, Leaderboard, LiveAudienceView, etc.

function randomRoomCode() {
  return Math.random().slice(2, 8);
}

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

  // Host: Start Quiz (set is_live, current_question_id, timer_end)
  const handleStartQuiz = async () => {
    if (!liveQuiz || !slides.length) return;
    const timer = slides[0]?.timer || 20;
    const timerEnd = new Date(Date.now() + timer * 1000).toISOString();
    await supabase.from('sessions').update({
      is_live: true,
      current_question_id: slides[0]?.id,
      timer_end: timerEnd,
    }).eq('code', roomCode);
    setStatus('live');
    setLiveQuiz({ ...liveQuiz, is_live: true, current_question_id: slides[0]?.id, timer_end: timerEnd });
  };

  // Sync host view with sessions changes
  useEffect(() => {
    if (liveQuiz && status === 'live' && liveQuiz.current_question_id != null) {
      // Show the current question and timer to the host
      // (UI below will use liveQuiz.current_question_id and timer_end)
    }
  }, [liveQuiz, status]);

  // Host: Next Question
  const handleNext = async () => {
    if (!liveQuiz || !slides.length) return;
    const currentIdx = slides.findIndex(s => s.id === liveQuiz.current_question_id);
    const next = currentIdx + 1;
    if (next < slides.length) {
      const timer = slides[next]?.timer || 20;
      const timerEnd = new Date(Date.now() + timer * 1000).toISOString();
      await supabase.from('sessions').update({
        current_question_id: slides[next]?.id,
        timer_end: timerEnd,
      }).eq('code', roomCode);
    } else {
      await handleEnd();
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
        <Leaderboard players={leaderboard} />
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
    <div className="present-quiz-layout" style={{ maxWidth: 600, margin: '0 auto', padding: 32 }}>
      <h1 style={{ fontWeight: 700, marginBottom: 16 }}>Live Quiz Host Panel</h1>
      {/* Always show room code and join link if roomCode exists */}
      {roomCode && (
        <div style={{ marginBottom: 16 }}>
          <b>Room Code:</b> <span style={{ fontFamily: 'monospace', fontSize: 22 }}>{roomCode}</span><br />
          <b>Join Link:</b> <a href={generateLiveLink(roomCode)} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', wordBreak: 'break-all', fontSize: 16 }}>{generateLiveLink(roomCode)}</a>
        </div>
      )}
      {loading && <div>Loading questions...</div>}
      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
      {/* Fallback for no slides */}
      {(!loading && slides.length === 0 && !error) && (
        <div style={{ color: 'red', fontWeight: 600, fontSize: 18 }}>
          No questions found for this quiz. Please add questions and publish again.<br />
          <span style={{ color: '#888', fontSize: 14 }}>quizId: {quizId}</span>
        </div>
      )}
      {(!roomCode && !loading) ? (
        <button onClick={handleStart} style={{ padding: '12px 32px', fontSize: 18, borderRadius: 8, background: '#4a6bff', color: '#fff', border: 'none', fontWeight: 700, marginBottom: 24 }} disabled={loading}>
          {loading ? 'Starting...' : 'Start Live Quiz'}
        </button>
      ) : status === 'waiting' ? (
        <>
          <div style={{ marginBottom: 16, color: '#059669', fontWeight: 600 }}>Room Code: <span style={{ fontFamily: 'monospace', fontSize: 22 }}>{roomCode}</span></div>
          <div style={{ marginBottom: 16 }}>
            <b>Share this link with participants:</b><br />
            <a href={generateLiveLink(roomCode)} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', wordBreak: 'break-all', fontSize: 16 }}>{generateLiveLink(roomCode)}</a>
          </div>
          {/* Remove participants display for now, or handle undefined safely */}
          {/* <div style={{ marginBottom: 16 }}>
            <b>Participants:</b> {Array.isArray(liveQuiz?.participants) && liveQuiz.participants.length > 0 ? liveQuiz.participants.map(p => p.name).join(', ') : 'None yet'}
          </div> */}
          <button
            onClick={handleStartQuiz}
            style={{ padding: '12px 32px', fontSize: 18, borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 700, marginBottom: 24 }}
            disabled={loading || !slides.length}
          >
            {loading ? 'Starting...' : 'Start Quiz'}
          </button>
        </>
      ) : status === 'live' && liveQuiz && slides.length > 0 && liveQuiz.current_question_id != null ? (
        <>
          <div style={{ marginBottom: 16, color: '#059669', fontWeight: 600 }}>Quiz is LIVE!</div>
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
          <button onClick={handleNext} disabled={slides.findIndex(s => s.id === liveQuiz.current_question_id) >= slides.length - 1} style={{ padding: '10px 24px', borderRadius: 8, background: '#f59e42', color: '#fff', border: 'none', fontWeight: 700, marginRight: 12 }}>
            Next Question
          </button>
          <button onClick={handleEnd} style={{ padding: '10px 24px', borderRadius: 8, background: '#e11d48', color: '#fff', border: 'none', fontWeight: 700 }}>
            End Quiz
          </button>
        </>
      ) : null}
    </div>
  );
};

export default PresentQuizPage; 