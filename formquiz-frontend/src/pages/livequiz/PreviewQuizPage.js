import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QuizArenaLayout from '../../components/quiz/QuizArenaLayout';
import Spinner from '../../components/Spinner';
import Skeleton from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { supabase } from '../../supabase';

const PreviewQuizPage = () => {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [slides, setSlides] = useState([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    setError(null);
    if (quizId === 'preview') {
      // Load from localStorage
      const draft = localStorage.getItem('quizDraft');
      if (draft) {
        try {
          const { slides, globalSettings, quizTitle } = JSON.parse(draft);
          setQuiz({ title: quizTitle, customization_settings: globalSettings });
          setSlides(Array.isArray(slides) ? slides : []);
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
          const { data: quizData, error: quizError } = await supabase
            .from('quizzes')
            .select('*')
            .eq('id', quizId)
            .single();
          if (quizError || !quizData) {
            setError('Quiz not found.');
            setLoading(false);
            return;
          }
          setQuiz(quizData);
          const { data: slidesData, error: slidesError } = await supabase
            .from('slides')
            .select('*')
            .eq('quiz_id', quizId)
            .order('slide_index');
          if (slidesError || !Array.isArray(slidesData) || slidesData.length === 0) {
            setError('No slides found for this quiz.');
            setSlides([]);
            setLoading(false);
            return;
          }
          setSlides(slidesData);
        } catch (err) {
          setError('Failed to load quiz. Please check your connection.');
        } finally {
          setLoading(false);
        }
      })();
    }
    // eslint-disable-next-line
  }, [quizId, retryCount]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spinner size={40} /></div>;
  if (error) return (
    <div style={{ padding: 40, color: 'red', textAlign: 'center' }}>
      <div style={{ marginBottom: 16 }}>{error}</div>
      <button onClick={() => setRetryCount(c => c + 1)} style={{ padding: '8px 20px', borderRadius: 8, background: '#4a6bff', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', marginRight: 12 }}>Retry</button>
      <button onClick={() => navigate('/dashboard')} style={{ padding: '8px 20px', borderRadius: 8, background: '#888', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Back to Dashboard</button>
    </div>
  );
  if (!quiz || !slides.length) return <div style={{ padding: 40, color: 'red' }}>No slides found for this quiz. Please check your quiz setup.</div>;
  // Parse customization as in userend.js
  let customization = quiz.customization_settings || {};
  if (typeof customization === 'string') {
    try {
      customization = JSON.parse(customization);
    } catch (e) {
      customization = {};
    }
  }
  
  // Debug log for background image
  console.log('PreviewQuizPage - Quiz data:', quiz);
  console.log('PreviewQuizPage - Customization:', customization);
  console.log('PreviewQuizPage - Background image:', customization.backgroundImage);
  const slide = slides?.[current];
  if (!slide) return <div style={{ padding: 40, color: 'red' }}>No slide data available.</div>;
  // Section grid: active for current, filled for previous, inactive for next
  const sectionGrid = slides.map((_, idx) => idx <= current);

  // Custom top right button: Back to Edit
  const TopRightButton = (
    <button
      onClick={() => {
        if (quizId === 'preview') {
          // For draft preview, go back to quiz builder without quizId
          navigate('/quiz');
        } else {
          // For saved quiz preview, go to edit page
          navigate(`/quiz/edit/${quizId}`);
        }
      }}
      style={{
        background: customization.nextButtonColor || '#2563eb',
        color: customization.nextButtonTextColor || '#fff',
        border: 'none',
        borderRadius: 12,
        padding: '10px 24px',
        fontWeight: 700,
        fontSize: 16,
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(37,99,235,0.10)',
        position: 'fixed',
        top: 32,
        right: 32,
        zIndex: 100,
        transition: 'background 0.18s, color 0.18s',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span style={{ fontSize: 18, marginRight: 6 }}>←</span> Back to Edit
    </button>
  );

  // Next/Back button logic
  const isLast = current === slides.length - 1;
  const isFirst = current === 0;

  return (
    <div style={{ 
      position: 'relative', 
      minHeight: '100vh', 
      background: customization.backgroundImage ? 'transparent' : (customization.background || customization.backgroundColor || '#f8f9fb'),
      backgroundImage: customization.backgroundImage ? `url(${customization.backgroundImage})` : undefined,
      backgroundSize: customization.backgroundImage ? 'cover' : undefined,
      backgroundPosition: customization.backgroundImage ? 'center' : undefined,
      backgroundRepeat: customization.backgroundImage ? 'no-repeat' : undefined,
      backgroundAttachment: customization.backgroundImage ? 'fixed' : undefined,
      fontFamily: customization.fontFamily || customization.font || 'Inter, Arial, sans-serif' 
    }}>
      {TopRightButton}
      <QuizArenaLayout
        logo={customization.logo}
        username={customization.username || 'Preview'}
        quizTitle={quiz.title}
        questionNumber={current + 1}
        questionText={slide.question}
        selected={null}
        onSelect={null} // Disable answer selection
        showNextButton={!isLast}
        onNext={() => setCurrent(c => Math.min(slides.length - 1, c + 1))}
        onPrev={() => setCurrent(c => Math.max(0, c - 1))}
        showHeader={false}
        showSectionGrid={true}
        sectionGrid={sectionGrid}
        customization={customization}
        disabled={true}
        showTimer={false}
        nextButtonLabel={'Next Question'}
        prevButtonLabel={'Previous'}
        showPrevButton={!isFirst}
        topRightButton={null}
      />
    </div>
  );
};

export default PreviewQuizPage; 