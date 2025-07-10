import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../supabase';

const ViewResponses = () => {
  const { formId, quizId } = useParams();
  const [responses, setResponses] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [title, setTitle] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      let respData = null;
      let qData = null;
      let titleData = null;
      if (formId) {
        // Form responses
        const respRes = await supabase
          .from('responses')
          .select('*, users(email)')
          .eq('form_id', formId);
        respData = respRes.data;
        const formRes = await supabase
          .from('forms')
          .select('title')
          .eq('id', formId)
          .single();
        titleData = formRes.data?.title;
        const qRes = await supabase
          .from('questions')
          .select('*')
          .eq('form_id', formId)
          .order('order_index');
        qData = qRes.data;
      } else if (quizId) {
        // Quiz responses
        const respRes = await supabase
          .from('quiz_responses')
          .select('*, users(email)')
          .eq('quiz_id', quizId);
        respData = respRes.data;
        const quizRes = await supabase
          .from('quizzes')
          .select('title')
          .eq('id', quizId)
          .single();
        titleData = quizRes.data?.title;
        const qRes = await supabase
          .from('slides')
          .select('*')
          .eq('quiz_id', quizId)
          .order('slide_index');
        qData = qRes.data;
      }
      if (titleData) setTitle(titleData);
      if (respData) setResponses(respData);
      if (qData) setQuestions(qData);
    };
    fetchData();
  }, [formId, quizId]);

  const getQuestionText = (questionId) => {
    const q = questions.find(q => q.id === questionId);
    return q ? (q.question_text || q.title) : questionId;
  };

  return (
    <div style={{ padding: '30px' }}>
      <h2 style={{ marginBottom: '20px' }}>📋 Responses for: {title}</h2>
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