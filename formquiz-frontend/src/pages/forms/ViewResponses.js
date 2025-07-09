import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import Spinner from '../../components/Spinner';
import Skeleton from '../../components/Skeleton';
import { useToast } from '../../components/Toast';

// Enhanced Results Page CSS
const styles = `
.results-container {
  max-width: 700px;
  margin: 40px auto;
  padding: 24px;
  background: #f8fafc;
  border-radius: 18px;
  box-shadow: 0 4px 24px rgba(80, 80, 180, 0.08);
}
.form-title {
  color: #4a6bff;
  font-weight: 700;
}
.results-summary {
  margin-bottom: 18px;
  font-size: 1.1rem;
  color: #374151;
}
.no-responses {
  text-align: center;
  color: #888;
  font-size: 1.1rem;
  margin: 40px 0;
}
.responses-list {
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.response-card {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(44,62,80,0.08);
  padding: 18px 22px;
  border: 1px solid #e5e7eb;
}
.response-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 0.98rem;
  color: #6366f1;
}
.user-id {
  font-weight: 600;
}
.submitted-at {
  color: #6b7280;
}
.answers-list {
  margin-top: 8px;
}
.answer-row {
  display: flex;
  gap: 10px;
  margin-bottom: 6px;
  font-size: 1rem;
}
.question {
  color: #374151;
  font-weight: 500;
}
.answer {
  color: #2563eb;
  font-weight: 500;
}
`;
if (typeof document !== 'undefined' && !document.getElementById('results-enhanced-css')) {
  const style = document.createElement('style');
  style.id = 'results-enhanced-css';
  style.innerHTML = styles;
  document.head.appendChild(style);
}

const ViewResponses = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [responses, setResponses] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [formTitle, setFormTitle] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      console.log('formId:', formId); // Debug formId
      // Get responses
      const { data: respData, error: respError } = await supabase
        .from('responses')
        .select('*')
        .eq('form_id', formId);
      if (respError) {
        console.error('Supabase responses error:', respError);
      }
      if (respData) {
        setResponses(respData);
      }

      // Get form questions
      const { data: formData, error: formError } = await supabase
        .from('forms')
        .select('title')
        .eq('id', formId)
        .single();
      if (formError) {
        console.error('Supabase form error:', formError);
      }

      const { data: qData, error: qError } = await supabase
        .from('questions')
        .select('*')
        .eq('form_id', formId)
        .order('order_index');
      if (qError) {
        console.error('Supabase questions error:', qError);
      }

      if (formData) setFormTitle(formData.title);
      if (qData) setQuestions(qData);
    };

    fetchData();
  }, [formId]);

  const getQuestionText = (questionId) => {
    const q = questions.find(q => q.id === questionId);
    return q ? q.question_text : questionId;
  };

  return (
    <div className="results-container">
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          marginBottom: 18,
          background: '#4a6bff',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '10px 22px',
          fontWeight: 600,
          fontSize: 16,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(44,62,80,0.08)',
          transition: 'background 0.2s',
        }}
      >
        ← Back to Dashboard
      </button>
      <h2>📋 Responses for: <span className="form-title">{formTitle}</span></h2>
      <div className="results-summary">
        <span>Total Responses: <b>{responses.length}</b></span>
      </div>
      {responses.length === 0 ? (
        <div className="no-responses">
          <p>No responses submitted yet.</p>
        </div>
      ) : (
        <div className="responses-list">
          {responses.map((resp, idx) => (
            <div className="response-card" key={idx}>
              <div className="response-header">
                <span className="user-id">🧑 {resp.user_id || 'Anonymous'}</span>
                <span className="submitted-at">🕒 {new Date(resp.submitted_at).toLocaleString()}</span>
              </div>
              <div className="answers-list">
                {Object.entries(resp.answers || {}).map(([qid, answer], i) => (
                  <div className="answer-row" key={i}>
                    <span className="question">{getQuestionText(qid)}:</span>
                    <span className="answer">{answer}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ViewResponses;