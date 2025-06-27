import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { generateLiveLink } from '../utils/generateLiveLink';
import { socket } from '../utils/socket';
import Leaderboard from '../components/quiz/Leaderboard';
// TODO: Import TimerBar, Leaderboard, LiveAudienceView, etc.

function randomRoomCode() {
  return Math.random().toString().slice(2, 8);
}

const PresentQuizPage = () => {
  const { quizId } = useParams();
  const [status, setStatus] = useState('idle'); // idle, starting, live, error
  const [error, setError] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [slides, setSlides] = useState([]);
  const [isLive, setIsLive] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    // Fetch slides for this quiz
    const fetchSlides = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('slides').select('*').eq('quiz_id', quizId).order('slide_index');
      console.log('PresentQuizPage: quizId', quizId, 'slides', data);
      if (error) setError('Failed to load slides');
      else setSlides(data || []);
      setLoading(false);
    };
    fetchSlides();
  }, [quizId]);

  // Socket.IO host logic
  useEffect(() => {
    if (!quizId || !slides.length) return;
    if (!roomCode) return;
    // Host creates quiz room
    socket.emit('host_create_quiz', {
      quizId,
      roomCode,
      questions: slides.map(s => ({
        text: s.question,
        options: s.options,
        correctIndex: s.correct_answer_index,
        timeLimit: s.timer || 20,
      })),
    });
    socket.on('quiz_created', ({ roomCode }) => {
      setStatus('waiting');
    });
    socket.on('participants_updated', (list) => {
      setParticipants(list);
    });
    socket.on('quiz_started', () => {
      setIsLive(true);
      setStatus('live');
      setCurrentQuestion(0);
    });
    socket.on('question_changed', ({ index }) => {
      setCurrentQuestion(index);
    });
    socket.on('leaderboard', (players) => {
      setLeaderboard(players);
      setShowLeaderboard(true);
    });
    socket.on('quiz_ended', () => {
      setIsLive(false);
      setStatus('ended');
    });
    return () => {
      socket.off('quiz_created');
      socket.off('participants_updated');
      socket.off('quiz_started');
      socket.off('question_changed');
      socket.off('leaderboard');
      socket.off('quiz_ended');
    };
  }, [quizId, slides, roomCode]);

  const handleStart = async () => {
    // Always fetch fresh slides before starting
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from('slides').select('*').eq('quiz_id', quizId).order('slide_index');
    if (error || !data || data.length === 0) {
      setError('No questions found for this quiz. Please add questions and publish again.');
      setLoading(false);
      return;
    }
    setSlides(data);
    setLoading(false);
    // Generate new room code and clear state
    setRoomCode(randomRoomCode());
    setParticipants([]);
    setStatus('waiting');
    setIsLive(false);
    setShowLeaderboard(false);
    setLeaderboard([]);
    setCurrentQuestion(0);
  };

  const handleStartQuiz = () => {
    socket.emit('start_quiz', { roomCode });
    setIsLive(true);
    setStatus('live');
    setCurrentQuestion(0);
  };

  const handleNext = () => {
    if (currentQuestion < slides.length - 1) {
      const next = currentQuestion + 1;
      socket.emit('next_question', { roomCode, index: next });
    }
  };

  const handleEnd = () => {
    socket.emit('end_quiz', { roomCode });
    setIsLive(false);
    setStatus('idle');
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
      {!roomCode ? (
        <button onClick={handleStart} style={{ padding: '12px 32px', fontSize: 18, borderRadius: 8, background: '#4a6bff', color: '#fff', border: 'none', fontWeight: 700, marginBottom: 24 }}>
          Start Live Quiz
        </button>
      ) : status === 'waiting' ? (
        <>
          <div style={{ marginBottom: 16, color: '#059669', fontWeight: 600 }}>Room Code: <span style={{ fontFamily: 'monospace', fontSize: 22 }}>{roomCode}</span></div>
          <div style={{ marginBottom: 16 }}>
            <b>Share this link with participants:</b><br />
            <a href={generateLiveLink(roomCode)} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', wordBreak: 'break-all', fontSize: 16 }}>{generateLiveLink(roomCode)}</a>
          </div>
          <div style={{ marginBottom: 16 }}>
            <b>Participants:</b> {participants.length > 0 ? participants.map(p => p.name).join(', ') : 'None yet'}
          </div>
          <button onClick={handleStartQuiz} style={{ padding: '12px 32px', fontSize: 18, borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 700, marginBottom: 24 }}>
            Start Quiz
          </button>
        </>
      ) : isLive ? (
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
            <div style={{ fontWeight: 800, fontSize: 24, color: '#2563eb', marginBottom: 10 }}>Q{currentQuestion + 1} / {slides.length}</div>
            <div style={{ color: '#23272f', fontWeight: 700, fontSize: 22, margin: '0 0 18px 0', textAlign: 'center', letterSpacing: '-0.5px' }}>{slides[currentQuestion]?.question}</div>
            <div style={{ width: '100%', marginTop: 8 }}>
              {(slides[currentQuestion]?.options || []).map((opt, idx) => (
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
          <button onClick={handleNext} disabled={currentQuestion >= slides.length - 1} style={{ padding: '10px 24px', borderRadius: 8, background: '#f59e42', color: '#fff', border: 'none', fontWeight: 700, marginRight: 12 }}>
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