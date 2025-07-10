import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../supabase';
import './FormPreview.css';
import { v4 as uuidv4 } from 'uuid';
import Spinner from '../../components/Spinner';
import Skeleton from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
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

const FormPreview = () => {
  const { formId } = useParams();
  const [form, setForm] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [customization, setCustomization] = useState(DEFAULT_CUSTOMIZATION);

  useEffect(() => {
    const fetchForm = async () => {
      const { data: formData } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .single();

      const { data: questionData } = await supabase
        .from('questions')
        .select('*')
        .eq('form_id', formId)
        .order('order_index');

      setForm(formData);
      setQuestions(questionData);
      if (formData?.customization_settings) {
        setCustomization({ ...DEFAULT_CUSTOMIZATION, ...formData.customization_settings });
      }
    };

    fetchForm();
  }, [formId]);

  const handleChange = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = async () => {
    const responseData = {
      id: uuidv4(),
      form_id: formId,
      answers,
      submitted_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('responses')
      .insert([responseData]);

    if (error) {
      alert('❌ Failed to submit response: ' + error.message);
      return;
    }

    setSubmitted(true);
  };

  if (!form) return <div className="form-preview-bg"><div className="form-preview-centerbox"><Spinner size={40} /></div></div>;

  if (submitted) return (
    <div className="form-preview-bg" style={getBgStyle(customization)}>
      <div className="form-preview-centerbox" style={getCardStyle(customization)}>
        <h2 className="form-title" style={{ color: customization.textColor }}>✅ Thank you for submitting!</h2>
      </div>
    </div>
  );

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

  return (
    <FormLayout customization={customization}>
      <div className="form-content-area">
        {customization.logoImage && (
          <div className="form-logo-preview"><img src={customization.logoImage} alt="Form Logo" /></div>
        )}
        <h2 className="form-title" style={{ color: customization.textColor }}>{form.title}</h2>
        {form.description && <p className="form-desc" style={{ color: customization.textColor, opacity: 0.7 }}>{form.description}</p>}
        <form onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
          {questions.map((q, i) => (
            <div key={q.id} className="form-preview-question">
              <label className="form-preview-label" style={{ color: customization.textColor }}>
                {q.question_text || `Question ${i + 1}`}{q.required && <span style={{ color: '#e53935' }}> *</span>}
              </label>
              {renderQuestion(q, i)}
            </div>
          ))}
          <button type="submit" className="form-preview-submit" style={{ background: customization.buttonColor, color: customization.buttonTextColor, borderRadius: customization.borderRadius, fontFamily: customization.fontFamily }}>Submit</button>
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

export default FormPreview;
