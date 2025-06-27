import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../supabase';
import { useLiveQuiz } from '../../context/LiveQuizContext';
import QuestionTimer from '../../components/quiz/QuestionTimer';
import AnswerFeedback from '../../components/quiz/AnswerFeedback';
import Leaderboard from '../live/Leaderboard';

const JoinQuiz = () => {
  const { quizId } = useParams();
  const { quizState, setQuizState } = useLiveQuiz();
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [finished, setFinished] = useState(false);

  // Fetch quiz and questions, and subscribe to real-time updates
  useEffect(() => {
    const fetchQuiz = async () => {
      setLoading(true);
      setError(null);
      // Fetch live quiz state
      const { data: liveQuiz, error: liveQuizError } = await supabase
        .from('live_quizzes')
        .select('*')
        .eq('quiz_id', quizId)
        .single();
      if (liveQuizError || !liveQuiz) {
        setError('Quiz not found or not live.');
        setLoading(false);
        setQuestions([]);
        return;
      }
      setQuizState({
        ...quizState,
        isLive: liveQuiz.is_live,
        currentQuestionIndex: liveQuiz.current_question_index,
        quizId: quizId,
      });
      if (!liveQuiz.is_live) {
        setError('This quiz is not currently live.');
        setLoading(false);
        setQuestions([]);
        return;
      }
      // Fetch questions/slides
      const { data: qData, error: qError } = await supabase
        .from('slides')
        .select('*')
        .eq('quiz_id', quizId)
        .order('slide_index');
      if (qError || !Array.isArray(qData) || qData.length === 0) {
        setError('No questions found for this quiz.');
        setQuestions([]);
      } else {
        setQuestions(qData);
      }
      setLoading(false);
    };
    fetchQuiz();

    // Subscribe to real-time updates for live_quizzes
    const channel = supabase
      .channel('live-quiz-' + quizId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_quizzes', filter: `quiz_id=eq.${quizId}` }, fetchQuiz)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line
  }, [quizId, setQuizState, retryCount]);

  // Update current question
  useEffect(() => {
    if (questions && questions.length && quizState.currentQuestionIndex != null) {
      setCurrentQuestion(questions[quizState.currentQuestionIndex]);
      setSelectedOption(null);
      setFeedback(null);
      setIsLocked(false);
      setSubmitted(false);
    }
  }, [questions, quizState.currentQuestionIndex]);

  // Handle answer submission
  const handleSubmit = async () => {
    if (selectedOption == null || isLocked || submitted || !username.trim()) return;
    setIsLocked(true);
    setSubmitted(true);
    if (!currentQuestion) return;
    // Save response to DB
    const { error: submitError } = await supabase.from('live_responses').insert([
      {
        quiz_id: quizId,
        question_id: currentQuestion.id,
        selected_option: selectedOption,
        user_id: null, // Optionally use auth
        username: username.trim() || 'Anonymous',
        submitted_at: new Date().toISOString(),
      },
    ]);
    if (submitError) {
      setFeedback({
        isCorrect: false,
        correctAnswer: currentQuestion.options?.[currentQuestion.correct_answer_index],
        feedbackText: 'Failed to submit answer. Please try again.',
      });
      return;
    }
    // Show feedback
    const isCorrect = selectedOption === currentQuestion.correct_answer_index;
    setFeedback({
      isCorrect,
      correctAnswer: currentQuestion.options?.[currentQuestion.correct_answer_index],
      feedbackText: isCorrect ? 'Great job!' : 'Better luck next time!',
    });
    // If last question, show leaderboard
    if (quizState.currentQuestionIndex >= questions.length - 1) {
      setTimeout(() => setFinished(true), 1200);
    }
  };

  // Timer expire handler
  const handleTimerExpire = () => {
    setIsLocked(true);
    if (!submitted) handleSubmit();
  };

  if (loading) return <div>Loading quiz...</div>;
  if (error) return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>
      <button onClick={() => setRetryCount(c => c + 1)} style={{ padding: '8px 20px', borderRadius: 8, background: '#4a6bff', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Retry</button>
    </div>
  );
  if (finished) return <Leaderboard />;
  if (!currentQuestion) return <div>No active question at the moment.</div>;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #e0e7ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(60,60,100,0.10), 0 1.5px 6px rgba(0,0,0,0.03)', padding: '38px 28px 32px 28px', minWidth: 320, maxWidth: 520, width: '100%', margin: '0 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', transition: 'box-shadow 0.2s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: 18 }}>
          <div style={{ fontWeight: 800, fontSize: 28, color: '#2563eb', letterSpacing: '-1px' }}>Quiz Arena</div>
          <div style={{ fontWeight: 500, color: '#888', fontSize: 17 }}>Q{quizState.currentQuestionIndex + 1} / {questions.length}</div>
        </div>
        <div style={{ margin: '18px 0', width: '100%' }}>
          <label htmlFor="username" style={{ fontWeight: 600, fontSize: 16 }}>Your Name:</label>
          <input id="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your name" style={{ padding: 10, borderRadius: 8, border: '1.5px solid #c7d2fe', marginLeft: 12, fontSize: 16, width: 180 }} maxLength={32} />
        </div>
        <div style={{ color: '#23272f', fontWeight: 700, fontSize: 22, margin: '0 0 18px 0', textAlign: 'center', letterSpacing: '-0.5px' }}>{currentQuestion.question}</div>
        <div style={{ width: '100%', marginTop: 8 }}>
          {(currentQuestion.options || []).map((opt, idx) => (
            <button
              key={idx}
              disabled={isLocked || submitted || !username.trim()}
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
                cursor: isLocked || submitted || !username.trim() ? 'not-allowed' : 'pointer',
                outline: selectedOption === idx ? '2px solid #a5b4fc' : 'none',
                transition: 'all 0.18s',
              }}
              onClick={() => setSelectedOption(idx)}
            >
              {opt}
            </button>
          ))}
        </div>
        <QuestionTimer seconds={20} onExpire={handleTimerExpire} isLocked={isLocked} />
        <button
          onClick={handleSubmit}
          disabled={isLocked || submitted || selectedOption == null || !username.trim()}
          style={{ marginTop: 16, padding: '10px 24px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 700, fontSize: 17, cursor: isLocked || submitted || !username.trim() ? 'not-allowed' : 'pointer', opacity: isLocked || submitted || !username.trim() ? 0.7 : 1 }}
        >
          Submit Answer
        </button>
        {/* Section grid for progress */}
        <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
          {questions.map((_, idx) => (
            <div key={idx} style={{ width: 22, height: 22, borderRadius: 4, background: idx === quizState.currentQuestionIndex ? '#2563eb' : '#e0e7ff', border: idx === quizState.currentQuestionIndex ? '2px solid #2563eb' : '1.5px solid #c7d2fe', display: 'inline-block', margin: 2 }} />
          ))}
        </div>
        {feedback && <AnswerFeedback {...feedback} />}
      </div>
    </div>
  );
};

export default JoinQuiz;
