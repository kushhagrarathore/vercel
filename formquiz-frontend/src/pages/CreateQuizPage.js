import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QuizSlideList from '../components/QuizSlideList';
import QuizSlideEditor from '../components/QuizSlideEditor';
import QuizSettingsPanel from '../components/QuizSettingsPanel';
import { FaChevronLeft, FaEye, FaCloudUploadAlt, FaMoon, FaSun } from 'react-icons/fa';
import { supabase } from '../supabase';

const defaultSettings = {
  font: 'Inter',
  fontSize: 20,
  align: 'center',
  backgroundColor: '#fff',
  textColor: '#222',
  buttonColor: '#2563eb',
  timer: 20,
};

const defaultSlides = [
  { question: 'Your first question?', options: ['Option 1', 'Option 2'], correctAnswer: 0, type: 'single', image: '', settings: { ...defaultSettings } },
  { question: 'Second question?', options: ['Option 1', 'Option 2'], correctAnswer: 0, type: 'single', image: '', settings: { ...defaultSettings } },
  { question: 'Third question?', options: ['Option 1', 'Option 2'], correctAnswer: 0, type: 'single', image: '', settings: { ...defaultSettings } },
  { question: 'Fourth question?', options: ['Option 1', 'Option 2'], correctAnswer: 0, type: 'single', image: '', settings: { ...defaultSettings } },
];

const CreateQuizPage = () => {
  const navigate = useNavigate();
  const { quizId } = useParams();

  const [slides, setSlides] = useState(defaultSlides);
  const [current, setCurrent] = useState(0);
  const [quizTitle, setQuizTitle] = useState('Untitled Presentation');
  const [publishing, setPublishing] = useState(false);
  const [globalSettings, setGlobalSettings] = useState(defaultSettings);
  const [darkMode, setDarkMode] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareQuizId, setShareQuizId] = useState(null);
  const [shareQuizLink, setShareQuizLink] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);

  // Load quiz if editing
  useEffect(() => {
    const fetchQuiz = async () => {
      if (!quizId) return;
      setLoading(true);

      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (quizError) {
        console.error(quizError);
      }

      if (quizData) {
        setQuizTitle(quizData.title || 'Untitled Presentation');
        setGlobalSettings(quizData.customization_settings || defaultSettings);
      }

      const { data: slidesData, error: slidesError } = await supabase
        .from('slides')
        .select('*')
        .eq('quiz_id', quizId)
        .order('slide_index');

      if (slidesError) {
        console.error(slidesError);
      }

      if (slidesData && slidesData.length > 0) {
        setSlides(
          slidesData.map((s) => ({
            question: s.question,
            options: s.options,
            correctAnswer: s.correct_answer_index,
            type: s.type,
            image: s.image || '',
            settings: {
              ...defaultSettings,
              backgroundColor: s.background || defaultSettings.backgroundColor,
              textColor: s.text_color || defaultSettings.textColor,
              fontSize: s.font_size || defaultSettings.fontSize,
            },
          }))
        );
      }

      setLoading(false);
    };

    fetchQuiz();
    // eslint-disable-next-line
  }, [quizId]);

  // On mount, restore from localStorage if not editing
  useEffect(() => {
    if (!quizId) {
      localStorage.removeItem('quizDraft');
      setSlides(defaultSlides);
      setGlobalSettings(defaultSettings);
      setQuizTitle('Untitled Presentation');
      setCurrent(0);
    }
  }, [quizId]);

  // Slide list handlers
  const handleSelectSlide = (idx) => setCurrent(idx);

  const handleRenameSlide = (idx, title) => {
    setSlides(
      slides.map((s, i) => (i === idx ? { ...s, question: title } : s))
    );
    setDirty(true);
  };

  const handleReorderSlides = (newSlides) => {
    setSlides(newSlides);
    setDirty(true);
  };

  const handleDuplicateSlide = (idx) => {
    const newSlides = [...slides];
    newSlides.splice(idx + 1, 0, {
      ...slides[idx],
      question: slides[idx].question + ' (Copy)',
    });
    setSlides(newSlides);
    setDirty(true);
  };

  const handleDeleteSlide = (idx) => {
    const newSlides = slides.filter((_, i) => i !== idx);
    setSlides(newSlides);
    setCurrent(Math.max(0, current - (idx === current ? 1 : 0)));
    setDirty(true);
  };

  const handleAddSlide = () => {
    setSlides([
      ...slides,
      {
        question: '',
        options: ['Option 1'],
        correctAnswer: 0,
        type: 'single',
        image: '',
        settings: { ...defaultSettings },
      },
    ]);
    setCurrent(slides.length);
    setDirty(true);
  };

  // Slide editor handlers
  const handleSlideChange = (updatedSlide) => {
    setSlides(
      slides.map((s, i) => (i === current ? updatedSlide : s))
    );
    setDirty(true);
  };

  const handleDuplicateOption = (idx) => {
    const slide = slides[current];
    if (slide.options.length >= 4) return;
    const newOpts = [...slide.options];
    newOpts.splice(idx + 1, 0, slide.options[idx] + ' (Copy)');
    handleSlideChange({ ...slide, options: newOpts });
  };

  const handleRemoveOption = (idx) => {
    const slide = slides[current];
    if (slide.options.length <= 1) return;
    const newOpts = slide.options.filter((_, i) => i !== idx);
    handleSlideChange({ ...slide, options: newOpts });
  };

  const handleAddOption = () => {
    const slide = slides[current];
    if (slide.options.length >= 4) return;
    handleSlideChange({
      ...slide,
      options: [...slide.options, 'New Option'],
    });
  };

  // Settings panel handlers
  const handleSettingsChange = (newSettings) => {
    setSlides(
      slides.map((s, i) =>
        i === current ? { ...s, settings: newSettings } : s
      )
    );
    setDirty(true);
  };

  const handleApplyAll = () => {
    const currSettings = slides[current].settings;
    setSlides(
      slides.map((s) => ({ ...s, settings: currSettings }))
    );
    setDirty(true);
  };

  const handleReset = () => {
    handleSettingsChange(defaultSettings);
    setDirty(true);
  };

  // Publish logic
  const handlePublish = async () => {
    setPublishing(true);
    try {
      if (!quizTitle.trim())
        throw new Error('Quiz title is required');
      if (!slides.length)
        throw new Error('At least one slide is required');
      for (const s of slides) {
        if (!s.question.trim() || !s.options || s.options.length < 2)
          throw new Error(
            'Each slide must have a question and at least 2 options'
          );
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      let quizIdToUse = quizId;
      let publicLink = '';

      if (quizIdToUse) {
        await supabase
          .from('quizzes')
          .update({
            title: quizTitle,
            customization_settings: globalSettings,
            is_active: true,
            is_shared: false,
            is_published: true,
            form_url: publicLink,
            created_by: user.email,
          })
          .eq('id', quizIdToUse);
      } else {
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .insert([
            {
              user_id: user.id,
              title: quizTitle,
              description: '',
              customization_settings: globalSettings,
              is_active: true,
              is_shared: false,
              is_published: true,
              form_url: '',
              created_by: user.email,
              created_at: new Date().toISOString(),
            },
          ])
          .select('id')
          .single();

        if (quizError) throw new Error(quizError.message);
        quizIdToUse = quizData.id;

        publicLink = generateLiveLink(quizIdToUse);
        await supabase
          .from('quizzes')
          .update({ form_url: publicLink })
          .eq('id', quizIdToUse);
      }

      alert('Quiz published!');
      setDirty(false);
    } catch (err) {
      alert(
        'Failed to publish quiz: ' + (err.message || err)
      );
    } finally {
      setPublishing(false);
    }
  };

  // Preview navigation
  const handlePreview = () => {
    const latestSettings =
      slides[current]?.settings || globalSettings;
    localStorage.setItem(
      'quizDraft',
      JSON.stringify({
        slides,
        globalSettings: latestSettings,
        quizTitle,
      })
    );
    navigate('/quiz/preview/preview');
  };

  // Dark mode toggle
  const handleToggleDark = () => {
    setDarkMode((d) => !d);
    document.documentElement.setAttribute(
      'data-theme',
      !darkMode ? 'dark' : 'light'
    );
  };

  // Back button logic
  const handleBack = () => {
    if (dirty) setShowUnsavedModal(true);
    else window.location = '/dashboard';
  };
  const confirmBack = () => {
    setShowUnsavedModal(false);
    window.location = '/dashboard';
  };
  const cancelBack = () => setShowUnsavedModal(false);

  // Main layout
  return (
    <div
      style={{
        minHeight: '100vh',
        background: darkMode ? '#181c24' : '#f8f9fb',
        fontFamily:
          'Inter, Segoe UI, Arial, sans-serif',
      }}
    >
      {/* Top Bar */}
      {/* (existing JSX remains unchanged from your snippet) */}
      {/* Left Panel */}
      {/* Center Editor */}
      {/* Right Panel */}
      {/* Modal */}
      {/* etc. */}
      {/* Keep rest of the JSX as in your original snippet */}
    </div>
  );
};

function generateLiveLink(quizId) {
  return `${window.location.origin}/quiz/present/${quizId}`;
}

export default CreateQuizPage;
