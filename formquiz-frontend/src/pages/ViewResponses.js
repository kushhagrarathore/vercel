import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabase';

const ViewResponses = () => {
  const { formId } = useParams();
  const [responses, setResponses] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [formTitle, setFormTitle] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      // Get responses
      const { data: respData } = await supabase
        .from('responses')
        .select('*, users(email)')
        .eq('form_id', formId);

      if (respData) {
        setResponses(respData);
      }

      // Get form questions
      const { data: formData } = await supabase
        .from('forms')
        .select('title')
        .eq('id', formId)
        .single();

      const { data: qData } = await supabase
        .from('questions')
        .select('*')
        .eq('form_id', formId)
        .order('order_index');

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
    <div style={{ padding: '30px' }}>
      <h2 style={{ marginBottom: '20px' }}>📋 Responses for: {formTitle}</h2>
      {responses.length === 0 ? (
        <p>No responses submitted yet.</p>
      ) : (
        responses.map((resp, idx) => (
          <div
            key={idx}
            style={{
              border: '1px solid #ddd',
              padding: '15px',
              marginBottom: '20px',
              borderRadius: '8px',
              background: '#f9f9f9',
            }}
          >
            <p><strong>🧑 User:</strong> {resp.users?.email || 'Anonymous'}</p>
            <p><strong>🕒 Submitted At:</strong> {new Date(resp.submitted_at).toLocaleString()}</p>
            <ul style={{ marginTop: '10px' }}>
              {Object.entries(resp.answers || {}).map(([qid, answer], i) => (
                <li key={i} style={{ marginBottom: 5 }}>
                  <strong>{getQuestionText(qid)}:</strong> {answer}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
};

export default ViewResponses;