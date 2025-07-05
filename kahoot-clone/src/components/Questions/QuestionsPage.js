import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';

// Enhanced customization options
const FONT_FAMILIES = [
  { label: 'Sans Serif', value: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { label: 'Serif', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Monospace', value: '"Courier New", Courier, monospace' },
  { label: 'Display', value: '"Arial Black", "Helvetica Bold", sans-serif' },
];

const FONT_SIZES = [
  { label: 'Small', value: 16 },
  { label: 'Medium', value: 20 },
  { label: 'Large', value: 24 },
  { label: 'Extra Large', value: 32 },
];

const BACKGROUND_COLORS = [
  { label: 'White', value: '#ffffff', class: 'bg-white' },
  { label: 'Light Blue', value: '#f0f8ff', class: 'bg-blue-50' },
  { label: 'Light Green', value: '#f0fff4', class: 'bg-green-50' },
  { label: 'Light Purple', value: '#faf5ff', class: 'bg-purple-50' },
  { label: 'Light Gray', value: '#f9fafb', class: 'bg-gray-50' },
  { label: 'Dark Blue', value: '#1e3a8a', class: 'bg-blue-900' },
  { label: 'Dark Green', value: '#14532d', class: 'bg-green-900' },
  { label: 'Dark Purple', value: '#581c87', class: 'bg-purple-900' },
  { label: 'Black', value: '#000000', class: 'bg-black' },
];

const TEXT_COLORS = [
  { label: 'Black', value: '#000000', class: 'text-black' },
  { label: 'Dark Gray', value: '#374151', class: 'text-gray-700' },
  { label: 'Blue', value: '#1d4ed8', class: 'text-blue-700' },
  { label: 'Green', value: '#059669', class: 'text-green-700' },
  { label: 'Purple', value: '#7c3aed', class: 'text-purple-700' },
  { label: 'Red', value: '#dc2626', class: 'text-red-700' },
  { label: 'White', value: '#ffffff', class: 'text-white' },
];

const BUTTON_STYLES = [
  { label: 'Rounded', value: 'rounded-lg', radius: 8 },
  { label: 'Pill', value: 'rounded-full', radius: 9999 },
  { label: 'Square', value: 'rounded-none', radius: 0 },
  { label: 'Soft', value: 'rounded-xl', radius: 12 },
];

const BUTTON_COLORS = [
  { label: 'Blue', value: '#3b82f6', hover: '#2563eb', class: 'bg-blue-500 hover:bg-blue-600' },
  { label: 'Green', value: '#10b981', hover: '#059669', class: 'bg-green-500 hover:bg-green-600' },
  { label: 'Purple', value: '#8b5cf6', hover: '#7c3aed', class: 'bg-purple-500 hover:bg-purple-600' },
  { label: 'Red', value: '#ef4444', hover: '#dc2626', class: 'bg-red-500 hover:bg-red-600' },
  { label: 'Gray', value: '#6b7280', hover: '#4b5563', class: 'bg-gray-500 hover:bg-gray-600' },
];

const TIMER_OPTIONS = [10, 15, 20, 30, 45, 60];

export default function QuestionsPage() {
  const [slides, setSlides] = useState([]); // Each slide: {id, question_text, options, correct_answer_index, timer, customization}
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quizId, setQuizId] = useState(null);
  const [quizTitle, setQuizTitle] = useState('Untitled Presentation');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Quiz drafts management
  const [quizDrafts, setQuizDrafts] = useState([]);
  const [selectedQuizDraft, setSelectedQuizDraft] = useState(null);

  // Fetch questions on mount
  useEffect(() => {
    fetchQuizDrafts();
    if (quizId) {
      fetchQuestions(quizId);
    }
  }, [quizId]);

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e) => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setIsDragging(false);
      return;
    }

    const updatedSlides = [...slides];
    const [draggedSlide] = updatedSlides.splice(draggedIndex, 1);
    updatedSlides.splice(dropIndex, 0, draggedSlide);
    
    setSlides(updatedSlides);
    setSelectedIdx(dropIndex);
    setDraggedIndex(null);
    setDragOverIndex(null);
    setIsDragging(false);
    
    // Save the new order
    saveSlideOrder(updatedSlides);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setIsDragging(false);
  };

  // Fetch all quiz drafts with question counts
  async function fetchQuizDrafts() {
    try {
      const { data: quizzes, error: quizzesError } = await supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false });
      if (quizzesError) throw quizzesError;
      
      // Get question counts for each quiz
      const quizzesWithCounts = await Promise.all(
        (quizzes || []).map(async (quiz) => {
          const { count, error: countError } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('quiz_id', quiz.id);
          
          return {
            ...quiz,
            questions_count: countError ? 0 : count
          };
        })
      );
      
      setQuizDrafts(quizzesWithCounts);
    } catch (err) {
      console.error('Error fetching quiz drafts:', err);
    }
  }

  // Load a specific quiz
  async function loadQuiz(quizId) {
    setLoading(true);
    try {
      setQuizId(quizId);
      setSelectedQuizDraft(quizId);
      
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();
      if (quizError) throw quizError;
      
      setQuizTitle(quizData.title);
      
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true });
      
      if (questionsError) throw questionsError;
      
      setSlides(
        (questionsData || []).map((q, idx) => {
          // Ensure each question has at least 2 options
          const options = q.options && q.options.length >= 2 ? q.options : ['Option 1', 'Option 2'];
          const correct_answer_index = q.correct_answer_index >= 0 && q.correct_answer_index < options.length 
            ? q.correct_answer_index 
            : 0;
          
          // Enhanced customization with defaults
          const settings = q.settings || {};
          return {
            id: q.id,
            question_text: q.question_text || '',
            options,
            correct_answer_index,
            timer: q.timer || 20,
            customization: {
              backgroundColor: settings.backgroundColor || BACKGROUND_COLORS[0].value,
              textColor: settings.textColor || TEXT_COLORS[0].value,
              fontFamily: settings.fontFamily || FONT_FAMILIES[0].value,
              fontSize: settings.fontSize || FONT_SIZES[1].value,
              buttonStyle: settings.buttonStyle || BUTTON_STYLES[0].value,
              buttonColor: settings.buttonColor || BUTTON_COLORS[0].value,
              buttonRadius: settings.buttonRadius || BUTTON_STYLES[0].radius,
            },
            media: q.media || null,
          };
        })
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Fetch questions for a specific quiz
  async function fetchQuestions(quizId) {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      setSlides(
        (data || []).map((q, idx) => {
          const options = q.options && q.options.length >= 2 ? q.options : ['Option 1', 'Option 2'];
          const correct_answer_index = q.correct_answer_index >= 0 && q.correct_answer_index < options.length 
            ? q.correct_answer_index 
            : 0;
          
          const settings = q.settings || {};
          return {
            id: q.id,
            question_text: q.question_text || '',
            options,
            correct_answer_index,
            timer: q.timer || 20,
            customization: {
              backgroundColor: settings.backgroundColor || BACKGROUND_COLORS[0].value,
              textColor: settings.textColor || TEXT_COLORS[0].value,
              fontFamily: settings.fontFamily || FONT_FAMILIES[0].value,
              fontSize: settings.fontSize || FONT_SIZES[1].value,
              buttonStyle: settings.buttonStyle || BUTTON_STYLES[0].value,
              buttonColor: settings.buttonColor || BUTTON_COLORS[0].value,
              buttonRadius: settings.buttonRadius || BUTTON_STYLES[0].radius,
            },
            media: q.media || null,
          };
        })
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Save individual slide
  async function saveSlide(idx, slide) {
    if (!slide.id || !quizId) return;
    try {
      await supabase.from('questions').update({
        question_text: slide.question_text,
        question_type: 'multiple_choice',
        options: slide.options,
        correct_answer_index: slide.correct_answer_index,
        timer: slide.timer,
        settings: slide.customization,
      }).eq('id', slide.id);
    } catch (err) {
      setError(err.message);
    }
  }

  // Save slide order
  async function saveSlideOrder(updatedSlides) {
    if (!quizId) return;
    try {
      for (let i = 0; i < updatedSlides.length; i++) {
        const slide = updatedSlides[i];
        if (slide.id) {
          await supabase.from('questions').update({
            order_index: i,
          }).eq('id', slide.id);
        }
      }
    } catch (err) {
      setError(err.message);
    }
  }

  // Add new slide
  function addSlide() {
    const newSlide = {
      question_text: '',
      options: ['Option 1', 'Option 2'],
      correct_answer_index: 0,
      timer: 20,
      customization: {
        backgroundColor: BACKGROUND_COLORS[0].value,
        textColor: TEXT_COLORS[0].value,
        fontFamily: FONT_FAMILIES[0].value,
        fontSize: FONT_SIZES[1].value,
        buttonStyle: BUTTON_STYLES[0].value,
        buttonColor: BUTTON_COLORS[0].value,
        buttonRadius: BUTTON_STYLES[0].radius,
      },
    };
    setSlides([...slides, newSlide]);
    setSelectedIdx(slides.length);
  }

  // Duplicate slide
  async function duplicateSlide(idx) {
    const slideToDuplicate = slides[idx];
    const duplicatedSlide = {
      ...slideToDuplicate,
      id: null, // Remove ID so it becomes a new slide
      question_text: `${slideToDuplicate.question_text} (Copy)`,
    };
    
    const newSlides = [...slides];
    newSlides.splice(idx + 1, 0, duplicatedSlide);
    setSlides(newSlides);
    setSelectedIdx(idx + 1);
  }

  // Delete slide
  async function deleteSlide(idx) {
    if (slides.length <= 1) return; // Don't delete the last slide
    
    const slideToDelete = slides[idx];
    if (slideToDelete.id) {
      try {
        await supabase.from('questions').delete().eq('id', slideToDelete.id);
      } catch (err) {
        setError(err.message);
        return;
      }
    }
    
    const newSlides = slides.filter((_, i) => i !== idx);
    setSlides(newSlides);
    
    if (selectedIdx >= newSlides.length) {
      setSelectedIdx(Math.max(0, newSlides.length - 1));
    } else if (selectedIdx === idx) {
      setSelectedIdx(Math.max(0, idx - 1));
    }
  }

  // Update slide
  function updateSlide(idx, newSlide) {
    const updatedSlides = [...slides];
    updatedSlides[idx] = newSlide;
    setSlides(updatedSlides);
    
    // Auto-save if slide has an ID
    if (newSlide.id) {
      saveSlide(idx, newSlide);
    }
  }

  // Update option
  function updateOption(idx, optIdx, value) {
    const slide = { ...slides[idx] };
    slide.options[optIdx] = value;
    updateSlide(idx, slide);
  }

  // Add option
  function addOption(idx) {
    const slide = { ...slides[idx] };
    if (slide.options.length < 4) {
      slide.options.push(`Option ${slide.options.length + 1}`);
      updateSlide(idx, slide);
    }
  }

  // Delete option
  function deleteOption(idx, optIdx) {
    const slide = { ...slides[idx] };
    if (slide.options.length > 2) {
      slide.options = slide.options.filter((_, i) => i !== optIdx);
      if (slide.correct_answer_index >= slide.options.length) {
        slide.correct_answer_index = 0;
      }
      updateSlide(idx, slide);
    }
  }

  // Duplicate option
  function duplicateOption(idx, optIdx) {
    const slide = { ...slides[idx] };
    if (slide.options.length < 4) {
      slide.options = [
        ...slide.options.slice(0, optIdx + 1),
        slide.options[optIdx],
        ...slide.options.slice(optIdx + 1),
      ];
      updateSlide(idx, slide);
    }
  }

  // Set correct option
  function setCorrectOption(idx, optIdx) {
    const slide = { ...slides[idx], correct_answer_index: optIdx };
    updateSlide(idx, slide);
  }

  // Customization handlers
  function setBackgroundColor(idx, value) {
    const slide = { ...slides[idx] };
    slide.customization = { ...slide.customization, backgroundColor: value };
    updateSlide(idx, slide);
  }

  function setTextColor(idx, value) {
    const slide = { ...slides[idx] };
    slide.customization = { ...slide.customization, textColor: value };
    updateSlide(idx, slide);
  }

  function setFontFamily(idx, value) {
    const slide = { ...slides[idx] };
    slide.customization = { ...slide.customization, fontFamily: value };
    updateSlide(idx, slide);
  }

  function setFontSize(idx, value) {
    const slide = { ...slides[idx] };
    slide.customization = { ...slide.customization, fontSize: value };
    updateSlide(idx, slide);
  }

  function setButtonStyle(idx, value, radius) {
    const slide = { ...slides[idx] };
    slide.customization = { 
      ...slide.customization, 
      buttonStyle: value,
      buttonRadius: radius
    };
    updateSlide(idx, slide);
  }

  function setButtonColor(idx, value) {
    const slide = { ...slides[idx] };
    slide.customization = { ...slide.customization, buttonColor: value };
    updateSlide(idx, slide);
  }

  function setTimer(idx, value) {
    const slide = { ...slides[idx], timer: value };
    updateSlide(idx, slide);
  }

  // Save quiz title
  async function saveQuizTitle(newTitle) {
    setQuizTitle(newTitle);
    if (quizId) {
      await supabase.from('quizzes').update({ title: newTitle }).eq('id', quizId);
    }
  }

  // New Form: clear all state and start fresh
  function startNewForm() {
    setQuizId(null);
    setQuizTitle('Untitled Presentation');
    setSlides([]);
    setSelectedIdx(0);
    setSelectedQuizDraft(null);
  }

  // Save all slides and quiz title
  async function saveQuiz() {
    setLoading(true);
    try {
      let currentQuizId = quizId;
      
      if (!quizId) {
        // Create a new quiz
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .insert([{ title: quizTitle }])
          .select()
          .single();
        if (quizError) throw quizError;
        currentQuizId = quizData.id;
        setQuizId(currentQuizId);
      } else {
        // Update quiz title
        await supabase.from('quizzes').update({ title: quizTitle }).eq('id', quizId);
      }

      // Fetch existing questions for this quiz
      const { data: existingQuestions, error: fetchError } = await supabase
        .from('questions')
        .select('id, order_index')
        .eq('quiz_id', currentQuizId);
      if (fetchError) throw fetchError;
      
      const existingIds = (existingQuestions || []).map(q => q.id);
      const slidesWithId = slides.filter(s => s.id);
      const slidesWithoutId = slides.filter(s => !s.id);
      
      // Upsert (update) existing questions
      for (let i = 0; i < slidesWithId.length; i++) {
        const s = slidesWithId[i];
        await supabase.from('questions').update({
          question_text: s.question_text,
          question_type: 'multiple_choice',
          options: s.options,
          correct_answer_index: s.correct_answer_index,
          order_index: i,
          timer: s.timer,
          quiz_id: currentQuizId,
          media: s.media || null,
          settings: s.customization,
        }).eq('id', s.id);
      }
      
      // Insert new questions
      if (slidesWithoutId.length > 0) {
        const questionsToInsert = slidesWithoutId.map((s, idx) => ({
          question_text: s.question_text,
          question_type: 'multiple_choice',
          options: s.options,
          correct_answer_index: s.correct_answer_index,
          order_index: slidesWithId.length + idx,
          timer: s.timer,
          quiz_id: currentQuizId,
          media: s.media || null,
          settings: s.customization,
        }));
        await supabase.from('questions').insert(questionsToInsert);
      }
      
      // Delete removed questions
      const currentIds = slidesWithId.map(s => s.id);
      const toDelete = existingIds.filter(id => !currentIds.includes(id));
      if (toDelete.length > 0) {
        await supabase.from('questions').delete().in('id', toDelete);
      }
      
      setSuccessMessage('Quiz saved!');
      setTimeout(() => setSuccessMessage(''), 2000);
      
      // Refresh quiz drafts list and update selection
      await fetchQuizDrafts();
      setSelectedQuizDraft(currentQuizId);
      
      // Reload slides to get new IDs for unsaved slides
      if (slidesWithoutId.length > 0) {
        await fetchQuestions(currentQuizId);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const selectedSlide = slides[selectedIdx] || {};

  return (
    <div className="relative flex flex-col min-h-screen bg-gray-50">
      {/* Top Menu Bar */}
      <div className="fixed top-0 left-0 w-full z-20 bg-white border-b shadow-sm flex items-center justify-between px-6 py-3" style={{ minHeight: '64px' }}>
        <div className="flex items-center gap-4">
          <button
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold shadow hover:bg-gray-200 transition-all border border-gray-200"
            onClick={startNewForm}
            disabled={loading}
          >
            New Form
          </button>
          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">Load Quiz Draft</label>
            <select
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-300"
              value={selectedQuizDraft || ''}
              onChange={(e) => {
                const selectedId = e.target.value;
                if (selectedId) {
                  loadQuiz(selectedId);
                } else {
                  startNewForm();
                }
              }}
              disabled={loading}
            >
              <option value="">Select a quiz draft...</option>
              {quizDrafts.map((quiz) => (
                <option key={quiz.id} value={quiz.id}>
                  {quiz.title} ({quiz.questions_count || 0} questions)
                </option>
              ))}
            </select>
          </div>
          {quizId && (
            <div className="text-xs text-green-600 font-medium">
              ✓ Quiz loaded
            </div>
          )}
        </div>
        <div className="flex flex-col items-center">
          <input
            className="text-xl font-bold text-gray-800 bg-transparent border-none outline-none px-2 py-1 rounded focus:ring-2 focus:ring-blue-300 transition-all w-64 text-center"
            value={quizTitle}
            onChange={e => saveQuizTitle(e.target.value)}
            placeholder="Untitled Presentation"
            style={{ maxWidth: '320px' }}
          />
          {quizId && (
            <div className="text-xs text-gray-500 mt-1">
              Quiz ID: {quizId.slice(0, 8)}...
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {successMessage && <span className="text-green-600 font-semibold mr-2">{successMessage}</span>}
          <button
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold shadow hover:bg-blue-700 transition-all text-lg"
            onClick={saveQuiz}
            disabled={loading}
          >
            Save Quiz
          </button>
        </div>
      </div>
      
      {/* Spacer for fixed bar */}
      <div style={{ minHeight: '64px' }} />

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row flex-1">
        {/* Left Sidebar - Slide List */}
        <div className="w-full lg:w-1/4 bg-white border-r p-4">
          <div className="mb-4 text-center">
            <p className="text-sm text-gray-600 mb-2">Drag to reorder slides</p>
          </div>
          
          {/* Scrollable slide list with fixed height */}
          <div className="h-[calc(100vh-200px)] overflow-y-auto">
            {slides.map((slide, idx) => (
              <div
                key={slide.id || idx}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-2 mb-2 px-3 py-2 rounded-lg cursor-move transition-all duration-200 ${
                  selectedIdx === idx ? 'bg-blue-100 border-l-4 border-blue-500' : 'hover:bg-gray-100'
                } ${
                  draggedIndex === idx ? 'opacity-50 scale-95 rotate-1 shadow-lg' : ''
                } ${
                  dragOverIndex === idx && draggedIndex !== idx ? 'bg-blue-50 border-l-4 border-blue-300 transform translate-y-0.5' : ''
                }`}
                onClick={() => !isDragging && setSelectedIdx(idx)}
              >
                <span className="font-semibold text-blue-700">Q{idx + 1}</span>
                <span className="truncate text-gray-700 text-sm flex-1">{slide.question_text || 'Untitled'}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateSlide(idx);
                    }}
                    className="opacity-40 hover:opacity-100 transition-opacity text-blue-500 hover:text-blue-700"
                    title="Duplicate slide"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSlide(idx);
                    }}
                    className="opacity-40 hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                    title="Delete slide"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <button
            className="mt-4 w-full py-2 bg-blue-500 text-white rounded-lg font-bold shadow hover:bg-blue-600 transition-all"
            onClick={addSlide}
            disabled={loading}
          >
            + Add Slide
          </button>
        </div>

        {/* Center Panel - Slide Preview */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          {/* Fixed size slide container */}
          <div 
            className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden"
            style={{
              width: '800px',
              height: '600px',
              maxWidth: '90vw',
              maxHeight: '70vh'
            }}
          >
            {/* Live preview of the slide */}
            <div 
              className="w-full h-full flex flex-col justify-center p-8 relative"
              style={{
                backgroundColor: selectedSlide.customization?.backgroundColor || BACKGROUND_COLORS[0].value,
                color: selectedSlide.customization?.textColor || TEXT_COLORS[0].value,
                fontFamily: selectedSlide.customization?.fontFamily || FONT_FAMILIES[0].value,
                fontSize: `${selectedSlide.customization?.fontSize || FONT_SIZES[1].value}px`,
              }}
            >
              {/* Question text */}
              <div className="mb-8 text-center">
                <h2 className="font-bold mb-4 break-words leading-tight">
                  {selectedSlide.question_text || 'Your question here?'}
                </h2>
              </div>
              
              {/* Options */}
              <div className="space-y-4">
                {selectedSlide.options && selectedSlide.options.map((option, index) => (
                  <div
                    key={index}
                    className="w-full p-4 rounded-lg border-2 border-gray-200 transition-all duration-200 hover:shadow-md"
                    style={{
                      backgroundColor: selectedSlide.customization?.buttonColor || BUTTON_COLORS[0].value,
                      borderRadius: `${selectedSlide.customization?.buttonRadius || BUTTON_STYLES[0].radius}px`,
                      color: '#ffffff',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{option}</span>
                      {selectedSlide.correct_answer_index === index && (
                        <span className="text-white font-bold">✓</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Timer display */}
              <div className="absolute top-4 right-4 bg-white/90 rounded-full px-4 py-2 shadow-lg">
                <span className="font-bold text-gray-700">{selectedSlide.timer || 20}s</span>
              </div>
            </div>
          </div>
          
          {/* Slide editor below preview */}
          <div className="w-full max-w-4xl mt-6 bg-white rounded-xl shadow-lg p-6">
            <h3 className="font-bold text-lg text-gray-800 mb-4">Edit Slide {selectedIdx + 1}</h3>
            
            {/* Question text editor */}
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">Question Text</label>
              <textarea
                className="w-full p-3 border rounded-lg text-lg font-semibold focus:ring-2 focus:ring-blue-300 resize-none"
                rows={3}
                placeholder="Enter your question here..."
                value={selectedSlide.question_text || ''}
                onChange={e => updateSlide(selectedIdx, { ...selectedSlide, question_text: e.target.value })}
              />
            </div>
            
            {/* Options editor */}
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">Answer Options</label>
              <div className="space-y-3">
                {selectedSlide.options && selectedSlide.options.map((option, optIdx) => (
                  <div key={optIdx} className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
                    <input
                      type="radio"
                      checked={selectedSlide.correct_answer_index === optIdx}
                      onChange={() => setCorrectOption(selectedIdx, optIdx)}
                      className="accent-blue-500 w-5 h-5"
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={e => updateOption(selectedIdx, optIdx, e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none text-base p-2 rounded focus:ring-2 focus:ring-blue-300"
                      placeholder={`Option ${optIdx + 1}`}
                    />
                    <button 
                      onClick={() => duplicateOption(selectedIdx, optIdx)} 
                      className="text-gray-400 hover:text-blue-500 p-1" 
                      title="Duplicate"
                      disabled={selectedSlide.options && selectedSlide.options.length >= 4}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => deleteOption(selectedIdx, optIdx)} 
                      className={`${selectedSlide.options && selectedSlide.options.length <= 2 ? 'text-gray-300 cursor-not-allowed' : 'text-red-400 hover:text-red-600'} p-1`}
                      title={selectedSlide.options && selectedSlide.options.length <= 2 ? 'Minimum 2 options required' : 'Delete option'}
                      disabled={selectedSlide.options && selectedSlide.options.length <= 2}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              
              {(selectedSlide.options && selectedSlide.options.length < 4) && (
                <button
                  className="w-full mt-3 py-2 bg-blue-50 text-blue-700 rounded-lg font-semibold hover:bg-blue-100 transition-all"
                  onClick={() => addOption(selectedIdx)}
                >
                  + Add Option ({selectedSlide.options ? selectedSlide.options.length : 0}/4)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Customization Panel */}
        <div className="w-full lg:w-1/3 bg-white border-l p-4">
          <div className="h-[calc(100vh-200px)] overflow-y-auto">
            <h3 className="font-bold text-xl text-gray-800 mb-6">Customization</h3>
            
            {/* Background Color */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-3">Background Color</label>
              <div className="grid grid-cols-3 gap-2">
                {BACKGROUND_COLORS.map(color => (
                  <button
                    key={color.value}
                    className={`w-full h-12 rounded-lg border-2 transition-all ${
                      selectedSlide.customization?.backgroundColor === color.value 
                        ? 'border-blue-500 scale-105' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setBackgroundColor(selectedIdx, color.value)}
                    title={color.label}
                  >
                    <span className="sr-only">{color.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Text Color */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-3">Text Color</label>
              <div className="grid grid-cols-3 gap-2">
                {TEXT_COLORS.map(color => (
                  <button
                    key={color.value}
                    className={`w-full h-12 rounded-lg border-2 transition-all flex items-center justify-center ${
                      selectedSlide.customization?.textColor === color.value 
                        ? 'border-blue-500 scale-105' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setTextColor(selectedIdx, color.value)}
                    title={color.label}
                  >
                    <span className="text-white font-bold text-sm">Aa</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Font Family */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Font Family</label>
              <select
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-300"
                value={selectedSlide.customization?.fontFamily || FONT_FAMILIES[0].value}
                onChange={e => setFontFamily(selectedIdx, e.target.value)}
              >
                {FONT_FAMILIES.map(font => (
                  <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Font Size</label>
              <div className="grid grid-cols-2 gap-2">
                {FONT_SIZES.map(size => (
                  <button
                    key={size.value}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedSlide.customization?.fontSize === size.value 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setFontSize(selectedIdx, size.value)}
                  >
                    <span className="font-semibold">{size.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Button Style */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Button Style</label>
              <div className="grid grid-cols-2 gap-2">
                {BUTTON_STYLES.map(style => (
                  <button
                    key={style.value}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedSlide.customization?.buttonStyle === style.value 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setButtonStyle(selectedIdx, style.value, style.radius)}
                  >
                    <span className="font-semibold">{style.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Button Color */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-3">Button Color</label>
              <div className="grid grid-cols-3 gap-2">
                {BUTTON_COLORS.map(color => (
                  <button
                    key={color.value}
                    className={`w-full h-12 rounded-lg border-2 transition-all ${
                      selectedSlide.customization?.buttonColor === color.value 
                        ? 'border-blue-500 scale-105' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setButtonColor(selectedIdx, color.value)}
                    title={color.label}
                  >
                    <span className="sr-only">{color.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Timer */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Timer (seconds)</label>
              <select
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-300"
                value={selectedSlide.timer || 20}
                onChange={e => setTimer(selectedIdx, parseInt(e.target.value))}
              >
                {TIMER_OPTIONS.map(timer => (
                  <option key={timer} value={timer}>{timer}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {error}
        </div>
      )}
    </div>
  );
} 