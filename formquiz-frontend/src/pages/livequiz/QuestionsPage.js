import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../supabase.js';
import QuestionPreview from './QuestionPreview';

export default function QuestionsPage() {
  const { quizId } = useParams();
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState({
    question_text: '',
    options: ['', ''],
    correct_answer_index: 0,
    timer: 20,
    settings: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quizName, setQuizName] = useState('');
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const quizNameInputRef = useRef(null);
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState(null);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const dragItem = useRef();
  const dragOverItem = useRef();
  const [fullScreenPreview, setFullScreenPreview] = useState(false);
  const [customTab, setCustomTab] = useState('templates');
  const [quizTitleError, setQuizTitleError] = useState('');
  const [showTitlePrompt, setShowTitlePrompt] = useState(false);
  const [titleInputGlow, setTitleInputGlow] = useState(false);
  const [titleInputBg, setTitleInputBg] = useState(false);
  const navigate = useNavigate();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [deletedQuestionIds, setDeletedQuestionIds] = useState([]);

  // Centralized theme/customization defaults (must match AdminPage.js)
  const settingsDefaults = {
    backgroundColor: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)',
    backgroundGradient: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)',
    imageUrl: '',
    questionContainerBgColor: '#ffffff',
    textColor: '#222222',
    buttonColor: '#2563eb',
    fontSize: 32,
    fontFamily: 'Inter, Arial, sans-serif',
    borderRadius: 32,
    padding: 48,
    margin: 32,
    alignment: 'center',
    optionLayout: 'vertical',
    shadow: true,
    bold: false,
    italic: false,
  };
  function getSettings(obj) {
    return { ...settingsDefaults, ...(obj || {}) };
  }

  // Global customization state for 'Apply to All'
  const [globalCustomization, setGlobalCustomization] = useState(settingsDefaults);

  // 3. Add right sidebar state
  const [customSidebarOpen, setCustomSidebarOpen] = useState(true);

  // Full screen preview state
  const [isFullScreenPreview, setIsFullScreenPreview] = useState(false);

  // Ref for preview container (must be after customSidebarOpen is defined)
  const previewRef = useRef(null);

  // Scroll to preview when customization sidebar opens (must be after customSidebarOpen is defined)
  useEffect(() => {
    if (customSidebarOpen && previewRef.current) {
      previewRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [customSidebarOpen]);

  useEffect(() => {
    if (quizId) {
      fetchQuizAndQuestions(quizId);
    } else {
      fetchQuestions();
    }
    // eslint-disable-next-line
  }, [quizId]);

  async function fetchQuestions() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lq_questions')
        .select('*')
        .is('quiz_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Reverse the array so newest is last (append new at end)
      const ordered = (data || []).slice().reverse();
      setQuestions(ordered);
      if (ordered.length > 0) {
        setSelectedQuestionIdx(0);
        setForm({ ...ordered[0] });
        setIsEditingExisting(true);
      } else {
        setSelectedQuestionIdx(null);
        setForm({
          question_text: '',
          options: ['', ''],
          correct_answer_index: 0,
          timer: 20,
        });
        setIsEditingExisting(false);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchQuizAndQuestions(quizId) {
    setLoading(true);
    try {
      // Fetch quiz title
      const { data: quizData, error: quizError } = await supabase
        .from('lq_quizzes')
        .select('*')
        .eq('id', quizId)
        .single();
      if (quizError) throw quizError;
      setQuizName(quizData.title);
      setSelectedQuizId(quizId);

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('lq_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('created_at', { ascending: true });
      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);
      if (questionsData && questionsData.length > 0) {
        setForm({ ...questionsData[0] });
        setSelectedQuestionIdx(0);
        setIsEditingExisting(true);
      } else {
        setForm({
          question_text: '',
          options: ['', ''],
          correct_answer_index: 0,
          timer: 20,
          settings: { ...settingsDefaults },
        });
        setSelectedQuestionIdx(null);
        setIsEditingExisting(false);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // 2. Add settings state for the form
  function getSettings(obj) {
    // Use globalCustomization as base if set
    return { ...globalCustomization, ...(obj?.settings || obj || {}) };
  }

  // 4. Update form state to always include settings
  useEffect(() => {
    if (selectedQuestionIdx !== null && questions[selectedQuestionIdx]) {
      setForm({ ...questions[selectedQuestionIdx], settings: getSettings(questions[selectedQuestionIdx].settings) });
    }
  }, [selectedQuestionIdx, globalCustomization]);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setLoading(true);
      if (isEditingExisting && selectedQuestionIdx !== null) {
        const questionToUpdate = questions[selectedQuestionIdx];
        const { error } = await supabase
          .from('lq_questions')
          .update({
            question_text: form.question_text,
            options: form.options.filter(opt => opt.trim() !== ''),
            correct_answer_index: form.correct_answer_index,
            timer: form.timer,
            settings: form.settings || {},
          })
          .eq('id', questionToUpdate.id);
        if (error) throw error;
        const updatedQuestions = [...questions];
        updatedQuestions[selectedQuestionIdx] = {
          ...questionToUpdate,
          question_text: form.question_text,
          options: form.options.filter(opt => opt.trim() !== ''),
          correct_answer_index: form.correct_answer_index,
          timer: form.timer,
          settings: form.settings || {},
        };
        setQuestions(updatedQuestions);
        setSuccessMessage('Question updated!');
      } else {
        // Add new question to the end
        const { data, error } = await supabase
          .from('lq_questions')
          .insert([{
            ...form,
            options: form.options.filter(opt => opt.trim() !== ''),
            quiz_id: selectedQuizId,
            settings: form.settings || {},
          }])
          .select();
        if (error) throw error;
        // Append the new question to the end of the local state
        const newQuestion = data && data[0];
        const updatedQuestions = [...questions, newQuestion];
        setQuestions(updatedQuestions);
        setForm({
          question_text: '',
          options: ['', ''],
          correct_answer_index: 0,
          timer: 20,
          settings: { ...settingsDefaults },
        });
        setSuccessMessage('Question added!');
        setSelectedQuestionIdx(updatedQuestions.length - 1);
        setIsEditingExisting(true);
        return;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleOptionChange(index, value) {
    const newOptions = [...form.options];
    newOptions[index] = value;
    setForm({ ...form, options: newOptions });
  }

  function addOption() {
    setForm({ ...form, options: [...form.options, ''] });
  }

  function removeOption(index) {
    if (form.options.length > 2) {
      const newOptions = form.options.filter((_, i) => i !== index);
      let newCorrect = form.correct_answer_index;
      if (index < form.correct_answer_index) newCorrect--;
      if (newCorrect >= newOptions.length) newCorrect = 0;
      setForm({
        ...form,
        options: newOptions,
        correct_answer_index: newCorrect,
      });
    }
  }

  const handleMenuCreateQuiz = async () => {
    if (quizNameInputRef.current) {
      quizNameInputRef.current.focus();
    }
    setLoading(true);
    setSuccessMessage('');
    setQuizTitleError('');
    setShowTitlePrompt(false);
    setTitleInputGlow(false);
    setTitleInputBg(false);
    if (!quizName.trim()) {
      setQuizTitleError('Please enter a quiz title before proceeding.');
      setShowTitlePrompt(true);
      setTitleInputGlow(true);
      setTitleInputBg(true);
      setLoading(false);
      setTimeout(() => setShowTitlePrompt(false), 3500);
      setTimeout(() => setTitleInputGlow(false), 2500);
      setTimeout(() => setTitleInputBg(false), 2500);
      return;
    }
    try {
      // Fetch the current authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError('Unable to get user info. Please log in again.');
        setLoading(false);
        return;
      }
      const userId = user.id;
      const titleToSave = quizName.trim() ? quizName : 'Untitled Quiz';
      const { data, error } = await supabase
        .from('lq_quizzes')
        .insert([{ title: titleToSave, user_id: userId }])
        .select()
        .single();
      if (!error) {
        setSelectedQuizId(data.id);
        const { error: updateError } = await supabase
          .from('lq_questions')
          .update({ quiz_id: data.id })
          .is('quiz_id', null);
        if (updateError) throw updateError;
        setQuestions([]);
        setQuizName('');
        setSuccessMessage('Quiz created successfully.');
      } else {
        setError(error.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      fetchQuestions();
    }
  };

  const handleSidebarClick = (idx) => {
    setSelectedQuestionIdx(idx);
    setForm({ ...questions[idx] });
    setIsEditingExisting(true);
  };

  const handleAddQuestion = () => {
    setForm({
      question_text: '',
      options: ['', ''],
      correct_answer_index: 0,
      timer: 20,
      settings: { ...globalCustomization },
    });
    setSelectedQuestionIdx(null);
    setIsEditingExisting(false);
  };

  // Native HTML5 drag-and-drop handlers
  const handleDragStart = (index) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    const from = dragItem.current;
    const to = dragOverItem.current;
    if (from === undefined || to === undefined || from === to) {
      dragItem.current = undefined;
      dragOverItem.current = undefined;
      return;
    }
    const updatedQuestions = [...questions];
    const [removed] = updatedQuestions.splice(from, 1);
    updatedQuestions.splice(to, 0, removed);
    setQuestions(updatedQuestions);
    // Update selectedQuestionIdx to follow the moved question
    if (selectedQuestionIdx === from) {
      setSelectedQuestionIdx(to);
    } else if (selectedQuestionIdx > from && selectedQuestionIdx <= to) {
      setSelectedQuestionIdx(selectedQuestionIdx - 1);
    } else if (selectedQuestionIdx < from && selectedQuestionIdx >= to) {
      setSelectedQuestionIdx(selectedQuestionIdx + 1);
    }
    dragItem.current = undefined;
    dragOverItem.current = undefined;
  };

  // Delete question handler
  const handleDeleteQuestion = (idx) => {
    const questionToDelete = questions[idx];
    if (questionToDelete.id) {
      setDeletedQuestionIds((prev) => [...prev, questionToDelete.id]);
    }
    const updatedQuestions = questions.filter((_, i) => i !== idx);
    setQuestions(updatedQuestions);
    // Adjust selectedQuestionIdx if needed
    if (selectedQuestionIdx === idx) {
      setSelectedQuestionIdx(null);
      setIsEditingExisting(false);
      setForm({ question_text: '', options: ['', ''], correct_answer_index: 0, timer: 20 });
    } else if (selectedQuestionIdx > idx) {
      setSelectedQuestionIdx(selectedQuestionIdx - 1);
    }
    setHasUnsavedChanges(true);
  };

  // --- CREATE or SAVE QUIZ LOGIC ---
  const handleCreateOrSaveQuiz = async () => {
    setLoading(true);
    setSuccessMessage('');
    setQuizTitleError('');
    setShowTitlePrompt(false);
    setTitleInputGlow(false);
    setTitleInputBg(false);
    if (!quizName.trim()) {
      setQuizTitleError('Please enter a quiz title before proceeding.');
      setShowTitlePrompt(true);
      setTitleInputGlow(true);
      setTitleInputBg(true);
      setLoading(false);
      setTimeout(() => setShowTitlePrompt(false), 3500);
      setTimeout(() => setTitleInputGlow(false), 2500);
      setTimeout(() => setTitleInputBg(false), 2500);
      return;
    }
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError('Unable to get user info. Please log in again.');
        setLoading(false);
        return;
      }
      const userId = user.id;
      const titleToSave = quizName.trim() ? quizName : 'Untitled Quiz';
      let quizId = selectedQuizId;
      if (!selectedQuizId) {
        // CREATE new draft quiz
        const { data, error } = await supabase
          .from('lq_quizzes')
          .insert([{ title: titleToSave, user_id: userId }])
          .select()
          .single();
        if (error) throw error;
        quizId = data.id;
        setSelectedQuizId(data.id);
        // Save all current questions to lq_questions
        for (const [i, q] of questions.entries()) {
          await supabase.from('lq_questions').update({ quiz_id: data.id, order_index: i }).eq('id', q.id);
        }
        setSuccessMessage('Draft created!');
      } else {
        // SAVE/UPDATE existing draft quiz
        const { error } = await supabase
          .from('lq_quizzes')
          .update({ title: titleToSave })
          .eq('id', quizId);
        if (error) throw error;
        // Delete questions marked for deletion
        if (deletedQuestionIds.length > 0) {
          await supabase.from('lq_questions').delete().in('id', deletedQuestionIds);
          setDeletedQuestionIds([]);
        }
        // Update order_index for remaining questions
        for (const [i, q] of questions.entries()) {
          await supabase.from('lq_questions').update({ order_index: i }).eq('id', q.id);
        }
        setSuccessMessage('Draft saved!');
      }
      setHasUnsavedChanges(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Track unsaved changes on any edit
  useEffect(() => {
    setHasUnsavedChanges(true);
    // eslint-disable-next-line
  }, [quizName, questions, form]);

  // --- APPLY TO ALL LOGIC ---
  const handleApplyToAll = () => {
    // Save current form.settings as the new globalCustomization
    const newCustomization = { ...form.settings };
    setGlobalCustomization(newCustomization);
    // Apply to all questions
    const updatedQuestions = questions.map(q => ({ ...q, settings: { ...newCustomization } }));
    setQuestions(updatedQuestions);
    // If editing a question, update its form as well
    setForm(f => ({ ...f, settings: { ...newCustomization } }));
  };

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Buttons */}
      <div className="flex justify-between items-center px-10 py-5 bg-white rounded-b-2xl shadow-md sticky top-0 z-30 border-b border-gray-100" style={{minHeight:'4.5rem'}}>
        <div className="flex items-center gap-4">
          <button
            className="text-blue-400 font-bold text-base hover:underline focus:outline-none"
            style={{background:'none',border:'none',padding:0}}
            onClick={() => navigate('/dashboard')}
          >
            ← Back to Dashboard
          </button>
        <input
          ref={quizNameInputRef}
          type="text"
          value={quizName}
          onChange={e => {
            setQuizName(e.target.value);
            if (e.target.value.trim()) setQuizTitleError('');
            if (e.target.value.trim()) {
              setShowTitlePrompt(false);
              setTitleInputGlow(false);
              setTitleInputBg(false);
            }
          }}
          placeholder="Untitled Quiz"
            className={`ml-4 text-3xl font-bold truncate max-w-xs border-none focus:ring-0 focus:outline-none p-0 m-0 transition-all duration-300 text-gray-500 ${titleInputGlow ? 'ring-2 ring-amber-400 ring-offset-2 border-amber-400' : ''} ${titleInputBg ? 'bg-amber-100/70' : 'bg-transparent'}`}
          style={{ minWidth: '120px', letterSpacing: '-0.01em' }}
        />
        </div>
        <div className="flex items-center gap-4">
          {/* Remove the Preview button in the top menu bar */}
          <button
            className="px-6 py-2 rounded-xl font-bold text-white transition-colors"
            style={{
              background: 'linear-gradient(90deg, #4f8cff 0%, #a084ee 100%)',
              boxShadow: 'none',
              border: 'none',
              fontSize: '1.15rem',
              marginRight: '0.5rem',
            }}
            onClick={() => navigate('/Admin')}
          >
            Start Quiz →
          </button>
          <button
            type="button"
            onClick={handleCreateOrSaveQuiz}
            className={`px-6 py-2 rounded-xl font-bold text-white transition-colors whitespace-nowrap`}
            style={{
              background: selectedQuizId ? '#facc15' : 'linear-gradient(90deg, #4f8cff 0%, #a084ee 100%)',
              color: selectedQuizId ? '#222' : '#fff',
              boxShadow: 'none',
              border: 'none',
              fontSize: '1.15rem',
            }}
            disabled={loading}
          >
            {loading ? (selectedQuizId ? 'Saving...' : 'Creating...') : (selectedQuizId ? 'Save' : 'Create Quiz')}
          </button>
        </div>
      </div>
        {/* Floating Prompt Box */}
        {showTitlePrompt && (
          <div
            className="fixed left-1/2 top-16 z-50 -translate-x-1/2 animate-fade-in-out"
            style={{
              minWidth: 320,
              background: 'rgba(255, 237, 213, 0.98)', // amber-100
              color: '#b45309', // amber-700
              border: '2px solid #f59e42', // amber-400
              borderRadius: 16,
              boxShadow: '0 4px 24px 0 rgba(0,0,0,0.10)',
              padding: '18px 32px',
              fontWeight: 600,
              fontSize: 18,
              textAlign: 'center',
              transition: 'opacity 0.5s',
            }}
          >
            Please enter a quiz title before proceeding.
          </div>
        )}
      {/* Layout: Sidebar + Main + (optional) Right Panel */}
      <div className="flex flex-row w-full">
        {/* Fixed, full-height Sidebar with native drag-and-drop */}
        <aside className="fixed top-[4.5rem] left-0 h-[calc(100vh-4.5rem)] w-64 min-w-[13rem] bg-white rounded-2xl shadow-xl flex flex-col justify-between z-20 border border-gray-100" style={{margin:'1.5rem 0 1.5rem 1.5rem',padding:'0.5rem 0'}}>
          <div className="overflow-y-auto flex-1 p-4">
            <h2 className="text-lg font-bold mb-3 text-purple-700">Questions</h2>
            <ul className="space-y-2">
              {questions.map((q, idx) => (
                <li
                  key={q.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragEnter={() => handleDragEnter(idx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => e.preventDefault()}
                 className={`w-full text-left px-3 py-2 rounded-xl transition-colors flex items-center gap-2 cursor-move select-none ${selectedQuestionIdx === idx ? 'bg-blue-50 font-bold text-blue-700' : 'hover:bg-gray-50'}`}
                  onClick={() => handleSidebarClick(idx)}
                >
                  <span className="text-xs font-semibold text-gray-400 mr-2">Q{idx + 1}</span>
                  <span className="truncate flex-1">{q.question_text || `Question ${idx + 1}`}</span>
                  <button
                    type="button"
                   className="ml-2 text-red-400 hover:text-red-600 p-1 rounded-full bg-red-50 hover:bg-red-100"
                    title="Delete Question"
                    onClick={e => { e.stopPropagation(); handleDeleteQuestion(idx); }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="p-4 border-t border-gray-100">
            <button
              className="w-full px-6 py-3 rounded-2xl font-bold text-white"
              style={{
                background: 'linear-gradient(90deg, #4f8cff 0%, #a084ee 100%)',
                boxShadow: 'none',
                border: 'none',
                fontSize: '1.12rem',
                letterSpacing: '-0.01em',
                marginTop: '0.5rem',
                marginBottom: '0.5rem',
              }}
              onClick={handleAddQuestion}
            >
              + Add Question
            </button>
          </div>
        </aside>
        {/* Responsive container for main content and right sidebar */}
        <div
          className={`flex flex-row flex-1 transition-all duration-300 ml-60 ${customSidebarOpen ? 'mr-80' : ''}`}
          style={{ minHeight: 'calc(100vh - 4.5rem)', overflowY: 'auto' }}
        >
          {/* Main Content: Only show selected question for editing, or the add form if none selected */}
          <main
            className={`flex-1 p-8 transition-all duration-300 flex flex-col items-center justify-start`}
            style={{
              maxWidth: customSidebarOpen ? 'calc(100vw - 15rem - 20rem)' : 'calc(100vw - 15rem)',
              width: '100%',
              overflowY: 'auto',
            }}
          >
            {successMessage && (
              <div className="mb-4 p-2 bg-green-100 text-green-800 rounded">{successMessage}</div>
            )}
            {/* If a question is selected, show it for editing. Otherwise, show the add form. */}
            {/* Place this after the preview overlay logic */}
            <div className="w-full max-w-5xl mx-auto flex flex-col gap-10 justify-center items-center px-2 md:px-8 mt-8 mb-12">
              <form
                onSubmit={handleSubmit}
                className="w-full flex flex-col gap-8 justify-center items-center"
                style={{
                  background: getSettings(form.settings).questionContainerBgColor,
                  borderRadius: getSettings(form.settings).borderRadius,
                  color: getSettings(form.settings).textColor,
                  fontFamily: getSettings(form.settings).fontFamily,
                  fontSize: getSettings(form.settings).fontSize,
                  fontWeight: getSettings(form.settings).bold ? 'bold' : 'normal',
                  fontStyle: getSettings(form.settings).italic ? 'italic' : 'normal',
                  boxShadow: getSettings(form.settings).shadow ? '0 8px 32px 0 rgba(44,62,80,0.13)' : 'none',
                  padding: getSettings(form.settings).padding,
                  margin: getSettings(form.settings).margin,
                  textAlign: getSettings(form.settings).alignment,
                  transition: 'all 0.3s',
                  minHeight: '420px',
                  maxWidth: '100vw',
                }}
              >
                <input
                  className="w-full text-4xl md:text-5xl font-bold text-blue-700 mb-8 text-center tracking-tight bg-transparent outline-none border-b-2 border-blue-200 focus:border-blue-500 transition"
                  style={{fontSize: Math.max(32, getSettings(form.settings).fontSize + 8)}}
                  type="text"
                  placeholder="Enter your question..."
                  value={form.question_text}
                  onChange={e => setForm({ ...form, question_text: e.target.value })}
                  maxLength={200}
                  required
                />
                <div className={`w-full grid gap-8 ${form.options.length === 2 ? 'grid-cols-2' : form.options.length === 3 ? 'grid-cols-3' : form.options.length >= 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1'} mb-4`}>
                  {form.options.map((option, index) => (
                    <div
                      key={index}
                      className={`relative flex items-center px-8 py-6 rounded-2xl border-2 transition-all duration-200 group bg-white`}
                      style={{
                        color: getSettings(form.settings).textColor,
                        fontFamily: getSettings(form.settings).fontFamily,
                        fontSize: Math.max(22, getSettings(form.settings).fontSize),
                        fontWeight: getSettings(form.settings).bold ? 'bold' : 'normal',
                        fontStyle: getSettings(form.settings).italic ? 'italic' : 'normal',
                        minHeight: '72px',
                        boxShadow: 'none',
                        marginBottom: '0.5rem',
                        borderRadius: getSettings(form.settings).borderRadius * 0.7,
                        borderWidth: 2,
                        borderColor: form.correct_answer_index === index ? '#22c55e' : '#e5e7eb',
                        background: form.correct_answer_index === index ? '#dcfce7' : '#fff',
                        transition: 'all 0.2s',
                      }}
                    >
                      <input
                        className="flex-1 text-left px-2 font-semibold break-words bg-transparent outline-none border-none text-lg"
                        type="text"
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={e => handleOptionChange(index, e.target.value)}
                        maxLength={100}
                        required
                      />
                      <button
                        type="button"
                        className={`ml-4 text-green-600 font-bold text-3xl focus:outline-none ${form.correct_answer_index === index ? '' : 'opacity-30 hover:opacity-100'}`}
                        onClick={() => setForm({ ...form, correct_answer_index: index })}
                        title="Mark as correct answer"
                        tabIndex={0}
                      >
                        ✓
                      </button>
                      {form.options.length > 2 && (
                        <button
                          type="button"
                          className="ml-2 text-red-500 font-bold text-2xl focus:outline-none opacity-60 hover:opacity-100"
                          onClick={() => removeOption(index)}
                          title="Remove option"
                          tabIndex={0}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-2">
                  <button
                    type="button"
                    onClick={addOption}
                    className="px-6 py-3 bg-blue-100 text-blue-700 rounded-xl font-semibold hover:bg-blue-200 transition-colors text-lg"
                    disabled={form.options.length >= 6}
                  >
                    Add Option
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFullScreenPreview(true)}
                    className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors text-lg shadow-lg"
                  >
                    Preview
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold text-2xl hover:bg-green-700 disabled:bg-gray-300 mt-6 transition-colors"
                  style={{ boxShadow: 'none', border: 'none' }}
                >
                  {loading ? (isEditingExisting ? 'Saving...' : 'Adding...') : (isEditingExisting ? 'Save Changes' : 'Save Question')}
                </button>
              </form>
            </div>
          </main>
          {/* Customization panel */}
          <aside className={`fixed right-0 top-[4.5rem] h-[calc(100vh-4.5rem)] w-80 min-w-[16rem] bg-white shadow-lg z-20 transition-transform duration-300 ${customSidebarOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
            <button
              className="absolute -left-10 top-4 bg-blue-500 text-white rounded-l px-3 py-2 shadow hover:bg-blue-600 focus:outline-none"
              onClick={() => setCustomSidebarOpen((open) => !open)}
              aria-label={customSidebarOpen ? 'Close Customization Panel' : 'Open Customization Panel'}
            >
              {customSidebarOpen ? '→' : '←'}
            </button>
            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              <h3 className="text-lg font-bold mb-4 text-blue-700">Customize Question</h3>
              {/* Tab Menu */}
              <div className="flex mb-6 border-b border-gray-200">
                <button
                  className={`flex-1 py-2 text-center font-semibold ${customTab === 'templates' ? 'border-b-2 border-blue-500 text-blue-700' : 'text-gray-500'}`}
                  onClick={() => setCustomTab('templates')}
                  type="button"
                >
                  Templates
                </button>
                <button
                  className={`flex-1 py-2 text-center font-semibold ${customTab === 'advanced' ? 'border-b-2 border-blue-500 text-blue-700' : 'text-gray-500'}`}
                  onClick={() => setCustomTab('advanced')}
                  type="button"
                >
                  Advanced
                </button>
              </div>
              {/* Templates Tab */}
              {customTab === 'templates' && (
                <div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Dark Mode Template */}
                    <button
                      type="button"
                      className="rounded-lg border border-gray-300 p-3 flex flex-col items-center justify-center hover:border-blue-500 transition"
                      style={{ background: '#222', color: '#fff' }}
                      onClick={() => setForm(f => ({ ...f, settings: { ...f.settings, backgroundColor: '#222', textColor: '#fff', fontSize: 18, buttonColor: '#fff', questionContainerBgColor: '#222', borderRadius: 16 } }))}
                    >
                      <span className="font-bold mb-1">Dark Mode</span>
                      <span className="text-xs">bg-gray-900 text-white</span>
                    </button>
                    {/* Light Mode Template */}
                    <button
                      type="button"
                      className="rounded-lg border border-gray-300 p-3 flex flex-col items-center justify-center hover:border-blue-500 transition"
                      style={{ background: '#fff', color: '#111' }}
                      onClick={() => setForm(f => ({ ...f, settings: { ...f.settings, backgroundColor: '#fff', textColor: '#111', fontSize: 16, buttonColor: '#111', questionContainerBgColor: '#fff', borderRadius: 16 } }))}
                    >
                      <span className="font-bold mb-1">Light Mode</span>
                      <span className="text-xs">bg-white text-black</span>
                    </button>
                    {/* Ocean Blue Template */}
                    <button
                      type="button"
                      className="rounded-lg border border-gray-300 p-3 flex flex-col items-center justify-center hover:border-blue-500 transition"
                      style={{ background: '#dbeafe', color: '#1e3a8a' }}
                      onClick={() => setForm(f => ({ ...f, settings: { ...f.settings, backgroundColor: '#dbeafe', textColor: '#1e3a8a', fontSize: 18, buttonColor: '#3b82f6', questionContainerBgColor: '#dbeafe', borderRadius: 20 } }))}
                    >
                      <span className="font-bold mb-1">Ocean Blue</span>
                      <span className="text-xs">bg-blue-100 text-blue-900</span>
                    </button>
                    {/* Sunshine Yellow Template */}
                    <button
                      type="button"
                      className="rounded-lg border border-gray-300 p-3 flex flex-col items-center justify-center hover:border-blue-500 transition"
                      style={{ background: '#fef9c3', color: '#a16207' }}
                      onClick={() => setForm(f => ({ ...f, settings: { ...f.settings, backgroundColor: '#fef9c3', textColor: '#a16207', fontSize: 20, buttonColor: '#facc15', questionContainerBgColor: '#fef9c3', borderRadius: 32 } }))}
                    >
                      <span className="font-bold mb-1">Sunshine Yellow</span>
                      <span className="text-xs">bg-yellow-100 text-yellow-900</span>
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 text-center">Click a template to apply its style instantly.</div>
                </div>
              )}
              {/* Advanced Tab */}
              {customTab === 'advanced' && (
                <>
                  {/* Page Background Section */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-blue-600 mb-2">Page Background</h4>
                    <label className="block font-medium mb-1">Background Color</label>
                    <input type="color" value={form.settings?.backgroundColor || settingsDefaults.backgroundColor} onChange={e => setForm(f => ({ ...f, settings: { ...f.settings, backgroundColor: e.target.value } }))} />
                    <label className="block font-medium mt-3 mb-1">Background Gradient (CSS)</label>
                    <input type="text" value={form.settings?.backgroundGradient || ''} onChange={e => setForm(f => ({ ...f, settings: { ...f.settings, backgroundGradient: e.target.value } }))} className="w-full border rounded p-1" placeholder="e.g. linear-gradient(90deg, #f0f, #0ff)" />
                    <label className="block font-medium mt-3 mb-1">Background Image URL</label>
                    <input type="text" value={form.settings?.imageUrl || ''} onChange={e => setForm(f => ({ ...f, settings: { ...f.settings, imageUrl: e.target.value } }))} className="w-full border rounded p-1" placeholder="https://..." />
                  </div>
                  {/* Question Container Section */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-blue-600 mb-2">Question Container</h4>
                    <label className="block font-medium mb-1">Container Background Color</label>
                    <input type="color" value={form.settings?.questionContainerBgColor || settingsDefaults.questionContainerBgColor} onChange={e => setForm(f => ({ ...f, settings: { ...f.settings, questionContainerBgColor: e.target.value } }))} />
                    <label className="block font-medium mt-3 mb-1">Font Size</label>
                    <select value={form.settings?.fontSize || settingsDefaults.fontSize} onChange={e => setForm(f => ({ ...f, settings: { ...f.settings, fontSize: parseInt(e.target.value) } }))} className="w-full border rounded p-1">
                      <option value={14}>sm</option>
                      <option value={16}>base</option>
                      <option value={18}>lg</option>
                      <option value={20}>xl</option>
                      <option value={24}>2xl</option>
                      <option value={28}>3xl</option>
                      <option value={32}>4xl</option>
                    </select>
                    <label className="block font-medium mt-3 mb-1">Font Family</label>
                    <select value={form.settings?.fontFamily || settingsDefaults.fontFamily} onChange={e => setForm(f => ({ ...f, settings: { ...f.settings, fontFamily: e.target.value } }))} className="w-full border rounded p-1">
                      <option value="Inter, Arial, sans-serif">Inter (Modern)</option>
                      <option value="Arial, sans-serif">Arial</option>
                      <option value="Georgia, serif">Georgia</option>
                      <option value="'Courier New', monospace">Courier New</option>
                      <option value="'Comic Sans MS', cursive">Comic Sans</option>
                      <option value="Tahoma, Geneva, sans-serif">Tahoma</option>
                    </select>
                    <label className="block font-medium mt-3 mb-1">Text Color</label>
                    <input type="color" value={form.settings?.textColor || settingsDefaults.textColor} onChange={e => setForm(f => ({ ...f, settings: { ...f.settings, textColor: e.target.value } }))} />
                    <label className="block font-medium mt-3 mb-1">Text Alignment</label>
                    <select value={form.settings?.alignment || settingsDefaults.alignment} onChange={e => setForm(f => ({ ...f, settings: { ...f.settings, alignment: e.target.value } }))} className="w-full border rounded p-1">
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                    <div className="flex items-center gap-4 mt-3">
                      <label className="font-medium flex items-center gap-1"><input type="checkbox" checked={form.settings?.bold ?? settingsDefaults.bold} onChange={e => setForm(f => ({ ...f, settings: { ...f.settings, bold: e.target.checked } }))} /> Bold</label>
                      <label className="font-medium flex items-center gap-1"><input type="checkbox" checked={form.settings?.italic ?? settingsDefaults.italic} onChange={e => setForm(f => ({ ...f, settings: { ...f.settings, italic: e.target.checked } }))} /> Italic</label>
                    </div>
                  </div>
                  {/* Options Styling Section */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-blue-600 mb-2">Options Styling</h4>
                    <label className="block font-medium mb-1">Option Layout</label>
                    <select value={form.settings?.optionLayout || settingsDefaults.optionLayout} onChange={e => setForm(f => ({ ...f, settings: { ...f.settings, optionLayout: e.target.value } }))} className="w-full border rounded p-1">
                      <option value="vertical">Vertical</option>
                      <option value="horizontal">Horizontal</option>
                    </select>
                    <label className="block font-medium mt-3 mb-1">Button Color</label>
                    <input type="color" value={form.settings?.buttonColor || settingsDefaults.buttonColor} onChange={e => setForm(f => ({ ...f, settings: { ...f.settings, buttonColor: e.target.value } }))} />
                    <label className="block font-medium mt-3 mb-1">Border Radius</label>
                    <input type="number" min="0" max="48" value={form.settings?.borderRadius || settingsDefaults.borderRadius} onChange={e => setForm(f => ({ ...f, settings: { ...f.settings, borderRadius: parseInt(e.target.value) } }))} className="w-full border rounded p-1" />
                    <label className="block font-medium mt-3 mb-1">Shadow</label>
                    <input type="checkbox" checked={form.settings?.shadow ?? settingsDefaults.shadow} onChange={e => setForm(f => ({ ...f, settings: { ...f.settings, shadow: e.target.checked } }))} />
                  </div>
                  {/* Spacing and Layout Section */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-blue-600 mb-2">Spacing & Layout</h4>
                    <label className="block font-medium mb-1">Padding</label>
                    <input type="number" min="0" max="64" value={form.settings?.padding || settingsDefaults.padding} onChange={e => setForm(f => ({ ...f, settings: { ...f.settings, padding: parseInt(e.target.value) } }))} className="w-full border rounded p-1" />
                    <label className="block font-medium mt-3 mb-1">Margin</label>
                    <input type="number" min="0" max="64" value={form.settings?.margin || settingsDefaults.margin} onChange={e => setForm(f => ({ ...f, settings: { ...f.settings, margin: parseInt(e.target.value) } }))} className="w-full border rounded p-1" />
                  </div>
                  {/* Timer Section */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-blue-600 mb-2">Timer</h4>
                    <label className="block font-medium mb-1">Timer (seconds)</label>
                    <input
                      type="number"
                      value={form.timer}
                      onChange={e => setForm(f => ({ ...f, timer: parseInt(e.target.value) }))}
                      className="w-full p-3 border rounded-lg text-lg shadow-sm"
                      min="5"
                      max="60"
                      required
                    />
                  </div>
                </>
              )}
              {/* Apply to All Button */}
              <div className="flex justify-center mt-8">
                <button
                  type="button"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold shadow hover:bg-blue-700 transition-all"
                  onClick={handleApplyToAll}
                >
                  Apply to All
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
      {/* Add a fullscreen preview overlay using QuestionPreview */}
      {isFullScreenPreview && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80" style={{ minHeight: '100vh', minWidth: '100vw' }}>
          <QuestionPreview
            question={form}
            customizations={getSettings(form.settings)}
            editable={false}
            showTimer={false}
            showCorrect={false}
            showTopBar={true}
            quizCode={selectedQuizId || 'PREVIEW'}
            questionNumber={selectedQuestionIdx !== null ? selectedQuestionIdx + 1 : 1}
            totalQuestions={questions.length || 1}
            onExit={() => setIsFullScreenPreview(false)}
          />
        </div>
      )}
    </div>
  );
} 