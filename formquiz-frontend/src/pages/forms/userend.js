import React, { useEffect, useState, useRef } from "react";
import { Button } from '../../components/buttonquiz';
import { supabase } from '../../supabase';
import { CheckCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from 'react-hot-toast';

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
            ans.trim().replace(/\s+/g, ' ').toLowerCase() === userAnswer.text.trim().replace(/\s+/g, ' ').toLowerCase()
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

function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

function getNowIST() {
  // Get current UTC time, then add 5.5 hours for IST
  const now = new Date();
  const istOffset = 330; // IST is UTC+5:30 in minutes
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (istOffset * 60000));
}

// Replace parseISTFromUTCString with parseISTFromISTString
function parseISTFromISTString(istString) {
  // Handles both 'YYYY-MM-DD HH:mm:ss' and 'YYYY-MM-DDTHH:mm:ss'
  if (!istString) return null;
  let datePart, timePart;
  if (istString.includes('T')) {
    [datePart, timePart] = istString.split('T');
  } else if (istString.includes(' ')) {
    [datePart, timePart] = istString.split(' ');
  } else {
    // Unexpected format
    return null;
  }
  if (!datePart || !timePart) return null;
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour = 0, minute = 0, second = 0] = timePart.split(':').map(Number);
  // IST is UTC+5:30, so subtract 5.5 hours to get UTC
  const utcMillis = Date.UTC(year, month - 1, day, hour - 5, minute - 30, second);
  return new Date(utcMillis);
}

// Utility to fetch server time from Supabase
async function fetchServerTime() {
  // Use Supabase RPC to get server time
  const { data, error } = await supabase.rpc('get_server_time');
  if (error || !data) {
    // fallback: use Date.now(), but warn
    console.warn('Failed to fetch server time from Supabase, using local time.');
    return new Date();
  }
  return new Date(data);
}

// Utility to generate a 6-digit alphanumeric code
function generateResultCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function LiveQuizUser() {
  const query = useQuery();
  // Allow joining via either ?quizId=... or ?code=...
  const quizId = query.get("quizId") || query.get("code");
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
  const [quizWindowStatus, setQuizWindowStatus] = useState("open"); // 'open', 'not_started', 'ended'
  const [quizStart, setQuizStart] = useState(null); // Store start_time
  const [quizEnd, setQuizEnd] = useState(null); // Store end_time
  const [isHost, setIsHost] = useState(false); // Store if current user is host
  const [serverNow, setServerNow] = useState(null); // server time
  const [countdown, setCountdown] = useState(null); // seconds left
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [resultCode, setResultCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [codeVerified, setCodeVerified] = useState(false);
  const [showCodePrompt, setShowCodePrompt] = useState(false);
  const [fiveMinWarned, setFiveMinWarned] = useState(false);
  const [oneMinWarned, setOneMinWarned] = useState(false);
  const [resultViewData, setResultViewData] = useState(null); // for result lookup by code
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [anonymousName, setAnonymousName] = useState("");
  const [showQuizUI, setShowQuizUI] = useState(true); // controls if quiz UI is shown after submission
  // Add state for copy-to-clipboard feedback
  const [copied, setCopied] = useState(false);

  // Show error if no quiz code/id is present
  useEffect(() => {
    if (!quizId) {
      setError('Quiz code not found in the link.');
      setLoading(false);
    }
  }, [quizId]);

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
      // Try to fetch by id only if id is a valid UUID
      let quizData = null;
      let _quizError = null;
      if (id && isUUID(id)) {
        const { data, error } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', id)
          .single();
        quizData = data;
        _quizError = error;
      }
      // If not found or not a UUID, try by code
      if ((!quizData || _quizError) && id) {
        const { data, error } = await supabase
          .from('quizzes')
          .select('*')
          .eq('code', id)
          .single();
        quizData = data;
        _quizError = error;
      }
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
      setQuizStart(quizData.start_time ? parseISTFromISTString(quizData.start_time) : null);
      setQuizEnd(quizData.end_time ? parseISTFromISTString(quizData.end_time) : null);
      // Always fetch slides, regardless of timer
      let slidesData, _slidesError;
      ({ data: slidesData, error: _slidesError } = await supabase
        .from('slides')
        .select('*')
        .eq('quiz_id', quizData.id)
        .order('slide_index'));
      if ((!slidesData || slidesData.length === 0) && quizData.code) {
        ({ data: slidesData, error: _slidesError } = await supabase
          .from('slides')
          .select('*')
          .eq('quiz_id', quizData.code)
          .order('slide_index'));
      }
      if (_slidesError || !slidesData || slidesData.length === 0) {
        setError('No slides found for this quiz.');
        setLoading(false);
        return;
      }
      // Prompt for username if not logged in
      const { data: authData } = await supabase.auth.getUser();
      setUser(authData.user);
      // Check if current user is the host (quiz creator)
      let host = false;
      if (authData.user && quizData.user_id && authData.user.id === quizData.user_id) {
        host = true;
      }
      setIsHost(host);
      // Timer access control (after slides are fetched)
      const nowIST = getNowIST();
      const start = quizData.start_time ? parseISTFromISTString(quizData.start_time) : null;
      const end = quizData.end_time ? parseISTFromISTString(quizData.end_time) : null;
      if (host) {
        setQuizWindowStatus("open"); // Host can always access
      } else if (start && nowIST < start) {
        setQuizWindowStatus("not_started");
      } else if (end && nowIST > end) {
        setQuizWindowStatus("ended");
      } else {
        setQuizWindowStatus("open");
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
      if (!authData.user) setShowUserPrompt(true);
    }
    fetchQuizData();
  }, [quizId]);

  // Auto-save answers
  useEffect(() => {
    localStorage.setItem('quizAnswers', JSON.stringify(answers));
  }, [answers]);

  // Remove auto-assign Anonymous and always show prompt before quiz
  // (Remove the useEffect that sets username to 'Anonymous' automatically)

  // Show username prompt for anonymous users before quiz starts
  useEffect(() => {
    async function checkUser() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        setShowUserPrompt(true);
      }
    }
    checkUser();
  }, []);

  // Countdown timer logic
  useEffect(() => {
    if (!quizEnd || !serverNow || submitted) return;
    let timer;
    function updateCountdown() {
      const now = new Date();
      const diff = Math.floor((quizEnd.getTime() - now.getTime()) / 1000);
      setCountdown(diff > 0 ? diff : 0);
      if (diff <= 0) {
        setCountdown(0);
      }
    }
    updateCountdown();
    timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [quizEnd, serverNow, submitted]);

  // 5-min and 1-min warnings: show only once, exactly at 300s and 60s left
  useEffect(() => {
    if (countdown === null || submitted) return;
    if (countdown === 300 && !fiveMinWarned) {
      toast('⚠️ 5 minutes left! Please review and submit.', { icon: '⏰' });
      setFiveMinWarned(true);
    }
    if (countdown === 60 && !oneMinWarned) {
      toast('⏳ 1 minute left! Your quiz will be auto-submitted.', { icon: '⏳' });
      setOneMinWarned(true);
    }
    // Auto-submit at 0 (only once)
    if (countdown === 0 && !submitted && slides.length > 0 && !autoSubmitted) {
      setAutoSubmitted(true);
      handleSubmit(true); // auto-submit
    }
  }, [countdown, submitted, slides.length, fiveMinWarned, oneMinWarned, autoSubmitted]);

  // On submission, generate and save result code in quiz_responses (not quizzes)
  const handleSubmit = async (auto = false) => {
    if (isSubmitting || submitted) return;
    setIsSubmitting(true);
    const validationError = validate();
    if (validationError && !auto) {
      setError(validationError);
      setIsSubmitting(false);
      return;
    }
    setError(null);
    let user_id = null;
    let usernameToSave = '';
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        user_id = user.id;
        usernameToSave = username;
      } else {
        user_id = null;
        usernameToSave = anonymousName || 'Anonymous';
      }
    } catch {
      user_id = null;
      usernameToSave = anonymousName || 'Anonymous';
    }
    // Calculate score before submitting (robust, always correct)
    const score = calculateScore(slides, answers);
    // Generate result code for this response (only once)
    let code = resultCode;
    if (!code) {
      code = generateResultCode();
      setResultCode(code);
    }
    const responseData = {
      quiz_id: quizId || localStorage.getItem('quizId') || null,
      user_id,
      username: usernameToSave,
      answers,
      score, // push the robust score into the DB
      submitted_at: new Date().toISOString(),
      response_id: code,
    };
    if (responseData.quiz_id) {
      const { error: insertError } = await supabase
        .from('quiz_responses')
        .insert([responseData]);
      if (insertError) {
        setError('Failed to submit response: ' + insertError.message);
        setIsSubmitting(false);
        return;
      }
    }
    setSubmitted(true);
    setShowQuizUI(false);
    setIsSubmitting(false);
    if (auto) toast("⏳ Time's up! Your quiz has been auto-submitted.", { icon: '⏳' });
  };

  // After submission, hide score/answers until after end_time and code entry
  const canShowResults = (submitted && quizEnd && new Date() > quizEnd && codeVerified) || (!!resultViewData);

  // After end_time, show code prompt if not verified
  useEffect(() => {
    if ((submitted && quizEnd && new Date() > quizEnd && !codeVerified) || (quizEnd && new Date() > quizEnd && !submitted)) {
      setShowCodePrompt(true);
    }
  }, [submitted, quizEnd, codeVerified]);

  // Disable all inputs if auto-submitted or time is up or after submission
  const inputsDisabled = autoSubmitted || (countdown === 0 && !submitted) || submitted || isSubmitting;

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
                ans => ans.trim().replace(/\s+/g, ' ').toLowerCase() === userAnswer.text.trim().replace(/\s+/g, ' ').toLowerCase()
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

  // Fetch server time and sync every 10s
  useEffect(() => {
    let interval;
    async function syncServerTime() {
      const now = await fetchServerTime();
      setServerNow(now);
    }
    syncServerTime();
    interval = setInterval(syncServerTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // In the main render, update the UI as follows:
  if (error) return <div style={{ color: 'red', padding: 40 }}>{error}</div>;
  if (loading) return <div className="p-4">Loading...</div>;
  if (slides.length === 0) return <div style={{ color: 'red', padding: 40 }}>No slides found for this quiz.</div>;
  // 1. Always show nickname prompt before quiz starts for both anonymous and logged-in users
  if (!hasEnteredName && quizWindowStatus === 'open' && !submitted && showQuizUI) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: customization.background, fontFamily: customization.fontFamily }}>
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold mb-4">Enter your name to join the quiz</h2>
          <input
            className="border border-gray-300 rounded px-4 py-2 w-full mb-4"
            type="text"
            placeholder="Your name (required)"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <button
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 w-full"
            onClick={() => {
              if (username.trim()) setHasEnteredName(true);
            }}
            disabled={!username.trim()}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }
  // 1. Restore strict time window logic for all users
  if (quizWindowStatus === "not_started") {
    return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#b91c1c', fontWeight: 600, textAlign: 'center' }}>
      This quiz is not currently active.<br />
      Please return during the scheduled time:<br />
      {quizStart && quizEnd && `${quizStart.toLocaleString()} – ${quizEnd.toLocaleString()}`}
    </div>;
  }
  // 2. After timer ends, always show result code entry (never blank)
  if (quizWindowStatus === "ended" && !codeVerified && !resultViewData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: customization.background, fontFamily: customization.fontFamily }}>
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4">This quiz has ended.</h2>
          <p className="mb-4">Enter your result code to view your answers and score.</p>
          <input
            className="border border-gray-300 rounded px-4 py-2 w-full mb-4 text-lg"
            type="text"
            placeholder="Enter 6-digit code"
            value={codeInput}
            onChange={e => setCodeInput(e.target.value.toUpperCase())}
            maxLength={6}
          />
          <button
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 w-full font-bold"
            onClick={async () => {
              // Look up quiz_responses by response_id and quiz_id
              const { data: respData } = await supabase
                .from('quiz_responses')
                .select('*')
                .eq('quiz_id', quizId)
                .eq('response_id', codeInput)
                .single();
              if (respData && respData.response_id === codeInput) {
                setResultViewData(respData);
                setCodeVerified(true);
                setShowCodePrompt(false);
              } else {
                toast.error('Invalid code. Please try again.');
              }
            }}
            disabled={codeInput.length !== 6}
          >
            View Results
          </button>
        </div>
      </div>
    );
  }

  // 3. After entering a valid result code, always show the result/score view
  if (codeVerified && resultViewData) {
    // Use resultViewData for answers and score
    const userAnswers = resultViewData.answers;
    const score = resultViewData.score;
    const usernameToShow = resultViewData.username;
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{
        backgroundColor: customization.backgroundImage ? 'transparent' : (customization.background || customization.backgroundColor || '#fff'),
        backgroundImage: customization.backgroundImage ? `url(${customization.backgroundImage})` : undefined,
        backgroundSize: customization.backgroundImage ? 'cover' : undefined,
        backgroundPosition: customization.backgroundImage ? 'center' : undefined,
        backgroundRepeat: customization.backgroundImage ? 'no-repeat' : undefined,
        fontFamily: customization.fontFamily,
        color: customization.textColor
      }}>
        <div className="bg-white shadow-2xl rounded-3xl p-8 max-w-2xl w-full text-center">
          <h2 className="text-4xl font-extrabold mb-6" style={{ color: customization.textColor }}>🎉 Quiz Submitted!</h2>
          <p className="text-xl mb-8" style={{ color: customization.textColor }}>Thank you for submitting your answers{usernameToShow ? `, ${usernameToShow}` : ''}!</p>
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
                  isCorrect = userAnswer && typeof userAnswer.text === 'string' && userAnswer.text.trim() !== '' && correct.some(ans => typeof ans === 'string' && ans.trim().replace(/\s+/g, ' ').toLowerCase() === userAnswer.text.trim().replace(/\s+/g, ' ').toLowerCase());
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
        </div>
      </div>
    );
  }

  // 4. After submission, before end_time OR after end_time (in the same session), always show confirmation/result code screen for both anonymous and logged-in users
  if (submitted) {
    // UX: Thank you, code, copy feature
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: customization.background, fontFamily: customization.fontFamily }}>
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
          <h2 className="text-3xl font-extrabold mb-4 text-green-700">Thank you for participating!</h2>
          <p className="mb-4 text-lg">Your responses have been submitted.</p>
          <div className="mb-4">
            <span className="block text-lg font-semibold mb-2">Your result code:</span>
            <div
              className="text-3xl font-mono font-extrabold bg-yellow-100 text-yellow-800 rounded-lg px-6 py-4 mb-2 tracking-widest border-2 border-yellow-400 shadow-lg select-all inline-flex items-center justify-center cursor-pointer transition hover:bg-yellow-200"
              style={{ userSelect: 'all' }}
              onClick={() => {
                navigator.clipboard.writeText(resultCode);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              title="Click to copy"
            >
              {resultCode}
              <button
                aria-label="Copy code"
                style={{ marginLeft: 12, background: 'none', border: 'none', cursor: 'pointer', outline: 'none' }}
                tabIndex={-1}
                onClick={e => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(resultCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? (
                  <span style={{ color: '#059669', fontWeight: 700, fontSize: 18, marginLeft: 4 }}>✔ Copied!</span>
                ) : (
                  <svg width="20" height="20" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ marginLeft: 4, verticalAlign: 'middle' }}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
                )}
              </button>
            </div>
            <div className="text-gray-600 text-sm mt-2">Save this code to view your responses later.</div>
          </div>
        </div>
      </div>
    );
  }

  // In the main quiz UI, show countdown timer and disable inputs if needed
  if (!showQuizUI) return null;

  return (
    <div className="min-h-screen w-full flex flex-col" style={{
      backgroundColor: customization.backgroundImage ? 'transparent' : (customization.background || customization.backgroundColor || '#fff'),
      backgroundImage: customization.backgroundImage ? `url(${customization.backgroundImage})` : undefined,
      backgroundSize: customization.backgroundImage ? 'cover' : undefined,
      backgroundPosition: customization.backgroundImage ? 'center' : undefined,
      backgroundRepeat: customization.backgroundImage ? 'no-repeat' : undefined,
      fontFamily: customization.fontFamily,
      color: customization.textColor
    }}>
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 shadow-sm border-b bg-white/80 sticky top-0 z-20" style={{ fontFamily: customization.fontFamily }}>
        <button onClick={handleExit} className="text-blue-600 font-bold text-lg hover:underline">Exit Quiz</button>
        <div className="flex items-center gap-4">
          <span className="font-semibold text-base" style={{ color: customization.textColor }}>{user ? user.email : ''}</span>
          <button onClick={handleLoginLogout} className="text-blue-600 font-bold text-lg hover:underline">{user ? 'Logout' : 'Login'}</button>
        </div>
      </div>
      {/* Countdown Timer */}
      {quizEnd && countdown !== null && !submitted && (
        <div className="w-full flex justify-center items-center py-2 bg-yellow-50 text-yellow-800 font-bold text-lg tracking-wide shadow-sm border-b border-yellow-200">
          Time Remaining: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
        </div>
      )}
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
              <Button onClick={() => setQuestionIndex(q => Math.max(0, q - 1))} disabled={isFirst || inputsDisabled} className="px-6 py-2 rounded-lg font-bold text-base bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 transition-all" style={{ opacity: isFirst || inputsDisabled ? 0.5 : 1 }}>Back</Button>
              {isLast ? (
                <Button onClick={() => setShowConfirm(true)} disabled={inputsDisabled} className="px-6 py-2 rounded-lg font-bold text-base bg-blue-600 text-white hover:bg-blue-700 transition-all" style={{ opacity: inputsDisabled ? 0.5 : 1 }}>Submit</Button>
              ) : (
                <Button onClick={() => setQuestionIndex(q => Math.min(totalQuestions - 1, q + 1))} disabled={inputsDisabled} className="px-6 py-2 rounded-lg font-bold text-base bg-blue-600 text-white hover:bg-blue-700 transition-all" style={{ opacity: isLast || inputsDisabled ? 0.5 : 1 }}>Next</Button>
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
