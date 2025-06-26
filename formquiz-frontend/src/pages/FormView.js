import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import './FormView.css';

const FormView = () => {
  const { formId } = useParams();
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  // ✅ Fetch form and questions
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
      } catch (error) {
        console.error('Error loading form:', error);
      }
    };

    fetchFormAndQuestions();
  }, [formId]);

  // ✅ Handle input change
  const handleChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // ✅ Handle form submission (resolved)
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required questions
    const unansweredRequired = form.questions.filter(
      (q) => q.required && (!answers[q.id] || answers[q.id].trim?.() === '')
    );

    if (unansweredRequired.length > 0) {
      alert('❌ Please fill in all required questions.');
      return;
    }

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

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

  // ✅ Render individual question
  const renderQuestion = (q, index) => {
    switch (q.question_type) {
      case 'short_text':
      case 'short-text':
        return (
          <input
            type="text"
            value={answers[q.id] || ''}
            onChange={(e) => handleChange(q.id, e.target.value)}
            className="form-input"
            required={q.required}
          />
        );
      case 'long_text':
      case 'long-text':
        return (
          <textarea
            required={q.required}
            value={answers[q.id] || ''}
            onChange={(e) => handleChange(q.id, e.target.value)}
            rows={4}
            style={{ width: '100%', padding: 8 }}
          />
        );
      case 'multiple_choice':
      case 'multiple-choice':
        return (
          <div>
            {q.options?.map((opt, idx) => (
              <label key={idx} style={{ display: 'block', marginBottom: 5 }}>
                <input
                  type="radio"
                  name={q.id}
                  value={opt}
                  checked={answers[q.id] === opt}
                  onChange={() => handleChange(q.id, opt)}
                />{' '}
                {opt}
              </label>
            ))}
          </div>
        );
      default:
        return <p>❌ Unsupported question type: {q.question_type}</p>;
    }
  };

  // ✅ UI states
  if (!form) return <p>Loading...</p>;
  if (submitted) {
    return (
      <div style={{ textAlign: 'center', marginTop: 60, fontSize: 22, color: '#219150', fontWeight: 600 }}>
        <span role="img" aria-label="success">✅</span> Response saved!
      </div>
    );
  }

  // ✅ Main UI
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f7fafc 0%, #e3e9f7 100%)', padding: '40px 0', fontFamily: 'Inter, Arial, sans-serif' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', background: '#fff', borderRadius: 16, boxShadow: '0 6px 32px rgba(44,62,80,0.10)', padding: '36px 32px 32px 32px', position: 'relative' }}>
        <h2 style={{ textAlign: 'center', fontWeight: 800, fontSize: 28, marginBottom: 8, color: '#2d3a4a', letterSpacing: '-1px' }}>
          {form.title || 'Untitled Form'}
        </h2>
        {form.description && <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: 24 }}>{form.description}</p>}

        <form onSubmit={handleSubmit}>
          {(form.questions || []).map((q, i) => (
            <div key={i} style={{ marginBottom: 28 }}>
              <label style={{ fontWeight: 600, color: '#374151', fontSize: 16, marginBottom: 6, display: 'block' }}>
                {q.question_text}{q.required && <span style={{ color: '#e53935' }}> *</span>}
              </label>
              <div>{renderQuestion(q, i)}</div>
            </div>
          ))}
          <button type="submit" style={{
            width: '100%',
            background: 'linear-gradient(90deg, #4a6bff 0%, #6b8cff 100%)',
            color: 'white',
            fontWeight: 700,
            fontSize: 18,
            border: 'none',
            borderRadius: 8,
            padding: '14px 0',
            marginTop: 10,
            boxShadow: '0 2px 8px rgba(44,62,80,0.08)',
            cursor: 'pointer',
            transition: 'background 0.2s',
            letterSpacing: '0.5px'
          }}>
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

export default FormView;
