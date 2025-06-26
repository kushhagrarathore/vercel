import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import Leaderboard from './live/Leaderboard';

const ResultsPage = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [slides, setSlides] = useState([]);
  const [participants, setParticipants] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      // Fetch quiz info
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();
      if (quizError || !quizData) {
        setError('Quiz not found.');
        setLoading(false);
        return;
      }
      setQuiz(quizData);
      // Fetch slides
      const { data: slidesData, error: slidesError } = await supabase
        .from('slides')
        .select('*')
        .eq('quiz_id', quizId);
      setSlides(Array.isArray(slidesData) ? slidesData : []);
      // Fetch unique participants from live_responses
      const { data: responses, error: respError } = await supabase
        .from('live_responses')
        .select('username', { count: 'exact', head: false })
        .eq('quiz_id', quizId);
      if (!respError && Array.isArray(responses)) {
        const unique = new Set(responses.map(r => r.username || 'Anonymous'));
        setParticipants(unique.size);
      } else {
        setParticipants(0);
      }
      setLoading(false);
    };
    fetchResults();
    // eslint-disable-next-line
  }, [quizId, retryCount]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading results...</div>;
  if (error) return (
    <div style={{ padding: 40, color: 'red', textAlign: 'center' }}>
      <div style={{ marginBottom: 16 }}>{error}</div>
      <button onClick={() => setRetryCount(c => c + 1)} style={{ padding: '8px 20px', borderRadius: 8, background: '#4a6bff', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', marginRight: 12 }}>Retry</button>
      <button onClick={() => navigate('/dashboard')} style={{ padding: '8px 20px', borderRadius: 8, background: '#888', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Back to Dashboard</button>
    </div>
  );

  return (
    <div className="results-layout" style={{ maxWidth: 600, margin: '0 auto', padding: 32 }}>
      <h1 style={{ fontWeight: 700, marginBottom: 12 }}>Quiz Results</h1>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontWeight: 600 }}>{quiz?.title}</h2>
        <div style={{ color: '#555', marginTop: 8 }}>
          <b>Total Questions:</b> {slides.length} <br />
          <b>Participants:</b> {participants}
        </div>
      </div>
      <Leaderboard />
      {/* Placeholder for word cloud or answer stats */}
      {/* <div style={{ marginTop: 32 }}>[Word cloud/answer stats coming soon]</div> */}
    </div>
  );
};

export default ResultsPage;
