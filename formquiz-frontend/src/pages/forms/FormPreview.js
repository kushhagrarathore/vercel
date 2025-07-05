import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../supabase';
import './FormPreview.css';
import { v4 as uuidv4 } from 'uuid';
import Spinner from '../../components/Spinner';
import Skeleton from '../../components/Skeleton';
import { useToast } from '../../components/Toast';

const FormPreview = () => {
  const { formId } = useParams();
  const [form, setForm] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

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

  if (!form) return <div>Loading form...</div>;

  if (submitted) return <div className="form-preview-wrapper"><h2>✅ Thank you for submitting!</h2></div>;

  return (
    <div className="form-preview-wrapper">
      <div className="main-form-card">
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <div className="stat-box">
            <div>Responses</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>0</div>
          </div>
          <div className="stat-box">
            <div>Average Time</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>00:00</div>
          </div>
          <div className="stat-box">
            <div>Duration</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>0 Days</div>
          </div>
        </div>
        <h2>{form.title}</h2>
        {questions.map((q, i) => (
          <div key={q.id} className="preview-question">
            <h4>Q{i + 1}. {q.question_text}</h4>

            {q.question_type === 'short-text' && (
              <input
                type="text"
                onChange={(e) => handleChange(q.id, e.target.value)}
              />
            )}

            {q.question_type === 'long-text' && (
              <textarea
                rows={4}
                onChange={(e) => handleChange(q.id, e.target.value)}
              />
            )}

            {q.question_type === 'multiple-choice' && (
              <div>
                {q.options.map((opt, idx) => (
                  <label key={idx}>
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      onChange={() => handleChange(q.id, opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}

        <button className="share-btn" onClick={handleSubmit}>
          Share to collect responses
        </button>
      </div>
    </div>
  );
};

export default FormPreview;
