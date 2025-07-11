import React, { useEffect, useState, useRef } from "react";
import { Button } from '../../components/buttonquiz';
import { supabase } from '../../supabase';
import { CheckCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

// Fisher-Yates shuffle algorithm
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function calculateScore(slides, userAnswers) {
  let score = 0;
  slides.forEach((slide, idx) => {
    const correct = Array.isArray(slide.correct_answers) ? slide.correct_answers : [];
    const userAnswer = userAnswers[idx];
    let isCorrect = false;
    if (slide.type === 'multiple' || slide.type === 'true_false') {
      isCorrect = (
        userAnswer &&
        typeof userAnswer.selectedIndex === 'number' &&
        correct.includes(userAnswer.selectedIndex)
      );
    } else if (slide.type === 'one_word') {
      isCorrect = (
        userAnswer &&
        typeof userAnswer.text === 'string' &&
        userAnswer.text.trim() !== '' &&
        correct.some(
          ans =>
            typeof ans === 'string' &&
            ans.trim().toLowerCase() === userAnswer.text.trim().toLowerCase()
        )
      );
    }
    console.log(`Slide ${idx + 1}:`, { correct, userAnswer, isCorrect });
    if (isCorrect) score++;
  });
  console.log('Final calculated score:', score);
  return score;
}

// Enhanced Results UI CSS
const resultsStyles = `
.results-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.result-card {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(44,62,80,0.08);
  padding: 18px 22px;
  border: 1px solid #e5e7eb;
}
.question-text {
  font-weight: 600;
  margin-bottom: 8px;
  color: #23272f;
  font-size: 1.1rem;
}
.q-number {
  color: #4a6bff;
  font-weight: 700;
  margin-right: 6px;
}
.options-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 6px;
}
.option {
  padding: 6px 14px;
  border-radius: 8px;
  background: #f3f4f6;
  color: #23272f;
  font-size: 1rem;
  margin-bottom: 2px;
  border: 1px solid transparent;
  transition: background 0.2s, color 0.2s;
}
.option.correct {
  background: #d1fae5;
  color: #059669;
  border-color: #059669;
  font-weight: 700;
}
.option.wrong {
  background: #fee2e2;
  color: #b91c1c;
  border-color: #b91c1c;
  font-weight: 700;
}
.option.correct-answer {
  background: #fef9c3;
  color: #b45309;
  border-color: #b45309;
  font-weight: 700;
}
.your-answer {
  font-weight: 500;
  margin-top: 6px;
}
.your-answer .correct {
  color: #059669;
}
.your-answer .wrong {
  color: #b91c1c;
}
.correct-answer {
  margin-top: 4px;
  color: #059669;
  font-weight: 500;
}
`;
if (typeof document !== 'undefined' && !document.getElementById('results-enhanced-css')) {
  const style = document.createElement('style');
  style.id = 'results-enhanced-css';
  style.innerHTML = resultsStyles;
  document.head.appendChild(style);
}

export default function LiveQuizUser() {
  const query = useQuery();
  const quizId = query.get("quizId");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [slides, setSlides] = useState([]);
  const [quizTitle, setQuizTitle] = useState("Quiz");
  const [answers, setAnswers] = useState([]); // [{type, selectedIndex/text}]
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [customization, setCustomization] = useState({ fontFamily: 'Inter, Arial, sans-serif', textColor: '#23272f', background: '#fff' });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [allResponses, setAllResponses] = useState([]);
  const [username, setUsername] = useState("");
  const [hasEnteredName, setHasEnteredName] = useState(false);
  const [showUserPrompt, setShowUserPrompt] = useState(false);

  // Fetch slides and customization from Supabase
  useEffect(() => {
    async function fetchQuizData() {
      setLoading(true);
      let id = quizId || localStorage.getItem('quizId');
      if (!id) {
        setError('Quiz ID not found.');
        setLoading(false);
        return;
      }
      // Fetch quiz record for customization
      const { data: quizData, error: _quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', id)
        .single();
      if (_quizError || !quizData) {
        setError('Quiz not found.');
        setLoading(false);
        return;
      }
      setQuizTitle(quizData.title || 'Quiz');
      if (quizData.customization_settings) {
        let custom = quizData.customization_settings;
        if (typeof custom === 'string') {
          try {
            custom = JSON.parse(custom);
          } catch (e) {
            custom = {};
          }
        }
        setCustomization(custom);
      }
      // Fetch slides
      const { data: slidesData, error: _slidesError } = await supabase
        .from('slides')
        .select('*')
        .eq('quiz_id', id)
        .order('slide_index');
      if (_slidesError || !slidesData || slidesData.length === 0) {
        setError('No slides found for this quiz.');
        setLoading(false);
        return;
      }
      // Shuffle the slides for random order
      const shuffledSlides = shuffleArray(slidesData);
      setSlides(shuffledSlides);
      setAnswers(shuffledSlides.map(q => {
        if (q.type === 'multiple') return { type: 'multiple', selectedIndex: null };
        if (q.type === 'true_false') return { type: 'true_false', selectedIndex: null };
        if (q.type === 'one_word') return { type: 'one_word', text: '' };
        return { type: q.type };
      }));
      setLoading(false);
      // Prompt for username if not logged in
      supabase.auth.getUser().then(({ data }) => {
        setUser(data.user);
        // Do not prompt for login; allow anonymous access
      });
    }
    fetchQuizData();
  }, [quizId]);

  // Auto-save answers
  useEffect(() => {
    localStorage.setItem('quizAnswers', JSON.stringify(answers));
  }, [answers]);

  const currentQuestion = slides[questionIndex];
  const totalQuestions = slides.length;
  const isFirst = questionIndex === 0;
  const isLast = questionIndex === totalQuestions - 1;

  // Animate transitions
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.classList.remove('fadein');
      void containerRef.current.offsetWidth;
      containerRef.current.classList.add('fadein');
    }
  }, [questionIndex]);

  // Handle answer selection/input
  const handleAnswer = (value) => {
    setAnswers(prev => prev.map((a, i) => i === questionIndex ? { ...a, ...value } : a));
  };

  // Validation
  const validate = () => {
    for (let i = 0; i < slides.length; i++) {
      const q = slides[i];
      const a = answers[i];
      if (q.required) {
        if ((a.type === 'multiple' || a.type === 'true_false') && (a.selectedIndex === null || a.selectedIndex === undefined)) {
          return `Please answer question ${i + 1}`;
        }
        if (a.type === 'one_word' && (!a.text || a.text.trim() === '')) {
          return `Please answer question ${i + 1}`;
        }
      }
    }
    return null;
  };

  // Submit answers to Supabase
  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    let user_id = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      user_id = user?.id || null;
    } catch {}
    // Calculate score before submitting (robust, always correct)
    const score = calculateScore(slides, answers);
    const responseData = {
      quiz_id: quizId || localStorage.getItem('quizId') || null,
      user_id,
      username: username,
      answers,
      score, // push the robust score into the DB
      submitted_at: new Date().toISOString(),
    };
    if (responseData.quiz_id) {
      const { error: insertError } = await supabase
        .from('quiz_responses')
        .insert([responseData]);
      if (insertError) {
        setError('Failed to submit response: ' + insertError.message);
        return;
      }
    }
    setSubmitted(true);
  };

  // Top bar actions
  const handleExit = () => navigate('/dashboard');
  const handleLoginLogout = async () => {
    if (user) {
      await supabase.auth.signOut();
      setUser(null);
    } else {
      navigate('/login');
    }
  };

  // Render input based on type
  const renderInput = () => {
    if (!currentQuestion) return null;
    if (currentQuestion.type === 'multiple') {
      return (
        <div className="flex flex-col gap-3 mt-6">
          {currentQuestion.options.map((opt, i) => {
            const isSelected = answers[questionIndex]?.selectedIndex === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleAnswer({ selectedIndex: i })}
                className={`transition-all border-2 rounded-lg px-5 py-3 text-lg flex items-center justify-between shadow-sm hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-blue-400 ${isSelected ? 'border-blue-600 bg-blue-50 font-bold text-blue-900' : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'}`}
                style={{ fontFamily: customization.fontFamily }}
              >
                {opt}
                {isSelected && <CheckCircle className="w-5 h-5 text-blue-600 ml-2" />}
              </button>
            );
          })}
        </div>
      );
    } else if (currentQuestion.type === 'true_false') {
      return (
        <div className="flex flex-col gap-3 mt-6">
          {["True", "False"].map((opt, i) => {
            const isSelected = answers[questionIndex]?.selectedIndex === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleAnswer({ selectedIndex: i })}
                className={`transition-all border-2 rounded-lg px-5 py-3 text-lg flex items-center justify-between shadow-sm hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-blue-400 ${isSelected ? 'border-blue-600 bg-blue-50 font-bold text-blue-900' : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'}`}
                style={{ fontFamily: customization.fontFamily }}
              >
                {opt}
                {isSelected && <CheckCircle className="w-5 h-5 text-blue-600 ml-2" />}
              </button>
            );
          })}
        </div>
      );
    } else if (currentQuestion.type === 'one_word') {
      return (
        <input
          type="text"
          value={answers[questionIndex]?.text || ''}
          onChange={e => handleAnswer({ text: e.target.value })}
          className="w-full border-2 rounded-lg px-4 py-3 mt-6 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
          style={{ fontFamily: customization.fontFamily, color: customization.textColor }}
          placeholder="Type your answer..."
        />
      );
    } else {
      return <div>Unsupported question type</div>;
    }
  };

  // Question overview panel
  const renderOverview = () => (
    <div className="h-full flex flex-col items-center py-8 px-2">
      <div className="font-bold text-lg mb-4" style={{ fontFamily: customization.fontFamily, color: customization.textColor }}>
        Questions
      </div>
      <div className="grid grid-cols-2 md:grid-cols-1 gap-3 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-blue-50" style={{ maxHeight: '70vh', minWidth: 70 }}>
        {slides.map((q, idx) => {
          const answered = q.type === 'one_word' ? (answers[idx]?.text && answers[idx].text.trim() !== '') : (answers[idx]?.selectedIndex !== null && answers[idx]?.selectedIndex !== undefined);
          return (
            <button
              key={q.id || idx}
              type="button"
              onClick={() => setQuestionIndex(idx)}
              className={`transition-all rounded-lg px-0 py-3 w-16 font-semibold shadow-md border-2 text-center text-base hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 ${questionIndex === idx ? 'border-blue-600 bg-blue-50 text-blue-900' : answered ? 'border-green-500 bg-green-50 text-green-800' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
              style={{ fontFamily: customization.fontFamily }}
            >
              Q{idx + 1}
            </button>
          );
        })}
      </div>
    </div>
  );

  // Confirmation dialog
  const renderConfirmDialog = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center" style={{ fontFamily: customization.fontFamily }}>
        <h2 className="text-2xl font-bold mb-4">Submit Quiz?</h2>
        <p className="mb-6">Are you sure you want to submit your answers? You won't be able to change them after this.</p>
        <div className="flex justify-center gap-4">
          <button onClick={() => { setShowConfirm(false); handleSubmit(); }} className="bg-blue-600 text-white font-bold px-6 py-2 rounded">Submit</button>
          <button onClick={() => setShowConfirm(false)} className="bg-gray-100 text-gray-800 font-bold px-6 py-2 rounded border">Cancel</button>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    if (!submitted) return;
    async function fetchScores() {
      // Fetch all responses for this quiz
      const { data: responsesData } = await supabase
        .from('quiz_responses')
        .select('*')
        .eq('quiz_id', quizId);

      // Fetch slides for correct answers
      const { data: slidesData } = await supabase
        .from('slides')
        .select('*')
        .eq('quiz_id', quizId);

      // Safeguard: Only map if both are arrays
      if (!Array.isArray(responsesData) || !Array.isArray(slidesData)) {
        setAllResponses([]);
        return;
      }

      // Calculate scores
      const scores = responsesData.map(resp => {
        let score = 0;
        slidesData.forEach((slide, idx) => {
          const userAnswer = resp.answers[idx];
          // Debug logging
          console.log(
            `Scoring Slide ${idx + 1}`,
            'correct_answers:', JSON.stringify(slide.correct_answers),
            'userAnswer:', JSON.stringify(userAnswer),
            'slideType:', slide.type
          );
          if (slide.type === 'multiple' || slide.type === 'true_false') {
            // Only award if user actually answered and answer is correct
            if (
              userAnswer &&
              typeof userAnswer.selectedIndex === 'number' &&
              Array.isArray(slide.correct_answers) &&
              slide.correct_answers.includes(userAnswer.selectedIndex)
            ) {
              score++;
            }
          } else if (slide.type === 'one_word') {
            // Only award if user actually answered and answer is correct
            if (
              userAnswer &&
              typeof userAnswer.text === 'string' &&
              userAnswer.text.trim() !== '' &&
              Array.isArray(slide.correct_answers) &&
              slide.correct_answers.some(
                ans => ans.trim().toLowerCase() === userAnswer.text.trim().toLowerCase()
              )
            ) {
              score++;
            }
          }
        });
        return {
          user: resp.user_id,
          score,
        };
      });
      setAllResponses(responsesData);
    }
    fetchScores();
  }, [submitted, quizId]);

  if (error) return <div style={{ color: 'red', padding: 40 }}>{error}</div>;
  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!loading && slides.length === 0) return <div style={{ color: 'red', padding: 40 }}>No slides found for this quiz.</div>;
  if (!currentQuestion && !submitted) return <div className="p-4">Loading...</div>;

  if (showUserPrompt && !submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: customization.background, fontFamily: customization.fontFamily }}>
        <div className="bg-white shadow-2xl rounded-3xl p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-6" style={{ color: customization.textColor }}>Enter Username or Login</h2>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Enter your username"
            className="w-full border-2 rounded-lg px-4 py-3 mb-4 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
            style={{ fontFamily: customization.fontFamily, color: customization.textColor }}
          />
          <div className="flex flex-col gap-2">
            <Button
              className="bg-blue-600 text-white font-bold px-8 py-3 rounded-lg"
              onClick={() => {
                if (username.trim() !== "") setShowUserPrompt(false);
              }}
              disabled={username.trim() === ""}
            >
              Continue as Guest
            </Button>
            <Button
              className="bg-gray-100 text-blue-700 font-bold px-8 py-3 rounded-lg border border-blue-600"
              onClick={() => navigate('/login')}
            >
              Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!hasEnteredName && !submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: customization.background, fontFamily: customization.fontFamily, color: customization.textColor }}>
        <div className="bg-white shadow-2xl rounded-3xl p-8 max-w-md w-full text-center" style={{ fontFamily: customization.fontFamily, color: customization.textColor }}>
          <h2 className="text-2xl font-bold mb-6" style={{ color: customization.textColor }}>Enter Your Name to Start</h2>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Enter your name"
            className="w-full border-2 rounded-lg px-4 py-3 mb-4 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
            style={{ fontFamily: customization.fontFamily, color: customization.textColor, background: customization.background, borderColor: customization.textColor, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          />
          <div className="flex flex-col gap-2">
            <Button
              className="bg-blue-600 text-white font-bold px-8 py-3 rounded-lg"
              style={{ fontFamily: customization.fontFamily, background: customization.textColor, color: customization.background, borderColor: customization.textColor }}
              onClick={() => {
                if (username.trim() !== "") setHasEnteredName(true);
              }}
              disabled={username.trim() === ""}
            >
              Start Quiz
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (submitted)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: customization.background, fontFamily: customization.fontFamily }}>
        <div className="bg-white shadow-2xl rounded-3xl p-8 max-w-2xl w-full text-center">
          <h2 className="text-4xl font-extrabold mb-6" style={{ color: customization.textColor }}>🎉 Quiz Submitted!</h2>
          <p className="text-xl mb-8" style={{ color: customization.textColor }}>Thank you for submitting your answers!</p>
          {/* Show only the current user's score, fallback to latest response for this username if anonymous */}
          {allResponses.length > 0 ? (
            (() => {
              let userAnswers = [];
              if (user && user.id) {
                // Find the latest response for this user_id
                const found = allResponses
                  .filter(u => u.user_id === user.id)
                  .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))[0];
                if (found) userAnswers = found.answers;
              } else if (username) {
                // Find the latest response for this username
                const foundResp = allResponses
                  .filter(r => r.username === username)
                  .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))[0];
                if (foundResp) userAnswers = foundResp.answers;
              } else {
                // fallback: show the last submitted answers
                const lastResp = allResponses[allResponses.length - 1];
                userAnswers = lastResp?.answers ?? [];
              }
              const score = calculateScore(slides, userAnswers);
              return (
                <>
                  <h3 className="text-2xl font-bold mb-4">Your Score</h3>
                  <div className="text-3xl font-extrabold mb-6" style={{ color: customization.textColor }}>
                    {score} / {slides.length}
                  </div>
                  <div className="text-left max-w-xl mx-auto mt-8">
                    <h4 className="text-xl font-bold mb-4" style={{ color: customization.textColor }}>Your Responses</h4>
                    <ol className="results-list">
                      {slides.map((slide, idx) => {
                        const userAnswer = userAnswers[idx];
                        let answerDisplay = '';
                        let isCorrect = false;
                        let correctDisplay = '';
                        const correct = Array.isArray(slide.correct_answers) ? slide.correct_answers : [];
                        if (slide.type === 'multiple' || slide.type === 'true_false') {
                          if (typeof userAnswer?.selectedIndex === 'number' && slide.options && slide.options[userAnswer.selectedIndex] !== undefined) {
                            answerDisplay = slide.options[userAnswer.selectedIndex];
                          } else {
                            answerDisplay = 'No answer';
                          }
                          isCorrect = userAnswer && typeof userAnswer.selectedIndex === 'number' && correct.includes(userAnswer.selectedIndex);
                          if (!isCorrect && correct.length > 0 && slide.options) {
                            correctDisplay = correct.map(i => slide.options[i]).join(', ');
                          }
                        } else if (slide.type === 'one_word') {
                          answerDisplay = userAnswer?.text ? userAnswer.text : 'No answer';
                          isCorrect = userAnswer && typeof userAnswer.text === 'string' && userAnswer.text.trim() !== '' && correct.some(ans => typeof ans === 'string' && ans.trim().toLowerCase() === userAnswer.text.trim().toLowerCase());
                          if (!isCorrect && correct.length > 0) {
                            correctDisplay = correct.join(', ');
                          }
                        } else {
                          answerDisplay = 'No answer';
                        }
                        return (
                          <li key={slide.id || idx} className="result-card">
                            <div className="question-text"><span className="q-number">Q{idx + 1}:</span> {slide.question}</div>
                            {slide.options && (slide.type === 'multiple' || slide.type === 'true_false') && (
                              <div className="options-list">
                                {slide.options.map((opt, i) => (
                                  <div
                                    key={i}
                                    className={
                                      'option' +
                                      (userAnswer?.selectedIndex === i ? (isCorrect ? ' correct' : ' wrong') : '') +
                                      (correct.includes(i) && !isCorrect ? ' correct-answer' : '')
                                    }
                                  >
                                    {opt}
                                    {userAnswer?.selectedIndex === i && (isCorrect ? ' ✔️' : ' ❌')}
                                    {correct.includes(i) && !isCorrect && ' ✓'}
                                  </div>
                                ))}
                              </div>
                            )}
                            {slide.type === 'one_word' && (
                              <div>
                                <span className="your-answer">
                                  Your Answer: <span className={isCorrect ? 'correct' : 'wrong'}>{answerDisplay} {isCorrect ? '✔️' : '❌'}</span>
                                </span>
                                {!isCorrect && correctDisplay && (
                                  <div className="correct-answer">
                                    Correct Answer: <span>{correctDisplay}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                </>
              );
            })()
          ) : (
            <div className="text-lg mb-6" style={{ color: customization.textColor }}>
              Your score will appear here after submission.
            </div>
          )}
        </div>
      </div>
    );

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ background: customization.background || customization.backgroundColor || '#fff', fontFamily: customization.fontFamily, color: customization.textColor }}>
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 shadow-sm border-b bg-white/80 sticky top-0 z-20" style={{ fontFamily: customization.fontFamily }}>
        <button onClick={handleExit} className="text-blue-600 font-bold text-lg hover:underline">Exit Quiz</button>
        <div className="flex items-center gap-4">
          <span className="font-semibold text-base" style={{ color: customization.textColor }}>{user ? user.email : ''}</span>
          <button onClick={handleLoginLogout} className="text-blue-600 font-bold text-lg hover:underline">{user ? 'Logout' : 'Login'}</button>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex flex-1 w-full h-full min-h-0">
        {/* Left: Question Area */}
        <div className="w-full md:w-7/10 lg:w-7/10 xl:w-7/10 flex flex-col items-center justify-center px-4 py-8 transition-all duration-300" ref={containerRef} style={{ minHeight: '70vh' }}>
          <div className="w-full max-w-2xl mx-auto bg-white/90 rounded-2xl shadow-xl p-8 transition-all duration-300" style={{ fontFamily: customization.fontFamily, color: customization.textColor }}>
            <div className="flex justify-between items-center mb-4">
              <div className="text-base font-semibold opacity-80">Question {questionIndex + 1} of {totalQuestions}</div>
              <div className="text-base font-semibold opacity-80">{quizTitle}</div>
            </div>
            <div className="text-2xl font-bold mb-6" style={{ color: customization.textColor, fontFamily: customization.fontFamily, minHeight: 48, transition: 'color 0.2s' }}>
              {currentQuestion?.question}
            </div>
            {renderInput()}
            {error && <div className="text-red-600 font-semibold mt-4">{error}</div>}
            <div className="flex justify-between mt-10 gap-4">
              <Button onClick={() => setQuestionIndex(q => Math.max(0, q - 1))} disabled={isFirst} className="px-6 py-2 rounded-lg font-bold text-base bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 transition-all" style={{ opacity: isFirst ? 0.5 : 1 }}>Back</Button>
              {isLast ? (
                <Button onClick={() => setShowConfirm(true)} className="px-6 py-2 rounded-lg font-bold text-base bg-blue-600 text-white hover:bg-blue-700 transition-all">Submit</Button>
              ) : (
                <Button onClick={() => setQuestionIndex(q => Math.min(totalQuestions - 1, q + 1))} className="px-6 py-2 rounded-lg font-bold text-base bg-blue-600 text-white hover:bg-blue-700 transition-all" style={{ opacity: isLast ? 0.5 : 1 }}>Next</Button>
              )}
            </div>
          </div>
        </div>
        {/* Right: Overview Panel */}
        <div className="hidden md:flex md:w-3/10 lg:w-3/10 xl:w-3/10 border-l bg-white/80 shadow-inner min-h-0">
          {renderOverview()}
        </div>
      </div>
      {showConfirm && renderConfirmDialog()}
      <style>{`
        .fadein { animation: fadein 0.4s; }
        @keyframes fadein { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        @media (max-width: 900px) {
          .md\:w-7\/10 { width: 100% !important; }
          .md\:flex { display: none !important; }
        }
      `}</style>
    </div>
  );
}

// Vercel note: If you want to allow warnings in build, set CI=false in your Vercel project environment variables.
