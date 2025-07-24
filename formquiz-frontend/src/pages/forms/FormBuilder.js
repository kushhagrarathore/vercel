// Move all imports to the very top of the file
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../../supabase';
import { v4 as uuidv4 } from 'uuid';
import { QRCodeSVG } from 'qrcode.react';
import { ChromePicker } from 'react-color';
import './FormBuilder.css';
import Spinner from '../../components/Spinner';
import { useToast } from '../../components/Toast';
import LongTextQuestion from '../../components/quiz/LongTextQuestion';
import ShortTextQuestion from '../../components/quiz/ShortTextQuestion';
import MultipleChoiceQuestion from '../../components/quiz/MultipleChoiceQuestion';
import PictureChoiceQuestion from '../../components/quiz/PictureChoiceQuestion';
import CustomizationPanel from '../../components/forms/CustomizationPanel';
import FormLayout from '../../components/forms/FormLayout';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PlusIcon, EyeIcon, TrashIcon, SaveIcon, ChevronLeft, ChevronRight, Settings, ChevronsLeft, ChevronsRight } from 'lucide-react';
// Remove react-beautiful-dnd imports and onDragEnd

// Add SortableQuestion component above FormBuilder
function SortableQuestion({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    boxShadow: isDragging ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
    background: isDragging ? '#f8f8ff' : undefined,
    marginBottom: 12,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {React.cloneElement(children, { dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  );
}

const FormBuilder = () => {
  const location = useLocation();
  const premadeQuestions = location.state?.questions;
  const premadeTitle = location.state?.title;
  const premadeDescription = location.state?.description;

  const [title, setTitle] = useState(premadeTitle || 'Untitled Form');
  const [description, setDescription] = useState(premadeDescription || '');
  const [questions, setQuestions] = useState(
    premadeQuestions
      ? premadeQuestions.map(q => ({ ...q, id: q.id || uuidv4() }))
      : []
  );
  const [formId, setFormId] = useState(null);
  const [isCustomizePanelOpen, setIsCustomizePanelOpen] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const navigate = useNavigate();
  const { formId: paramFormId } = useParams(); // <-- Get formId from URL
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('build');
  const [isAddQuestionModalOpen, setIsAddQuestionModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);

  const PencilIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>;
  const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
  const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

  const [customization, setCustomization] = useState({
    backgroundColor: '#ffffff',
    textColor: '#000000',
    buttonColor: '#4a6bff',
    buttonTextColor: '#ffffff',
    backgroundImage: '',
    logoImage: '',
    fontFamily: 'Arial, sans-serif',
    borderRadius: '4px',
  });

  // NEW: handleDragEnd for @dnd-kit
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setQuestions((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      setHasUnsavedChanges(true); // Indicate unsaved changes after reordering
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const questionTypes = {
    standard: [
      { name: 'Short text', icon: '📄', type: 'short-text' },
      { name: 'Long text', icon: '✍️', type: 'long-text' },
      { name: 'Multiple choice', icon: '●', type: 'multiple-choice' },
      { name: 'Picture choice', icon: '🖼️', type: 'picture-choice' },
    ],
    premium: [
      { name: 'Video', icon: '📹', type: 'video' },
    ],
  };

  useEffect(() => {
    // Only fetch form if paramFormId is present (i.e., editing an existing form)
    if (!paramFormId) {
      setLoading(false);
      setFormId(null);
      // If template data is present, set it (for navigation from template cards)
      if (premadeQuestions && premadeQuestions.length > 0) {
        setQuestions(premadeQuestions.map(q => ({ ...q, id: q.id || uuidv4() })));
      }
      if (premadeTitle) {
        setTitle(premadeTitle);
      }
      if (premadeDescription) {
        setDescription(premadeDescription);
      }
      return;
    }
    async function fetchForm() {
      setLoading(true);
      try {
        const { data: form, error } = await supabase
          .from('forms')
          .select('*')
          .eq('id', paramFormId)
          .single();
        if (error || !form) {
          setFormId(null);
          setLoading(false);
          return;
        }
        setFormId(form.id);
        setTitle(form.title || 'Untitled Form');
        setDescription(form.description || '');
        setCustomization(form.customization_settings || customization);
        // Fetch questions
        const { data: questionsData } = await supabase
          .from('questions')
          .select('*')
          .eq('form_id', form.id)
          .order('order_index');
        // Map old questions to ensure question_type and label are present
        const mappedQuestions = (questionsData || []).map(q => ({
          ...q,
          question_type: q.question_type || q.type || 'short-text',
          label: q.label || q.question_text || '',
        }));
        setQuestions(mappedQuestions);
        setLoading(false);
      } catch (err) {
        setFormId(null);
        setLoading(false);
      }
    }
    fetchForm();
    // eslint-disable-next-line
  }, [paramFormId]);


  const addQuestion = (type) => {
    setHasUnsavedChanges(true);

    const questionLabels = {
      'short-text': 'Short answer question',
      'long-text': 'Long answer question',
      'multiple-choice': 'Multiple choice question',
      'picture-choice': 'Picture choice question',
      'video': 'Video question'
    };

    // Refactored to potentially avoid a parser bug
    const defaultQuestionText = `New ${type} question`;
    const questionText = questionLabels[type] || defaultQuestionText;

    const newQuestion = {
      id: uuidv4(),
      question_type: type,
      question_text: questionText, // Using the new variable
      options: type.includes('choice') ? ['Option 1', 'Option 2'] : [],
      media: '',
      required: false,
      settings: {},
    };

    setQuestions(prev => [...prev, newQuestion]);
  };

  const removeQuestion = (idToRemove) => {
    setHasUnsavedChanges(true);
    setQuestions(questions.filter(q => q.id !== idToRemove));
  };

  const handleQuestionTextChange = (id, newText) => {
    setHasUnsavedChanges(true);
    setQuestions(prev =>
      prev.map(q => (q.id === id ? { ...q, question_text: newText } : q))
    );
  };

  const updateQuestion = (id, field, value) => {
    setHasUnsavedChanges(true);
    setQuestions(prev =>
      prev.map(q => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const addOption = (questionId) => {
    setHasUnsavedChanges(true);
    setQuestions(prev =>
      prev.map(q =>
        q.id === questionId
          ? { ...q, options: [...q.options, `Option ${q.options.length + 1}`] }
          : q
      )
    );
  };

  const saveForm = async () => {
    if (!title.trim()) {
      alert('Form title cannot be empty.');
      return;
    }
    if (!questions.length) {
      alert('Please add at least one question before saving.');
      return;
    }
    setLoading(true);
    setHasUnsavedChanges(false); // ✅ Reset unsaved flag after saving

    try {
      let currentFormId = formId;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to save a form.');
        setLoading(false);
        return;
      }
      // CREATE NEW FORM if no ID
      if (!currentFormId) {
        const formData = {
          title: title.trim(),
          description: description.trim(), // ✅ new
          customization_settings: customization,
          created_by: user?.email || 'anonymous',
          user_id: user?.id || null,
        };
        const { data: form, error: formError } = await supabase
          .from('forms')
          .insert([formData])
          .select()
          .single();
        if (formError) {
          alert(`❌ Failed to create form`);
          setLoading(false);
          return;
        }
        currentFormId = form.id;
        setFormId(currentFormId);
        localStorage.setItem('currentFormId', currentFormId);
        localStorage.setItem('formUserEmail', user?.email);
      } else {
        // UPDATE FORM if already exists
        const { error: updateError } = await supabase
          .from('forms')
          .update({
            title: title.trim(),
            description: description.trim(), // ✅ new
            customization_settings: customization,
            user_id: user?.id || null,
          })
          .eq('id', currentFormId);
        if (updateError) {
          alert('❌ Failed to update form');
          setLoading(false);
          return;
        }
      }
      // Delete old questions
      const { error: deleteError } = await supabase
        .from('questions')
        .delete()
        .eq('form_id', currentFormId);
      if (deleteError) {
        alert(`❌ Failed to delete old questions: ${deleteError.message}`);
        setLoading(false);
        return;
      }
      // Insert new questions
      if (questions.length) {
        const questionsWithId = questions.map((q, idx) => ({ ...q, id: q.id || uuidv4() }));
        const questionsToInsert = questionsWithId.map((q, idx) => ({
          id: q.id,
          form_id: currentFormId,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          required: q.required,
          media: q.media,
          order_index: idx,
          settings: q.settings,
          created_at: q.created_at || new Date().toISOString(),
        }));
        const { error: insertError } = await supabase
          .from('questions')
          .insert(questionsToInsert);
        if (insertError) {
          alert(`❌ Failed to save questions: ${insertError.message}`);
          setLoading(false);
          return;
        }
      }
      setHasUnsavedChanges(false);
      setLoading(false);
      alert('✅ Form saved successfully!');
    } catch (error) {
      alert(`❌ Error saving form: ${error.message}`);
      setLoading(false);
    }
  };

  const handleDeleteForm = async () => {
    if (!window.confirm('Are you sure you want to delete this form?')) return;

    try {
      if (formId) {
        const { error } = await supabase.from('forms').delete().eq('id', formId);
        if (error) {
          console.error('Error deleting form:', error);
          alert(`❌ Error deleting form: ${error.message}`);
          return;
        }
      }

      // Clear localStorage and reset state
      localStorage.removeItem('formQuestions');
      localStorage.removeItem('formTitle');
      localStorage.removeItem('currentFormId');
      localStorage.removeItem('formCustomization');

      setQuestions([]);
      setTitle('Untitled Form');
      setDescription(''); // ✅ new
      setFormId(null);
      setCustomization({
        backgroundColor: '#ffffff',
        textColor: '#000000',
        buttonColor: '#4a6bff',
        buttonTextColor: '#ffffff',
        backgroundImage: '',
        logoImage: '',
        fontFamily: 'Arial, sans-serif',
        borderRadius: '4px',
      });
      setHasUnsavedChanges(false);

      alert('✅ Form deleted successfully!');
    } catch (error) {
      console.error('Error deleting form:', error);
      alert(`❌ Error deleting form: ${error.message}`);
    }
  };

  const handleBackToDashboard = () => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm(
        '⚠️ You have unsaved changes. Are you sure you want to go back to the dashboard without saving?'
      );
      if (!confirmLeave) return;
    }
    // Do NOT auto-save or create a form here!
    // If the form was never saved (no formId), do not create it or show it on the dashboard.
    navigate('/dashboard');
  };

  const handlePreviewClick = () => {
    if (questions.length === 0) {
      alert('Please add at least one question before previewing.');
      return;
    }

    const formDraft = {
      title,
      description, // ✅ new
      questions,
      customization,
    };

    localStorage.setItem('formDraft', JSON.stringify(formDraft));
    localStorage.setItem('skipFormSave', 'false');
    setIsPreviewMode(true);
  };

  const handleNavigateToResults = () => {
    if (!formId) {
      toast('Please save your form to see the results.', 'info');
      return;
    }
    navigate(`/forms/${formId}/results`);
  };

  const renderQuestion = (question, index) => {
    // Normalize question data for components
    const normalizedQuestion = {
      ...question,
      label: question.question_text || question.label || '',
      type: question.question_type || question.type || 'short-text',
    };

    const commonProps = {
      question: normalizedQuestion,
      questionIndex: index + 1,
      onRemove: () => removeQuestion(question.id),
      onQuestionTextChange: handleQuestionTextChange,
      onUpdateQuestion: updateQuestion,
      onAddOption: addOption,
      customization,
    };

    // Handle both old and new question type formats
    const questionType = question.question_type || question.type || 'short-text';

    switch (questionType) {
      case 'short-text':
      case 'short_text':
        return <ShortTextQuestion key={question.id} {...commonProps} />;
      case 'long-text':
      case 'long_text':
        return <LongTextQuestion key={question.id} {...commonProps} />;
      case 'multiple-choice':
      case 'multiple_choice':
        return <MultipleChoiceQuestion key={question.id} {...commonProps} />;
      case 'picture-choice':
      case 'picture_choice':
        return <PictureChoiceQuestion key={question.id} {...commonProps} />;
      default:
        console.warn('Unknown question type:', questionType);
        return (
          <div key={question.id} className="question-block">
            <div className="question-header">
              <span className="question-number">Question {index + 1}</span>
              <button className="remove-question-button" onClick={() => removeQuestion(question.id)}>
                ✕
              </button>
            </div>
            <input
              type="text"
              className="question-input"
              placeholder={`${questionType} question (component not implemented)`}
              value={question.question_text || question.label || ''}
              onChange={(e) => handleQuestionTextChange(question.id, e.target.value)}
              style={{ color: customization.textColor }}
            />
            <p className="placeholder-notice">
              This question type ({questionType}) needs a custom component implementation.
            </p>
          </div>
        );
    }
  };

  const baseURL = window.location.origin;
  const formUrl = formId ? `${baseURL}/form/${formId}` : '';

  // Preview mode render
  if (isPreviewMode) {
    return (
      <FormLayout customization={customization}>
        <div className="form-content-area">
          {customization.logoImage && (
            <div className="form-logo-preview">
              <img src={customization.logoImage} alt="Form Logo" style={{ maxWidth: '200px' }} />
            </div>
          )}
          <h2 className="form-title" style={{ color: customization.textColor }}>{title}</h2>
          {description && (
            <p
              className="form-description-preview"
              style={{
                color: customization.textColor,
                fontFamily: customization.fontFamily,
                fontSize: '1.1rem',
                marginTop: '8px',
                marginBottom: '24px',
                textAlign: 'center',
                maxWidth: '700px',
                lineHeight: '1.6',
              }}
            >
              {description}
            </p>
          )}
          {questions.map((question, index) => (
            <div key={question.id} className="form-preview-question">
              <h3 className="form-preview-label" style={{ color: customization.textColor }}>
                Q{index + 1}. {question.question_text || question.label || 'Untitled Question'}
              </h3>
              {(question.question_type === 'short-text' || question.type === 'short-text') && (
                <input
                  type="text"
                  placeholder="Short answer text"
                  disabled
                  className="form-preview-input"
                  style={{
                    color: customization.textColor,
                    borderRadius: customization.borderRadius,
                    borderColor: customization.buttonColor + '80',
                    fontFamily: customization.fontFamily,
                  }}
                />
              )}
              {(question.question_type === 'long-text' || question.type === 'long-text') && (
                <textarea
                  placeholder="Long answer text"
                  rows="4"
                  disabled
                  className="form-preview-input"
                  style={{
                    color: customization.textColor,
                    borderRadius: customization.borderRadius,
                    borderColor: customization.buttonColor + '80',
                    fontFamily: customization.fontFamily,
                  }}
                />
              )}
              {(question.question_type === 'multiple-choice' || question.question_type === 'dropdown' || question.type === 'multiple-choice') && (
                <div className="form-preview-options">
                  {question.options?.map((option, optIndex) => (
                    <label key={optIndex} className="form-preview-option-label" style={{ color: customization.textColor, fontFamily: customization.fontFamily }}>
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        disabled
                        className="form-preview-radio"
                        style={{
                          accentColor: customization.buttonColor,
                          marginRight: '8px',
                        }}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
          <button
            className="form-preview-submit"
            style={{
              backgroundColor: customization.buttonColor,
              color: customization.buttonTextColor,
              borderRadius: customization.borderRadius,
              padding: '12px 25px',
              border: 'none',
              cursor: 'pointer',
              marginTop: '30px',
              fontSize: '1.1em',
              fontFamily: customization.fontFamily,
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
              transition: 'background-color 0.3s ease, transform 0.1s ease',
            }}
            onMouseOver={e => (e.target.style.backgroundColor = customization.buttonColor + 'cc')}
            onMouseOut={e => (e.target.style.backgroundColor = customization.buttonColor)}
            disabled
          >
            Submit
          </button>
          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <button
              className="preview-button"
              onClick={() => {
                localStorage.removeItem('skipFormSave');
                setIsPreviewMode(false);
              }}
              style={{ background: 'none', border: 'none', color: customization.buttonColor, fontWeight: 600, cursor: 'pointer', fontSize: 16 }}
            >
              ← Back to Edit
            </button>
          </div>
        </div>
      </FormLayout>
    );
  }

  // For new forms (no paramFormId), show the builder interface
  if (!paramFormId) {
    return (
      <div className="form-builder-page flex flex-col h-screen w-screen bg-gray-50 overflow-hidden" style={{ fontFamily: customization.fontFamily }}>
        {loading && <div className="absolute inset-0 flex items-center justify-center"><Spinner size={40} /></div>}
        {!loading && (
          <>
            <header className="sticky top-0 z-30 bg-white border-b border-gray-200 p-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <button className="bg-transparent border-none cursor-pointer text-sm text-gray-500 hover:text-indigo-600 transition flex items-center gap-2" onClick={handleBackToDashboard}>
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <input
                  type="text"
                  placeholder="Untitled Form"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="text-xl font-bold border-none outline-none bg-transparent text-gray-800 w-72"
                />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={saveForm} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-sm">
                  <SaveIcon className="w-4 h-4" /> Save
                </button>
                <button onClick={handlePreviewClick} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-sm">
                  <EyeIcon className="w-4 h-4" /> Preview
                </button>
                <button onClick={() => setIsShareModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg shadow-sm hover:bg-indigo-700 transition-colors text-sm">
                  Share
                </button>
                <button onClick={handleDeleteForm} className="flex items-center justify-center w-9 h-9 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-red-50 text-gray-600 hover:text-red-600 transition-colors" title="Delete Form">
                  <TrashIcon className="w-4 h-4" />
                </button>
                <button onClick={() => setIsCustomizePanelOpen(!isCustomizePanelOpen)} className="flex items-center justify-center w-9 h-9 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 text-gray-600 transition-colors" title="Customize">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
              <aside className={`bg-white border-r transition-all duration-300 ease-in-out flex flex-col ${isLeftSidebarCollapsed ? 'w-20' : 'w-72'}`}>
                <div className="p-4 flex-1 overflow-y-auto">
                <button
                  onClick={() => setIsAddQuestionModalOpen(true)}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg shadow-sm hover:bg-indigo-700 transition-all duration-200 ease-in-out mb-4"
                >
                    <PlusIcon className="w-5 h-5" />
                    {!isLeftSidebarCollapsed && <span>Add Question</span>}
                </button>
                <div className="space-y-2">
                  {questions.map((q, index) => (
                      <div key={q.id} className="p-3 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center cursor-pointer overflow-hidden">
                        <span className="text-gray-500 font-bold">{String(index + 1).padStart(2, '0')}</span>
                        {!isLeftSidebarCollapsed && (
                          <span className="font-semibold text-gray-800 truncate ml-3" title={q.question_text || 'Untitled Question'}>
                          {q.question_text || 'Untitled Question'}
                        </span>
                        )}
                    </div>
                  ))}
                </div>
              </div>
                <div className="p-2 border-t">
                  <button
                    onClick={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
                    className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
                    title={isLeftSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                  >
                    {isLeftSidebarCollapsed ? <ChevronsRight className="w-5 h-5" /> : <ChevronsLeft className="w-5 h-5" />}
                  </button>
                </div>
              </aside>

              <main className="flex-1 p-8 bg-slate-100 overflow-y-auto">
                <div className="form-title-block max-w-4xl mx-auto">
                  <textarea
                    className="form-description-textarea w-full text-4xl font-bold border-none outline-none bg-transparent text-gray-800 resize-none mb-2"
                    placeholder="Form Title"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setHasUnsavedChanges(true); }}
                    rows="1"
                  />
                  <textarea
                    className="form-description-textarea w-full text-base border-none outline-none bg-transparent text-gray-500 resize-none"
                    placeholder="Add a short description about this form..."
                    value={description}
                    onChange={(e) => { setDescription(e.target.value); setHasUnsavedChanges(true); }}
                    rows="2"
                  />
                </div>
                {questions.length > 0 ? (
                  <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                      <div className="questions-container max-w-4xl mx-auto mt-8">
                        {questions.map((q, i) => (
                          <SortableQuestion key={q.id} id={q.id}>
                            {renderQuestion(q, i)}
                          </SortableQuestion>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="text-center py-24 px-8 mt-8 bg-white rounded-xl border-2 border-dashed border-gray-300 max-w-4xl mx-auto">
                    <h3 className="text-xl font-semibold text-gray-700">Your form is empty!</h3>
                    <p className="text-gray-500 mt-2">Click the "+ Add Question" button to start building your form.</p>
                  </div>
                )}
              </main>

              <aside className={`bg-white border-l transition-all duration-300 ease-in-out overflow-y-auto ${isCustomizePanelOpen ? 'w-80 p-4' : 'w-0 p-0 overflow-hidden'}`}>
              {isCustomizePanelOpen && (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Customize</h3>
                      <button onClick={() => setIsCustomizePanelOpen(false)} className="text-gray-500 hover:text-gray-800">
                        <CloseIcon />
                      </button>
                    </div>
                    <CustomizationPanel
                      customization={customization}
                      setCustomization={(newCustomization) => {
                        setCustomization(newCustomization);
                        setHasUnsavedChanges(true);
                      }}
                      ChromePicker={ChromePicker}
                    />
                  </>
              )}
              </aside>
            </div>
            {isAddQuestionModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
                <div className="relative w-full max-w-lg mx-4 sm:mx-auto rounded-2xl shadow-xl bg-white/70 backdrop-blur-lg border border-white/30 p-8 animate-pop-in" style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)' }}>
                  <button onClick={() => setIsAddQuestionModalOpen(false)} className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-800 transition-colors">
                    <CloseIcon />
                  </button>
                  <h3 className="text-2xl font-bold text-center mb-6 text-gray-900">Choose a question type</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {questionTypes['standard'].map((qType) => (
                      <button
                        key={qType.type}
                        onClick={() => {
                          addQuestion(qType.type);
                          setIsAddQuestionModalOpen(false);
                        }}
                        className="flex flex-col items-center justify-center rounded-xl bg-white/80 border border-gray-200 shadow-md px-6 py-8 transition-all duration-200 hover:bg-indigo-50 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 group cursor-pointer"
                        type="button"
                      >
                        <span className="text-3xl mb-2 text-indigo-500 group-hover:scale-110 transition-transform">
                          {/* Use a relevant icon for each type */}
                          {qType.type === 'short-text' && <span>📝</span>}
                          {qType.type === 'long-text' && <span>✒️</span>}
                          {qType.type === 'multiple-choice' && <span>🔘</span>}
                          {qType.type === 'picture-choice' && <span>🖼️</span>}
                        </span>
                        <span className="font-semibold text-lg text-gray-800 mb-1 text-center">{qType.name}</span>
                        <span className="text-gray-500 text-sm text-center">
                          {qType.type === 'short-text' && 'Single-line text answer'}
                          {qType.type === 'long-text' && 'Multi-line text answer'}
                          {qType.type === 'multiple-choice' && 'Select one from options'}
                          {qType.type === 'picture-choice' && 'Choose from images'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <style>{`
                  @keyframes pop-in {
                    0% { opacity: 0; transform: scale(0.92); }
                    100% { opacity: 1; transform: scale(1); }
                  }
                  .animate-pop-in {
                    animation: pop-in 0.32s cubic-bezier(0.4,0,0.2,1);
                  }
                `}</style>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Fallback UI for missing formId or failed load
  if (!formId) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>Form not found or missing ID.</h2>
        <button onClick={() => navigate('/dashboard')} style={{ marginTop: 24, padding: '12px 32px', fontSize: 18, borderRadius: 8, background: '#4a6bff', color: '#fff', border: 'none', fontWeight: 700 }}>Back to Dashboard</button>
      </div>
    );
  }

  // Main form builder render
  return (
    <div className="form-builder-page flex flex-col h-screen w-screen bg-gray-50 overflow-hidden" style={{ fontFamily: customization.fontFamily }}>
      {loading && <div className="absolute inset-0 flex items-center justify-center"><Spinner size={40} /></div>}
      {!loading && (
        <>
          <header className="sticky top-0 z-30 bg-white border-b border-gray-200 p-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <button className="bg-transparent border-none cursor-pointer text-sm text-gray-500 hover:text-indigo-600 transition flex items-center gap-2" onClick={handleBackToDashboard}>
                  <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <input
                type="text"
                placeholder="Untitled Form"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                  className="text-xl font-bold border-none outline-none bg-transparent text-gray-800 w-72"
              />
            </div>
              <div className="flex items-center gap-2">
                <button onClick={saveForm} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-sm">
                  <SaveIcon className="w-4 h-4" /> Save
              </button>
                <button onClick={handlePreviewClick} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-sm">
                  <EyeIcon className="w-4 h-4" /> Preview
              </button>
                <button onClick={() => setIsShareModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg shadow-sm hover:bg-indigo-700 transition-colors text-sm">
                Share
              </button>
                <button onClick={handleDeleteForm} className="flex items-center justify-center w-9 h-9 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-red-50 text-gray-600 hover:text-red-600 transition-colors" title="Delete Form">
                  <TrashIcon className="w-4 h-4" />
              </button>
                <button onClick={() => setIsCustomizePanelOpen(!isCustomizePanelOpen)} className="flex items-center justify-center w-9 h-9 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 text-gray-600 transition-colors" title="Customize">
                  <Settings className="w-4 h-4" />
              </button>
            </div>
          </header>

          <div className="flex flex-1 overflow-hidden">
            {activeSection === 'build' && (
              <>
                <aside className={`bg-white border-r transition-all duration-300 ease-in-out flex flex-col ${isLeftSidebarCollapsed ? 'w-20' : 'w-72'}`}>
                  <div className="p-4 flex-1 overflow-y-auto">
                  <button
                    onClick={() => setIsAddQuestionModalOpen(true)}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg shadow-sm hover:bg-indigo-700 transition-all duration-200 ease-in-out mb-4"
                  >
                      <PlusIcon className="w-5 h-5" />
                      {!isLeftSidebarCollapsed && <span>Add Question</span>}
                  </button>
                  <div className="space-y-2">
                    {questions.map((q, index) => (
                        <div key={q.id} className="p-3 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center cursor-pointer overflow-hidden">
                          <span className="text-gray-500 font-bold">{String(index + 1).padStart(2, '0')}</span>
                          {!isLeftSidebarCollapsed && (
                            <span className="font-semibold text-gray-800 truncate ml-3" title={q.question_text || 'Untitled Question'}>
                            {q.question_text || 'Untitled Question'}
                          </span>
                          )}
                      </div>
                    ))}
                  </div>
                </div>
                  <div className="p-2 border-t">
                    <button
                      onClick={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
                      className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
                      title={isLeftSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                    >
                      {isLeftSidebarCollapsed ? <ChevronsRight className="w-5 h-5" /> : <ChevronsLeft className="w-5 h-5" />}
                    </button>
                  </div>
                </aside>

                <main className="flex-1 p-8 bg-slate-100 overflow-y-auto">
                   <div className="form-title-block max-w-4xl mx-auto">
                    <textarea
                       className="form-description-textarea w-full text-4xl font-bold border-none outline-none bg-transparent text-gray-800 resize-none mb-2"
                       placeholder="Form Title"
                       value={title}
                       onChange={(e) => { setTitle(e.target.value); setHasUnsavedChanges(true); }}
                       rows="1"
                     />
                     <textarea
                       className="form-description-textarea w-full text-base border-none outline-none bg-transparent text-gray-500 resize-none"
                      placeholder="Add a short description about this form..."
                      value={description}
                       onChange={(e) => { setDescription(e.target.value); setHasUnsavedChanges(true); }}
                       rows="2"
                    />
                  </div>

                  {questions.length > 0 ? (
                    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                        <div className="questions-container max-w-4xl mx-auto mt-8">
                          {questions.map((q, i) => (
                            <SortableQuestion key={q.id} id={q.id}>
                              {renderQuestion(q, i)}
                            </SortableQuestion>
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="text-center py-24 px-8 mt-8 bg-white rounded-xl border-2 border-dashed border-gray-300 max-w-4xl mx-auto">
                      <h3 className="text-xl font-semibold text-gray-700">Your form is empty!</h3>
                      <p className="text-gray-500 mt-2">Click the "+ Add Question" button to start building your form.</p>
                    </div>
                  )}
                </main>
                <aside className={`bg-white border-l transition-all duration-300 ease-in-out overflow-y-auto ${isCustomizePanelOpen ? 'w-80 p-4' : 'w-0 p-0 overflow-hidden'}`}>
                {isCustomizePanelOpen && (
                    <>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Customize</h3>
                        <button onClick={() => setIsCustomizePanelOpen(false)} className="text-gray-500 hover:text-gray-800">
                          <CloseIcon />
                        </button>
                      </div>
                      <CustomizationPanel
                        customization={customization}
                        setCustomization={(_newCustomization) => {
                          setCustomization(_newCustomization);
                          setHasUnsavedChanges(true);
                        }}
                        ChromePicker={ChromePicker}
                      />
                    </>
                )}
                </aside>
              </>
            )}
            {activeSection === 'share' && (
              <div className="share-panel">
                <h2>Share Your Form</h2>
                <div className="share-options">
                  <div className="share-url">
                    <label>Form URL:</label>
                    <input
                      type="text"
                      value={formUrl}
                      readOnly
                      onClick={(e) => {
                        e.target.select();
                        navigator.clipboard.writeText(formUrl).then(() => {
                          toast('Form URL copied!', 'success');
                        });
                      }}
                    />
                    <button className="copy-url-button" onClick={() => {navigator.clipboard.writeText(formUrl); toast('Form URL copied!', 'success');}}>Copy URL</button>
                  </div>
                  <div className="share-qr-code">
                    <label>QR Code:</label>
                    {formUrl ? (
                      <QRCodeSVG value={formUrl} size={128} level="H" />
                    ) : (
                      <p>Save your form to generate a QR code.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            {activeSection === 'results' && (
              <div className="results-panel">
                <h2>Form Results</h2>
                <button className="view-responses-button" onClick={() => navigate(`/form/${formId}/results`)}>View Responses</button>
              </div>
            )}
          </div>
          {isAddQuestionModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
              <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg transform transition-all">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Choose a question type</h3>
                  <button onClick={() => setIsAddQuestionModalOpen(false)} className="p-2 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-800 transition-colors">
                    <CloseIcon />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {questionTypes['standard'].map((qType) => (
                    <div
                      key={qType.type}
                      onClick={() => {
                        addQuestion(qType.type);
                        setIsAddQuestionModalOpen(false);
                      }}
                      className="p-4 border rounded-lg hover:bg-indigo-50 hover:border-indigo-400 cursor-pointer flex items-center gap-4 transition-all group"
                    >
                      <span className="font-semibold text-gray-700 group-hover:text-indigo-800">{qType.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
          <div className="relative w-full max-w-md mx-4 sm:mx-auto rounded-2xl shadow-xl bg-white/90 backdrop-blur-lg border border-white/30 p-8 animate-pop-in">
            <button onClick={() => setIsShareModalOpen(false)} className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-800 transition-colors">
              <CloseIcon />
            </button>
            <h3 className="text-2xl font-bold text-center mb-6 text-gray-900">Share Your Form</h3>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Public Link:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={formUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border rounded-lg bg-gray-100 text-gray-700"
                  onClick={e => { e.target.select(); }}
                />
                <button
                  className="px-3 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600"
                  onClick={() => { navigator.clipboard.writeText(formUrl); toast('Link copied!', 'success'); }}
                >
                  Copy Link
                </button>
              </div>
            </div>
            <div className="mb-4 flex flex-col items-center">
              <label className="block text-gray-700 font-medium mb-1">QR Code:</label>
              {formUrl ? (
                <QRCodeSVG id="form-qr-code" value={formUrl} size={128} level="H" />
              ) : (
                <p>Save your form to generate a QR code.</p>
              )}
              <button
                className="mt-3 px-3 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600"
                onClick={() => {
                  const svg = document.getElementById('form-qr-code');
                  if (!svg) return;
                  const serializer = new window.XMLSerializer();
                  const svgString = serializer.serializeToString(svg);
                  const canvas = document.createElement('canvas');
                  const img = new window.Image();
                  img.onload = function () {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const pngFile = canvas.toDataURL('image/png');
                    const downloadLink = document.createElement('a');
                    downloadLink.href = pngFile;
                    downloadLink.download = 'form-qr-code.png';
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                  };
                  img.src = 'data:image/svg+xml;base64,' + window.btoa(unescape(encodeURIComponent(svgString)));
                }}
              >
                Download QR Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormBuilder;nk.download = 'form-qr-code.png';
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                  };
                  img.src = 'data:image/svg+xml;base64,' + window.btoa(unescape(encodeURIComponent(svgString)));
                }}
              >
                Download QR Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormBuilder;