import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../supabase';
import FormLayout from '../../components/forms/FormLayout';
import '../../components/forms/FormLayout.css';

const ViewResponses = () => {
  const { formId, quizId } = useParams();
  const [responses, setResponses] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [title, setTitle] = useState('');
  const [customization, setCustomization] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      let respData = null;
      let qData = null;
      let titleData = null;
      let customizationData = null;
      if (formId) {
        // Form responses
        const respRes = await supabase
          .from('responses')
          .select('*, users(email)')
          .eq('form_id', formId);
        respData = respRes.data;
        const formRes = await supabase
          .from('forms')
          .select('title, customization_settings')
          .eq('id', formId)
          .single();
        titleData = formRes.data?.title;
        customizationData = formRes.data?.customization_settings || {};
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
      if (respData) {
        console.log('Fetched responses:', respData);
        setResponses(respData);
      }
      if (qData) setQuestions(qData);
      if (customizationData) setCustomization(customizationData);
    };
    fetchData();
  }, [formId, quizId]);

  const getQuestionText = (questionId) => {
    const q = questions.find(q => q.id === questionId);
    return q ? (q.question_text || q.title) : questionId;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f7fafc', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 900, margin: '0 auto', padding: '48px 0 24px 0', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '32px', fontWeight: 700, fontSize: '2rem', color: '#2d314d', letterSpacing: '-1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <span role="img" aria-label="clipboard">📋</span> Responses for: <span style={{ color: '#3b3b6d' }}>{title}</span>
        </h2>
      </div>
      {responses.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <FormLayout customization={customization}>
            <div className="form-content-area" style={{ textAlign: 'center', fontSize: '1.1rem', color: '#888', minWidth: 250, minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ margin: 0 }}>No responses submitted yet.</p>
            </div>
          </FormLayout>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: 900, margin: '0 auto', paddingBottom: 48 }}>
          {responses.map((resp, idx) => {
            let answersObj = {};
            try {
              answersObj = typeof resp.answers === 'string' ? JSON.parse(resp.answers) : resp.answers;
            } catch (e) {
              answersObj = {};
            }
            return (
              <FormLayout key={idx} customization={customization}>
                <div className="form-content-area">
                  <div style={{ marginBottom: 16, color: customization.textColor || '#2d314d', fontWeight: 500 }}>
                    <span role="img" aria-label="user">🧑</span> <b>User:</b> {resp.users?.email || 'Anonymous'}<br />
                    <span role="img" aria-label="clock">🕒</span> <b>Submitted At:</b> {new Date(resp.submitted_at).toLocaleString()}
                  </div>
                  <ul style={{ marginTop: '10px', paddingLeft: 0, listStyle: 'none' }}>
                    {Object.entries(answersObj || {}).map(([qid, answer], i) => (
                      <li key={i} style={{ marginBottom: 12, background: 'rgba(255,255,255,0.10)', borderRadius: 8, padding: '10px 14px', color: customization.textColor || '#2d314d', fontSize: '1.08rem' }}>
                        <strong>{getQuestionText(qid)}:</strong> {answer}
                      </li>
                    ))}
                  </ul>
                </div>
              </FormLayout>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ViewResponses;