import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import TimerBar from '../components/quiz/TimerBar';
import './CreateQuizPage.css';
import Spinner from '../components/Spinner';
import { useToast } from '../components/Toast';

const cardVariants = {
  initial: { opacity: 0, y: 40, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -40, scale: 0.98, transition: { duration: 0.3 } },
};

const PreviewQuizPage = () => {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [slides, setSlides] = useState([]);
  const [current, setCurrent] = useState(0);
  const [timer, setTimer] = useState(0);
  const [progress, setProgress] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [selected, setSelected] = useState(null);
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    setError(null);
    if (quizId === 'preview') {
      // Load from localStorage
      const draft = localStorage.getItem('quizPreview');
      if (draft) {
        try {
          const { slides, globalSettings, quizTitle } = JSON.parse(draft);
          setQuiz({ title: quizTitle, customization_settings: globalSettings });
          setSlides(Array.isArray(slides) ? slides : []);
          setTimer(slides?.[0]?.timer || 20);
          setProgress(1);
        } catch (err) {
          setError('Failed to load preview data.');
        }
      } else {
        setError('No preview data found.');
      }
      setLoading(false);
    } else {
      // Load from Supabase
      (async () => {
        try {
          const { data: quizData, error: quizError } = await import('../supabase').then(m => m.supabase)
            .then(supabase => supabase.from('quizzes').select('*').eq('id', quizId).single());
          if (quizError || !quizData) {
            setError('Quiz not found.');
            setLoading(false);
            return;
          }
          setQuiz(quizData);
          const { data: slidesData, error: slidesError } = await import('../supabase').then(m => m.supabase)
            .then(supabase => supabase.from('slides').select('*').eq('quiz_id', quizId).order('slide_index'));
          if (slidesError || !Array.isArray(slidesData) || slidesData.length === 0) {
            setError('No slides found for this quiz.');
            setSlides([]);
            setLoading(false);
            return;
          }
          setSlides(slidesData);
          setTimer(slidesData?.[0]?.timer || 20);
          setProgress(1);
        } catch (err) {
          setError('Failed to load quiz. Please check your connection.');
        } finally {
          setLoading(false);
        }
      })();
    }
    // eslint-disable-next-line
  }, [quizId, toast, retryCount]);

  useEffect(() => {
    if (!slides.length) return;
    setTimer(slides?.[current]?.timer || 20);
    setProgress(1);
    setSubmitted(false);
    setSelected(null);
    // Timer countdown
    const interval = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        setProgress((t - 1) / (slides?.[current]?.timer || 20));
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [current, slides]);

  const handleAnswer = idx => {
    setSelected(idx);
    setSubmitted(true);
    setTimeout(() => {
      if (current < slides.length - 1) setCurrent(current + 1);
    }, 1200);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spinner size={40} /></div>;
  if (error) return (
    <div style={{ padding: 40, color: 'red', textAlign: 'center' }}>
      <div style={{ marginBottom: 16 }}>{error}</div>
      <button onClick={() => setRetryCount(c => c + 1)} style={{ padding: '8px 20px', borderRadius: 8, background: '#4a6bff', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', marginRight: 12 }}>Retry</button>
      <button onClick={() => navigate('/dashboard')} style={{ padding: '8px 20px', borderRadius: 8, background: '#888', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Back to Dashboard</button>
    </div>
  );
  if (!quiz || !slides.length) return <div style={{ padding: 40, color: 'red' }}>No slides found for this quiz. Please check your quiz setup.</div>;
  const customization = quiz.customization_settings?.theme || {};
  const slide = slides?.[current];
  if (!slide) return <div style={{ padding: 40, color: 'red' }}>No slide data available.</div>;
  const options = Array.isArray(slide.options) ? slide.options : [];

  return (
    <div className="quiz-preview-root" style={{
      background: customization.color || '#f5f7fa',
      fontFamily: customization.font || 'Inter',
      minHeight: '100vh',
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div className="quiz-topbar" style={{ background: 'transparent', boxShadow: 'none', marginBottom: 12 }}>
        <h2 style={{ fontWeight: 700 }}>{quiz.title}</h2>
        <span style={{ fontWeight: 500, color: '#888', fontSize: 16 }}>Question {current + 1} / {slides.length}</span>
      </div>
      <div className="quiz-preview-center" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={slide.id}
            className="quiz-preview-card"
            variants={cardVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
              background: customization.backgroundColor || '#fff',
              borderRadius: customization.borderRadius ? customization.borderRadius + 'px' : '18px',
              boxShadow: '0 8px 32px rgba(60,60,100,0.10), 0 1.5px 6px rgba(0,0,0,0.03)',
              padding: '38px 28px 32px 28px',
              minWidth: 320,
              maxWidth: 420,
              width: '100%',
              margin: '0 12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            <TimerBar duration={slide.timer} progress={progress} />
            <h2 style={{ color: customization.textColor || '#222', fontWeight: 700, fontSize: 22, margin: '18px 0 18px 0', textAlign: 'center' }}>{slide.question}</h2>
            <div className="options-list" style={{ width: '100%', marginTop: 8 }}>
              {options.length === 0 ? (
                <div style={{ color: 'red', textAlign: 'center' }}>No options available for this question.</div>
              ) : options.map((opt, idx) => (
                <motion.button
                  key={idx}
                  className={`option-btn${selected === idx ? ' selected' : ''}`}
                  style={{
                    background: selected === idx ? (customization.buttonColor || customization.color || '#4a6bff') : '#fff',
                    color: selected === idx ? '#fff' : (customization.textColor || '#222'),
                    borderRadius: customization.borderRadius ? customization.borderRadius + 'px' : '12px',
                    border: '2px solid #e0e0e0',
                    margin: '10px 0',
                    fontWeight: 600,
                    width: '100%',
                    fontSize: 17,
                    boxShadow: selected === idx ? '0 2px 12px rgba(74,107,255,0.10)' : 'none',
                    transition: 'background 0.18s, color 0.18s',
                  }}
                  disabled={submitted}
                  onClick={() => handleAnswer(idx)}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.03 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  {opt}
                </motion.button>
              ))}
            </div>
            <motion.div
              className="quiz-progress-badge"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              style={{
                position: 'absolute',
                top: 18,
                right: 24,
                background: customization.buttonColor || customization.color || '#4a6bff',
                color: '#fff',
                borderRadius: '12px',
                padding: '4px 14px',
                fontWeight: 600,
                fontSize: 15,
                boxShadow: '0 1px 6px rgba(74,107,255,0.10)',
              }}
            >
              {current + 1} / {slides.length}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PreviewQuizPage; 