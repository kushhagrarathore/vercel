import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import Leaderboard from './live/Leaderboard';
import './ResultsPage.css';

const ResultsPage = () => {
  const { quizId, formId } = useParams();
  const navigate = useNavigate();

  // Quiz mode
  const [quiz, setQuiz] = useState(null);
  const [slides, setSlides] = useState([]);
  const [participants, setParticipants] = useState(0);

  // Form mode
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuizData = async () => {
      try {
        setLoading(true);
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .single();

        if (quizError || !quizData) throw new Error('Quiz not found.');
        setQuiz(quizData);

        const { data: slidesData } = await supabase
          .from('quiz_slides')
          .select('*')
          .eq('quiz_id', quizId)
          .order('order', { ascending: true });
        setSlides(slidesData);

        const { data: responses } = await supabase
          .from('live_responses')
          .select('username');
        const unique = new Set(responses.map(r => r.username || 'Anonymous'));
        setParticipants(unique.size);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchFormData = async () => {
      try {
        setLoading(true);
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
      } catch (err) {
        setError('Failed to fetch form results.');
      } finally {
        setLoading(false);
      }
    };

    if (quizId) fetchQuizData();
    else if (formId) fetchFormData();
  }, [quizId, formId]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading results...</div>;

  if (error) {
    return (
      <div style={{ padding: 40, color: 'red', textAlign: 'center' }}>
        <div>{error}</div>
        <button onClick={() => navigate('/dashboard')} style={{ marginTop: 20 }}>← Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="results-container" style={{ maxWidth: 800, margin: '0 auto', padding: 32 }}>
      <button className="back-button" onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>

      {/* ✅ Quiz Results View */}
      {quizId && (
        <>
          <h2 className="results-title">Quiz Results</h2>
          <div style={{ marginBottom: 24 }}>
            <h3>{quiz?.title}</h3>
            <p><b>Total Questions:</b> {slides.length}</p>
            <p><b>Participants:</b> {participants}</p>
          </div>
          <Leaderboard quizId={quizId} />
        </>
      )}

      {/* ✅ Form Results Table */}
      {formId && (
        <>
          <h2 className="results-title">Responses</h2>
          <div className="responses-table">
            <div className="table-header">
              <span>No.</span>
              <span>Date</span>
              {questions.map((q, i) => (
                <span key={q.id}>Q{i + 1}. {q.question_text}</span>
              ))}
            </div>

            {responses.map((resp, idx) => (
              <div key={idx} className="table-row">
                <span>{idx + 1}</span>
                <span>{new Date(resp.submitted_at).toLocaleString()}</span>
                {questions.map((q, i) => (
                  <span key={q.id}>
                    <strong>{i + 1}:</strong> {resp.answers?.[q.id] || '—'}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ResultsPage;
