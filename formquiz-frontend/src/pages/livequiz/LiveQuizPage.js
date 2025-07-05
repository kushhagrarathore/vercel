

import { useParams } from 'react-router-dom';
import { supabase } from '../../supabase';
import { useLiveQuiz } from '../../components/livequiz/LiveQuizContext';
import QuestionTimer from '../../components/quiz/QuestionTimer';
import AnswerFeedback from '../../components/quiz/AnswerFeedback';
import Leaderboard from './Leaderboard';


const LiveQuizPage = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { quizState, setQuizState } = useLiveQuiz();
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [error, setError] = useState(null);

  // Fetch quiz state and questions
  useEffect(() => {
    const fetchQuiz = async () => {
      setLoading(true);
      setError(null);
      // Fetch live quiz state
      const { data: liveQuiz, error: liveQuizError } = await supabase
        .from('lq_quizzes')
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lq_quizzes', filter: `quiz_id=eq.${quizId}` }, fetchQuiz)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line
  }, [quizId, setQuizState]);

  // Update current question
  useEffect(() => {
    if (questions && questions.length && quizState.currentQuestionIndex != null) {
      setCurrentQuestion(questions[quizState.currentQuestionIndex]);
      setSelectedOption(null);
      setFeedback(null);
      setIsLocked(false);
      setSubmitted(false);
      setShowLeaderboard(false);
    }
  }, [questions, quizState.currentQuestionIndex]);

  // Handle answer submission
  const handleSubmit = async () => {
    if (selectedOption == null || isLocked || submitted) return;
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
        username: 'Anonymous', // Optionally get from context or input
        submitted_at: new Date().toISOString(),
      },
    ]);
    if (submitError) {
      setFeedback({
        isCorrect: false,
        correctAnswer: currentQuestion.options?.[currentQuestion.correct_answer_index],
        feedbackText: 'Failed to submit answer. Please try again.',
      });
      setShowLeaderboard(true);
      return;
    }
    // Show feedback
    const isCorrect = selectedOption === currentQuestion.correct_answer_index;
    setFeedback({
      isCorrect,
      correctAnswer: currentQuestion.options?.[currentQuestion.correct_answer_index],
      feedbackText: isCorrect ? 'Great job!' : 'Better luck next time!',
    });
    setShowLeaderboard(true);
  };

  // Timer expire handler
  const handleTimerExpire = () => {
    setIsLocked(true);
    if (!submitted) handleSubmit();
    setShowLeaderboard(true);
  };

  if (loading) return <div>Loading quiz...</div>;
  if (error) return <div style={{ color: 'red', padding: 24 }}>{error}</div>;
  if (!currentQuestion) return <div>No active question at the moment.</div>;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <button
        onClick={() => navigate('/dashboard')}
        style={{ marginBottom: 18, padding: '8px 18px', borderRadius: 8, background: '#7c3aed', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 15 }}
      >
        ← Back to Dashboard
      </button>
      <h2>Live Quiz</h2>
      <div style={{ marginBottom: 16 }}>
        <b>Question {quizState.currentQuestionIndex + 1}:</b> {currentQuestion.question}
      </div>
      <div>
        {(currentQuestion.options || []).map((opt, idx) => (
          <button
            key={idx}
            disabled={isLocked || submitted}
            style={{
              display: 'block',
              width: '100%',
              margin: '8px 0',
              padding: 12,
              borderRadius: 8,
              background: selectedOption === idx ? '#4a6bff' : '#f3f4f6',
              color: selectedOption === idx ? '#fff' : '#222',
              border: '1px solid #e5e7eb',
              cursor: isLocked || submitted ? 'not-allowed' : 'pointer',
              fontWeight: 600,
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
        disabled={isLocked || submitted || selectedOption == null}
        style={{ marginTop: 16, padding: '10px 24px', borderRadius: 8, background: '#4a6bff', color: '#fff', border: 'none', fontWeight: 700, cursor: isLocked || submitted ? 'not-allowed' : 'pointer' }}
      >
        Submit Answer
      </button>
      {feedback && <AnswerFeedback {...feedback} />}
      {showLeaderboard && <Leaderboard />}
    </div>
  );
};

export default LiveQuizPage; 