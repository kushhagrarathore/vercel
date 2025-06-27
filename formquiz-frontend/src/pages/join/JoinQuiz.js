import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { socket } from '../../utils/socket';
import QuestionTimer from '../../components/quiz/QuestionTimer';
import AnswerFeedback from '../../components/quiz/AnswerFeedback';
import Leaderboard from '../../components/quiz/Leaderboard';

const JoinQuiz = () => {
  const { roomCode } = useParams();
  const [joined, setJoined] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [quizEnded, setQuizEnded] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    // Listen for quiz events (always active)
    socket.on('quiz_started', ({ questions }) => {
      setQuestions(questions);
      setCurrentIndex(0);
      setCurrentQuestion(questions[0]);
      setFinished(false);
      setQuizEnded(false);
      setFeedback(null);
      setSelectedOption(null);
      setSubmitted(false);
      setIsLocked(false);
    });
    socket.on('question_changed', ({ index }) => {
      setCurrentIndex(index);
      setCurrentQuestion(questions[index]);
      setFeedback(null);
      setSelectedOption(null);
      setSubmitted(false);
      setIsLocked(false);
    });
    socket.on('quiz_ended', () => {
      setFinished(true);
      setQuizEnded(true);
    });
    socket.on('leaderboard', (players) => {
      setLeaderboard(players);
      setFinished(true);
    });
    socket.on('answer_feedback', ({ isCorrect, correctAnswer, feedbackText }) => {
      setFeedback({ isCorrect, correctAnswer, feedbackText });
    });
    socket.on('connect_error', () => {
      setConnectionError('Connection lost. Please refresh the page.');
    });
    return () => {
      socket.off('quiz_started');
      socket.off('question_changed');
      socket.off('quiz_ended');
      socket.off('leaderboard');
      socket.off('answer_feedback');
      socket.off('connect_error');
    };
  }, [questions]);

  const handleJoin = () => {
    if (!username.trim()) {
      setError('Please enter your name.');
      return;
    }
    setError(null);
    socket.emit('player_join', { roomCode, name: username.trim() });
    setJoined(true);
  };

  const handleSubmit = () => {
    if (selectedOption == null || isLocked || submitted) return;
    setIsLocked(true);
    setSubmitted(true);
    socket.emit('submit_answer', {
      roomCode,
      index: currentIndex,
      answer: selectedOption,
      name: username.trim(),
    });
    // If server does not send feedback, fallback to optimistic feedback
    setTimeout(() => {
      if (!feedback) {
        const isCorrect = selectedOption === currentQuestion.correctIndex;
        setFeedback({
          isCorrect,
          correctAnswer: currentQuestion.options?.[currentQuestion.correctIndex],
          feedbackText: isCorrect ? 'Great job!' : 'Better luck next time!',
        });
      }
    }, 1200);
  };

  const handleTimerExpire = () => {
    setIsLocked(true);
    if (!submitted) handleSubmit();
  };

  if (connectionError) {
    return <div style={{ color: 'red', padding: 32 }}>{connectionError}</div>;
  }
  if (quizEnded) {
    return <div style={{ color: 'red', padding: 32 }}>Quiz Ended</div>;
  }
  if (!joined) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(60,60,100,0.10)', padding: 36, minWidth: 320, maxWidth: 420, width: '100%' }}>
          <h2 style={{ fontWeight: 800, fontSize: 28, color: '#2563eb', marginBottom: 18 }}>Join Live Quiz</h2>
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="username" style={{ fontWeight: 600, fontSize: 16 }}>Your Name:</label>
            <input id="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your name" style={{ padding: 10, borderRadius: 8, border: '1.5px solid #c7d2fe', marginLeft: 12, fontSize: 16, width: 180 }} maxLength={32} />
          </div>
          <button onClick={handleJoin} style={{ padding: '12px 32px', fontSize: 18, borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 700, marginBottom: 12 }}>Join Quiz</button>
          {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
        </div>
      </div>
    );
  }
  if (finished) return <Leaderboard players={leaderboard} />;
  if (!currentQuestion) return <div>Waiting for host to start the quiz...</div>;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #e0e7ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(60,60,100,0.10)', padding: '38px 28px 32px 28px', minWidth: 320, maxWidth: 520, width: '100%', margin: '0 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', transition: 'box-shadow 0.2s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: 18 }}>
          <div style={{ fontWeight: 800, fontSize: 28, color: '#2563eb', letterSpacing: '-1px' }}>Quiz Arena</div>
          <div style={{ fontWeight: 500, color: '#888', fontSize: 17 }}>Q{currentIndex + 1} / {questions.length}</div>
        </div>
        <div style={{ color: '#23272f', fontWeight: 700, fontSize: 22, margin: '0 0 18px 0', textAlign: 'center', letterSpacing: '-0.5px' }}>{currentQuestion.question}</div>
        <div style={{ width: '100%', marginTop: 8 }}>
          {(currentQuestion.options || []).map((opt, idx) => (
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
        <QuestionTimer seconds={currentQuestion.timeLimit || 20} onExpire={handleTimerExpire} isLocked={isLocked} />
        <button
          onClick={handleSubmit}
          disabled={isLocked || submitted || selectedOption == null}
          style={{ marginTop: 16, padding: '10px 24px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 700, fontSize: 17, cursor: isLocked || submitted ? 'not-allowed' : 'pointer', opacity: isLocked || submitted ? 0.7 : 1 }}
        >
          Submit Answer
        </button>
        {/* Section grid for progress */}
        <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
          {questions.map((_, idx) => (
            <div key={idx} style={{ width: 22, height: 22, borderRadius: 4, background: idx === currentIndex ? '#2563eb' : '#e0e7ff', border: idx === currentIndex ? '2px solid #2563eb' : '1.5px solid #c7d2fe', display: 'inline-block', margin: 2 }} />
          ))}
        </div>
        {feedback && <AnswerFeedback {...feedback} />}
      </div>
    </div>
  );
};

export default JoinQuiz;
