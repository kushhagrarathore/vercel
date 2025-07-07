import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/client';
import QuestionPreview from './QuestionPreview';

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
      const titleToSave = quizName.trim() ? quizName : 'Untitled Quiz';
      const { data, error } = await supabase
        .from('lq_quizzes')
        .insert([{ title: titleToSave }])
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

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Buttons */}
      <div className="flex justify-between items-center px-6 py-4 bg-white shadow sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-semibold"
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
            className={`ml-4 text-xl font-semibold truncate max-w-xs border-none focus:ring-0 focus:outline-none p-0 m-0 transition-all duration-300 ${titleInputGlow ? 'ring-2 ring-amber-400 ring-offset-2 border-amber-400' : ''} ${titleInputBg ? 'bg-amber-100/70' : 'bg-transparent'}`}
            style={{ minWidth: '120px' }}
          />
        </div>
        <div className="flex items-center gap-4">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
            onClick={() => navigate('/Admin')}
          >
            Go to Admin Page →
          </button>
          <button
            type="button"
            onClick={handleMenuCreateQuiz}
            className="px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors whitespace-nowrap"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Quiz'}
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
        <aside className="fixed top-[4.5rem] left-0 h-[calc(100vh-4.5rem)] w-60 min-w-[12rem] bg-white shadow-lg flex flex-col justify-between z-10">
          <div className="overflow-y-auto flex-1 p-4">
            <h2 className="text-lg font-bold mb-3">Questions</h2>
            <ul className="space-y-2">
              {questions.map((q, idx) => (
                <li
                  key={q.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragEnter={() => handleDragEnter(idx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => e.preventDefault()}
                  className={`w-full text-left px-3 py-2 rounded transition-colors flex items-center gap-2 cursor-move select-none ${selectedQuestionIdx === idx ? 'bg-blue-100 font-bold' : 'hover:bg-gray-100'}`}
                  onClick={() => handleSidebarClick(idx)}
                >
                  <span className="text-xs font-semibold text-gray-500 mr-2">Q{idx + 1}</span>
                  <span className="truncate flex-1">{q.question_text || `Question ${idx + 1}`}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="p-4 border-t">
            <button
              className="w-full py-2 bg-green-500 text-white rounded hover:bg-green-600"
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
            <form onSubmit={handleSubmit} className="mb-8 w-full flex flex-col items-center">
              <div className="bg-white/80 rounded-xl shadow-lg p-6 max-w-2xl w-full mx-auto">
                <h2 className="text-2xl font-bold text-blue-700 mb-4 text-center">{isEditingExisting ? `Q${selectedQuestionIdx + 1} Preview & Edit` : 'Add New Question'}</h2>
                <div className="mb-4">
                  <label className="block mb-2 font-semibold text-gray-700">Question Text</label>
                  <input
                    type="text"
                    value={form.question_text}
                    onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                    className="w-full p-3 border rounded-lg text-lg shadow-sm focus:ring-2 focus:ring-blue-300"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-2 font-semibold text-gray-700">Options</label>
                  <ul className="ml-4 mt-2 space-y-2">
                    {form.options.map((option, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          className="flex-1 p-2 border rounded-lg text-base shadow-sm"
                          placeholder={`Option ${index + 1}`}
                          required
                        />
                        <input
                          type="radio"
                          name="correct_answer"
                          checked={form.correct_answer_index === index}
                          onChange={() => setForm({ ...form, correct_answer_index: index })}
                          className="ml-2"
                        />
                        <span className={form.correct_answer_index === index ? 'text-green-600 font-bold' : 'text-gray-500'}>
                          {form.correct_answer_index === index ? '✓' : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="ml-2 px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 disabled:opacity-50"
                          disabled={form.options.length <= 2}
                          style={{ display: form.options.length > 2 ? 'inline-block' : 'none' }}
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
                    className="mt-4 px-4 py-2 bg-gray-200 rounded-lg font-semibold hover:bg-gray-300 disabled:opacity-50"
                    disabled={form.options.length >= 4}
                    style={{ display: form.options.length < 4 ? 'inline-block' : 'none' }}
                  >
                    Add Option
                  </button>
                </div>
                <div className="mb-4">
                  <label className="block mb-2 font-semibold text-gray-700">Timer (seconds)</label>
                  <input
                    type="number"
                    value={form.timer}
                    onChange={(e) => setForm({ ...form, timer: parseInt(e.target.value) })}
                    className="w-full p-3 border rounded-lg text-lg shadow-sm"
                    min="5"
                    max="60"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-500 text-white rounded-lg font-bold text-lg shadow hover:bg-blue-600 disabled:bg-gray-400 mt-2"
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
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
} 