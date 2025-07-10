import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import FormLayout from '../../components/forms/FormLayout';
import '../../components/forms/FormLayout.css';
import { FaUser, FaClock, FaArrowLeft } from 'react-icons/fa';
import ShareDropdown from './ShareDropdown';

const ViewResponses = () => {
  const { formId, quizId } = useParams();
  const navigate = useNavigate();
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
      if (respData) setResponses(respData);
      if (qData) setQuestions(qData);
      if (customizationData) setCustomization(customizationData);
    };
    fetchData();
  }, [formId, quizId]);

  const getQuestionText = (questionId) => {
    const q = questions.find(q => q.id === questionId);
    return q ? (q.question_text || q.title) : questionId;
  };

  // Get all question IDs in order
  const questionIds = questions.map(q => q.id);

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: 'linear-gradient(120deg, #e0e7ff 0%, #f8fafc 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
      padding: 0,
    }}>
      <div style={{ width: '100%', maxWidth: 900, margin: '0 auto', padding: '48px 0 24px 0', textAlign: 'center', position: 'relative' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            position: 'absolute',
            left: 0,
            top: 36,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(99,102,241,0.10)',
            color: '#6366f1',
            border: 'none',
            borderRadius: 10,
            padding: '8px 18px',
            fontWeight: 700,
            fontSize: '1.08rem',
            boxShadow: '0 2px 8px #a5b4fc22',
            cursor: 'pointer',
            transition: 'background 0.18s, color 0.18s, box-shadow 0.18s',
            zIndex: 10,
          }}
          onMouseOver={e => { e.currentTarget.style.background = '#6366f1'; e.currentTarget.style.color = '#fff'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.10)'; e.currentTarget.style.color = '#6366f1'; }}
        >
          <FaArrowLeft style={{ fontSize: 18 }} /> Back
        </button>
        <h2 style={{ marginBottom: '32px', fontWeight: 800, fontSize: '2.3rem', color: '#39397a', letterSpacing: '-1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <span role="img" aria-label="clipboard">📋</span> Responses for: <span style={{ color: '#39397a' }}>{title}</span>
        </h2>
      </div>
      {responses.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <div style={{
            background: 'rgba(255,255,255,0.55)',
            boxShadow: '0 8px 32px 0 rgba(44,62,80,0.13)',
            border: '1.5px solid #e0e7ef',
            borderRadius: 24,
            minWidth: 320,
            minHeight: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.18rem',
            color: '#7b7b9d',
            fontWeight: 500,
            textAlign: 'center',
            backdropFilter: 'blur(8px)',
            margin: '0 auto',
            animation: 'fadeInCard 0.7s',
          }}>
            No responses submitted yet.
          </div>
        </div>
      ) : (
        <div style={{
          width: '100%',
          maxWidth: 1200,
          margin: '0 auto',
          paddingBottom: 48,
          overflowX: 'auto',
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            background: 'rgba(255,255,255,0.85)',
            borderRadius: 18,
            boxShadow: '0 8px 32px 0 rgba(44,62,80,0.13)',
            overflow: 'hidden',
            fontSize: '1.08rem',
            animation: 'fadeInCard 0.7s',
          }}>
            <thead>
              <tr style={{ background: 'linear-gradient(90deg, #e0e7ff 0%, #a5b4fc 100%)', color: '#39397a', fontWeight: 700 }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '2px solid #e0e7ef', fontWeight: 800 }}>User</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '2px solid #e0e7ef', fontWeight: 800 }}>Submitted At</th>
                {questionIds.map(qid => (
                  <th key={qid} style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '2px solid #e0e7ef', fontWeight: 800 }}>{getQuestionText(qid)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {responses.map((resp, idx) => {
                let answersObj = {};
                try {
                  answersObj = typeof resp.answers === 'string' ? JSON.parse(resp.answers) : resp.answers;
                } catch (e) {
                  answersObj = {};
                }
                return (
                  <tr key={idx} style={{
                    background: idx % 2 === 0 ? 'rgba(99,102,241,0.04)' : 'rgba(255,255,255,0.95)',
                    transition: 'background 0.2s, box-shadow 0.2s',
                    borderRadius: 12,
                    boxShadow: '0 1px 4px #a5b4fc11',
                    cursor: 'pointer',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = '#e0e7ff'; }}
                  onMouseOut={e => { e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(99,102,241,0.04)' : 'rgba(255,255,255,0.95)'; }}
                  >
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: '#6366f1', borderBottom: '1px solid #e0e7ef', borderRight: '1px solid #f3f4f6' }}>{resp.users?.email || 'Anonymous'}</td>
                    <td style={{ padding: '8px 10px', color: '#7b7b9d', borderBottom: '1px solid #e0e7ef', borderRight: '1px solid #f3f4f6' }}>{new Date(resp.submitted_at).toLocaleString()}</td>
                    {questionIds.map(qid => (
                      <td key={qid} style={{ padding: '8px 10px', color: '#39397a', borderBottom: '1px solid #e0e7ef' }}>
                        {answersObj && answersObj[qid] ? answersObj[qid] : <span style={{ color: '#bbb' }}>-</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {/* Share Results Button */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', margin: '32px 0 0 0' }}>
        <ShareDropdown responses={responses.map(resp => {
          let answersObj = {};
          try {
            answersObj = typeof resp.answers === 'string' ? JSON.parse(resp.answers) : resp.answers;
          } catch (e) {
            answersObj = {};
          }
          return {
            User: resp.users?.email || 'Anonymous',
            SubmittedAt: new Date(resp.submitted_at).toLocaleString(),
            ...answersObj
          };
        })} />
      </div>
      <style>{`
        @keyframes fadeInCard {
          from { opacity: 0; transform: translateY(24px) scale(0.98); }
          to { opacity: 1; transform: none; }
        }
        @media (max-width: 700px) {
          table { font-size: 0.98rem; }
          th, td { padding: 6px 4px !important; }
        }
      `}</style>
    </div>
  );
};

export default ViewResponses;