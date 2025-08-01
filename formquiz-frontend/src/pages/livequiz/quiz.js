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
import { FiArrowLeft, FiEye, FiUpload, FiSun, FiMoon, FiSave, FiEdit2, FiTrash2, FiBarChart2, FiSettings } from "react-icons/fi";

import { Button } from '../../components/buttonquiz';
import { Input } from '../../components/input';

import { PlusIcon, ChevronsRight, ChevronsLeft } from 'lucide-react';


import { supabase } from "../../supabase";
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
        <Button className="copy-button px-4 py-2 rounded bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors mb-2 w-full" onClick={handleCopy}>
          Copy Link
        </Button>
        <Button 
          onClick={handleOpen} 
          className="px-4 py-2 rounded bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors mb-2 w-full"
        >
          Open Link
        </Button>
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

// Add at the top, after imports:
function toUTCISOStringFromLocal(localDateTimeString) {
  // localDateTimeString: 'YYYY-MM-DDTHH:mm' (assumed local time)
  const [date, time] = localDateTimeString.split('T');
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  // Create a Date object in local time
  const local = new Date(year, month - 1, day, hour, minute);
  return new Date(local.getTime() - (local.getTimezoneOffset() * 60000)).toISOString();
}
function toLocalDateTimeInputValue(utcISOString) {
  // Converts UTC ISO string to 'YYYY-MM-DDTHH:mm' in local time for input
  if (!utcISOString) return '';
  const date = new Date(utcISOString);
  const pad = n => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Minimalistic background customization for Quiz Builder
const MinimalBackgroundCustomization = ({ customization, setCustomization }) => {
  const [bgImageInput, setBgImageInput] = useState(customization.backgroundImage || "");
  const [bgImageError, setBgImageError] = useState("");

  // Update input when customization changes
  useEffect(() => {
    setBgImageInput(customization.backgroundImage || "");
  }, [customization.backgroundImage]);

  // Validate image URL
  const validateImageUrl = (url, cb) => {
    if (!url) { cb(true); return; }
    
    // Allow common image formats
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
    const isImageUrl = imageExtensions.test(url) || url.startsWith('data:image');
    
    if (!isImageUrl) {
      cb(false);
      return;
    }
    
    const img = new window.Image();
    img.onload = () => cb(true);
    img.onerror = () => cb(false);
    img.src = url;
  };

  const handleBgImageChange = (value) => {
    setBgImageInput(value);
    if (!value) {
      setBgImageError("");
      setCustomization(prev => ({ ...prev, backgroundImage: "" }));
      return;
    }
    
    // Convert Google Drive links to direct links
    let processedUrl = value;
    if (value.includes('drive.google.com')) {
      const match = value.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        processedUrl = `https://drive.google.com/uc?export=view&id=${match[1]}`;
      }
    }
    
    validateImageUrl(processedUrl, (isValid) => {
      if (isValid) {
        setBgImageError("");
        setCustomization(prev => ({ ...prev, backgroundImage: processedUrl }));
        // Show success notification
        if (processedUrl) {
          const notification = document.createElement('div');
          notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #10b981;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          `;
          notification.textContent = 'Background image applied successfully!';
          document.body.appendChild(notification);
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 3000);
        }
      } else {
        setBgImageError("Invalid image URL. Please use a direct/public image link.");
      }
    });
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 10 }}>Background</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <label style={{ fontWeight: 500, fontSize: 15 }}>Color:</label>
        <input
          type="color"
          value={customization.backgroundColor || '#ffffff'}
          onChange={e => setCustomization(prev => ({ ...prev, backgroundColor: e.target.value }))}
          style={{ width: 38, height: 38, border: 'none', borderRadius: 8, background: '#f7fafc', boxShadow: '0 1px 4px rgba(44,62,80,0.07)' }}
        />
        <div style={{ width: 38, height: 38, borderRadius: 8, background: customization.backgroundColor || '#fff', border: '1.5px solid #e5e7eb' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontWeight: 500, fontSize: 15 }}>Image URL:</label>
        <input
          type="text"
          placeholder="Paste image URL (optional)"
          value={bgImageInput}
          onChange={e => handleBgImageChange(e.target.value)}
          onBlur={e => handleBgImageChange(e.target.value)}
          style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 15, background: '#f7fafc', color: '#2d314d' }}
        />
        {bgImageError && <div style={{ color: 'red', fontSize: 13 }}>{bgImageError}</div>}
        {customization.backgroundImage && !bgImageError && (
          <div style={{ position: 'relative', width: '100%', height: 60, background: `url(${customization.backgroundImage}) center/cover no-repeat`, border: '1px dashed #ccc', borderRadius: 4, marginTop: 6 }}>
            <button
              onClick={() => handleBgImageChange('')}
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: 20,
                height: 20,
                fontSize: 12,
                cursor: 'pointer'
              }}
              title="Remove background image"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// 🔲 Main Quiz Builder
export default function Quiz() {
  const { quizId } = useParams();
  const location = useLocation();
  const [title, setTitle] = useState("");
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
  const [slideTransition, setSlideTransition] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showModal, setShowModal] = useState(false);
  // Removed dark mode state
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
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const pendingNavigationRef = useRef(null);
  const navigate = useNavigate();

  // Collapse left sidebar by default for blank quiz (only one default slide and blank question)
  const isBlankQuiz = slides.length === 1 && !slides[0].question && (!slides[0].options || slides[0].options.every(opt => !opt));
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(isBlankQuiz);

  // --- Bulletproof Unsaved Changes Logic ---
  const [initialSlides, setInitialSlides] = useState('');
  const [initialTitle, setInitialTitle] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  function setInitialStateNow(slidesArr, quizTitle) {
    setInitialSlides(JSON.stringify(slidesArr));
    setInitialTitle(quizTitle);
  }

  // After loading from DB/AI, call setInitialStateNow(loadedSlides, loadedTitle)
  // After saving, call setInitialStateNow(slides, title)

  useEffect(() => {
    setHasUnsavedChanges(
      JSON.stringify(slides) !== initialSlides || title !== initialTitle
    );
  }, [slides, title, initialSlides, initialTitle]);
  // --- End Bulletproof Logic ---

  // Set initial tab from query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'results') setActiveTab('results');
    else setActiveTab('edit');
    
    // Set initialized after a short delay to prevent glitchy start
    setTimeout(() => setIsInitialized(true), 100);
    
    // Prevent scrolling on quiz page
    document.body.classList.add('quiz-page');
    document.documentElement.classList.add('quiz-page');
    
    return () => {
      document.body.classList.remove('quiz-page');
      document.documentElement.classList.remove('quiz-page');
    };
  }, [location.search]);

  // Cleanup saved state when navigating away
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Only clear if not returning from preview
      if (!localStorage.getItem('quizState')) {
        localStorage.removeItem('quizDraft');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Removed dark mode effects

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
      const quizId = location.state.quizId;
      const formattedSlides = aiQuestions.map((q, index) => ({
        id: q.id || Date.now() + index,
        name: q.question || `Question ${index + 1}`,
        type: 'multiple',
        question: q.question || '',
        options: q.options || ['', '', '', ''],
        correctAnswers: Array.isArray(q.correct_answers) ? q.correct_answers : [0],
        background: '#ffffff',
        textColor: '#000000',
        fontFamily: textStyles[0].value,
      }));
      setSlides(formattedSlides);
      setTitle(location.state.topic || 'AI Generated Quiz');
      setPublishedQuizId(quizId); // Use the UUID quiz ID
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
            
            // Load customization settings from database
            if (quizData.customization_settings) {
              try {
                const parsedSettings = JSON.parse(quizData.customization_settings);
                setCustomization(prev => ({
                  ...prev,
                  backgroundColor: parsedSettings.backgroundColor || '#ffffff',
                  backgroundImage: parsedSettings.backgroundImage || '',
                }));
              } catch (error) {
                console.error('Error parsing customization settings:', error);
              }
            }
            
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
            setStartDateTime(quizData.start_time ? toLocalDateTimeInputValue(quizData.start_time) : "");
            setEndDateTime(quizData.end_time ? toLocalDateTimeInputValue(quizData.end_time) : "");
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
      
      // Load customization settings from database
      if (quizData.customization_settings) {
        try {
          const parsedSettings = JSON.parse(quizData.customization_settings);
          setCustomization(prev => ({
            ...prev,
            backgroundColor: parsedSettings.backgroundColor || '#ffffff',
            backgroundImage: parsedSettings.backgroundImage || '',
          }));
        } catch (error) {
          console.error('Error parsing customization settings:', error);
        }
      }
      
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
          correctAnswers: s.correctAnswers || [],
          background: s.background || '#ffffff',
          textColor: s.text_color || '#000000',
          fontFamily: s.font_family || textStyles[0].value,
        })));
        setSelectedSlide(0);
      }
      setStartDateTime(quizData.start_time ? toLocalDateTimeInputValue(quizData.start_time) : "");
      setEndDateTime(quizData.end_time ? toLocalDateTimeInputValue(quizData.end_time) : "");
    }
    fetchQuizAndSlides();
  }, [quizId]);

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
    // Always navigate to dashboard
    navigate('/dashboard');
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
    console.log('handlePublishOrSave started');
    
    // Validate quiz content
    if (!title || title.trim() === '') {
      setNotification('Please enter a quiz title.');
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    if (!slides || slides.length === 0) {
      setNotification('Please add at least one slide to your quiz.');
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    // Check if slides have content
    const hasContent = slides.some(slide => 
      slide.question && slide.question.trim() !== '' && 
      slide.options && slide.options.length > 0 && 
      slide.options.some(opt => opt && opt.trim() !== '')
    );
    
    if (!hasContent) {
      setNotification('Please add questions and options to your quiz.');
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    try {
      const { data: user, error: userError } = await supabase.auth.getUser();
      if (userError || !user?.user) {
        setNotification('Unable to get user info.');
        console.error('User error:', userError);
        return;
      }
      console.log('User authenticated:', user.user.email);
    const { id: user_id, email } = user.user;
    const customization_settings = JSON.stringify({
      fontFamily: currentSlide?.fontFamily || textStyles[0].value,
      textColor: currentSlide?.textColor || '#000000',
      background: currentSlide?.background || '#ffffff',
      backgroundColor: customization.backgroundColor || '#ffffff',
      backgroundImage: customization.backgroundImage || '',
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
          start_time: startDateTime ? toUTCISOStringFromLocal(startDateTime) : null,
          end_time: endDateTime ? toUTCISOStringFromLocal(endDateTime) : null,
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
          start_time: startDateTime ? toUTCISOStringFromLocal(startDateTime) : null,
          end_time: endDateTime ? toUTCISOStringFromLocal(endDateTime) : null,
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
    const localSlideIds = slides.filter(s => s.id && typeof s.id === 'string' && s.id.length > 20).map(s => s.id); // Only consider valid UUIDs
    // 2. Compute slides to update, insert, delete
    const slidesToUpdate = slides.filter(s => s.id && typeof s.id === 'string' && s.id.length > 20 && dbSlideIds.includes(s.id));
    const slidesToInsert = slides.filter(s => !s.id || typeof s.id !== 'string' || s.id.length <= 20); // Include slides with temporary IDs
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
      ...(slide.id && typeof slide.id === 'string' && slide.id.length > 20 ? { id: slide.id } : {}), // Only include valid UUIDs
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
      setNotification('Failed to fetch slides after save: '      + fetchError.message);
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
      correctAnswers: s.correctAnswers || [],
      background: s.background || '#ffffff',
      textColor: s.text_color || '#000000',
      fontFamily: s.font_family || textStyles[0].value,
    })));
    // Reset selectedSlide if out of bounds
    setSelectedSlide(prev => (validSlides.length === 0 ? 0 : Math.min(prev, validSlides.length - 1)));
    setNotification('Quiz and slides saved to Supabase!');
    setShowModal(true);
    setTimeout(() => setNotification(null), 3000);
    setInitialStateNow(slides, title);
    
    // Clear saved state after successful save
    localStorage.removeItem('quizState');
    console.log('Cleared saved quiz state after successful save');
    } catch (error) {
      console.error('Error in handlePublishOrSave:', error);
      setNotification('Error saving quiz: ' + error.message);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Quiz-wide customization state
  const [customization, setCustomization] = useState({
    backgroundColor: '#ffffff',
    backgroundImage: '',
  });

  // Load customization and quiz state from localStorage on mount
  useEffect(() => {
    const savedCustomization = localStorage.getItem('quizCustomization');
    if (savedCustomization) {
      try {
        const parsed = JSON.parse(savedCustomization);
        setCustomization(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Error loading customization from localStorage:', error);
      }
    }

    // Restore quiz state from localStorage if returning from preview
    const savedQuizState = localStorage.getItem('quizState');
    if (savedQuizState) {
      try {
        const parsed = JSON.parse(savedQuizState);
        if (parsed.slides && parsed.slides.length > 0) {
          setSlides(parsed.slides);
          setTitle(parsed.title || 'Untitled Quiz');
          setSelectedSlide(parsed.selectedSlide || 0);
          console.log('Restored quiz state from localStorage:', parsed);
        }
      } catch (error) {
        console.error('Error loading quiz state from localStorage:', error);
      }
    }
  }, []);

  // Save customization to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('quizCustomization', JSON.stringify(customization));
    console.log('Customization updated:', customization);
  }, [customization]);

  const gradientBg = {
    backgroundColor: customization.backgroundImage ? 'transparent' : (customization.backgroundColor || '#f8fafc'),
    backgroundImage: customization.backgroundImage ? `url(${customization.backgroundImage})` : undefined,
    backgroundSize: customization.backgroundImage ? 'cover' : undefined,
    backgroundPosition: customization.backgroundImage ? 'center' : undefined,
    backgroundRepeat: customization.backgroundImage ? 'no-repeat' : undefined,
    backgroundAttachment: customization.backgroundImage ? 'fixed' : undefined,
    minHeight: '100vh',
    width: '100%',
    transition: 'background 0.3s',
  };

  // Debug log for background image
  useEffect(() => {
    if (customization.backgroundImage) {
      console.log('Background image URL:', customization.backgroundImage);
      console.log('GradientBg style:', gradientBg);
    }
  }, [customization.backgroundImage, gradientBg]);

  // Add state for customization tab
  const [customTab, setCustomTab] = useState('templates');
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  // Collapsible customize panel state
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(true);

  // Preview mode component
  const PreviewMode = () => {
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const currentPreviewSlide = slides[currentSlideIndex];

    const handleNext = () => {
      if (currentSlideIndex < slides.length - 1) {
        setCurrentSlideIndex(currentSlideIndex + 1);
      }
    };

    const handlePrev = () => {
      if (currentSlideIndex > 0) {
        setCurrentSlideIndex(currentSlideIndex - 1);
      }
    };

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: customization.backgroundImage ? 'transparent' : (customization.backgroundColor || '#f8fafc'),
        backgroundImage: customization.backgroundImage ? `url(${customization.backgroundImage})` : undefined,
        backgroundSize: customization.backgroundImage ? 'cover' : undefined,
        backgroundPosition: customization.backgroundImage ? 'center' : undefined,
        backgroundRepeat: customization.backgroundImage ? 'no-repeat' : undefined,
        backgroundAttachment: customization.backgroundImage ? 'fixed' : undefined,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        {/* Preview Header */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 1001
        }}>
          <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{title || 'Untitled Quiz'}</div>
          <button
            onClick={() => setIsPreviewMode(false)}
            style={{
              background: 'rgba(37,99,235,0.8)',
              backdropFilter: 'blur(10px) saturate(180%)',
              WebkitBackdropFilter: 'blur(10px) saturate(180%)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              padding: '8px 16px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(37,99,235,0.9)';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(37,99,235,0.8)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <span>←</span> Back to Edit
          </button>
        </div>

        {/* Preview Content */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '18px',
          boxShadow: '0 8px 32px rgba(60,60,100,0.10)',
          maxWidth: '600px',
          width: '100%',
          padding: '2rem',
          marginTop: '4rem',
          position: 'relative'
        }}>
          {/* Progress Bar */}
          <div style={{ width: '100%', height: '6px', background: '#e5eaf0', borderRadius: '4px', marginBottom: '1.5rem' }}>
            <div style={{ 
              width: `${((currentSlideIndex + 1) / slides.length) * 100}%`, 
              height: '100%', 
              background: '#3b82f6', 
              borderRadius: '4px', 
              transition: 'width 0.3s' 
            }} />
          </div>

          {/* Question */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontWeight: 600, color: '#6b7280', marginBottom: '0.5rem' }}>
              Question {currentSlideIndex + 1} of {slides.length}
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937' }}>
              {currentPreviewSlide?.question || 'No question'}
            </h2>
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {currentPreviewSlide?.options?.map((option, index) => (
              <button
                key={index}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(10px) saturate(180%)',
                  color: '#1f2937',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  padding: '1rem',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255,255,255,0.2)';
                  e.target.style.borderColor = 'rgba(59,130,246,0.5)';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255,255,255,0.1)';
                  e.target.style.borderColor = 'rgba(255,255,255,0.2)';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                {option}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginTop: '2rem',
            gap: '1rem'
          }}>
            <button
              onClick={handlePrev}
              disabled={currentSlideIndex === 0}
              style={{
                background: currentSlideIndex === 0 ? 'rgba(243,244,246,0.3)' : 'rgba(59,130,246,0.8)',
                backdropFilter: 'blur(10px) saturate(180%)',
                WebkitBackdropFilter: 'blur(10px) saturate(180%)',
                color: currentSlideIndex === 0 ? '#9ca3af' : 'white',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                fontWeight: 600,
                cursor: currentSlideIndex === 0 ? 'not-allowed' : 'pointer',
                opacity: currentSlideIndex === 0 ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={currentSlideIndex === slides.length - 1}
              style={{
                background: currentSlideIndex === slides.length - 1 ? 'rgba(243,244,246,0.3)' : 'rgba(59,130,246,0.8)',
                backdropFilter: 'blur(10px) saturate(180%)',
                WebkitBackdropFilter: 'blur(10px) saturate(180%)',
                color: currentSlideIndex === slides.length - 1 ? '#9ca3af' : 'white',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                fontWeight: 600,
                cursor: currentSlideIndex === slides.length - 1 ? 'not-allowed' : 'pointer',
                opacity: currentSlideIndex === slides.length - 1 ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={gradientBg} className="quiz-page-container">
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
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 p-4 flex justify-between items-center shrink-0" style={{ position: 'relative', zIndex: 20 }}>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            className="rounded-full px-4 py-2 shadow-md border-2 flex items-center gap-2 hover:bg-gray-50 hover:border-blue-500 transition-all duration-150"
            style={{
              background: 'transparent',
              color: '#374151',
              borderColor: '#d1d5db',
              fontWeight: 500,
              fontSize: 14,
              boxShadow: '0 1px 2px 0 rgba(0,0,0,0.04)',
              letterSpacing: '0.01em',
              minWidth: 110,
              outline: 'none',
            }}
            onClick={() => {
              // Clear saved state when explicitly navigating away
              localStorage.removeItem('quizState');
              localStorage.removeItem('quizDraft');
              navigate('/dashboard');
            }}
            title="Back to Dashboard"
          >
            <span style={{ display: 'flex', alignItems: 'center', marginRight: 6 }}><FiArrowLeft style={{ fontSize: 20, marginRight: 2 }} /></span>
            <span style={{ marginLeft: 0 }}>Back</span>
          </Button>
          <input
            type="text"
            placeholder="Untitled Quiz"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="text-xl font-bold border-none outline-none bg-transparent text-gray-800 w-72"
          />
          {/* Removed Results button from here, will move next to Preview */}
        </div>
        <div className="flex gap-2 items-center">
          {/* Dark mode toggle removed */}
          <Button
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-sm"
            style={{ background: '#fff', color: '#374151', border: '1px solid #d1d5db', fontWeight: 500, borderRadius: 8, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.04)', fontSize: 14 }}
            onClick={() => {
              setIsPreviewMode(!isPreviewMode);
            }}
            title="Preview as Admin"
          >
            <FiEye /> Preview
          </Button>
          <Button
            onClick={() => {
              // Redirect to the dedicated results page
              const quizIdToUse = publishedQuizId || quizId;
              if (quizIdToUse) {
                navigate(`/quiz/${quizIdToUse}/results`); // Corrected path
              } else {
                // If no quiz ID, show a message or handle accordingly
                setNotification('Please save/publish the quiz first to view results.');
                setTimeout(() => setNotification(null), 3000);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-sm"
            style={{ background: '#fff', color: '#374151', border: '1px solid #d1d5db', fontWeight: 500, borderRadius: 8, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.04)', fontSize: 14 }}
          >
            <FiBarChart2 style={{ marginRight: 4, color: '#6b7280', fontSize: 16 }} />
            Results
          </Button>
          <Button
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-sm"
            style={{ background: '#fff', color: '#374151', border: '1px solid #d1d5db', fontWeight: 500, borderRadius: 8, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.04)', fontSize: 14 }}
            onClick={() => {
              if (isPublishing) return;
              console.log('Publish button clicked');
              console.log('Current quiz state:', { title, slides, publishedQuizId });
              setIsPublishing(true);
              handlePublishOrSave().finally(() => setIsPublishing(false));
            }}
            disabled={isPublishing}
            title={publishedQuizId ? "Save" : "Publish"}
          >
            {isPublishing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
            ) : (
              publishedQuizId ? <FiSave /> : <FiUpload />
            )} {isPublishing ? "Saving..." : (publishedQuizId ? "Save" : "Publish")}
          </Button>
          {/* Customize toggle button */}
          <Button
            className={`rounded-full px-3 py-2 shadow-sm border ml-2 ${isCustomizeOpen ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-600'}`}
            style={{ borderColor: 'var(--border)' }}
            onClick={() => setIsCustomizeOpen(v => !v)}
            title={isCustomizeOpen ? 'Hide Customize Panel' : 'Show Customize Panel'}
          >
            <FiSettings />
          </Button>
        </div>
      </header>
      {/* Main Layout */}
      <div className="flex w-full" style={{ background: 'transparent', height: 'calc(100vh - 4.5rem)', position: 'relative', overflow: 'hidden', zIndex: 1 }}>
        {/* Left Sidebar: Add Slide & Slide List */}
        <aside className={`bg-white border-r transition-all duration-300 ease-in-out flex flex-col ${isLeftSidebarCollapsed ? 'w-20' : 'w-64'}`} style={{ width: isLeftSidebarCollapsed ? '5rem' : '16rem', flexShrink: 0, position: 'fixed', left: 0, top: '4.5rem', height: 'calc(100vh - 4.5rem)', zIndex: 10 }}>
          <div className="p-4 flex-1 overflow-y-auto">
            <button
              onClick={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
              className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 mb-4"
              title={isLeftSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              style={{ border: '1px solid #e5e7eb' }}
            >
              {isLeftSidebarCollapsed ? <ChevronsRight className="w-5 h-5" /> : <ChevronsLeft className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setAddSlidePopupOpen(true)}
              className="w-full px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg shadow-sm hover:bg-indigo-700 transition mb-4 flex items-center justify-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              {!isLeftSidebarCollapsed && <span>Add Slide</span>}
            </button>
            <div className="space-y-2">
              {slides.map((slide, index) => (
                <div key={slide.id} className={`p-3 rounded-lg flex items-center cursor-pointer overflow-hidden ${selectedSlide === index ? 'bg-blue-100' : 'bg-gray-100 hover:bg-gray-200'}`}
                  onClick={() => {
                    setSlideTransition(true);
                    setTimeout(() => {
                      setSelectedSlide(index);
                      setTimeout(() => setSlideTransition(false), 100);
                    }, 200);
                  }}
                  title={slide.question || 'Untitled Slide'}
                >
                  <span className="text-gray-500 font-bold">{String(index + 1).padStart(2, '0')}</span>
                  {!isLeftSidebarCollapsed && (
                    <span className="font-semibold text-gray-800 truncate ml-3">
                      {slide.question || 'Untitled Slide'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          {addSlidePopupOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg flex flex-col items-center">
                <h3 className="text-xl font-bold mb-6 text-blue-700">Add New Slide</h3>
                <div className="flex gap-4 mb-6">
                  {questionTypes.map(qt => (
                    <button
                      key={qt.value}
                      className="px-6 py-3 rounded-lg bg-indigo-100 text-indigo-700 font-semibold shadow hover:bg-indigo-200 transition-all"
                      onClick={() => {
                        addSlide(qt.value);
                        setAddSlidePopupOpen(false);
                      }}
                    >
                      {qt.label}
                    </button>
                  ))}
                </div>
                <button
                  className="mt-2 px-4 py-2 rounded bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300"
                  onClick={() => setAddSlidePopupOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Center Content Area */}
        <div
          className="flex-1 flex min-h-screen quiz-center-content"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "2rem",
            transition: "all 0.3s ease",
            marginLeft: isLeftSidebarCollapsed ? "5rem" : "16rem", // left panel width
            marginRight: isCustomizeOpen ? "20rem" : "0rem",       // right panel width
            position: "relative",
            overflow: "hidden",
            height: "calc(100vh - 4.5rem)",
            width: `calc(100vw - ${isLeftSidebarCollapsed ? "5rem" : "16rem"} - ${isCustomizeOpen ? "20rem" : "0rem"})`,
            maxWidth: "100%",
            flex: 1,
          }}
        >
          {/* Dynamic Background Particles */}
          <div className="quiz-particles">
            <div className="quiz-particle"></div>
            <div className="quiz-particle"></div>
            <div className="quiz-particle"></div>
            <div className="quiz-particle"></div>
            <div className="quiz-particle"></div>
          </div>
          
          <div 
            className="max-w-2xl w-full flex flex-col gap-6 justify-center items-center"
            style={{
              animation: isInitialized ? "slideInFromCenter 0.6s ease-out" : "none",
              transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              position: "relative",
              zIndex: 1,
              margin: "0 auto",
              padding: "1rem",
              width: "100%",
              maxWidth: "700px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              opacity: isInitialized ? 1 : 0,
              transform: isInitialized ? "translateY(0)" : "translateY(20px)",
              height: "100%",
            }}
          >
            <div 
              className={`border-2 rounded-2xl shadow-2xl quiz-slide-container ${slideTransition ? 'slide-transition-enter' : ''}`}
              style={{
                boxShadow: '0 8px 32px 0 rgba(44,62,80,0.12)',
                borderColor: 'rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                border: '1px solid rgba(255,255,255,0.2)',
                backgroundImage: currentSlide?.backgroundImage ? `url(${currentSlide.backgroundImage})` : (customization.backgroundImage ? `url(${customization.backgroundImage})` : undefined),
                backgroundSize: currentSlide?.backgroundImage ? 'cover' : (customization.backgroundImage ? 'cover' : undefined),
                backgroundPosition: currentSlide?.backgroundImage ? 'center' : (customization.backgroundImage ? 'center' : undefined),
                backgroundRepeat: currentSlide?.backgroundImage ? 'no-repeat' : (customization.backgroundImage ? 'no-repeat' : undefined),
                borderRadius: (currentSlide?.borderRadius || defaultSlideStyle.borderRadius),
                color: currentSlide?.textColor || defaultSlideStyle.textColor,
                fontFamily: currentSlide?.fontFamily || defaultSlideStyle.fontFamily,
                fontSize: currentSlide?.fontSize || defaultSlideStyle.fontSize,
                fontWeight: currentSlide?.bold ? 'bold' : 'normal',
                fontStyle: currentSlide?.italic ? 'italic' : 'normal',
                boxShadow: currentSlide?.shadow ? '0 4px 16px 0 rgba(0,0,0,0.08)' : '0 8px 32px 0 rgba(44,62,80,0.12)',
                padding: '2rem 2rem 2.5rem 2rem',
                margin: '0',
                textAlign: currentSlide?.alignment || defaultSlideStyle.alignment,
                transition: slideTransition ? 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                boxSizing: 'border-box',
                overflow: 'hidden',
                height: 'auto',
                maxHeight: '600px',
                transform: slideTransition ? 'translateX(50px)' : 'translateX(0)',
                opacity: slideTransition ? 0.5 : 1,
                animation: slideTransition ? 'none' : (isInitialized ? 'slideInFromCenter 0.6s ease-out' : 'none'),
              }}
              onMouseEnter={(e) => {
                if (!slideTransition) {
                  e.currentTarget.style.transform = 'scale(1.02) translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px 0 rgba(44,62,80,0.18)';
                }
              }}
              onMouseLeave={(e) => {
                if (!slideTransition) {
                  e.currentTarget.style.transform = 'scale(1) translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(44,62,80,0.12)';
                }
              }}
            >
              <div 
              className="font-semibold mb-2 text-blue-700"
              style={{
                animation: 'slideInFromLeft 0.5s ease-out',
                transform: 'translateX(0)',
                transition: 'all 0.3s ease'
              }}
            >
              Slide {selectedSlide + 1} of {slides.length}
            </div>
              <div 
              className="flex gap-3 mb-4"
              style={{
                animation: 'slideInFromRight 0.5s ease-out',
                transform: 'translateX(0)',
                transition: 'all 0.3s ease'
              }}
            >
              {questionTypes.map((qt, index) => (
                <button
                  key={qt.value}
                  className={`quizbuilder-question-type-btn${currentSlide?.type === qt.value ? ' active' : ''}`}
                  style={{ 
                    padding: '6px 14px', 
                    fontSize: 14, 
                    borderRadius: 8, 
                    border: 'none', 
                    fontWeight: 600, 
                    background: currentSlide?.type === qt.value ? '#2563eb' : '#f7f8fa', 
                    color: currentSlide?.type === qt.value ? '#fff' : '#2563eb', 
                    marginRight: 8,
                    animation: `slideInFromRight 0.5s ease-out ${index * 0.1}s`,
                    transform: 'translateX(0)',
                    transition: 'all 0.3s ease'
                  }}
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
                      if (!Array.isArray(currentSlide?.options) || currentSlide?.options.length < 2) {
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
              value={currentSlide?.question}
              onChange={(e) => updateSlide("question", e.target.value)}
              className="quizbuilder-question-input w-full p-4 border border-gray-200 rounded-lg text-lg shadow-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all mb-4"
              style={{ 
                color: '#222', 
                background: '#f8fafc', 
                borderColor: '#e0e7ff', 
                fontFamily: 'Inter, Arial, sans-serif',
                animation: 'slideInFromCenter 0.6s ease-out 0.2s both',
                transform: 'translateY(0)',
                transition: 'all 0.3s ease'
              }}
            />
            {/* Render input UI based on type */}
            {currentSlide?.type === 'multiple' && (
              <div 
                className="space-y-3 w-full"
                style={{
                  animation: 'slideInFromCenter 0.6s ease-out 0.4s both',
                  transform: 'translateY(0)',
                  transition: 'all 0.3s ease'
                }}
              >
                {currentSlide?.options.map((opt, i) => {
                  const isCorrect = currentSlide?.correctAnswers.includes(i);
           
                  return (
                    <div key={i} className="quizbuilder-option-row flex items-center px-4 py-2 rounded-full border transition-all duration-200 group mb-2" style={{ minHeight: '56px', position: 'relative', boxShadow: 'none', background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                      <input
                        type="checkbox"
                        name={`correct-answer-${selectedSlide}`}
                        checked={isCorrect}
                        onChange={() => {
                          let newAnswers = currentSlide?.correctAnswers.includes(i)
                            ? currentSlide?.correctAnswers.filter(idx => idx !== i)
                            : [i];
                          updateSlide('correctAnswers', newAnswers);
                        }}
                        className="accent-blue-600 mr-2"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(i, e.target.value)}
                        placeholder={`Option ${i + 1}`}
                        className="flex-1 bg-transparent border-none outline-none px-2 py-2 text-base font-semibold rounded-full focus:ring-0 focus:outline-none"
                        style={{ color: 'var(--text)', fontFamily: 'Inter, Arial, sans-serif', background: 'transparent' }}
                      />
                      {currentSlide?.options.length > 2 && (
                        <button onClick={() => removeOption(i)} className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center transition-all ml-2" style={{ boxShadow: 'none', border: 'none', padding: 0, marginRight: 0 }} title="Delete option"><FiTrash2 /></button>
                      )}
                    </div>
                  );
                })}
                {currentSlide?.options.length < 4 ? (
                  <Button variant="outline" className="quizbuilder-add-option-btn w-full mt-2" style={{ borderColor: '#4f8cff', color: '#4f8cff', background: '#e0e7ff' }} onClick={() => {
                    const updatedSlides = [...slides];
                    updatedSlides[selectedSlide].options.push("");
                    setSlides(updatedSlides);
                  }}>+ Add Option</Button>
                ) : null}
              </div>
            )}
            {currentSlide?.type === 'true_false' && (
              <div 
                className="space-y-3 w-full"
                style={{
                  animation: 'slideInFromCenter 0.6s ease-out 0.4s both',
                  transform: 'translateY(0)',
                  transition: 'all 0.3s ease'
                }}
              >
                {['True', 'False'].map((opt, i) => {
                  const isCorrect = currentSlide?.correctAnswers.includes(i);
                  return (
                    <div key={i} className="quizbuilder-option-row flex items-center px-4 py-2 rounded-full border transition-all duration-200 group mb-2" style={{ minHeight: '56px', position: 'relative', boxShadow: 'none', background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                      <input
                        type="checkbox"
                        name={`correct-answer-${selectedSlide}`}
                        checked={isCorrect}
                        onChange={() => {
                          let newAnswers = currentSlide?.correctAnswers.includes(i)
                            ? currentSlide?.correctAnswers.filter(idx => idx !== i)
                            : [i];
                          updateSlide('correctAnswers', newAnswers);
                        }}
                        className="accent-blue-600 mr-2"
                      />
                      <input
                        type="text"
                        value={opt}
                        disabled
                        className="flex-1 bg-transparent border-none outline-none px-2 py-2 text-base font-semibold rounded-full focus:ring-0 focus:outline-none"
                        style={{ color: 'var(--text)', fontFamily: 'Inter, Arial, sans-serif', background: 'transparent' }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            {currentSlide?.type === 'one_word' && (
              <div 
                className="space-y-3 w-full"
                style={{
                  animation: 'slideInFromCenter 0.6s ease-out 0.4s both',
                  transform: 'translateY(0)',
                  transition: 'all 0.3s ease'
                }}
              >
                <div className="quizbuilder-option-row flex items-center px-4 py-2 rounded-full border transition-all duration-200 group mb-2" style={{ minHeight: '56px', position: 'relative', boxShadow: 'none', background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                  <span className="font-semibold mr-2">Correct Answer:</span>
                  <input
                    type="text"
                    value={currentSlide?.correctAnswers[0] || ''}
                    onChange={e => updateSlide('correctAnswers', [e.target.value])}
                    placeholder="Enter the correct answer"
                    className="flex-1 bg-transparent border-none outline-none px-2 py-2 text-base font-semibold rounded-full focus:ring-0 focus:outline-none"
                    style={{ color: 'var(--text)', fontFamily: 'Inter, Arial, sans-serif', background: 'transparent' }}
                  />
                </div>
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Right Panel: Customization */}
        <aside className={`fixed right-0 top-[4.5rem] h-[calc(100vh-4.5rem)] w-80 min-w-[16rem] p-[2rem_1.5rem] shadow-lg z-20 transition-transform duration-300 flex flex-col bg-white overflow-y-auto ${isCustomizeOpen ? 'translate-x-0' : 'translate-x-full'}`} style={{ borderRadius: 0, margin: 0, background: 'var(--card)', color: 'var(--text)', boxShadow: '0 4px 24px 0 var(--border)' }}>
          {isCustomizeOpen && (
            <>
              <div className="flex mb-6 border-b" style={{ borderColor: 'var(--border)' }}>
                <button
                  className={`flex-1 py-2 text-center font-semibold ${customTab === 'templates' ? 'border-b-2 border-blue-500 text-blue-700' : 'text-gray-500'}`}
                  onClick={() => setCustomTab('templates')}
                  type="button"
                  style={{ background: 'none', borderColor: customTab === 'templates' ? '#3b82f6' : 'transparent', color: customTab === 'templates' ? 'var(--accent)' : 'var(--text-secondary)' }}
                >
                  Templates
                </button>
                <button
                  className={`flex-1 py-2 text-center font-semibold ${customTab === 'advanced' ? 'border-b-2 border-blue-500 text-blue-700' : 'text-gray-500'}`}
                  onClick={() => setCustomTab('advanced')}
                  type="button"
                  style={{ background: 'none', borderColor: customTab === 'advanced' ? '#3b82f6' : 'transparent', color: customTab === 'advanced' ? 'var(--accent)' : 'var(--text-secondary)' }}
                >
                  Advanced
                </button>
              </div>
              {/* Templates Tab */}
              {customTab === 'templates' && (
                <div className="flex flex-col gap-6 mb-4">
                  {/* Dark Mode Template */}
                  <button
                    type="button"
                    className={`flex items-center gap-4 rounded-2xl border-2 p-5 transition group ${currentSlide?.background === '#222' && currentSlide?.textColor === '#fff' ? 'border-black shadow-lg' : 'border-gray-300'} bg-[#222] hover:shadow-2xl hover:-translate-y-1`}
                    style={{ color: '#fff' }}
                    onClick={() => updateSlide('background', '#222') || updateSlide('textColor', '#fff')}
                  >
                    <div className="w-2 h-14 rounded-l-xl" style={{ background: '#222' }}></div>
                    <div className="flex flex-col items-start">
                      <span className="font-bold text-lg group-hover:underline" style={{ color: '#fff' }}>Dark Mode</span>
                      <span className="text-xs" style={{ color: '#e5e7eb' }}>bg-gray-900 text-white</span>
                    </div>
                  </button>
                  {/* Light Mode Template */}
                  <button
                    type="button"
                    className={`flex items-center gap-4 rounded-2xl border-2 p-5 transition group ${currentSlide?.background === '#fff' && currentSlide?.textColor === '#111' ? 'border-black shadow-lg' : 'border-gray-200'} bg-white hover:shadow-2xl hover:-translate-y-1`}
                    style={{ color: '#111' }}
                    onClick={() => updateSlide('background', '#fff') || updateSlide('textColor', '#111')}
                  >
                    <div className="w-2 h-14 rounded-l-xl" style={{ background: '#fff', border: '1px solid #e5e7eb' }}></div>
                    <div className="flex flex-col items-start">
                      <span className="font-bold text-lg group-hover:underline" style={{ color: '#111' }}>Light Mode</span>
                      <span className="text-xs" style={{ color: '#6b7280' }}>bg-white text-black</span>
                    </div>
                  </button>
                  {/* Ocean Blue Template */}
                  <button
                    type="button"
                    className={`flex items-center gap-4 rounded-2xl border-2 p-5 transition group ${currentSlide?.background === '#dbeafe' && currentSlide?.textColor === '#1e3a8a' ? 'border-blue-500 shadow-lg' : 'border-blue-300'} bg-[#dbeafe] hover:shadow-2xl hover:-translate-y-1`}
                    style={{ color: '#1e3a8a' }}
                    onClick={() => updateSlide('background', '#dbeafe') || updateSlide('textColor', '#1e3a8a')}
                  >
                    <div className="w-2 h-14 rounded-l-xl" style={{ background: '#60a5fa' }}></div>
                    <div className="flex flex-col items-start">
                      <span className="font-bold text-lg group-hover:underline" style={{ color: '#1e3a8a' }}>Ocean Blue</span>
                      <span className="text-xs" style={{ color: '#1e3a8a' }}>bg-blue-100 text-blue-900</span>
                    </div>
                  </button>
                  {/* Sunshine Yellow Template */}
                  <button
                    type="button"
                    className={`flex items-center gap-4 rounded-2xl border-2 p-5 transition group ${currentSlide?.background === '#fef9c3' && currentSlide?.textColor === '#a16207' ? 'border-yellow-400 shadow-lg' : 'border-yellow-200'} bg-[#fef9c3] hover:shadow-2xl hover:-translate-y-1`}
                    style={{ color: '#a16207' }}
                    onClick={() => updateSlide('background', '#fef9c3') || updateSlide('textColor', '#a16207')}
                  >
                    <div className="w-2 h-14 rounded-l-xl" style={{ background: '#fde68a' }}></div>
                    <div className="flex flex-col items-start">
                      <span className="font-bold text-lg group-hover:underline" style={{ color: '#a16207' }}>Sunshine Yellow</span>
                      <span className="text-xs" style={{ color: '#a16207' }}>bg-yellow-100 text-yellow-900</span>
                    </div>
                  </button>
                  {/* Apply to All Button */}
                  <button
                    type="button"
                    className="flex items-center gap-3 rounded-2xl border-2 p-5 transition font-bold bg-blue-50 border-blue-500 text-blue-700 hover:bg-blue-100 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                    style={{ boxShadow: '0 2px 12px #3b82f633', marginTop: 8 }}
                    onClick={() => {
                      const {
                        background = '#ffffff',
                        textColor = '#000000',
                        fontFamily = textStyles[0].value,
                        fontSize = 20,
                        alignment = 'center',
                        bold = false,
                        italic = false,
                        shadow = false,
                        borderRadius = 20,
                      } = currentSlide || {};
                      setSlides(prev => prev.map(slide => ({
                        ...slide,
                        background,
                        textColor,
                        fontFamily,
                        fontSize,
                        alignment,
                        bold,
                        italic,
                        shadow,
                        borderRadius,
                      })));
                      setDefaultSlideStyle(style => ({
                        ...style,
                        background,
                        textColor,
                        fontFamily,
                        fontSize,
                        alignment,
                        bold,
                        italic,
                        shadow,
                        borderRadius,
                      }));
                      setNotification('Applied customization to all slides!');
                      setTimeout(() => setNotification(null), 2000);
                    }}
                  >
                    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 12l5 5 5-5M12 17V3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Apply to All
                  </button>
                  <div className="text-xs text-gray-500 text-center mt-2">Click a template to apply its style instantly.</div>
                </div>
              )}
              {/* Advanced Tab */}
              {customTab === 'advanced' && (
                <div className="space-y-6">
                  <MinimalBackgroundCustomization customization={customization} setCustomization={setCustomization} />
                  <div>
                    <div className="font-semibold mb-2 text-blue-700">Text Style</div>
                    <select
                      className="w-full border rounded-lg p-3 mb-4 text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                      style={{ background: '#f9fafb', color: '#222', borderColor: '#e0e7ff' }}
                      value={currentSlide?.fontFamily || textStyles[0].value}
                      onChange={e => updateSlide('fontFamily', e.target.value)}
                    >
                      {textStyles.map(style => (
                        <option key={style.value} value={style.value} style={{ fontFamily: style.value }}>{style.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="font-semibold mb-2 text-blue-700">Colors</div>
                    <div className="flex items-end gap-6 mb-2">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs text-gray-500">Text</span>
                        <div
                          className="w-8 h-8 rounded-full mb-1 border-2 shadow cursor-pointer"
                          style={{ background: currentSlide?.textColor, borderColor: '#e0e7ff' }}
                          onClick={() => setOpenColorPicker(openColorPicker === 'text' ? null : 'text')}
                        />
                        {openColorPicker === 'text' && (
                          <input
                            type="color"
                            value={currentSlide?.textColor}
                            onChange={e => { updateSlide('textColor', e.target.value); setOpenColorPicker(null); }}
                            className="w-10 h-10 p-0 border-2 rounded-lg bg-transparent cursor-pointer shadow-sm mt-1"
                            style={{ background: 'none', borderColor: '#e0e7ff' }}
                            autoFocus
                            onBlur={() => setOpenColorPicker(null)}
                          />
                        )}
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs text-gray-500">BG</span>
                        <div
                          className="w-8 h-8 rounded-full mb-1 border-2 shadow cursor-pointer"
                          style={{ background: currentSlide?.background, borderColor: '#e0e7ff' }}
                          onClick={() => setOpenColorPicker(openColorPicker === 'bg' ? null : 'bg')}
                        />
                        {openColorPicker === 'bg' && (
                          <input
                            type="color"
                            value={currentSlide?.background}
                            onChange={e => { updateSlide('background', e.target.value); setOpenColorPicker(null); }}
                            className="w-10 h-10 p-0 border-2 rounded-lg bg-transparent cursor-pointer shadow-sm mt-1"
                            style={{ background: 'none', borderColor: '#e0e7ff' }}
                            autoFocus
                            onBlur={() => setOpenColorPicker(null)}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold mb-2 text-blue-700">Font Size</div>
                    <select value={currentSlide?.fontSize || 20} onChange={e => updateSlide('fontSize', parseInt(e.target.value))} className="w-full border rounded p-1">
                      <option value={14}>sm</option>
                      <option value={16}>base</option>
                      <option value={18}>lg</option>
                      <option value={20}>xl</option>
                      <option value={24}>2xl</option>
                      <option value={28}>3xl</option>
                      <option value={32}>4xl</option>
                    </select>
                  </div>
                  {/* --- Quiz Availability Section: removed current IST time display --- */}
                  <hr className="my-4 border-blue-200" />
                  <div style={{ background: '#f3f6fd', borderRadius: 12, padding: 16, marginBottom: 8 }}>
                    <div className="font-semibold mb-2 text-blue-700" style={{ fontSize: 16 }}>Quiz Availability</div>
                    <div className="flex flex-col gap-3">
                      <label>
                        <span className="text-sm">Start Date & Time</span>
                        <input
                          type="datetime-local"
                          value={startDateTime}
                          onChange={e => setStartDateTime(e.target.value)}
                          className="w-full border rounded p-2 mt-1"
                        />
                      </label>
                      <label>
                        <span className="text-sm">End Date & Time</span>
                        <input
                          type="datetime-local"
                          value={endDateTime}
                          onChange={e => setEndDateTime(e.target.value)}
                          className="w-full border rounded p-2 mt-1"
                        />
                      </label>
                      <div className="text-xs text-gray-500 mt-1">Times are in your local timezone. Quiz will only be accessible between these times.</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold mb-2 text-blue-700">Text Alignment</div>
                    <select value={currentSlide?.alignment || 'center'} onChange={e => updateSlide('alignment', e.target.value)} className="w-full border rounded p-1">
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    <label className="font-medium flex items-center gap-1"><input type="checkbox" checked={currentSlide?.bold ?? false} onChange={e => updateSlide('bold', e.target.checked)} /> Bold</label>
                    <label className="font-medium flex items-center gap-1"><input type="checkbox" checked={currentSlide?.italic ?? false} onChange={e => updateSlide('italic', e.target.checked)} /> Italic</label>
                  </div>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
      {/* Results Tab (unchanged) */}
      {activeTab !== 'edit' && (
        <div className="bg-white rounded-xl shadow p-6 max-w-4xl mx-auto mt-10">
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
      
      {/* Preview Mode Overlay */}
      {isPreviewMode && <PreviewMode />}
    </div>
  );
}
