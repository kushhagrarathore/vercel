 import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import './ResultsPage.css';

const ResultsPage = () => {
  const { formId } = useParams();
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const { data: qData } = await supabase
        .from('questions')
        .select('id, question_text')
        .eq('form_id', formId)
        .order('order_index');

      const { data: rData } = await supabase
        .from('responses')
        .select('answers, submitted_at')
        .eq('form_id', formId)
        .order('submitted_at', { ascending: false });

      if (qData) setQuestions(qData);
      if (rData) setResponses(rData);
    };

    fetchData();
  }, [formId]);

  return (
    <div className="results-container">
      <button className="back-button" onClick={() => navigate('/dashboard')}>
        ← Back to Dashboard
      </button>

      <h2 className="results-title">Responses</h2>

      <div className="responses-table">
        <div className="table-header">
          <span>No.</span>
          <span>Date</span>
          {questions.map((q, index) => (
            <span key={q.id}>Q{index + 1}. {q.question_text}</span>
          ))}
        </div>

        {responses.map((resp, idx) => (
          <div key={idx} className="table-row">
            <span>{idx + 1}</span>
            <span>{new Date(resp.submitted_at).toLocaleString()}</span>
            {questions.map((q, index) => (
              <span key={q.id}>
                <strong>{index + 1}:</strong> {resp.answers?.[q.id] || '—'}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResultsPage;