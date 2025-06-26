import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';
import { QRCodeSVG } from 'qrcode.react';
import { ChromePicker } from 'react-color';
import './FormBuilder.css';
import Spinner from '../components/Spinner';
import Skeleton from '../components/Skeleton';
import { useToast } from '../components/Toast';

// Question components
import LongTextQuestion from '../components/LongTextQuestion';
import ShortTextQuestion from '../components/ShortTextQuestion';
import MultipleChoiceQuestion from '../components/MultipleChoiceQuestion';
import PictureChoiceQuestion from '../components/PictureChoiceQuestion';
import CustomizationPanel from '../components/CustomizationPanel';

const FormBuilder = () => {
  const [title, setTitle] = useState('Untitled Form');
  const [questions, setQuestions] = useState([]);
  const [formId, setFormId] = useState(null);
  const [activeTab, setActiveTab] = useState('standard');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const navigate = useNavigate();
  const { formId: paramFormId } = useParams();
  const toast = useToast();
  const [loading, setLoading] = useState(true);

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

  // Initialize form data
  useEffect(() => {
    const initializeForm = async () => {
      setLoading(true);
      try {
        if (paramFormId) {
          // Load existing form from database
          const { data: form, error: formError } = await supabase
            .from('forms')
            .select('*')
            .eq('id', paramFormId)
            .single();

          if (formError || !form) {
            console.error('Error loading form:', formError);
            return;
          }

          setTitle(form.title || 'Untitled Form');
          setFormId(form.id);
          setCustomization(form.customization_settings || customization);

          const { data: questionsData, error: questionsError } = await supabase
            .from('questions')
            .select('*')
            .eq('form_id', paramFormId)
            .order('order_index');

          if (!questionsError && questionsData) {
            setQuestions(
              questionsData.map(q => ({
                id: q.id || uuidv4(),
                type: (q.question_type || 'short-text').replace('_', '-'),
                label: q.question_text,
                options: q.options || [],
                media: q.media || '',
                required: q.required || false,
                settings: q.settings || {},
              }))
            );
          }
        } else {
          // Check if coming from preview
          const draft = localStorage.getItem('formDraft');
          if (draft) {
            const parsed = JSON.parse(draft);
            setTitle(parsed.title || 'Untitled Form');
            setQuestions(parsed.questions || []);
            setCustomization(parsed.customization || customization);
            localStorage.removeItem('formDraft');
          }

          // Check if we should skip loading saved form
          const skipSave = localStorage.getItem('skipFormSave');
          if (skipSave === 'true') {
            localStorage.removeItem('formQuestions');
            localStorage.removeItem('formTitle');
            localStorage.removeItem('currentFormId');
            localStorage.removeItem('formCustomization');
            localStorage.removeItem('skipFormSave');
            return;
          }

          // Load saved form data from localStorage
          const savedQuestions = localStorage.getItem('formQuestions');
          const savedTitle = localStorage.getItem('formTitle');
          const savedFormId = localStorage.getItem('currentFormId');
          const savedCustomization = localStorage.getItem('formCustomization');

          if (savedQuestions) {
            try {
              setQuestions(JSON.parse(savedQuestions));
            } catch (error) {
              toast('Error parsing saved questions', 'error');
              console.error('Error parsing saved questions:', error);
            }
          }
          if (savedTitle) setTitle(savedTitle);
          if (savedFormId) setFormId(savedFormId);
          if (savedCustomization) {
            try {
              setCustomization(JSON.parse(savedCustomization));
            } catch (error) {
              toast('Error parsing saved customization', 'error');
              console.error('Error parsing saved customization:', error);
            }
          }
        }
      } catch (error) {
        toast('Error initializing form', 'error');
        console.error('Error initializing form:', error);
      } finally {
        setLoading(false);
      }
    };
    initializeForm();
  }, [paramFormId, toast]);

  // Auto-save to localStorage
  useEffect(() => {
    const skip = localStorage.getItem('skipAutoSave');
    if (skip === 'true') {
      return;
    }

    if (questions.length > 0 || title !== 'Untitled Form') {
      localStorage.setItem('formQuestions', JSON.stringify(questions));
      localStorage.setItem('formTitle', title);
      localStorage.setItem('formCustomization', JSON.stringify(customization));
      if (formId) {
        localStorage.setItem('currentFormId', formId);
      }
    }
  }, [questions, title, customization, formId]);

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
      type,
      label: questionLabels[type] || `New ${type} question`,
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
      prev.map(q => (q.id === id ? { ...q, label: newText } : q))
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

  const testDatabaseConnection = async () => {
    try {
      const { data: forms, error: formsError } = await supabase
        .from('forms')
        .select('*')
        .limit(1);
        
      if (formsError) {
        console.error('Forms table error:', formsError);
        alert(`❌ Forms table error: ${formsError.message}`);
        return false;
      }
      
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .limit(1);
        
      if (questionsError) {
        console.error('Questions table error:', questionsError);
        alert(`❌ Questions table error: ${questionsError.message}`);
        return false;
      }
      
      alert('✅ Database connection successful!');
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      alert(`❌ Database connection failed: ${error.message}`);
      return false;
    }
  };

  const debugCurrentState = () => {
    console.log('🔍 DEBUGGING CURRENT STATE:');
    console.log('📝 Form ID:', formId);
    console.log('📝 Form Title:', title);
    console.log('📋 Questions count:', questions.length);
    console.log('📋 Questions:', questions);
    console.log('🎨 Customization:', customization);
    
    questions.forEach((q, index) => {
      console.log(`📝 Question ${index + 1} check:`, {
        id: q.id,
        type: q.type,
        label: q.label,
        hasId: !!q.id,
        hasType: !!q.type,
        hasLabel: !!q.label,
        labelLength: q.label?.length || 0,
        optionsType: typeof q.options,
        isOptionsArray: Array.isArray(q.options),
        optionsLength: q.options?.length || 0,
        required: q.required,
        requiredType: typeof q.required
      });
    });

    alert('Check console for detailed debugging information');
  };

  const saveForm = async () => {
    setLoading(true);
    setHasUnsavedChanges(false); // ✅ Reset unsaved flag after saving

    try {
      console.log('💾 Starting form save process...');
      let currentFormId = formId;

      const {
        data: { user },
      } = await supabase.auth.getUser(); // ✅ Fetch current user ONCE

      // ✅ CREATE NEW FORM if no ID
      if (!currentFormId) {
        const formData = {
          title: title.trim(),
          customization_settings: customization,
          created_by: user?.email || 'anonymous', // ✅ attach user email
          user_id: user?.id || null, // ✅ attach user id
        };

        const { data: form, error: formError } = await supabase
          .from('forms')
          .insert([formData])
          .select()
          .single();

        if (formError) {
          console.error('❌ Form creation failed:', formError);
          alert(`❌ Failed to create form`);
          return;
        }

        currentFormId = form.id;
        setFormId(currentFormId);
        localStorage.setItem('currentFormId', currentFormId);
        localStorage.setItem('formUserEmail', user?.email);
      } else {
        // ✅ UPDATE FORM if already exists
        const { error: updateError } = await supabase
          .from('forms')
          .update({
            title: title.trim(),
            customization_settings: customization,
            user_id: user?.id || null, // ✅ update user id as well
          })
          .eq('id', currentFormId);

        if (updateError) {
          alert('❌ Failed to update form');
          return;
        }
      }

      // Delete old questions
      const { error: deleteError } = await supabase
        .from('questions')
        .delete()
        .eq('form_id', currentFormId);

      if (deleteError) {
        console.error('Question deletion failed:', deleteError);
        alert(`❌ Failed to delete old questions: ${deleteError.message}`);
        return;
      }

      // Insert new questions
      const formattedQuestions = questions.map((q, index) => ({
        form_id: currentFormId,
        question_text: (q.label && q.label.trim()) || `Question ${index + 1}`,
        question_type: (q.type || 'short_text').replace('-', '_'),
        options: Array.isArray(q.options) ? q.options : [],
        media: typeof q.media === 'string' ? q.media : '',
        required: Boolean(q.required),
        order_index: index,
        settings: typeof q.settings === 'object' && q.settings !== null ? q.settings : {},
      }));

      const { data: insertedQuestions, error: questionsError } = await supabase
        .from('questions')
        .insert(formattedQuestions)
        .select();

      if (questionsError) {
        console.error('Questions insert failed:', questionsError);
        let errorMessage = 'Unknown error occurred while inserting questions.';

        if (questionsError.code === '23503') {
          errorMessage = 'Foreign key constraint failed. The form ID might not exist in the database.';
        } else if (questionsError.code === '42601') {
          errorMessage = 'SQL syntax error. There might be an issue with the data format.';
        } else if (questionsError.code === '23502') {
          errorMessage = 'A required field is missing. Check that all questions have the necessary data.';
        } else if (questionsError.message) {
          errorMessage = questionsError.message;
        }

        alert(`❌ Failed to insert questions: ${errorMessage}`);
        return;
      }

      setHasUnsavedChanges(false);
      toast('Form saved successfully!', 'success');
    } catch (error) {
      toast('Failed to save form', 'error');
      console.error('Unexpected error saving form:', error);
      alert(`❌ Unexpected error: ${error.message || 'Unknown error occurred'}`);
    } finally {
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
        '⚠️ You have unsaved changes. Are you sure you want to go back to the dashboard?'
      );
      if (!confirmLeave) return;
    }

    localStorage.setItem('skipFormSave', 'true');
    navigate('/dashboard');
  };

  const handleNewFormClick = () => {
    if (hasUnsavedChanges) {
      const confirmNew = window.confirm(
        '⚠️ You have unsaved changes. Are you sure you want to create a new form?'
      );
      if (!confirmNew) return;
    }

    localStorage.removeItem('formQuestions');
    localStorage.removeItem('formTitle');
    localStorage.removeItem('currentFormId');
    localStorage.removeItem('formCustomization');

    setQuestions([]);
    setTitle('Untitled Form');
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
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    navigate('/');
  };

  const handlePreviewClick = () => {
    if (questions.length === 0) {
      alert('Please add at least one question before previewing.');
      return;
    }

    const formDraft = {
      title,
      questions,
      customization,
    };

    localStorage.setItem('formDraft', JSON.stringify(formDraft));
    localStorage.setItem('skipFormSave', 'false');
    setIsPreviewMode(true);
  };

  const renderQuestion = (question, index) => {
    const commonProps = {
      question,
      questionIndex: index + 1,
      onRemove: () => removeQuestion(question.id),
      onQuestionTextChange: handleQuestionTextChange,
      onUpdateQuestion: updateQuestion,
      onAddOption: addOption,
      customization,
    };

    switch (question.type) {
      case 'short-text':
        return <ShortTextQuestion key={question.id} {...commonProps} />;
      case 'long-text':
        return <LongTextQuestion key={question.id} {...commonProps} />;
      case 'multiple-choice':
        return <MultipleChoiceQuestion key={question.id} {...commonProps} />;
      case 'picture-choice':
        return <PictureChoiceQuestion key={question.id} {...commonProps} />;
      default:
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
              placeholder={`${question.type} question (component not implemented)`}
              value={question.label}
              onChange={(e) => handleQuestionTextChange(question.id, e.target.value)}
              style={{ color: customization.textColor }}
            />
            <p className="placeholder-notice">
              This question type ({question.type}) needs a custom component implementation.
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
      <div className="form-builder-page">
        <header className="form-builder-header">
          <div className="header-left">
            <span className="form-builder-breadcrumb">Form Preview</span>
            <h1 className="logo-text">{title}</h1>
          </div>
          <div className="header-right">
            <button
              className="preview-button"
              onClick={() => {
                localStorage.removeItem('skipFormSave');
                setIsPreviewMode(false);
              }}
            >
              ← Back to Edit
            </button>
          </div>
        </header>

        <div
          className="form-preview-container"
          style={{
            backgroundColor: customization.backgroundColor,
            color: customization.textColor,
            fontFamily: customization.fontFamily,
            backgroundImage: customization.backgroundImage ? `url(${customization.backgroundImage})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            padding: '20px',
            borderRadius: customization.borderRadius,
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
          }}
        >
          {customization.logoImage && (
            <div className="preview-logo">
              <img src={customization.logoImage} alt="Form Logo" style={{ maxWidth: '200px' }} />
            </div>
          )}
          <h2 style={{ color: customization.textColor }}>{title}</h2>
          {questions.map((question, index) => (
            <div key={question.id} className="preview-question">
              <h3 style={{ color: customization.textColor }}>
                Q{index + 1}. {question.label || 'Untitled Question'}
              </h3>

              {question.type === 'short-text' && (
                <input
                  type="text"
                  placeholder="Short answer text"
                  disabled
                  style={{
                    color: customization.textColor,
                    borderRadius: customization.borderRadius,
                    borderColor: customization.buttonColor + '80',
                    fontFamily: customization.fontFamily,
                  }}
                />
              )}
              {question.type === 'long-text' && (
                <textarea
                  placeholder="Long answer text"
                  rows="4"
                  disabled
                  style={{
                    color: customization.textColor,
                    borderRadius: customization.borderRadius,
                    borderColor: customization.buttonColor + '80',
                    fontFamily: customization.fontFamily,
                  }}
                />
              )}
              {(question.type === 'multiple-choice' || question.type === 'dropdown') && (
                <div className="preview-options">
                  {question.options?.map((option, optIndex) => (
                    <label key={optIndex} style={{ color: customization.textColor, fontFamily: customization.fontFamily }}>
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        disabled
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
            onMouseOver={(e) => (e.target.style.backgroundColor = customization.buttonColor + 'cc')}
            onMouseOut={(e) => (e.target.style.backgroundColor = customization.buttonColor)}
          >
            Submit
          </button>
        </div>
      </div>
    );
  }

  // Main form builder render
  return (
    <div className="form-builder-page">
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
              <a href="#" className="active">Build</a>
              <a href="#">Integrate</a>
              <a href="#">Share</a>
              <a href="#">Results</a>
            </nav>
            <div className="header-right">
              <button className="save-button" onClick={saveForm}>
                Save Form
              </button>
              <button className="preview-button" onClick={handlePreviewClick}>
                Preview
              </button>
              <button className="new-form-button" onClick={handleNewFormClick}>
                + New Form
              </button>
              <button className="delete-button" onClick={handleDeleteForm}>
                Delete Form
              </button>
              <button 
                className="debug-button" 
                onClick={() => setIsDebugMode(!isDebugMode)}
                style={{ backgroundColor: '#ff6b6b', color: 'white', fontSize: '12px', padding: '5px 10px' }}
              >
                Debug
              </button>
              <button className="logout-button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </header>

          {isDebugMode && (
            <div style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '10px', 
              margin: '10px', 
              border: '1px solid #dee2e6',
              borderRadius: '4px'
            }}>
              <h4>Debug Panel</h4>
              <button onClick={debugCurrentState} style={{ marginRight: '10px' }}>
                Debug State
              </button>
              <button onClick={testDatabaseConnection} style={{ marginRight: '10px' }}>
                Test DB Connection
              </button>
              <div style={{ marginTop: '10px', fontSize: '12px' }}>
                <div>Form ID: {formId || 'None'}</div>
                <div>Questions: {questions.length}</div>
                <div>Title: {title}</div>
                <div>Has Unsaved Changes: {hasUnsavedChanges ? 'Yes' : 'No'}</div>
              </div>
            </div>
          )}

          <div className="form-builder-content">
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
              <div className="form-title-section">
                <p className="form-editor-area-title-placeholder">
                  Form Title: <span className="current-title">{title}</span>
                </p>
              </div>

              {questions.length > 0 ? (
                <div className="questions-container">
                  {questions.map((q, i) => renderQuestion(q, i))}
                </div>
              ) : (
                <div className="empty-form-message">
                  <p>Start by adding questions from the left sidebar!</p>
                  <img src="https://placehold.co/150x150/e0e0e0/555555?text=Empty+Form" alt="Empty form" />
                </div>
              )}

              {formId && (
                <div className="form-share-section">
                  <h3>Share Your Form</h3>
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
                            alert('Form URL copied to clipboard!');
                          }).catch(() => {
                            document.execCommand('copy');
                            alert('Form URL copied to clipboard!');
                          });
                        }}
                        style={{
                          color: customization.textColor,
                          borderRadius: customization.borderRadius,
                          borderColor: customization.buttonColor + '80',
                        }}
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(formUrl).then(() => {
                            alert('Form URL copied to clipboard!');
                          }).catch(() => {
                            const urlInput = document.querySelector('.share-url input');
                            if (urlInput) {
                              urlInput.select();
                              document.execCommand('copy');
                              alert('Form URL copied to clipboard!');
                            }
                          });
                        }}
                        style={{
                          backgroundColor: 'white',
                          color: 'black',
                          borderRadius: '4px',
                          fontFamily: 'arial',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                          transition: 'background-color 0.3s ease, transform 0.1s ease',
                          border: `1px solid ${customization.buttonColor}80`
                        }}
                      >
                        Copy URL
                      </button>
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
            </main>
          </div>
        </>
      )}
    </div>
  );
};

export default FormBuilder;