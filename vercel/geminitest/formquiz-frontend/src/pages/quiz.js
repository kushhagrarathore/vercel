import React, { useState, useEffect, useRef, useCallback, useContext } from "react";
import { useNavigate, useParams, useLocation, UNSAFE_NavigationContext as NavigationContext } from "react-router-dom";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { QRCodeCanvas } from "qrcode.react";
import { FiArrowLeft, FiEye, FiUpload, FiSun, FiMoon, FiSave, FiEdit2, FiTrash2, FiBarChart2 } from "react-icons/fi";

import { Button } from "../components/buttonquiz";
import { Input } from "../components/input";

import { supabase } from "../supabase";
import "./quiz.css";

// 🔲 Modal for sharing
const Modal = ({ show, onClose, url }) => {
  if (!show) return null;
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      // Show success feedback
      const button = document.querySelector('.copy-button');
      if (button) {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.style.background = '#10b981';
        setTimeout(() => {
          button.textContent = originalText;
          button.style.background = '#3b82f6';
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };
  
  const handleOpen = () => {
    window.open(url, '_blank');
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 relative">
        <button 
          onClick={onClose} 
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl font-bold"
          title="Close"
        >
          ×
        </button>
        <h2 className="text-lg font-semibold mb-4">Share Quiz</h2>
        <div className="flex justify-center items-center h-full w-full mb-4">
          <QRCodeCanvas value={url} />
        </div>
        <div className="flex justify-center gap-4 mb-4">
          <Button 
            onClick={handleCopy} 
            className="copy-button px-4 py-2 rounded bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors"
          >
            Copy Link
          </Button>
          <Button 
            onClick={handleOpen} 
            className="px-4 py-2 rounded bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors"
          >
            Open Link
          </Button>
        </div>
        <p className="text-sm break-all text-center mb-2 bg-gray-50 p-2 rounded border">{url}</p>
        <Button className="mt-2 w-full" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
};

// Sortable Slide Item
function SortableSlideItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

// Add textStyles array
const textStyles = [
  { label: 'Default', value: 'Inter, Segoe UI, Arial, sans-serif' },
  { label: 'Serif', value: 'Georgia, Times New Roman, serif' },
  { label: 'Mono', value: 'Menlo, Monaco, Consolas, monospace' },
  { label: 'Cursive', value: 'Comic Sans MS, Comic Sans, cursive' },
  { label: 'Fancy', value: 'Pacifico, cursive' },
];

// Add to the top, after textStyles
const questionTypes = [
  { label: 'Multiple Choice', value: 'multiple' },
  { label: 'True/False', value: 'true_false' },
  { label: 'One Word Answer', value: 'one_word' },
];

// Custom hook to block navigation in React Router v6
function useBlocker(blocker, when = true) {
  const { navigator } = useContext(NavigationContext);
  useEffect(() => {
    if (!when) return;
    const push = navigator.push;
    navigator.push = (...args) => {
      if (blocker()) {
        // Block navigation
        return;
      }
      push.apply(navigator, args);
    };
    return () => {
      navigator.push = push;
    };
  }, [navigator, blocker, when]);
}

// Add this function at the top (after imports):
function calculateScore(slides, userAnswers) {
  let score = 0;
  slides.forEach((slide, idx) => {
    const correct = Array.isArray(slide.correctAnswers) ? slide.correctAnswers : [];
    const userAnswer = userAnswers[idx];
    if (slide.type === 'multiple' || slide.type === 'true_false') {
      if (
        userAnswer &&
        typeof userAnswer.selectedIndex === 'number' &&
        correct.includes(userAnswer.selectedIndex)
      ) {
        score++;
      }
    } else if (slide.type === 'one_word') {
      if (
        userAnswer &&
        typeof userAnswer.text === 'string' &&
        userAnswer.text.trim() !== '' &&
        correct.some(
          ans =>
            typeof ans === 'string' &&
            ans.trim().replace(/\s+/g, ' ').toLowerCase() === userAnswer.text.trim().replace(/\s+/g, ' ').toLowerCase()
        )
      ) {
        score++;
      }
    }
  });
  return score;
}

// 🔲 Main Quiz Builder
export default function Quiz() {
  const { quizId } = useParams();
  const location = useLocation();
  const [title, setTitle] = useState("Untitled Presentation");
  const [slides, setSlides] = useState([{
    id: Date.now() + Math.random(),
    name: "Slide 1",
    type: "multiple",
    question: "",
    options: ["", ""],
    correctAnswers: [],
    background: "#ffffff",
    textColor: "#000000",
    fontFamily: textStyles[0].value,
  }]);
  const [selectedSlide, setSelectedSlide] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [editingName, setEditingName] = useState(null);
  const [openColorPicker, setOpenColorPicker] = useState(null);
  const [publishedQuizId, setPublishedQuizId] = useState(null);
  const [defaultSlideStyle, setDefaultSlideStyle] = useState({
    fontFamily: textStyles[0].value,
    textColor: '#000000',
    background: '#ffffff',
  });
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState('edit');
  const [responses, setResponses] = useState([]);
  const [addSlidePopupOpen, setAddSlidePopupOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const pendingNavigationRef = useRef(null);
  const navigate = useNavigate();

  // Set initial tab from query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'results') setActiveTab('results');
    else setActiveTab('edit');
  }, [location.search]);

  // On mount, sync dark mode with localStorage and set data-theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark';
    setIsDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, []);

  // When isDarkMode changes, update data-theme and localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Fetch responses when Results tab is selected and quiz is published
  useEffect(() => {
    if (activeTab === 'results' && (publishedQuizId || quizId)) {
      (async () => {
        const { data: responses, error } = await supabase
          .from('quiz_responses')
          .select('*')
          .eq('quiz_id', publishedQuizId || quizId)
          .order('submitted_at', { ascending: false });
        if (!error) setResponses(responses || []);
      })();
    }
  }, [activeTab, publishedQuizId, quizId]);

  // Handle AI-generated questions from navigation state
  useEffect(() => {
    if (location.state?.aiGenerated && location.state?.questions) {
      const aiQuestions = location.state.questions;
      const formattedSlides = aiQuestions.map((q, index) => ({
        id: q.id || Date.now() + index,
        name: q.question || `Question ${index + 1}`,
        type: 'multiple',
        question: q.question || '',
        options: q.options || ['', '', '', ''],
        correctAnswers: [q.correct_answer || 0],
        background: '#ffffff',
        textColor: '#000000',
        fontFamily: textStyles[0].value,
      }));
      
      setSlides(formattedSlides);
      setTitle(location.state.topic || 'AI Generated Quiz');
      setPublishedQuizId(location.state.sessionCode); // Set the AI-generated quiz ID
      setSelectedSlide(0);
      setHasUnsavedChanges(true);
      
      // Clear the navigation state to prevent re-applying on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Handle AI-generated quiz loading from URL (for direct access)
  useEffect(() => {
    if (quizId && quizId.startsWith('ai_')) {
      // This is an AI-generated quiz, fetch from database
      const fetchAIGeneratedQuiz = async () => {
        try {
          const { data: quizData, error: quizError } = await supabase
            .from('quizzes')
            .select('*')
            .eq('id', quizId)
            .single();
          
          if (quizData) {
            setTitle(quizData.title || 'AI Generated Quiz');
            setPublishedQuizId(quizId);
            
            // Fetch slides for this AI-generated quiz
            const { data: slidesData, error: slidesError } = await supabase
              .from('slides')
              .select('*')
              .eq('quiz_id', quizId)
              .order('slide_index');
            
            if (slidesData && slidesData.length > 0) {
              setSlides(slidesData.map(s => ({
                id: s.id,
                name: s.question || s.name || '',
                type: s.type || 'multiple',
                question: s.question || '',
                options: s.options || ["", ""],
                correctAnswers: s.correct_answers || [],
                background: s.background || '#ffffff',
                textColor: s.text_color || '#000000',
                fontFamily: s.font_family || textStyles[0].value,
              })));
              setSelectedSlide(0);
            }
          }
        } catch (error) {
          console.error('Error loading AI-generated quiz:', error);
        }
      };
      
      fetchAIGeneratedQuiz();
    }
  }, [quizId]);

  // Fetch quiz and slides if quizId is present
  useEffect(() => {
    async function fetchQuizAndSlides() {
      if (!quizId) return;
      // Fetch quiz
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();
      if (quizError || !quizData) return;
      setTitle(quizData.title || 'Untitled Presentation');
      setPublishedQuizId(quizId); // Ensure Save button is shown for existing quiz
      // Fetch slides
      const { data: slidesData, error: slidesError } = await supabase
        .from('slides')
        .select('*')
        .eq('quiz_id', quizId)
        .order('slide_index');
      if (slidesData && slidesData.length > 0) {
        setSlides(slidesData.map(s => ({
          id: s.id,
          name: s.question || s.name || '',
          type: s.type || 'multiple',
          question: s.question || '',
          options: s.options || ["", ""],
          correctAnswers: s.correct_answers || [],
          background: s.background || '#ffffff',
          textColor: s.text_color || '#000000',
          fontFamily: s.font_family || textStyles[0].value,
        })));
        setSelectedSlide(0);
      }
    }
    fetchQuizAndSlides();
  }, [quizId]);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [slides, title]);

  // Warn on browser/tab close
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Custom navigation blocker for in-app navigation
  useBlocker(
    useCallback(() => {
      if (hasUnsavedChanges) {
        setShowUnsavedModal(true);
        return true; // Block navigation
      }
      return false;
    }, [hasUnsavedChanges]),
    hasUnsavedChanges
  );

  // Handle leave/cancel in modal
  const handleLeave = () => {
    setShowUnsavedModal(false);
    setHasUnsavedChanges(false);
    // Actually navigate (simulate browser back)
    if (pendingNavigationRef.current) {
      pendingNavigationRef.current();
      pendingNavigationRef.current = null;
    } else {
      navigate(-1);
    }
  };
  const handleCancel = () => setShowUnsavedModal(false);

  const addSlide = (type = slides[selectedSlide]?.type || 'multiple') => {
    let newSlide = {
      name: `Slide ${slides.length + 1}`,
      type,
      question: '',
      options: type === 'true_false' ? ['True', 'False'] : ['', ''],
      correctAnswers: [],
      background: defaultSlideStyle.background,
      textColor: defaultSlideStyle.textColor,
      fontFamily: defaultSlideStyle.fontFamily,
    };
    setSlides([...slides, newSlide]);
    setSelectedSlide(slides.length);
  };

  const deleteSlide = (index) => {
    if (slides.length === 1) return;
    const newSlides = slides.filter((_, i) => i !== index);
    setSlides(newSlides);
    setSelectedSlide((prev) => (prev > index ? prev - 1 : Math.min(prev, newSlides.length - 1)));
  };

  const updateSlide = (key, value) => {
    setSlides((prev) =>
      prev.map((slide, i) =>
        i === selectedSlide ? { ...slide, [key]: value } : slide
      )
    );
  };

  const updateOption = (index, value) => {
    setSlides((prev) =>
      prev.map((slide, i) => {
        if (i !== selectedSlide) return slide;
        const newOptions = [...slide.options];
        newOptions[index] = value;
        return { ...slide, options: newOptions };
      })
    );
  };

  const removeOption = (index) => {
    setSlides((prev) =>
      prev.map((slide, i) => {
        if (i !== selectedSlide) return slide;
        const newOptions = [...slide.options];
        if (newOptions.length <= 2) return slide;
        newOptions.splice(index, 1);
        let newCorrect = slide.correctAnswers.includes(index) ? slide.correctAnswers.filter(idx => idx !== index) : [];
        return { ...slide, options: newOptions, correctAnswers: newCorrect };
      })
    );
  };

  const onDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = slides.findIndex((s) => s.id === active.id);
      const newIndex = slides.findIndex((s) => s.id === over.id);
      setSlides((prev) => arrayMove(prev, oldIndex, newIndex));
    }
  };

  const currentSlide = slides[selectedSlide];
  // Generate share URL that works with Vercel deployment
  const shareURL = (() => {
    const quizIdToUse = publishedQuizId || quizId;
    if (!quizIdToUse) return '';
    
    // Use window.location.origin for production, fallback for development
    const baseUrl = window.location.origin || 
                   (process.env.NODE_ENV === 'production' ? 'https://your-vercel-domain.vercel.app' : 'http://localhost:3000');
    
    return `${baseUrl}/userend?quizId=${quizIdToUse}`;
  })();

  const handlePublishOrSave = async () => {
    const { data: user, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.user) {
      setNotification('Unable to get user info.');
      console.error(userError);
      return;
    }
    const { id: user_id, email } = user.user;
    const customization_settings = JSON.stringify({
      fontFamily: currentSlide.fontFamily,
      textColor: currentSlide.textColor,
      background: currentSlide.background,
    });
    let quizIdToUse = publishedQuizId;
    let quiz;
    if (!publishedQuizId) {
      // First publish: insert new quiz
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .insert([{
          title,
          user_id,
          created_by: email,
          customization_settings,
        }])
        .select()
        .single();
      if (quizError) {
        setNotification('Error saving quiz.');
        console.error(quizError);
        return;
      }
      quiz = quizData;
      quizIdToUse = quiz.id;
      setPublishedQuizId(quiz.id);
    } else {
      // Save: update existing quiz
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .update({
          title,
          customization_settings,
        })
        .eq('id', publishedQuizId)
        .select()
        .single();
      if (quizError) {
        setNotification('Error updating quiz.');
        console.error(quizError);
        return;
      }
      quiz = quizData;
    }
    // --- Efficient slide update/insert/delete logic ---
    // 1. Fetch existing slides from DB
    let dbSlides = [];
    if (quizIdToUse) {
      const { data: dbSlidesData, error: dbSlidesError } = await supabase
        .from('slides')
        .select('id')
        .eq('quiz_id', quizIdToUse);
      if (dbSlidesError) {
        setNotification('Failed to fetch existing slides: ' + dbSlidesError.message);
        return;
      }
      dbSlides = dbSlidesData || [];
    }
    const dbSlideIds = dbSlides.map(s => s.id);
    const localSlideIds = slides.filter(s => s.id).map(s => s.id);
    // 2. Compute slides to update, insert, delete
    const slidesToUpdate = slides.filter(s => s.id && dbSlideIds.includes(s.id));
    const slidesToInsert = slides.filter(s => !s.id);
    const slidesToDelete = dbSlideIds.filter(id => !localSlideIds.includes(id));
    console.log('Slides to update:', slidesToUpdate);
    console.log('Slides to insert:', slidesToInsert);
    console.log('Slides to delete:', slidesToDelete);
    // 3. Prepare slide objects for DB
    const slideToDb = (slide, idx) => ({
      quiz_id: quizIdToUse,
      slide_index: idx,
      question: typeof slide.question === 'string' ? slide.question : '',
      type: typeof slide.type === 'string' ? slide.type : 'multiple',
      options: Array.isArray(slide.options) ? slide.options : [],
      correct_answers: slide.correctAnswers,
      background: typeof slide.background === 'string' ? slide.background : '',
      text_color: typeof slide.textColor === 'string' ? slide.textColor : '',
      font_size: typeof slide.fontSize === 'number' ? slide.fontSize : 20,
      font_family: typeof slide.fontFamily === 'string' ? slide.fontFamily : (textStyles[0]?.value || 'Arial'),
      ...(slide.id ? { id: slide.id } : {}),
    });
    // 4. Perform DB operations
    // a) Update existing slides
    for (let i = 0; i < slidesToUpdate.length; i++) {
      const slide = slidesToUpdate[i];
      const idx = slides.findIndex(s => s.id === slide.id);
      const updateObj = slideToDb(slide, idx);
      const { error: updateError } = await supabase
        .from('slides')
        .update(updateObj)
        .eq('id', slide.id);
      if (updateError) {
        setNotification('Failed to update slide: ' + updateError.message);
        return;
      }
    }
    // b) Insert new slides
    if (slidesToInsert.length > 0) {
      const slidesInsertArr = slidesToInsert.map((slide, idx) => slideToDb(slide, slides.indexOf(slide)));
      console.log('Inserting slides:', slidesInsertArr);
      const { error: insertError } = await supabase
        .from('slides')
        .insert(slidesInsertArr);
      if (insertError) {
        setNotification('Failed to insert new slides: ' + insertError.message);
        return;
      }
    }
    // c) Delete removed slides
    if (slidesToDelete.length > 0) {
      console.log('Deleting slides with ids:', slidesToDelete);
      const { error: deleteError } = await supabase
        .from('slides')
        .delete()
        .in('id', slidesToDelete);
      if (deleteError) {
        setNotification('Failed to delete removed slides: ' + deleteError.message);
        return;
      }
    }
    // d) After all operations, fetch all slides for this quiz and update local state
    const { data: allSlides, error: fetchError } = await supabase
      .from('slides')
      .select('*')
      .eq('quiz_id', quizIdToUse)
      .order('slide_index');
    if (fetchError) {
      setNotification('Failed to fetch slides after save: ' + fetchError.message);
      return;
    }
    console.log('Slides after save:', allSlides);
    // Only keep slides with a valid id
    const validSlides = (allSlides || []).filter(s => s.id);
    setSlides(validSlides.map(s => ({
      id: s.id,
      name: s.question || s.name || '',
      type: s.type || 'multiple',
      question: s.question || '',
      options: s.options || ["", ""],
      correctAnswers: s.correct_answers || [],
      background: s.background || '#ffffff',
      textColor: s.text_color || '#000000',
      fontFamily: s.font_family || textStyles[0].value,
    })));
    // Reset selectedSlide if out of bounds
    setSelectedSlide(prev => (validSlides.length === 0 ? 0 : Math.min(prev, validSlides.length - 1)));
    setNotification('Quiz and slides saved to Supabase!');
    setShowModal(true);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className={`min-h-screen p-4 transition-colors duration-300`} style={{
      background: 'var(--bg)',
      color: 'var(--text)'
    }}>
      {notification && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
          <div style={{ background: '#2563eb', color: '#fff', padding: '12px 32px', borderRadius: 8, fontWeight: 600, boxShadow: '0 2px 12px rgba(0,0,0,0.10)' }}>
            {notification}
          </div>
        </div>
      )}
      <Modal show={showModal} onClose={() => setShowModal(false)} url={shareURL} />

      {/* Unsaved Changes Modal */}
      {showUnsavedModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
          <div className="bg-white rounded-lg p-8 shadow-xl max-w-sm w-full text-center">
            <h2 className="text-2xl font-bold mb-4">Unsaved Changes</h2>
            <p className="mb-6">You have unsaved changes. Are you sure you want to leave?</p>
            <div className="flex justify-center gap-4">
              <button onClick={handleLeave} className="bg-red-500 text-white font-bold px-6 py-2 rounded">Leave</button>
              <button onClick={handleCancel} className="bg-gray-100 text-gray-800 font-bold px-6 py-2 rounded border">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex justify-between items-center mb-8 px-6 py-4 rounded-2xl shadow-lg border" style={{
        background: 'var(--card)',
        color: 'var(--text)',
        borderWidth: 2,
        borderColor: isDarkMode ? '#fff' : 'var(--border)'
      }}>
        {/* Left: Back Button and Title */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            className="flex items-center gap-2 rounded-full px-5 py-2 font-medium text-base shadow-sm border hover:bg-gray-100"
            style={{ background: 'var(--card)', color: 'var(--text)', borderColor: isDarkMode ? '#fff' : 'var(--border)' }}
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft className="text-lg" />
            Back
          </Button>
          <Input
            className="text-2xl font-bold border-none shadow-none focus:ring-0 focus:outline-none w-full max-w-lg bg-transparent"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Quiz"
            style={{ minWidth: 200, maxWidth: 400, background: 'transparent', color: 'var(--text)' }}
          />
          {/* Tabs for Edit/Results - now in top bar */}
          <div className="flex gap-2 ml-6">
            <Button
              onClick={() => setActiveTab('edit')}
              className={activeTab === 'edit'
                ? 'bg-blue-600 text-white font-bold border-b-4 border-blue-700 shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-b-4 border-transparent'}
              style={{ minWidth: 56, padding: '4px 10px', fontSize: 14, borderRadius: 6, boxShadow: 'none', transition: 'all 0.18s', borderBottomWidth: 4 }}
            >
              <FiEdit2 style={{ marginRight: 4, color: activeTab === 'edit' ? '#2563eb' : '#6b7280', fontSize: 16 }} />
              Edit
            </Button>
            <Button
              onClick={() => setActiveTab('results')}
              className={activeTab === 'results'
                ? 'bg-blue-600 text-white font-bold border-b-4 border-blue-700 shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-b-4 border-transparent'}
              style={{ minWidth: 56, padding: '4px 10px', fontSize: 14, borderRadius: 6, boxShadow: 'none', transition: 'all 0.18s', borderBottomWidth: 4 }}
            >
              <FiBarChart2 style={{ marginRight: 4, color: activeTab === 'results' ? '#2563eb' : '#6b7280', fontSize: 16 }} />
              Results
            </Button>
          </div>
        </div>
        {/* Right: Action Buttons */}
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            className="rounded-full px-3 py-2 shadow-sm border hover:bg-gray-100"
            style={{ background: 'var(--card)', color: 'var(--text)', borderColor: isDarkMode ? '#fff' : 'var(--border)' }}
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <FiSun /> : <FiMoon />}
          </Button>
          <Button
            className="rounded-full px-4 py-2 font-semibold flex items-center gap-2 shadow-md"
            style={{ background: 'var(--button)', color: '#fff' }}
            onClick={() => {
              if (!publishedQuizId && !quizId) {
                alert("Please publish or save the quiz before previewing.");
                return;
              }
              const idToUse = publishedQuizId || quizId;
              window.open(`/quiz/preview/${idToUse}`, "_blank");
            }}
            title="Preview as Admin"
          >
            <FiEye /> Preview
          </Button>
          <Button
            className="rounded-full px-4 py-2 font-semibold flex items-center gap-2 shadow-md"
            style={{ background: 'var(--button)', color: '#fff' }}
            onClick={handlePublishOrSave}
            title={publishedQuizId ? "Save" : "Publish"}
          >
            {publishedQuizId ? <FiSave /> : <FiUpload />} {publishedQuizId ? "Save" : "Publish"}
          </Button>
        </div>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'edit' ? (
        <div className="grid grid-cols-5 gap-6">
          {/* Left Panel: Slides List */}
          <div className="col-span-1 flex flex-col h-full">
            <div className="rounded-2xl shadow-md p-4 flex flex-col min-h-[500px] border" style={{ background: 'var(--card)', color: 'var(--text)', borderWidth: 2, borderColor: isDarkMode ? '#fff' : 'var(--border)' }}>
              <Button
                className="w-full mb-4 font-semibold rounded-lg py-2 border-none flex items-center justify-center gap-2"
                style={{ background: 'var(--button-hover)', color: 'var(--button)' }}
                onClick={() => setAddSlidePopupOpen(true)}
              >
                + Add Slide
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Button>
              {addSlidePopupOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30" onClick={() => setAddSlidePopupOpen(false)}>
                  <div className="bg-white rounded-xl shadow-2xl p-6 min-w-[260px] max-w-[90vw] relative" style={{ background: 'var(--card)', borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>
                    <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl font-bold" onClick={() => setAddSlidePopupOpen(false)} title="Close">×</button>
                    <div className="font-semibold text-lg mb-4 text-center">Select Question Type</div>
                    <div className="flex flex-col gap-2">
                      {questionTypes.map(qt => (
                        <button
                          key={qt.value}
                          className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                          style={{ color: 'var(--text)', background: 'var(--card)' }}
                          onClick={() => {
                            addSlide(qt.value);
                            setAddSlidePopupOpen(false);
                          }}
                        >
                          {qt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div className="flex-1">
                <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd} modifiers={[]}>
                  <SortableContext items={slides.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    {slides.map((slide, i) => (
                      <SortableSlideItem key={slide.id} id={slide.id}>
                        <div
                          className={`flex items-center gap-2 min-h-[40px] mb-2 px-2 py-2 rounded-lg cursor-pointer transition border-2 ${i === selectedSlide ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-100'}`}
                          style={{ background: i === selectedSlide ? 'var(--button-hover)' : 'var(--card)', color: 'var(--text)', borderWidth: 2, borderColor: isDarkMode ? '#fff' : (i === selectedSlide ? 'var(--button)' : 'var(--border)') }}
                        >
                          <span
                            className="text-xs font-bold w-8 text-center"
                            style={{ color: 'var(--accent)' }}
                            onPointerDown={e => { e.stopPropagation(); setSelectedSlide(i); }}
                          >{(i+1).toString().padStart(2, '0')}</span>
                          {editingName === slide.id ? (
                            <input
                              type="text"
                              value={slide.name}
                              autoFocus
                              onChange={e => {
                                const updatedSlides = [...slides];
                                updatedSlides[i].name = e.target.value;
                                setSlides(updatedSlides);
                              }}
                              onBlur={e => { e.stopPropagation(); setEditingName(null); }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { e.stopPropagation(); setEditingName(null); }
                              }}
                              className="flex-1 bg-transparent border-none outline-none text-sm font-medium"
                              style={{ color: 'var(--text)' }}
                              onPointerDown={e => e.stopPropagation()}
                            />
                          ) : (
                            <span
                              className="flex-1 text-sm font-medium"
                              style={{ color: 'var(--text)' }}
                              onPointerDown={e => { e.stopPropagation(); setSelectedSlide(i); }}
                            >{slide.name}</span>
                          )}
                          <button className="p-1 hover:text-blue-600" style={{ color: 'var(--text-secondary)' }} title="Edit slide name" onPointerDown={e => { e.stopPropagation(); setEditingName(slide.id); }}><FiEdit2 /></button>
                          <button className="p-1 hover:text-red-600" style={{ color: '#f87171' }} onPointerDown={e => { e.stopPropagation(); deleteSlide(i); }} title="Delete slide"><FiTrash2 /></button>
                        </div>
                      </SortableSlideItem>
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          </div>

          {/* Center Panel: Slide Editor */}
          <div className="col-span-3 flex flex-col items-center">
            <div className="rounded-2xl shadow-xl border w-full max-w-2xl p-8" style={{ background: 'var(--card)', color: 'var(--text)', borderWidth: 2, borderColor: isDarkMode ? '#fff' : 'var(--border)' }}>
              <div className="font-semibold mb-2" style={{ color: 'var(--accent)' }}>Slide {selectedSlide + 1} of {slides.length}</div>
              <div className="flex gap-3 mb-4">
                {questionTypes.map(qt => (
                  <button
                    key={qt.value}
                    className={`slide-type-btn${currentSlide.type === qt.value ? ' active' : ''}`}
                    style={{ padding: '6px 14px', fontSize: 14, borderRadius: 8, border: 'none', fontWeight: 600, background: currentSlide.type === qt.value ? '#2563eb' : '#f7f8fa', color: currentSlide.type === qt.value ? '#fff' : '#2563eb' }}
                    onClick={() => {
                      if (qt.value === 'true_false') {
                        updateSlide('type', 'true_false');
                        updateSlide('options', ['True', 'False']);
                        updateSlide('correctAnswers', []);
                      } else if (qt.value === 'one_word') {
                        updateSlide('type', 'one_word');
                        updateSlide('options', []);
                        updateSlide('correctAnswers', []);
                      } else {
                        updateSlide('type', 'multiple');
                        if (!Array.isArray(currentSlide.options) || currentSlide.options.length < 2) {
                          updateSlide('options', ['', '']);
                        }
                        updateSlide('correctAnswers', []);
                      }
                    }}
                  >
                    {qt.label}
                  </button>
                ))}
              </div>
              <Input
                placeholder="Your first question?"
                value={currentSlide.question}
                onChange={(e) => updateSlide("question", e.target.value)}
                className="text-lg font-semibold w-full mb-6 border rounded-lg px-4 py-3 focus:outline-none focus:ring-2"
                style={{ color: currentSlide.textColor, background: 'var(--bg)', borderColor: 'var(--border)', fontFamily: currentSlide.fontFamily }}
              />
              {/* Render input UI based on type */}
              {currentSlide.type === 'multiple' && (
                <div className="space-y-3">
                  {currentSlide.options.map((opt, i) => {
                    const isCorrect = currentSlide.correctAnswers.includes(i);
                    return (
                      <div key={i} className="flex items-center gap-2 rounded-lg px-4 py-2 border" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
                        <input
                          type="checkbox"
                          name={`correct-answer-${selectedSlide}`}
                          checked={isCorrect}
                          onChange={() => {
                            let newAnswers = currentSlide.correctAnswers.includes(i)
                              ? currentSlide.correctAnswers.filter(idx => idx !== i)
                              : [i];
                            updateSlide('correctAnswers', newAnswers);
                          }}
                          className="accent-blue-600"
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => updateOption(i, e.target.value)}
                          placeholder={`Option ${i + 1}`}
                          className="flex-1 bg-transparent border-none outline-none text-base px-2"
                          style={{ color: currentSlide.textColor, fontFamily: currentSlide.fontFamily }}
                        />
                        {currentSlide.options.length > 2 && (
                          <button onClick={() => removeOption(i)} className="hover:text-red-600 px-2 py-1 text-lg" style={{ color: '#f87171' }} title="Delete option"><FiTrash2 /></button>
                        )}
                      </div>
                    );
                  })}
                  {currentSlide.options.length < 4 ? (
                    <Button variant="outline" className="w-full mt-2 border-2 rounded-lg py-2" style={{ borderColor: 'var(--button)', color: 'var(--button)', background: 'var(--button-hover)' }} onClick={() => {
                      const updatedSlides = [...slides];
                      updatedSlides[selectedSlide].options.push("");
                      setSlides(updatedSlides);
                    }}>+ Add Option</Button>
                  ) : null}
                </div>
              )}
              {currentSlide.type === 'true_false' && (
                <div className="space-y-3">
                  {['True', 'False'].map((opt, i) => {
                    const isCorrect = currentSlide.correctAnswers.includes(i);
                    return (
                      <div key={i} className="flex items-center gap-2 rounded-lg px-4 py-2 border" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
                        <input
                          type="checkbox"
                          name={`correct-answer-${selectedSlide}`}
                          checked={isCorrect}
                          onChange={() => {
                            let newAnswers = currentSlide.correctAnswers.includes(i)
                              ? currentSlide.correctAnswers.filter(idx => idx !== i)
                              : [i];
                            updateSlide('correctAnswers', newAnswers);
                          }}
                          className="accent-blue-600"
                        />
                        <input
                          type="text"
                          value={opt}
                          disabled
                          className="flex-1 bg-transparent border-none outline-none text-base px-2 text-gray-500"
                          style={{ color: currentSlide.textColor, fontFamily: currentSlide.fontFamily }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
              {currentSlide.type === 'one_word' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-lg px-4 py-2 border" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
                    <span className="font-semibold mr-2">Correct Answer:</span>
                    <input
                      type="text"
                      value={currentSlide.correctAnswers[0] || ''}
                      onChange={e => updateSlide('correctAnswers', [e.target.value])}
                      placeholder="Enter the correct answer"
                      className="flex-1 bg-transparent border-none outline-none text-base px-2"
                      style={{ color: currentSlide.textColor, fontFamily: currentSlide.fontFamily }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Customization */}
          <div className="col-span-1">
            <div className="rounded-2xl shadow-xl border p-6 flex flex-col gap-6" style={{
              background: isDarkMode ? 'linear-gradient(135deg, rgba(36,37,54,0.95) 60%, rgba(60,60,80,0.95) 100%)' : 'linear-gradient(135deg, #fff 60%, #f3f4f6 100%)',
              color: 'var(--text)',
              borderWidth: 2,
              borderColor: isDarkMode ? '#fff' : 'var(--border)',
              borderRadius: 20,
              boxShadow: isDarkMode ? '0 4px 32px 0 rgba(0,0,0,0.35)' : '0 4px 24px 0 rgba(37,99,235,0.08)'
            }}>
              {/* Text Style Section */}
              <div>
                <div className="font-semibold mb-2" style={{ color: 'var(--text)' }}>Text Style</div>
                <select
                  className="w-full border rounded-lg p-3 mb-4 text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  style={{ background: isDarkMode ? '#232336' : '#f9fafb', color: 'var(--text)', borderColor: isDarkMode ? '#fff' : 'var(--border)' }}
                  value={currentSlide.fontFamily}
                  onChange={e => updateSlide('fontFamily', e.target.value)}
                >
                  {textStyles.map(style => (
                    <option key={style.value} value={style.value} style={{ fontFamily: style.value }}>{style.label}</option>
                  ))}
                </select>
              </div>
              {/* Color Section */}
              <div>
                <div className="font-semibold mb-2" style={{ color: 'var(--text)' }}>Colors</div>
                <div className="flex items-end gap-6 mb-2">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Text</span>
                    <div
                      className="w-8 h-8 rounded-full mb-1 border-2 shadow cursor-pointer"
                      style={{ background: currentSlide.textColor, borderColor: isDarkMode ? '#fff' : 'var(--border)' }}
                      onClick={() => setOpenColorPicker(openColorPicker === 'text' ? null : 'text')}
                    />
                    {openColorPicker === 'text' && (
                      <Input
                        type="color"
                        value={currentSlide.textColor}
                        onChange={e => { updateSlide('textColor', e.target.value); setOpenColorPicker(null); }}
                        className="w-10 h-10 p-0 border-2 rounded-lg bg-transparent cursor-pointer shadow-sm mt-1"
                        style={{ background: 'none', borderColor: isDarkMode ? '#fff' : 'var(--border)' }}
                        autoFocus
                        onBlur={() => setOpenColorPicker(null)}
                      />
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>BG</span>
                    <div
                      className="w-8 h-8 rounded-full mb-1 border-2 shadow cursor-pointer"
                      style={{ background: currentSlide.background, borderColor: isDarkMode ? '#fff' : 'var(--border)' }}
                      onClick={() => setOpenColorPicker(openColorPicker === 'bg' ? null : 'bg')}
                    />
                    {openColorPicker === 'bg' && (
                      <Input
                        type="color"
                        value={currentSlide.background}
                        onChange={e => { updateSlide('background', e.target.value); setOpenColorPicker(null); }}
                        className="w-10 h-10 p-0 border-2 rounded-lg bg-transparent cursor-pointer shadow-sm mt-1"
                        style={{ background: 'none', borderColor: isDarkMode ? '#fff' : 'var(--border)' }}
                        autoFocus
                        onBlur={() => setOpenColorPicker(null)}
                      />
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <Button
                  className="px-3 py-1 rounded bg-blue-600 text-white text-sm font-semibold"
                  onClick={() => {
                    // Apply current style to all slides
                    setSlides(slides.map(slide => ({
                      ...slide,
                      fontFamily: currentSlide.fontFamily,
                      textColor: currentSlide.textColor,
                      background: currentSlide.background,
                    })));
                    // Set as default for new slides
                    setDefaultSlideStyle({
                      fontFamily: currentSlide.fontFamily,
                      textColor: currentSlide.textColor,
                      background: currentSlide.background,
                    });
                  }}
                >
                  Apply Style to All Slides
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">Responses</h2>
          {responses.length === 0 ? (
            <div className="text-gray-500">No responses yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border">
                <thead>
                  <tr>
                    <th className="p-2 border-b">User</th>
                    <th className="p-2 border-b">Submitted At</th>
                    <th className="p-2 border-b">Score</th>
                    {slides.map((slide, idx) => (
                      <th key={slide.id || idx} className="p-2 border-b">Q{idx + 1}</th>
                    ))}
                  </tr>
                  <tr>
                    <th></th>
                    <th></th>
                    <th></th>
                    {slides.map((slide, idx) => (
                      <th key={slide.id || idx} className="p-2 border-b text-xs font-normal">{slide.question}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {responses.map((resp, i) => (
                    <tr key={i}>
                      <td className="p-2 border-b">{resp.username || resp.user_id || 'Anonymous'}</td>
                      <td className="p-2 border-b">{resp.submitted_at ? new Date(resp.submitted_at).toLocaleString() : ''}</td>
                      <td className="p-2 border-b">{calculateScore(slides, resp.answers)} / {slides.length}</td>
                      {slides.map((slide, idx) => {
                        const userAnswer = resp.answers?.[idx];
                        let answerDisplay = '';
                        let correctDisplay = '';
                        if (slide.type === 'multiple' || slide.type === 'true_false') {
                          answerDisplay = typeof userAnswer?.selectedIndex === 'number' && slide.options && slide.options[userAnswer.selectedIndex] !== undefined
                            ? slide.options[userAnswer.selectedIndex]
                            : 'No answer';
                          correctDisplay = slide.correctAnswers && slide.correctAnswers.length > 0
                            ? slide.options[slide.correctAnswers[0]]
                            : '';
                        } else if (slide.type === 'one_word') {
                          answerDisplay = userAnswer?.text ? userAnswer.text : 'No answer';
                          correctDisplay = slide.correctAnswers?.[0] || '';
                        } else {
                          answerDisplay = 'No answer';
                          correctDisplay = '';
                        }
                        return (
                          <td key={slide.id || idx} className="p-2 border-b">
                            <div><span className="font-medium">User:</span> {answerDisplay}</div>
                            <div><span className="font-medium">Correct:</span> {correctDisplay}</div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
