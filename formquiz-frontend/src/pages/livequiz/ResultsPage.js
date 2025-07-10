import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';

// Enhanced Quiz Results Page CSS
const styles = `
.quiz-results-container {
  max-width: 480px;
  margin: 40px auto;
  padding: 24px 0 80px 0;
  background: #f8fafc;
  border-radius: 20px;
  box-shadow: 0 6px 32px rgba(80, 80, 180, 0.10);
}
.quiz-results-header {
  padding: 0 24px;
}
.quiz-title {
  color: #4a6bff;
  font-weight: 700;
  font-size: 1.2rem;
  margin-bottom: 2px;
}
.quiz-results-summary {
  margin-bottom: 18px;
  font-size: 1rem;
  color: #374151;
}
.responses-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 0;
  padding: 0 24px;
  list-style: none;
}
.response-card {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(44,62,80,0.08);
  padding: 16px 18px;
  border: 1px solid #e5e7eb;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: box-shadow 0.2s, border 0.2s;
}
.response-card:hover {
  box-shadow: 0 4px 16px rgba(44,62,80,0.13);
  border-color: #4a6bff;
}
.response-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.response-name {
  font-weight: 700;
  font-size: 1.08rem;
  color: #23272f;
}
.response-score {
  font-weight: 600;
  color: #2563eb;
  font-size: 1.05rem;
  background: #e0e7ff;
  border-radius: 8px;
  padding: 2px 10px;
  margin-left: 8px;
}
.response-time {
  color: #6b7280;
  font-size: 0.98rem;
}
.export-btn {
  position: fixed;
  left: 50%;
  bottom: 32px;
  transform: translateX(-50%);
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 14px 32px;
  font-weight: 700;
  font-size: 1.1rem;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(44,62,80,0.10);
  transition: background 0.2s;
}
.export-btn:hover {
  background: #1d4ed8;
}
.modal-bg {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.18);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
}
.modal-content {
  background: #fff;
  border-radius: 0;
  box-shadow: none;
  padding: 48px 0 48px 0;
  max-width: 100vw;
  width: 100vw;
  min-height: 100vh;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}
@media (min-width: 900px) {
  .modal-content {
    border-radius: 24px;
    max-width: 700px;
    margin: 40px auto;
    box-shadow: 0 8px 32px rgba(44,62,80,0.18);
    padding: 48px 48px 48px 48px;
    min-height: unset;
  }
}
.modal-close {
  position: absolute;
  top: 24px;
  right: 32px;
  background: none;
  border: none;
  font-size: 2rem;
  color: #888;
  cursor: pointer;
  z-index: 10;
}
.modal-answers-list {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  max-width: 600px;
  align-items: center;
}
.modal-answer-row {
  background: #f3f4f6;
  border-radius: 14px;
  padding: 18px 24px;
  font-size: 1.08rem;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  box-shadow: 0 2px 8px #6366f122;
}
.modal-answer-row .question {
  font-weight: 700;
  color: #23272f;
  font-size: 1.08rem;
  margin-bottom: 6px;
}
.modal-answer-row .your-answer {
  color: #2563eb;
  font-weight: 500;
}
.modal-answer-row .correct {
  color: #059669;
  font-weight: 600;
}
.modal-answer-row .wrong {
  color: #b91c1c;
  font-weight: 600;
}
.modal-answer-row .correct-answer {
  color: #059669;
  font-weight: 500;
  margin-top: 2px;
}
`;
if (typeof document !== 'undefined' && !document.getElementById('quiz-results-modal-css')) {
  const style = document.createElement('style');
  style.id = 'quiz-results-modal-css';
  style.innerHTML = styles;
  document.head.appendChild(style);
}

const QuizResultsPage = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [responses, setResponses] = useState([]);
  const [quizTitle, setQuizTitle] = useState('');
  const [questions, setQuestions] = useState([]);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // Get quiz responses
      const { data: respData, error: respError } = await supabase
        .from('quiz_responses')
        .select('*')
        .eq('quiz_id', quizId);
      if (respError) {
        console.error('Supabase quiz_responses error:', respError);
      }
      if (respData) {
        setResponses(respData);
      }

      // Get quiz title and form_id
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('title, form_id')
        .eq('id', quizId)
        .single();
      if (quizError) {
        console.error('Supabase quiz error:', quizError);
      }
      if (quizData) setQuizTitle(quizData.title);

      // Get quiz questions using form_id
      if (quizData && quizData.form_id) {
        const { data: qData, error: qError } = await supabase
          .from('questions')
          .select('*')
          .eq('form_id', quizData.form_id)
          .order('order_index');
        if (qError) {
          console.error('Supabase questions error:', qError);
        }
        if (qData) setQuestions(qData);
      } else {
        setQuestions([]);
      }
    };
    fetchData();
  }, [quizId]);

  const getQuestionText = (questionId) => {
    const q = questions.find(q => q.id === questionId);
    return q ? q.question_text : questionId;
  };

  // Calculate average score
  const averageScore = responses.length > 0
    ? Math.round(responses.filter(r => typeof r.score === 'number').reduce((sum, r) => sum + (r.score || 0), 0) / responses.length)
    : 0;
  const lastUpdated = responses.length > 0 ? new Date(Math.max(...responses.map(r => new Date(r.submitted_at)))) : null;

  return (
    <div className="quiz-results-container">
      <div className="quiz-results-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
        <h2 style={{ fontWeight: 700, fontSize: '1.3rem', margin: '10px 0 2px 0' }}>Quiz Results</h2>
        <div className="quiz-title">{quizTitle}</div>
        <div className="quiz-results-summary">
          {responses.length} Responses · Average Score: {averageScore}
          {lastUpdated && (
            <span style={{ marginLeft: 10, color: '#888', fontWeight: 400, fontSize: '0.98rem' }}>
              · Updated {Math.round((Date.now() - lastUpdated.getTime()) / 3600000) || 1}h ago
            </span>
          )}
        </div>
        <div style={{ fontWeight: 600, margin: '18px 0 8px 0', fontSize: '1.08rem' }}>Individual Responses</div>
      </div>
      <ol className="responses-list">
        {responses.map((resp, idx) => (
          <li
            key={resp.id || idx}
            className="response-card"
          >
            <div className="response-info">
              <span
                className="response-name"
                style={{ cursor: 'pointer', textDecoration: 'underline' }}
                onClick={async () => {
                  setLoadingResponse(true);
                  let questionsToUse = questions;
                  // Always fetch questions if not loaded
                  if (!questions || questions.length === 0) {
                    setLoadingQuestions(true);
                    const { data: qData, error: qError } = await supabase
                      .from('questions')
                      .select('*')
                      .eq('form_id', quizId)
                      .order('order_index');
                    setLoadingQuestions(false);
                    if (qError) {
                      setLoadingResponse(false);
                      alert('Failed to fetch questions');
                      return;
                    }
                    setQuestions(qData);
                    questionsToUse = qData;
                  }
                  // Fetch response
                  const { data: respData, error } = await supabase
                    .from('quiz_responses')
                    .select('*')
                    .eq('id', resp.id)
                    .single();
                  setLoadingResponse(false);
                  if (error) {
                    alert('Failed to fetch response');
                    return;
                  }
                  setSelectedResponse(respData);
                }}
              >
                {resp.username || resp.user_id || 'Anonymous'}
              </span>
              <span className="response-time">Submitted {formatTimeAgo(resp.submitted_at)}</span>
            </div>
            <span className="response-score">{resp.score ?? 0}</span>
          </li>
        ))}
      </ol>
      <button className="export-btn" onClick={handleExportResults}>Export Results</button>
      {(loadingResponse || loadingQuestions) && (
        <div className="modal-bg"><div className="modal-content"><div>Loading response...</div></div></div>
      )}
      {selectedResponse && !loadingResponse && !loadingQuestions && (
        <div className="modal-bg" onClick={() => { setSelectedResponse(null); setShowDetails(false); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setSelectedResponse(null); setShowDetails(false); }}>&times;</button>
            <h3 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: 8 }}>
              {selectedResponse.username || selectedResponse.user_id || 'Anonymous'}'s Answers
            </h3>
            <div style={{ color: '#2563eb', fontWeight: 600, marginBottom: 8 }}>
              Score: {selectedResponse.score ?? 0} / {questions.length}
            </div>
            <div style={{ width: '100%', maxWidth: 700, margin: '0 auto', background: 'none', boxShadow: 'none', padding: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '1.15rem', margin: '18px 0 12px 0' }}>Your Responses</div>
              {questions.map((q, idx) => {
                let userAnswer = null;
                if (Array.isArray(selectedResponse.answers)) {
                  userAnswer = selectedResponse.answers.find(
                    a => a.questionId === q.id || a.question_id === q.id
                  ) || selectedResponse.answers[idx];
                }
                const correct = Array.isArray(q.correct_answers) ? q.correct_answers : [];
                return (
                  <div key={q.id || idx} style={{ marginBottom: 22 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      Q{idx + 1}: {q.question_text}
                    </div>
                    {q.options && Array.isArray(q.options) && q.options.length > 0 ? (
                      <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
                        {q.options.map((opt, optIdx) => {
                          const isSelected = userAnswer && userAnswer.selectedIndex === optIdx;
                          const isCorrect = correct.includes(optIdx);
                          return (
                            <li key={optIdx} style={{
                              display: 'block',
                              marginBottom: 2,
                              color: isSelected
                                ? (isCorrect ? '#7c3aed' : '#e11d48')
                                : (isCorrect ? '#7c3aed' : '#23272f'),
                              fontWeight: isSelected ? 600 : 400,
                              fontSize: '1rem',
                            }}>
                              <span>{opt}</span>
                              {isSelected && isCorrect && <span style={{marginLeft:4}}>✔️</span>}
                              {isSelected && !isCorrect && <span style={{marginLeft:4}}>❌</span>}
                              {!isSelected && isCorrect && <span style={{marginLeft:4}}>✔️</span>}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div style={{ marginLeft: 12 }}>
                        <span style={{
                          color: userAnswer && userAnswer.text && correct.some(ans => typeof ans === 'string' && ans.trim().toLowerCase() === userAnswer.text.trim().toLowerCase()) ? '#7c3aed' : '#e11d48',
                          fontWeight: 600,
                          fontSize: '1rem',
                        }}>
                          {userAnswer && userAnswer.text ? userAnswer.text : 'Not answered'} {userAnswer && userAnswer.text && correct.some(ans => typeof ans === 'string' && ans.trim().toLowerCase() === userAnswer.text.trim().toLowerCase()) ? '✔️' : userAnswer && userAnswer.text ? '❌' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizResultsPage;

// Helper to format time ago
function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffHrs = Math.floor(diffMs / 3600000);
  if (diffHrs < 1) {
    const diffMins = Math.floor(diffMs / 60000);
    return `${diffMins} min ago`;
  }
  return `${diffHrs}h ago`;
}

// Export results as CSV
function handleExportResults() {
  // ...implement CSV export logic here...
}