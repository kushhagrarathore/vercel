import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { supabase } from '../../supabase';
import './FormPreview.css'; // Use the same CSS as FormPreview for consistency
import FormLayout from '../../components/forms/FormLayout';

const DEFAULT_CUSTOMIZATION = {
  backgroundColor: '#f7fafc',
  textColor: '#22223b',
  buttonColor: '#2563eb',
  buttonTextColor: '#fff',
  backgroundImage: '',
  logoImage: '',
  fontFamily: 'Inter, Arial, sans-serif',
  borderRadius: '16px',
};

const FormView = () => {
  const { formId } = useParams();
  const location = useLocation();
  const isPreviewMode = new URLSearchParams(location.search).get('mode') === 'preview';
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [customization, setCustomization] = useState(DEFAULT_CUSTOMIZATION);

  useEffect(() => {
    const fetchFormAndQuestions = async () => {
      try {
        const { data: formData, error: formError } = await supabase
          .from('forms')
          .select('*')
          .eq('id', formId)
          .single();

        if (formError || !formData) throw new Error('Form not found');

        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('*')
          .eq('form_id', formId)
          .order('order_index');

        if (questionsError) throw new Error('Failed to load questions');

        setForm({ ...formData, questions: questionsData });
        if (formData?.customization_settings) {
          setCustomization({ ...DEFAULT_CUSTOMIZATION, ...formData.customization_settings });
        }
      } catch (error) {
        console.error('Error loading form:', error);
      }
    };

    fetchFormAndQuestions();
  }, [formId]);

  const handleChange = (questionId, value) => {
    if (isPreviewMode) return; // Prevent editing in preview mode
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isPreviewMode) return; // Prevent submit in preview mode

    // Validate required questions
    const unansweredRequired = form.questions.filter(
      (q) => q.required && (!answers[q.id] || answers[q.id].trim?.() === '')
    );

    if (unansweredRequired.length > 0) {
      alert('❌ Please fill in all required questions.');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('responses').insert([{
        form_id: formId,
        user_id: user?.id || null, // Support anonymous users
        answers: answers,
        submitted_at: new Date().toISOString(),
      }]);

      if (error) {
        console.error('❌ Failed to submit:', error);
        alert('❌ Submission failed');
      } else {
        alert('✅ Response submitted!');
        setSubmitted(true);
      }
    } catch (error) {
      console.error('❌ Submission error:', error);
      alert(`❌ Submission failed: ${error.message}`);
    }
  };

  function getBgStyle(c) {
    return {
      minHeight: '100vh',
      width: '100vw',
      backgroundColor: c.backgroundColor,
      backgroundImage: c.backgroundImage ? `url(${c.backgroundImage})` : undefined,
      backgroundSize: c.backgroundImage ? 'cover' : undefined,
      backgroundPosition: c.backgroundImage ? 'center' : undefined,
      backgroundRepeat: c.backgroundImage ? 'no-repeat' : undefined,
      fontFamily: c.fontFamily,
      transition: 'background 0.3s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };
  }
  function getCardStyle(c) {
    return {
      background: '#fff',
      borderRadius: c.borderRadius,
      boxShadow: '0 8px 32px 0 rgba(44,62,80,0.13)',
      maxWidth: 900,
      width: '100%',
      minWidth: 0,
      margin: '40px 0',
      padding: '48px 40px',
      color: c.textColor,
      fontFamily: c.fontFamily,
      transition: 'box-shadow 0.2s',
      position: 'relative',
      zIndex: 2,
    };
  }

  // UI states
  if (!form) return <div className="form-preview-bg"><div className="form-preview-centerbox">Loading...</div></div>;
  if (form.is_published === false) {
    return (
      <div className="form-preview-bg" style={getBgStyle(customization)}>
        <div className="form-preview-centerbox" style={getCardStyle(customization)}>
          <span role="img" aria-label="closed" style={{ fontSize: 32 }}>🚫</span>
          <div style={{ marginTop: 24, fontSize: 22, color: '#e53935', fontWeight: 700 }}>This form is closed.</div>
        </div>
      </div>
    );
  }
  if (submitted) {
    return (
      <div className="form-preview-bg" style={getBgStyle(customization)}>
        <div className="form-preview-centerbox" style={getCardStyle(customization)}>
          <span role="img" aria-label="success" style={{ fontSize: 32 }}>✅</span>
          <div style={{ marginTop: 24, fontSize: 22, color: '#219150', fontWeight: 600 }}>Response saved!</div>
        </div>
      </div>
    );
  }

  // Main UI
  return (
    <FormLayout customization={customization}>
      <div className="form-content-area">
        {customization.logoImage && (
          <div className="form-logo-preview"><img src={customization.logoImage} alt="Form Logo" /></div>
        )}
        <h2 className="form-title" style={{ color: customization.textColor }}>{form.title || 'Untitled Form'}</h2>
        {form.description && <p className="form-desc" style={{ color: customization.textColor, opacity: 0.7 }}>{form.description}</p>}
        <form onSubmit={handleSubmit}>
          {(form.questions || []).map((q, i) => (
            <div key={i} className="form-preview-question">
              <label className="form-preview-label" style={{ color: customization.textColor }}>
                {q.question_text || `Question ${i + 1}`}{q.required && <span style={{ color: '#e53935' }}> *</span>}
              </label>
              <div>{renderQuestion(q, i)}</div>
            </div>
          ))}
          {!isPreviewMode && (
            <button type="submit" className="form-preview-submit" style={{ background: customization.buttonColor, color: customization.buttonTextColor, borderRadius: customization.borderRadius, fontFamily: customization.fontFamily }}>Submit</button>
          )}
        </form>
      </div>
    </FormLayout>
  );

  function renderQuestion(q, index) {
    const type = q.question_type || q.type;
    switch (type) {
      case 'short_text':
      case 'short-text':
        return (
          <input
            type="text"
            value={answers[q.id] || ''}
            onChange={e => handleChange(q.id, e.target.value)}
            className="form-preview-input"
            required={q.required}
            disabled={isPreviewMode}
            style={{ borderRadius: customization.borderRadius, fontFamily: customization.fontFamily, color: customization.textColor }}
          />
        );
      case 'long_text':
      case 'long-text':
        return (
          <textarea
            value={answers[q.id] || ''}
            onChange={e => handleChange(q.id, e.target.value)}
            rows={4}
            className="form-preview-input"
            required={q.required}
            disabled={isPreviewMode}
            style={{ borderRadius: customization.borderRadius, fontFamily: customization.fontFamily, color: customization.textColor, minHeight: 100 }}
          />
        );
      case 'multiple_choice':
      case 'multiple-choice':
        return (
          <div className="form-preview-options">
            {q.options?.map((opt, idx) => (
              <label key={idx} className="form-preview-option-label" style={{ color: customization.textColor, fontFamily: customization.fontFamily }}>
                <input
                  type="radio"
                  name={q.id}
                  value={opt}
                  checked={answers[q.id] === opt}
                  onChange={() => handleChange(q.id, opt)}
                  className="form-preview-radio"
                  style={{ accentColor: customization.buttonColor }}
                  required={q.required}
                  disabled={isPreviewMode}
                />{' '}
                {opt}
              </label>
            ))}
          </div>
        );
      case 'picture_choice':
      case 'picture-choice':
        return (
          <div className="form-preview-options">
            {q.options?.map((opt, idx) => (
              <label key={idx} className="form-preview-option-label" style={{ color: customization.textColor, fontFamily: customization.fontFamily, display: 'inline-block', margin: 8 }}>
                <input
                  type="radio"
                  name={q.id}
                  value={opt}
                  checked={answers[q.id] === opt}
                  onChange={() => handleChange(q.id, opt)}
                  className="form-preview-radio"
                  style={{ accentColor: customization.buttonColor }}
                  required={q.required}
                  disabled={isPreviewMode}
                />{' '}
                <img src={opt} alt="option" style={{ maxWidth: 80, maxHeight: 80, borderRadius: 8, border: '1px solid #eee', marginLeft: 6 }} />
              </label>
            ))}
          </div>
        );
      default:
        return <p style={{ color: '#e53935' }}>❌ Unsupported question type: {type}</p>;
    }
  }
};

export default FormView;
