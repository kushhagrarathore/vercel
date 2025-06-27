import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [slides, setSlides] = useState(defaultSlides);
  const [current, setCurrent] = useState(0);
  const [quizTitle, setQuizTitle] = useState('Untitled Presentation');
  const [publishing, setPublishing] = useState(false);
  const [globalSettings, setGlobalSettings] = useState(defaultSettings);
  const [darkMode, setDarkMode] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // Slide list handlers
  const handleSelectSlide = idx => setCurrent(idx);
  const handleRenameSlide = (idx, title) => {
    setSlides(slides.map((s, i) => i === idx ? { ...s, question: title } : s));
    setDirty(true);
  };
  const handleReorderSlides = newSlides => { setSlides(newSlides); setDirty(true); };
  const handleDuplicateSlide = idx => {
    const newSlides = [...slides];
    newSlides.splice(idx + 1, 0, { ...slides[idx], question: slides[idx].question + ' (Copy)' });
    setSlides(newSlides);
    setDirty(true);
  };
  const handleDeleteSlide = idx => {
    const newSlides = slides.filter((_, i) => i !== idx);
    setSlides(newSlides);
    setCurrent(Math.max(0, current - (idx === current ? 1 : 0)));
    setDirty(true);
  };
  const handleAddSlide = () => {
    setSlides([...slides, { question: '', options: ['Option 1'], correctAnswer: 0, type: 'single', image: '', settings: { ...defaultSettings } }]);
    setCurrent(slides.length);
    setDirty(true);
  };

  // Slide editor handlers
  const handleSlideChange = updatedSlide => {
    setSlides(slides.map((s, i) => (i === current ? updatedSlide : s)));
    setDirty(true);
  };
  const handleDuplicateOption = idx => {
    const slide = slides[current];
    if (slide.options.length >= 4) return;
    const newOpts = [...slide.options];
    newOpts.splice(idx + 1, 0, slide.options[idx] + ' (Copy)');
    handleSlideChange({ ...slide, options: newOpts });
  };
  const handleRemoveOption = idx => {
    const slide = slides[current];
    if (slide.options.length <= 1) return;
    const newOpts = slide.options.filter((_, i) => i !== idx);
    handleSlideChange({ ...slide, options: newOpts });
  };
  const handleAddOption = () => {
    const slide = slides[current];
    if (slide.options.length >= 4) return;
    handleSlideChange({ ...slide, options: [...slide.options, 'New Option'] });
  };

  // Settings panel handlers
  const handleSettingsChange = newSettings => {
    setSlides(slides.map((s, i) => i === current ? { ...s, settings: newSettings } : s));
    setDirty(true);
  };
  const handleApplyAll = () => {
    const currSettings = slides[current].settings;
    setSlides(slides.map(s => ({ ...s, settings: currSettings })));
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
      if (!quizTitle.trim()) throw new Error('Quiz title is required');
      if (!slides.length) throw new Error('At least one slide is required');
      for (const s of slides) {
        if (!s.question.trim() || !s.options || s.options.length < 2) throw new Error('Each slide must have a question and at least 2 options');
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');
      const { data: quizData, error: quizError } = await supabase.from('quizzes').insert([
        {
          user_id: user.id,
          title: quizTitle,
          questions: slides,
          theme: slides[0]?.settings || {},
          settings: {},
          created_at: new Date().toISOString(),
        }
      ]).select('id').single();
      if (quizError) throw quizError;
      const quizId = quizData.id;
      const slidesToInsert = slides.map((slide, idx) => ({
        quiz_id: quizId,
        order: idx,
        type: slide.type,
        question: slide.question,
        options: slide.options,
        timer: slide.settings?.timer || 20,
        theme: slide.settings || {},
      }));
      if (slidesToInsert.length) {
        const { error: slideError } = await supabase.from('quiz_slides').insert(slidesToInsert);
        if (slideError) throw slideError;
      }
      alert('Quiz published!');
      setDirty(false);
      // Optionally: show a modal with a shareable link
    } catch (err) {
      alert('Failed to publish quiz: ' + (err.message || err));
    } finally {
      setPublishing(false);
    }
  };

  // Preview navigation
  const handlePreview = () => {
    // Save quiz draft to localStorage for PreviewQuizPage
    localStorage.setItem('quizPreview', JSON.stringify({
      slides,
      globalSettings,
      quizTitle
    }));
    navigate('/quiz/preview/preview');
  };

  // Dark mode toggle
  const handleToggleDark = () => {
    setDarkMode(d => !d);
    document.documentElement.setAttribute('data-theme', !darkMode ? 'dark' : 'light');
  };

  // Back button logic
  const handleBack = () => {
    if (dirty) setShowUnsavedModal(true);
    else window.location = '/dashboard';
  };
  const confirmBack = () => { setShowUnsavedModal(false); window.location = '/dashboard'; };
  const cancelBack = () => setShowUnsavedModal(false);

  // Main layout
  return (
    <div style={{ minHeight: '100vh', background: darkMode ? '#181c24' : '#f8f9fb', fontFamily: 'Inter, Segoe UI, Arial, sans-serif' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 32px 18px 18px', background: darkMode ? '#23263a' : '#fff', borderBottom: '1.5px solid #ececec', boxShadow: '0 2px 8px rgba(30,50,80,0.03)' }}>
        <button onClick={handleBack} style={{ background: darkMode ? '#23263a' : '#f3f4f6', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: darkMode ? '#fff' : '#222', fontSize: 17 }}><FaChevronLeft /> Back</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={handlePreview} style={{ background: '#f3f4f6', color: '#2563eb', border: 'none', borderRadius: 999, padding: '10px 28px', fontWeight: 700, fontSize: 17, cursor: 'pointer', boxShadow: 'none', marginRight: 8, display: 'flex', alignItems: 'center', gap: 10 }}><FaEye /> Preview</button>
          <button onClick={handlePublish} disabled={publishing} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 999, padding: '10px 28px', fontWeight: 700, fontSize: 17, cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.10)', opacity: publishing ? 0.7 : 1, marginRight: 8, display: 'flex', alignItems: 'center', gap: 10 }}><FaCloudUploadAlt /> {publishing ? 'Publishing...' : 'Publish'}</button>
          <button onClick={handleToggleDark} style={{ background: darkMode ? '#2563eb' : '#f3f4f6', color: darkMode ? '#fff' : '#2563eb', border: 'none', borderRadius: 999, padding: '10px 18px', fontWeight: 700, fontSize: 17, cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.10)', display: 'flex', alignItems: 'center', gap: 8 }} title="Toggle dark mode">{darkMode ? <FaSun /> : <FaMoon />}</button>
        </div>
      </div>
      {/* Unsaved changes modal */}
      {showUnsavedModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 8px 32px rgba(60,60,100,0.10)', padding: '38px 38px 32px 38px', minWidth: 320, maxWidth: 420, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 18 }}>Unsaved Changes</div>
            <div style={{ fontSize: 16, marginBottom: 28 }}>You have unsaved changes. Are you sure you want to leave?</div>
            <div style={{ display: 'flex', gap: 18, justifyContent: 'center' }}>
              <button onClick={confirmBack} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>Leave</button>
              <button onClick={cancelBack} style={{ background: '#f3f4f6', color: '#222', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* Main 3-column layout */}
      <div style={{ display: 'flex', gap: 32, padding: '38px 0 0 0', maxWidth: 1800, margin: '0 auto' }}>
        {/* Left: Slide List Card */}
        <div style={{ minWidth: 260, maxWidth: 320, width: 320, background: darkMode ? '#23263a' : '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(30,50,80,0.06)', border: '1.5px solid #ede9fe', padding: 18, display: 'flex', flexDirection: 'column', gap: 12, height: 'fit-content' }}>
          <button onClick={handleAddSlide} style={{ width: '100%', marginBottom: 12, background: '#ede9fe', color: '#2563eb', border: 'none', borderRadius: 8, padding: '10px 0', fontWeight: 700, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={slides.length >= 4}>+ Add Slide</button>
          <QuizSlideList
            slides={slides}
            current={current}
            onSelect={handleSelectSlide}
            onRename={handleRenameSlide}
            onReorder={handleReorderSlides}
            onDuplicate={handleDuplicateSlide}
            onDelete={handleDeleteSlide}
            onAdd={handleAddSlide}
          />
        </div>
        {/* Center: Main Editor Card */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>
          <div style={{ width: '100%', maxWidth: 820, background: darkMode ? '#23263a' : '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(60,60,100,0.10)', border: '1.5px solid #ede9fe', padding: '48px 38px 42px 38px', margin: '0 24px', minHeight: 520, display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'box-shadow 0.18s, border 0.18s, background 0.18s' }}>
            <QuizSlideEditor
              slide={slides[current]}
              onChange={handleSlideChange}
              slideIndex={current}
              totalSlides={slides.length}
              onDuplicateOption={handleDuplicateOption}
              onRemoveOption={handleRemoveOption}
              onAddOption={handleAddOption}
            />
          </div>
        </div>
        {/* Right: Settings Panel Card */}
        <div style={{ minWidth: 300, maxWidth: 360, width: 340, background: darkMode ? '#23263a' : '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(30,50,80,0.06)', border: '1.5px solid #ede9fe', padding: 28, display: 'flex', flexDirection: 'column', gap: 12, height: 'fit-content' }}>
          <QuizSettingsPanel
            settings={slides[current]?.settings || defaultSettings}
            onChange={handleSettingsChange}
            onApplyAll={handleApplyAll}
            onReset={handleReset}
          />
        </div>
      </div>
    </div>
  );
};

export default CreateQuizPage; 