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
      <div
        className="form-builder-page"
        style={{
          minHeight: '100vh',
          width: '100vw',
          backgroundColor: customization.backgroundColor,
          backgroundImage: customization.backgroundImage ? `url(${customization.backgroundImage})` : undefined,
          backgroundSize: customization.backgroundImage ? 'cover' : undefined,
          backgroundPosition: customization.backgroundImage ? 'center' : undefined,
          backgroundRepeat: customization.backgroundImage ? 'no-repeat' : undefined,
          fontFamily: customization.fontFamily,
          transition: 'background 0.3s',
        }}
      >
        {loading && <div style={{ margin: '40px auto', textAlign: 'center' }}><Spinner size={40} /></div>}
        {!loading && (
          <>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#4a5568' }} onClick={handleBackToDashboard}>
                  ← Back to Dashboard
                </button>
                <input
                  type="text"
                  placeholder="Untitled Form"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  style={{ fontSize: '1.75rem', fontWeight: '700', border: 'none', outline: 'none', background: 'transparent', color: '#1a202c', width: '300px' }}
                />
              </div>
              <nav style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '4px' }}>
                <button
                  onClick={() => setActiveSection('build')}
                  style={{ padding: '8px 16px', border: 'none', background: activeSection === 'build' ? '#6366f1' : 'transparent', color: activeSection === 'build' ? '#fff' : '#1a202c', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s ease-in-out' }}
                >
                  Build
                </button>
                <button
                  onClick={() => setActiveSection('share')}
                  style={{ padding: '8px 16px', border: 'none', background: activeSection === 'share' ? '#6366f1' : 'transparent', color: activeSection === 'share' ? '#fff' : '#1a202c', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s ease-in-out' }}
                >
                  Share
                </button>
                <button
                  onClick={handleNavigateToResults}
                  style={{ padding: '8px 16px', border: 'none', background: 'transparent', color: '#1a202c', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s ease-in-out' }}
                >
                  Results
                </button>
              </nav>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button
                  onClick={saveForm}
                  style={{ padding: '8px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Save Form
                </button>
                <button
                  onClick={handlePreviewClick}
                  style={{ padding: '8px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Preview
                </button>
                <button
                  onClick={handleDeleteForm}
                  style={{ padding: '8px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Delete Form
                </button>
                <button
                  onClick={() => setIsCustomizePanelOpen(!isCustomizePanelOpen)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', color: '#4a5568' }}
                >
                  Customize
                </button>
              </div>
            </header>

            <div className="flex w-full">
              {/* Left Sidebar: Slide Selector */}
              <div className="w-[280px] p-4 bg-white border-r rounded-xl shadow-md">
                <button
                  onClick={() => setIsAddQuestionModalOpen(true)}
                  className="w-full text-white font-semibold py-2 rounded-md bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 transition-all mb-4"
                >
                  + Add Question
                </button>
                <div className="space-y-2">
                  {questions.map((q, index) => (
                    <div key={q.id} className="p-3 rounded-lg bg-gray-100 hover:bg-gray-200 flex justify-between items-center cursor-pointer">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 font-bold">{String(index + 1).padStart(2, '0')}</span>
                        <span className="font-semibold text-gray-800 truncate">{q.question_text || 'Untitled Question'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-1 rounded-full text-gray-500 hover:bg-gray-300 hover:text-red-600 transition-colors" onClick={() => removeQuestion(q.id)}><TrashIcon /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Center: Form Editor */}
              <main className="flex-1 p-8 bg-slate-100">
                <div className="form-title-block">
                  <p className="form-editor-area-title-placeholder">
                    Form Title: <span className="current-title">{title}</span>
                  </p>
                  <textarea
                    className="form-description-textarea"
                    placeholder="Add a short description about this form..."
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                  />
                </div>
                {questions.length > 0 ? (
                  <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                      <div className="questions-container">
                        {questions.map((q, i) => (
                          <SortableQuestion key={q.id} id={q.id}>
                            {renderQuestion(q, i)}
                          </SortableQuestion>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="text-center py-24 px-8 bg-white rounded-xl border-2 border-dashed border-gray-300">
                    <h3 className="text-xl font-semibold text-gray-700">Your form is empty!</h3>
                    <p className="text-gray-500 mt-2">Click the "+ Add Question" button to start building your form.</p>
                  </div>
                )}
              </main>

              {/* Right Sidebar: Customization */}
              {isCustomizePanelOpen && (
                <aside className="w-[20%] p-4 bg-white border-l shadow-lg">
                  <h3 className="text-lg font-semibold mb-4">Customize</h3>
                  <div className="space-y-4">
                    <CustomizationPanel
                      customization={customization}
                      setCustomization={(newCustomization) => {
                        setCustomization(newCustomization);
                        setHasUnsavedChanges(true);
                      }}
                      ChromePicker={ChromePicker}
                    />
                  </div>
                </aside>
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
                        <span className="text-3xl transition-transform group-hover:scale-110">{qType.icon}</span>
                        <span className="font-semibold text-gray-700 group-hover:text-indigo-800">{qType.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
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
    <div
      className="form-builder-page"
      style={{
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: customization.backgroundColor,
        backgroundImage: customization.backgroundImage ? `url(${customization.backgroundImage})` : undefined,
        backgroundSize: customization.backgroundImage ? 'cover' : undefined,
        backgroundPosition: customization.backgroundImage ? 'center' : undefined,
        backgroundRepeat: customization.backgroundImage ? 'no-repeat' : undefined,
        fontFamily: customization.fontFamily,
        transition: 'background 0.3s',
      }}
    >
      {loading && <div style={{ margin: '40px auto', textAlign: 'center' }}><Spinner size={40} /></div>}
      {!loading && (
        <>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#4a5568' }} onClick={handleBackToDashboard}>
                ← Back to Dashboard
              </button>
              <input
                type="text"
                placeholder="Untitled Form"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                style={{ fontSize: '1.75rem', fontWeight: '700', border: 'none', outline: 'none', background: 'transparent', color: '#1a202c', width: '300px' }}
              />
            </div>
            <nav style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '4px' }}>
              <button
                onClick={() => setActiveSection('build')}
                style={{ padding: '8px 16px', border: 'none', background: activeSection === 'build' ? '#6366f1' : 'transparent', color: activeSection === 'build' ? '#fff' : '#1a202c', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s ease-in-out' }}
              >
                Build
              </button>
              <button
                onClick={() => setActiveSection('share')}
                style={{ padding: '8px 16px', border: 'none', background: activeSection === 'share' ? '#6366f1' : 'transparent', color: activeSection === 'share' ? '#fff' : '#1a202c', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s ease-in-out' }}
              >
                Share
              </button>
              <button
                onClick={handleNavigateToResults}
                style={{ padding: '8px 16px', border: 'none', background: 'transparent', color: '#1a202c', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s ease-in-out' }}
              >
                Results
              </button>
            </nav>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={saveForm}
                style={{ padding: '8px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
              >
                Save Form
              </button>
              <button
                onClick={handlePreviewClick}
                style={{ padding: '8px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
              >
                Preview
              </button>
              <button
                onClick={handleDeleteForm}
                style={{ padding: '8px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
              >
                Delete Form
              </button>
              <button
                onClick={() => setIsCustomizePanelOpen(!isCustomizePanelOpen)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', color: '#4a5568' }}
              >
                Customize
              </button>
            </div>
          </header>

          <div className="flex w-full">
            {activeSection === 'build' && (
              <>
                {/* Left Sidebar: Slide Selector */}
                <div className="w-[280px] p-4 bg-white border-r rounded-xl shadow-md">
                  <button
                    onClick={() => setIsAddQuestionModalOpen(true)}
                    className="w-full text-white font-semibold py-2 rounded-md bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 transition-all mb-4"
                  >
                    + Add Question
                  </button>
                  <div className="space-y-2">
                    {questions.map((q, index) => (
                      <div key={q.id} className="p-3 rounded-lg bg-gray-100 hover:bg-gray-200 flex justify-between items-center cursor-pointer">
                        <div className="flex items-center gap-3">
                          <span className="text-gray-500 font-bold">{String(index + 1).padStart(2, '0')}</span>
                          <span className="font-semibold text-gray-800 truncate">{q.question_text || 'Untitled Question'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="p-1 rounded-full text-gray-500 hover:bg-gray-300 hover:text-red-600 transition-colors" onClick={() => removeQuestion(q.id)}><TrashIcon /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Center: Form Editor */}
                <main className="flex-1 p-8 bg-slate-100">
                  <div className="form-title-block">
                    <p className="form-editor-area-title-placeholder">
                      Form Title: <span className="current-title">{title}</span>
                    </p>
                    <textarea
                      className="form-description-textarea"
                      placeholder="Add a short description about this form..."
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                    />
                  </div>

                  {questions.length > 0 ? (
                    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                        <div className="questions-container">
                          {questions.map((q, i) => (
                            <SortableQuestion key={q.id} id={q.id}>
                              {renderQuestion(q, i)}
                            </SortableQuestion>
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="text-center py-24 px-8 bg-white rounded-xl border-2 border-dashed border-gray-300">
                      <h3 className="text-xl font-semibold text-gray-700">Your form is empty!</h3>
                      <p className="text-gray-500 mt-2">Click the "+ Add Question" button to start building your form.</p>
                    </div>
                  )}
                </main>
                {/* Right Sidebar: Customization */}
                {isCustomizePanelOpen && (
                  <aside className="w-[20%] p-4 bg-white border-l shadow-lg">
                    <h3 className="text-lg font-semibold mb-4">Customize</h3>
                    <div className="space-y-4">
                      <CustomizationPanel
                        customization={customization}
                        setCustomization={(_newCustomization) => {
                          setCustomization(_newCustomization);
                          setHasUnsavedChanges(true);
                        }}
                        ChromePicker={ChromePicker}
                      />
                    </div>
                  </aside>
                )}
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
                      <span className="text-3xl transition-transform group-hover:scale-110">{qType.icon}</span>
                      <span className="font-semibold text-gray-700 group-hover:text-indigo-800">{qType.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FormBuilder;