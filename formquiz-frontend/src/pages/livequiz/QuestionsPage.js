import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase.js';
import QuestionPreview from './QuestionPreview';
import './QuestionsPage.css';

export default function QuestionsPage() {
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState({
    question_text: '',
    options: ['', ''],
    correct_answer_index: 0,
    timer: 20,
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

  // 1. Customization defaults
  const settingsDefaults = {
    backgroundColor: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)', // soft blue gradient
    backgroundGradient: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)',
    imageUrl: '',
    questionContainerBgColor: '#ffffff',
    textColor: '#222222',
    buttonColor: '#2563eb',
    fontSize: 20,
    fontFamily: 'Inter, Arial, sans-serif',
    borderRadius: 20,
    padding: 32,
    margin: 24,
    alignment: 'center',
    optionLayout: 'vertical',
    shadow: true,
    bold: false,
    italic: false,
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

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

  // 2. Add settings state for the form
  function getSettings(obj) {
    return { ...settingsDefaults, ...(obj?.settings || obj || {}) };
  }

  // 3. Add right sidebar state
  const [customSidebarOpen, setCustomSidebarOpen] = useState(true);

  // 4. Update form state to always include settings
  useEffect(() => {
    if (selectedQuestionIdx !== null && questions[selectedQuestionIdx]) {
      setForm({ ...questions[selectedQuestionIdx], settings: getSettings(questions[selectedQuestionIdx].settings) });
    }
  }, [selectedQuestionIdx]);

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
      settings: { ...settingsDefaults },
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

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="quizbuilder-bg">
      {/* Navigation Buttons */}
      <div className="quizbuilder-header">
        <div className="flex items-center gap-4">
          <button
            style={{background: 'none', border: 'none', color: '#6366f1', fontWeight: 700, fontSize: 17, cursor: 'pointer', borderRadius: 10, padding: '8px 18px'}}
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
          className="quizbuilder-header-title"
          style={{ minWidth: '120px' }}
        />
        </div>
        <div className="flex items-center gap-4">
          <button
            style={{background: 'linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 17, padding: '10px 24px', marginRight: 8, cursor: 'pointer', boxShadow: '0 2px 8px #a5b4fc33'}} 
            onClick={() => navigate('/Admin')}
          >
            Start Quiz →
          </button>
          <button
            type="button"
            onClick={handleCreateOrSaveQuiz}
            className="quizbuilder-style-btn"
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
      <div className="quizbuilder-main-layout">
        {/* Fixed, full-height Sidebar with native drag-and-drop */}
        <aside className="quizbuilder-sidebar">
          <div>
            <h2 className="quizbuilder-sidebar-title">Questions</h2>
            <ul className="quizbuilder-slide-list">
              {questions.map((q, idx) => (
                <li
                  key={q.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragEnter={() => handleDragEnter(idx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => e.preventDefault()}
                  className={`quizbuilder-slide-item${selectedQuestionIdx === idx ? ' selected' : ''}`}
                  onClick={() => handleSidebarClick(idx)}
                  style={{cursor: 'move'}}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#6366f1', marginRight: 8 }}>Q{idx + 1}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.question_text || `Question ${idx + 1}`}</span>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 16, cursor: 'pointer', borderRadius: 8, padding: 2, marginLeft: 4 }}
                    title="Delete Question"
                    onClick={e => { e.stopPropagation(); handleDeleteQuestion(idx); }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div style={{ borderTop: '1.5px solid #e0e7ef', marginTop: 18, paddingTop: 18 }}>
            <button
              className="quizbuilder-add-slide-btn"
              onClick={handleAddQuestion}
            >
              + Add Question
            </button>
          </div>
        </aside>
        {/* Responsive container for main content and right sidebar */}
        <div style={{ display: 'flex', flex: 1, gap: 32 }}>
          <main className="quizbuilder-editor-card">
            {successMessage && (
              <div style={{ marginBottom: 16, padding: 8, background: '#d1fae5', color: '#047857', borderRadius: 10, fontWeight: 600 }}>{successMessage}</div>
            )}
            {/* If a question is selected, show it for editing. Otherwise, show the add form. */}
            <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
              <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 2px 12px #a5b4fc22', padding: 32, width: '100%', maxWidth: 600, margin: '0 auto' }}>
                <h2 className="quizbuilder-editor-title" style={{ textAlign: 'center', marginBottom: 24 }}>{isEditingExisting ? `Q${selectedQuestionIdx + 1} Preview & Edit` : 'Add New Question'}</h2>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontWeight: 600, color: '#444', marginBottom: 6, display: 'block' }}>Question Text</label>
                  <input
                    type="text"
                    value={form.question_text}
                    onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                    className="quizbuilder-question-input"
                    required
                  />
                </div>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontWeight: 600, color: '#444', marginBottom: 6, display: 'block' }}>Options</label>
                  <ul className="quizbuilder-options-list" style={{ marginLeft: 0, marginTop: 8 }}>
                    {form.options.map((option, index) => (
                      <li key={index} className="quizbuilder-option-row" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          className="quizbuilder-question-input"
                          placeholder={`Option ${index + 1}`}
                          required
                          style={{ flex: 1, minWidth: 0, marginBottom: 0 }}
                        />
                        <input
                          type="radio"
                          name="correct_answer"
                          checked={form.correct_answer_index === index}
                          onChange={() => setForm({ ...form, correct_answer_index: index })}
                          style={{ marginLeft: 8 }}
                        />
                        <span style={{ color: form.correct_answer_index === index ? '#22c55e' : '#bbb', fontWeight: 700, fontSize: 18, marginLeft: 2 }}>
                          {form.correct_answer_index === index ? '✓' : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="quizbuilder-add-option-btn"
                          disabled={form.options.length <= 2}
                          style={{ display: form.options.length > 2 ? 'inline-block' : 'none', background: '#fee2e2', color: '#ef4444', fontWeight: 700, fontSize: 15, padding: '6px 12px', marginLeft: 2 }}
                          aria-label="Remove Option"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={addOption}
                    className="quizbuilder-add-option-btn"
                    disabled={form.options.length >= 4}
                    style={{ display: form.options.length < 4 ? 'inline-block' : 'none', marginTop: 12 }}
                  >
                    Add Option
                  </button>
                </div>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontWeight: 600, color: '#444', marginBottom: 6, display: 'block' }}>Timer (seconds)</label>
                  <input
                    type="number"
                    value={form.timer}
                    onChange={(e) => setForm({ ...form, timer: parseInt(e.target.value) })}
                    className="quizbuilder-timer-input"
                    min="5"
                    max="60"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="quizbuilder-style-btn"
                  style={{ width: '100%', marginTop: 12, fontSize: 18 }}
                >
                  {loading ? (isEditingExisting ? 'Saving...' : 'Adding...') : (isEditingExisting ? 'Save Changes' : 'Add Question')}
                </button>
              </div>
            </form>
            {/* Live Preview */}
            {form && (
              <div className="mt-8 w-full flex flex-col items-center">
                <div className="flex w-full justify-between items-center mb-2">
                  <h3 className="text-lg font-bold text-gray-700">Live Preview</h3>
                  <button
                    type="button"
                    className={`px-4 py-2 rounded-lg font-semibold shadow transition-all duration-200 ${fullScreenPreview ? 'bg-gray-700 text-white hover:bg-gray-800' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                    onClick={() => setFullScreenPreview(v => !v)}
                  >
                    {fullScreenPreview ? 'Exit Full Screen' : 'Full Screen Preview'}
                  </button>
                </div>
                {/* Preview Container */}
                <div className={fullScreenPreview ? 'fixed inset-0 z-50 bg-black/80 flex items-center justify-center' : 'w-full max-w-3xl aspect-[16/9] bg-gray-200 rounded-2xl flex items-center justify-center overflow-hidden border border-gray-300 shadow-inner'}>
                  <div className={fullScreenPreview ? 'w-[90vw] h-[90vh] flex items-center justify-center' : 'w-full h-full flex items-center justify-center scale-90'}>
                    <QuestionPreview question={form} customizations={form.settings} />
                    {fullScreenPreview && (
                      <button
                        className="absolute top-6 right-8 px-4 py-2 bg-gray-700 text-white rounded-lg font-semibold shadow hover:bg-gray-900 text-base border border-gray-900 z-50"
                        onClick={() => setFullScreenPreview(false)}
                      >
                        Close
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>
          {/* Customization panel */}
          <aside className="quizbuilder-right-panel">
            <button
              style={{ position: 'absolute', left: -40, top: 16, background: 'linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)', color: '#fff', border: 'none', borderRadius: '10px 0 0 10px', fontWeight: 700, fontSize: 15, padding: '8px 12px', boxShadow: '0 2px 8px #a5b4fc33', cursor: 'pointer' }}
              onClick={() => setCustomSidebarOpen((open) => !open)}
              aria-label={customSidebarOpen ? 'Close Customization Panel' : 'Open Customization Panel'}
            >
              {customSidebarOpen ? '→' : '←'}
            </button>
            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              <h3 className="quizbuilder-right-title" style={{ marginBottom: 18 }}>Customize Question</h3>
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
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
} 