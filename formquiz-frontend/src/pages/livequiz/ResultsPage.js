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
      <div style={{
        width: '100%',
        maxWidth: 1400,
        margin: '0 auto',
        padding: '48px 40px 0 40px',
        textAlign: 'left',
        position: 'relative',
        background: 'none',
        boxShadow: 'none',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(99,102,241,0.10)',
            color: '#6366f1',
            border: 'none',
            borderRadius: 10,
            padding: '10px 22px',
            fontWeight: 700,
            fontSize: '1.08rem',
            boxShadow: '0 2px 8px #a5b4fc22',
            cursor: 'pointer',
            transition: 'background 0.18s, color 0.18s, box-shadow 0.18s',
            marginBottom: 28,
            outline: 'none',
          }}
          onMouseOver={e => { e.currentTarget.style.background = '#6366f1'; e.currentTarget.style.color = '#fff'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.10)'; e.currentTarget.style.color = '#6366f1'; }}
          onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 3px #a5b4fc55'; }}
          onBlur={e => { e.currentTarget.style.boxShadow = '0 2px 8px #a5b4fc22'; }}
        >
          <span style={{ fontSize: 18, display: 'inline-block', marginRight: 4 }}>&larr;</span> Back
        </button>
        <h2 style={{ marginBottom: '32px', fontWeight: 800, fontSize: '2.3rem', color: '#39397a', letterSpacing: '-1px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span role="img" aria-label="clipboard">📋</span> Quiz Results: <span style={{ color: '#39397a' }}>{quizTitle}</span>
        </h2>
        <div style={{ marginBottom: 32, fontSize: '1.18rem', color: '#374151', fontWeight: 600, background: '#f3f4f6', borderRadius: 14, padding: '18px 24px', display: 'inline-block', boxShadow: '0 2px 8px #a5b4fc11' }}>
          {responses.length} Responses · Average Score: {averageScore}
          {lastUpdated && (
            <span style={{ marginLeft: 10, color: '#888', fontWeight: 400, fontSize: '0.98rem' }}>
              · Updated {Math.round((Date.now() - lastUpdated.getTime()) / 3600000) || 1}h ago
            </span>
          )}
        </div>
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
          maxWidth: 1400,
          margin: '0 auto',
          padding: '0 40px 56px 40px',
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
            fontSize: '1.1rem',
            animation: 'fadeInCard 0.7s',
          }}>
            <thead>
              <tr style={{ background: 'linear-gradient(90deg, #e0e7ff 0%, #a5b4fc 100%)', color: '#39397a', fontWeight: 700 }}>
                <th style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '2px solid #e0e7ef', fontWeight: 800 }}>User</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '2px solid #e0e7ef', fontWeight: 800 }}>Submitted At</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '2px solid #e0e7ef', fontWeight: 800 }}>Score</th>
                {questions.map(q => (
                  <th key={q.id} style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '2px solid #e0e7ef', fontWeight: 800 }}>{q.question_text}</th>
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
                // For quiz, answers may be array of {questionId, selectedIndex, text}
                const answerMap = Array.isArray(answersObj)
                  ? Object.fromEntries(answersObj.map(a => [a.questionId || a.question_id, a.selectedIndex !== undefined ? (q => q.options && q.options[a.selectedIndex] ? q.options[a.selectedIndex] : '-') : a.text || '-']))
                  : answersObj;
                return (
                  <tr key={resp.id || idx} style={{
                    background: idx % 2 === 0 ? 'rgba(99,102,241,0.04)' : 'rgba(255,255,255,0.95)',
                    transition: 'background 0.2s, box-shadow 0.2s',
                    borderRadius: 12,
                    boxShadow: '0 1px 4px #a5b4fc11',
                    cursor: 'pointer',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = '#e0e7ff'; }}
                  onMouseOut={e => { e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(99,102,241,0.04)' : 'rgba(255,255,255,0.95)'; }}
                  >
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#6366f1', borderBottom: '1px solid #e0e7ef', borderRight: '1px solid #f3f4f6' }}>{resp.username || resp.user_id || 'Anonymous'}</td>
                    <td style={{ padding: '12px 14px', color: '#7b7b9d', borderBottom: '1px solid #e0e7ef', borderRight: '1px solid #f3f4f6' }}>{new Date(resp.submitted_at).toLocaleString()}</td>
                    <td style={{ padding: '12px 14px', color: '#2563eb', fontWeight: 700, borderBottom: '1px solid #e0e7ef', borderRight: '1px solid #f3f4f6', textAlign: 'right' }}>{resp.score ?? '-'}</td>
                    {questions.map(q => (
                      <td key={q.id} style={{ padding: '12px 14px', color: '#39397a', borderBottom: '1px solid #e0e7ef' }}>
                        {(() => {
                          if (Array.isArray(resp.answers)) {
                            const found = resp.answers.find(a => (a.questionId || a.question_id) === q.id);
                            if (found) {
                              if (found.selectedIndex !== undefined && q.options && q.options[found.selectedIndex]) {
                                return q.options[found.selectedIndex];
                              } else if (found.text) {
                                return found.text;
                              }
                            }
                            return <span style={{ color: '#bbb' }}>-</span>;
                          } else if (resp.answers && resp.answers[q.id]) {
                            return resp.answers[q.id];
                          } else {
                            return <span style={{ color: '#bbb' }}>-</span>;
                          }
                        })()}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ height: 32 }} />
      <button className="export-btn" onClick={handleExportResults} style={{ marginTop: 32 }}>Export Results</button>
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