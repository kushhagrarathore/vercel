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
  const [activeTab, setActiveTab] = useState('standard');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const navigate = useNavigate();
  const { formId: paramFormId } = useParams(); // <-- Get formId from URL
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('build');

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
    
    const newQuestion = {
      id: uuidv4(),
      question_type: type,
      question_text: questionLabels[type] || `New ${type} question`,
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

  const baseURL = process.env.NODE_ENV === 'development'
    ? window.location.origin
    : 'https://inquizo-supa-5z4o.vercel.app/';

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
            <header className="form-builder-header">
              <div className="header-left">
                <button className="back-to-dashboard-button" onClick={handleBackToDashboard}>
                  ← Back to Dashboard
                </button>
                <input
                  type="text"
                  placeholder="Untitled Form"
                  className="form-title-input header-title-input"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                />
              </div>
              <nav className="header-nav">
                <button className={`nav-tab${activeSection === 'build' ? ' active' : ''}`} onClick={() => setActiveSection('build')}>Build</button>
                <button className={`nav-tab${activeSection === 'share' ? ' active' : ''}`} onClick={() => setActiveSection('share')}>Share</button>
                <button className={`nav-tab${activeSection === 'results' ? ' active' : ''}`} onClick={() => setActiveSection('results')}>Results</button>
              </nav>
              <div className="header-right">
                <button className="save-button" onClick={saveForm}>
                  Save Form
                </button>
                <button className="preview-button" onClick={handlePreviewClick}>
                  Preview
                </button>
                <button className="delete-button" onClick={handleDeleteForm}>
                  Delete Form
                </button>
              </div>
            </header>

            <div className="form-builder-content">
              {activeSection === 'build' && (
                <>
                  <aside className="question-types-sidebar">
                    <div className="sidebar-tabs">
                      <button
                        className={`tab-button ${activeTab === 'standard' ? ' active' : ''}`}
                        onClick={() => setActiveTab('standard')}
                      >
                        Questions
                      </button>
                      <button
                        className={`tab-button ${activeTab === 'premium' ? ' active' : ''}`}
                        onClick={() => setActiveTab('premium')}
                        title="Premium features coming soon!"
                      >
                        Premium
                      </button>
                      <button
                        className={`tab-button ${activeTab === 'customize' ? ' active' : ''}`}
                        onClick={() => setActiveTab('customize')}
                      >
                        Customize
                      </button>
                    </div>

                    {activeTab !== 'customize' && (
                      <ul className="question-list">
                        {questionTypes[activeTab].map((qType) => (
                          <li key={qType.type} onClick={() => addQuestion(qType.type)}>
                            <span className="icon">{qType.icon}</span>
                            {qType.name}
                          </li>
                        ))}
                      </ul>
                    )}

                    {activeTab === 'customize' && (
                      <CustomizationPanel
                        customization={customization}
                        setCustomization={(newCustomization) => {
                          setCustomization(newCustomization);
                          setHasUnsavedChanges(true);
                        }}
                        ChromePicker={ChromePicker}
                      />
                    )}
                  </aside>

                  <main className="form-editor-area">
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
                      <div className="questions-container">
                        {questions.map((q, i) => renderQuestion(q, i))}
                      </div>
                    ) : (
                      <div className="empty-form-message">
                        <p>Start by adding questions from the left sidebar!</p>
                      </div>
                    )}
                  </main>
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
          <header className="form-builder-header">
            <div className="header-left">
              <button className="back-to-dashboard-button" onClick={handleBackToDashboard}>
                ← Back to Dashboard
              </button>
              <input
                type="text"
                placeholder="Untitled Form"
                className="form-title-input header-title-input"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setHasUnsavedChanges(true);
                }}
              />
            </div>
            <nav className="header-nav">
              <button className={`nav-tab${activeSection === 'build' ? ' active' : ''}`} onClick={() => setActiveSection('build')}>Build</button>
              <button className={`nav-tab${activeSection === 'share' ? ' active' : ''}`} onClick={() => setActiveSection('share')}>Share</button>
              <button className={`nav-tab${activeSection === 'results' ? ' active' : ''}`} onClick={() => setActiveSection('results')}>Results</button>
            </nav>
            <div className="header-right">
              <button className="save-button" onClick={saveForm}>
                Save Form
              </button>
              <button className="preview-button" onClick={handlePreviewClick}>
                Preview
              </button>
              <button className="delete-button" onClick={handleDeleteForm}>
                Delete Form
              </button>
            </div>
          </header>

          {/* Removed Debug Panel */}

          <div className="form-builder-content">
            {activeSection === 'build' && (
              <>
                <aside className="question-types-sidebar">
                  <div className="sidebar-tabs">
                    <button
                      className={`tab-button ${activeTab === 'standard' ? 'active' : ''}`}
                      onClick={() => setActiveTab('standard')}
                    >
                      Questions
                    </button>
                    <button
                      className={`tab-button ${activeTab === 'premium' ? 'active' : ''}`}
                      onClick={() => setActiveTab('premium')}
                      title="Premium features coming soon!"
                    >
                      Premium
                    </button>
                    <button
                      className={`tab-button ${activeTab === 'customize' ? 'active' : ''}`}
                      onClick={() => setActiveTab('customize')}
                    >
                      Customize
                    </button>
                  </div>

                  {activeTab !== 'customize' && (
                    <ul className="question-list">
                      {questionTypes[activeTab].map((qType) => (
                        <li key={qType.type} onClick={() => addQuestion(qType.type)}>
                          <span className="icon">{qType.icon}</span>
                          {qType.name}
                        </li>
                      ))}
                    </ul>
                  )}

                  {activeTab === 'customize' && (
                    <CustomizationPanel
                      customization={customization}
                      setCustomization={(newCustomization) => {
                        setCustomization(newCustomization);
                        setHasUnsavedChanges(true);
                      }}
                      ChromePicker={ChromePicker}
                    />
                  )}
                </aside>

                <main className="form-editor-area">
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
                    <div className="questions-container">
                      {questions.map((q, i) => renderQuestion(q, i))}
                    </div>
                  ) : (
                    <div className="empty-form-message">
                      <p>Start by adding questions from the left sidebar!</p>
                    </div>
                  )}
                </main>
              </>
            )}
            {activeSection === 'integrate' && (
              <div className="integrate-panel">
                <h2>Integrate Your Form</h2>
                <p>Embed this form on your website using the following code:</p>
                <pre className="embed-code">{'<iframe src="' + formUrl + '" width="100%" height="600" frameborder="0"></iframe>'}</pre>
                <button className="copy-embed-button" onClick={() => {navigator.clipboard.writeText('<iframe src="' + formUrl + '" width="100%" height="600" frameborder="0"></iframe>'); toast('Embed code copied!', 'success');}}>Copy Embed Code</button>
              </div>
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
        </>
      )}
    </div>
  );
};

export default FormBuilder;