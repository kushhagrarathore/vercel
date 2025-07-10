import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';

const LiveQuizDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.from('lq_quizzes').select('*').eq('id', id).single();
      if (error || !data) {
        setError('Quiz not found.');
        setLoading(false);
        return;
      }
      setQuiz(data);
      setLoading(false);
    };
    fetchQuiz();
  }, [id]);

  useEffect(() => {
    if (!quiz) return;
    const fetchParticipants = async () => {
      const { data, error } = await supabase
        .from('lq_session_participants')
        .select('*')
        .eq('quiz_id', quiz.id);
      if (!error) setParticipants(data || []);
    };
    fetchParticipants();
  }, [quiz]);

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  if (error) return <div style={{ padding: 40, color: 'red' }}>{error}</div>;
  if (!quiz) return null;

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px #e0e7ef', padding: 32 }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 18, background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, cursor: 'pointer' }}>← Back</button>
      <h2 style={{ fontWeight: 800, fontSize: 28, marginBottom: 8 }}>{quiz.title || 'Untitled Live Quiz'}</h2>
      <div style={{ color: '#555', fontSize: 16, marginBottom: 8 }}>Code: <b>{quiz.code || quiz.id}</b></div>
      <div style={{ color: '#888', fontSize: 15, marginBottom: 18 }}>Created: {quiz.created_at ? new Date(quiz.created_at).toLocaleString() : 'N/A'}</div>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Participants</div>
      {participants.length === 0 ? (
        <div style={{ color: '#aaa', fontSize: 15 }}>No participants found.</div>
      ) : (
        <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
          {participants.map((p) => (
            <li key={p.id} style={{ padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>{p.username || p.user_id || p.id}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LiveQuizDetails; 