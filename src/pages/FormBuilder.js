import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';
import { QRCodeSVG } from 'qrcode.react';
import { ChromePicker } from 'react-color'; // Used in CustomizationPanel
import './FormBuilder.css';
import { useParams } from 'react-router-dom';


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
  const [activeTab, setActiveTab] = useState('standard'); // standard, premium, customize
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isDebugMode, setIsDebugMode] = useState(false); // For debugging
  const navigate = useNavigate();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // ✅ Track unsaved edits


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
      // Add more premium types here
    ],
  };

  const { formId: paramFormId } = useParams();

  useEffect(() => {
    if (paramFormId) {
      // If formId param is present, fetch form and questions from Supabase
      (async () => {
        const { data: form, error: formError } = await supabase
          .from('forms')
          .select('*')
          .eq('id', paramFormId)
          .single();
        if (formError || !form) return;
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
      })();
      return;
    }

    // Check if coming from preview (formDraft exists)
    const draft = localStorage.getItem('formDraft');
    if (draft) {
      const parsed = JSON.parse(draft);
      setTitle(parsed.title || '');
      setQuestions(parsed.questions || []);
      setCustomization(parsed.customization || {});
      // After restoring from draft, clear it so it doesn't persist
      localStorage.removeItem('formDraft');
      return;
    }

    // If not coming from preview, always start a new form (clear localStorage and reset state)
    localStorage.removeItem('formQuestions');
    localStorage.removeItem('formTitle');
    localStorage.removeItem('currentFormId');
    localStorage.removeItem('formCustomization');
    setTitle('Untitled Form');
    setQuestions([]);
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
  }, [paramFormId]);
// 👈 run when returning from preview



  useEffect(() => {
  const skip = localStorage.getItem('skipAutoSave');
  if (skip === 'true') {
    console.log('🚫 Skipping auto-save due to skipAutoSave flag');
    return;
  }

  if (questions.length > 0 || title !== 'Untitled Form') {
    localStorage.setItem('formQuestions', JSON.stringify(questions));
    localStorage.setItem('formTitle', title);
    localStorage.setItem('formCustomization', JSON.stringify(customization));
    console.log('💾 Auto-saved to localStorage');
  }
}, [questions, title, customization]);



  // Load saved form data from localStorage on mount
  useEffect(() => {
  const skipSave = localStorage.getItem('skipFormSave'); // ✅ check flag
  if (skipSave === 'true') {
    console.log('🛑 Skipping saved form load due to skipFormSave flag');
    localStorage.removeItem('formQuestions');
    localStorage.removeItem('formTitle');
    localStorage.removeItem('currentFormId');
    localStorage.removeItem('formCustomization');
    localStorage.removeItem('skipFormSave');
    return;
  }

  const savedQuestions = localStorage.getItem('formQuestions');
  const savedTitle = localStorage.getItem('formTitle');
  const savedFormId = localStorage.getItem('currentFormId');
  const savedCustomization = localStorage.getItem('formCustomization');

  if (savedQuestions) {
    try {
      const parsedQuestions = JSON.parse(savedQuestions);
      console.log('📋 Loaded questions from localStorage:', parsedQuestions);
      setQuestions(parsedQuestions);
    } catch (error) {
      console.error('❌ Error parsing saved questions:', error);
    }
  }
  if (savedTitle) setTitle(savedTitle);
  if (savedFormId) setFormId(savedFormId);
  if (savedCustomization) {
    try {
      setCustomization(JSON.parse(savedCustomization));
    } catch (error) {
      console.error('❌ Error parsing saved customization:', error);
    }
  }
}, []);

  // Persist form data to localStorage when relevant state changes
  useEffect(() => {
    if (questions.length > 0 || title !== 'Untitled Form') {
      localStorage.setItem('formQuestions', JSON.stringify(questions));
      localStorage.setItem('formTitle', title);
      localStorage.setItem('formCustomization', JSON.stringify(customization));
      console.log('💾 Saved to localStorage - Questions:', questions.length, 'Title:', title);
    }
  }, [questions, title, customization]);

  // Enhanced addQuestion function with better default values
  const addQuestion = (type) => {
    setHasUnsavedChanges(true); 
    console.log('➕ Adding question of type:', type);
    
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
    
    console.log('📝 New question created:', newQuestion);
    setQuestions(prev => {
      const updated = [...prev, newQuestion];
      console.log('📋 All questions after adding:', updated);
      return updated;
    });
  };

  const removeQuestion = (idToRemove) => {
    setHasUnsavedChanges(true); 
    console.log('🗑️ Removing question:', idToRemove);
    setQuestions(questions.filter(q => q.id !== idToRemove));
  };

  const handleQuestionTextChange = (id, newText) => {
    setHasUnsavedChanges(true); 
    console.log('✏️ Updating question text:', id, newText);
    setQuestions(prev =>
      prev.map(q => (q.id === id ? { ...q, label: newText } : q))
    );
  };

  const updateQuestion = (id, field, value) => {
    setHasUnsavedChanges(true); 
    console.log('🔄 Updating question field:', id, field, value);
    setQuestions(prev =>
      prev.map(q => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const addOption = (questionId) => {
    setHasUnsavedChanges(true); 
    console.log('➕ Adding option to question:', questionId);
    setQuestions(prev =>
      prev.map(q =>
        q.id === questionId
          ? { ...q, options: [...q.options, `Option ${q.options.length + 1}`] }
          : q
      )
    );
  };

  // Test database connection
  const testDatabaseConnection = async () => {
    try {
      console.log('🔧 Testing database connection...');
      
      // Test forms table
      const { data: forms, error: formsError } = await supabase
        .from('forms')
        .select('*')
        .limit(1);
        
      if (formsError) {
        console.error('❌ Forms table error:', formsError);
        alert(`❌ Forms table error: ${formsError.message}`);
        return false;
      }
      console.log('✅ Forms table accessible');
      
      // Test questions table
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .limit(1);
        
      if (questionsError) {
        console.error('❌ Questions table error:', questionsError);
        alert(`❌ Questions table error: ${questionsError.message}`);
        return false;
      }
      console.log('✅ Questions table accessible');
      
      alert('✅ Database connection successful!');
      return true;
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      alert(`❌ Database connection failed: ${error.message}`);
      return false;
    }
  };

  // Debug current state
  const debugCurrentState = () => {
    console.log('🔍 DEBUGGING CURRENT STATE:');
    console.log('📝 Form ID:', formId);
    console.log('📝 Form Title:', title);
    console.log('📋 Questions count:', questions.length);
    console.log('📋 Questions:', questions);
    console.log('🎨 Customization:', customization);
    
    // Check if questions have required fields
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

  // Enhanced saveForm function with comprehensive error handling
  const saveForm = async () => {
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
  user_id: user?.id || null,  // ✅ correct key
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
           user_id: user?.id || null,
        })
        .eq('id', currentFormId);

      if (updateError) {
        alert('❌ Failed to update form');
        return;
      }
    }

    // Proceed with deleting and inserting questions...

  

      // Step 2: Delete old questions
      console.log('🟡 Deleting old questions for form ID:', currentFormId);
      const { error: deleteError } = await supabase
        .from('questions')
        .delete()
        .eq('form_id', currentFormId);

      if (deleteError) {
        console.error('❌ Question deletion failed:', deleteError);
        alert(`❌ Failed to delete old questions: ${deleteError.message || 'Unknown error'}`);
        return;
      }
      console.log('✅ Old questions deleted successfully');

      // Step 3: Insert new questions
      console.log('📝 Processing questions for insertion...');
      console.log('📋 Raw questions data:', questions);
      
      const formattedQuestions = questions.map((q, index) => {
        // Ensure all required fields are properly formatted
        const formatted = {
          form_id: currentFormId,
          question_text: (q.label && q.label.trim()) || `Question ${index + 1}`,
          question_type: (q.type || 'short_text').replace('-', '_'),

          options: Array.isArray(q.options) ? q.options : [],
          media: (q.media && typeof q.media === 'string') ? q.media : '',
          required: Boolean(q.required),
          order_index: index,
          settings: (typeof q.settings === 'object' && q.settings !== null) ? q.settings : {},
        };
        
        console.log(`📋 Question ${index + 1} formatted:`, formatted);
        return formatted;
      });

      console.log('🟡 Inserting questions:', formattedQuestions);
      console.log('📊 Total questions to insert:', formattedQuestions.length);

      const { data: insertedQuestions, error: questionsError } = await supabase
        .from('questions')
        .insert(formattedQuestions)
        .select();

      if (questionsError) {
        console.error('❌ Questions insert failed:', questionsError);
        console.log('🧪 Data that failed to insert:', formattedQuestions);
        
        // More specific error handling
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

      console.log('✅ Questions inserted successfully:', insertedQuestions);
      console.log(`✅ Total questions inserted: ${insertedQuestions?.length || 0}`);

      // Step 4: Verify the save was successful
      const { data: verifyQuestions, error: verifyError } = await supabase
        .from('questions')
        .select('*')
        .eq('form_id', currentFormId)
        .order('order_index');

      if (!verifyError) {
        console.log('✅ Verification - Questions in database:', verifyQuestions);
        console.log(`✅ Verification - Found ${verifyQuestions.length} questions in database`);
      }

      alert(`✅ Form saved successfully! ${insertedQuestions?.length || 0} questions saved.`);
      
    } catch (error) {
      console.error('❌ Unexpected error saving form:', error);
      alert(`❌ Unexpected error: ${error.message || 'Unknown error occurred'}`);
    }
  };

  // Delete the current form
  const handleDeleteForm = async () => {
    if (!window.confirm('Are you sure you want to delete this form?')) return;

    try {
      if (formId) {
        console.log('🗑️ Deleting form with ID:', formId);
        const { error } = await supabase.from('forms').delete().eq('id', formId);
        if (error) {
          console.error('❌ Error deleting form:', error);
          alert(`❌ Error deleting form: ${error.message}`);
          return;
        }
      }

      // Clear localStorage
      localStorage.removeItem('formQuestions');
      localStorage.removeItem('formTitle');
      localStorage.removeItem('currentFormId');
      localStorage.removeItem('formCustomization');

      // Reset state
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

      alert('✅ Form deleted successfully!');
    } catch (error) {
      console.error('❌ Error deleting form:', error);
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

  localStorage.setItem('skipFormSave', 'true'); // ✅ Tell FormBuilder to skip reloading saved form
  navigate('/dashboard');
};

  const handleNewFormClick = () => {
  setHasUnsavedChanges(true); 
  localStorage.removeItem('formQuestions');
  localStorage.removeItem('formTitle');
  localStorage.removeItem('currentFormId');  // 👈 Important
  localStorage.removeItem('formCustomization');

  setQuestions([]);
  setTitle('Untitled Form');
  setFormId(null);  // 👈 Must reset to null
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
};

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    navigate('/');
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
const baseURL =
  process.env.NODE_ENV === 'development'
    ? window.location.origin
    : 'https://inquizo-supa-5z4o.vercel.app/'; // 👈 Replace with your deployed Vercel URL

const formUrl = formId ? `${baseURL}/form/${formId}` : '';

 const handlePreviewClick = () => {
  if (questions.length === 0) {
    alert('Please add at least one question before previewing.');
    return;
  }

  const formDraft = {
    title,
    questions,
    customization, // if you use this
  };

  localStorage.setItem('formDraft', JSON.stringify(formDraft));
  localStorage.setItem('skipFormSave', 'false');
  setIsPreviewMode(true);
};

  // Restore state from formDraft when exiting preview
  useEffect(() => {
    if (!isPreviewMode) {
      const draft = localStorage.getItem('formDraft');
      if (draft) {
        const parsed = JSON.parse(draft);
        setTitle(parsed.title || '');
        setQuestions(parsed.questions || []);
        setCustomization(parsed.customization || {});
        localStorage.removeItem('formDraft');
      }
    }
  }, [isPreviewMode]);

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
    localStorage.removeItem('skipFormSave'); // ✅ so saved state loads again
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
              {question.type === 'yes-no' && (
                <div className="preview-options">
                  <label style={{ color: customization.textColor, fontFamily: customization.fontFamily }}>
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      disabled
                      style={{
                        accentColor: customization.buttonColor,
                        marginRight: '8px',
                      }}
                    />
                    Yes
                  </label>
                  <label style={{ color: customization.textColor, fontFamily: customization.fontFamily }}>
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      disabled
                      style={{
                        accentColor: customization.buttonColor,
                        marginRight: '8px',
                      }}
                    />
                    No
                  </label>
                </div>
              )}
              {question.type === 'email' && (
                <input
                  type="email"
                  placeholder="Email address"
                  disabled
                  style={{
                    color: customization.textColor,
                    borderRadius: customization.borderRadius,
                    borderColor: customization.buttonColor + '80',
                    fontFamily: customization.fontFamily,
                  }}
                />
              )}
              {question.type === 'number' && (
                <input
                  type="number"
                  placeholder="Enter number"
                  disabled
                  style={{
                    color: customization.textColor,
                    borderRadius: customization.borderRadius,
                    borderColor: customization.buttonColor + '80',
                    fontFamily: customization.fontFamily,
                  }}
                />
              )}
              {question.type === 'date' && (
                <input
                  type="date"
                  disabled
                  style={{
                    color: customization.textColor,
                    borderRadius: customization.borderRadius,
                    borderColor: customization.buttonColor + '80',
                    fontFamily: customization.fontFamily,
                  }}
                />
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

  return (
    <div className="form-builder-page">
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
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <nav className="header-nav">
          <a href="#" className="active">
            Build
          </a>
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
          {/* Debug buttons - remove in production */}
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

      {/* Debug panel - remove in production */}
      {isDebugMode && (
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '10px', 
          margin: '10px', 
          border: '1px solid #dee2e6',
          borderRadius: '4px'
        }}>
          <h4>Debug Panel (Remove in Production)</h4>
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
              setCustomization={setCustomization}
              ChromePicker={ChromePicker} // Pass ChromePicker to the panel
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
            <div className="questions-container">{questions.map((q, i) => renderQuestion(q, i))}</div>
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
                        // Fallback for older browsers
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
                        // Fallback for older browsers
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
    </div>
  );
};

export default FormBuilder;