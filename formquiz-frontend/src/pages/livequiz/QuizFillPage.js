import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';

const QuizFillPage = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [slides, setSlides] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState('');
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState([]);

  useEffect(() => {
    const fetchQuiz = async () => {
      setLoading(true);
      setError(null);
      const { data: quizData, error: quizError } = await supabase.from('quizzes').select('*').eq('id', quizId).single();
      if (quizError || !quizData) {
        setError('Quiz not found.');
        setLoading(false);
        return;
      }
      setQuiz(quizData);
      const { data: slidesData, error: slidesError } = await supabase.from('live_quiz_slides').select('*').eq('quiz_id', quizId).order('slide_index');
      if (slidesError || !Array.isArray(slidesData) || slidesData.length === 0) {
        setError('No slides found for this quiz.');
        setLoading(false);
        return;
      }
      setSlides(slidesData);
      setLoading(false);
    };
    fetchQuiz();
  }, [quizId]);

  const handleAnswer = idx => {
    setSelected(idx);
    setSubmitted(true);
    setAnswers(prev => [...prev, { questionId: slides[current].id, selected: idx }]);
    setTimeout(() => {
      if (current < slides.length - 1) {
        setCurrent(current + 1);
        setSelected(null);
        setSubmitted(false);
      } else {
        setFinished(true);
      }
    }, 600);
  };

  const handleSubmit = async () => {
    await supabase.from('quiz_responses').insert({
      quiz_id: quizId,
      username: username.trim() || 'Anonymous',
      answers,
      submitted_at: new Date().toISOString(),
    });
    alert('Thank you for submitting your responses!');
    navigate('/');
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="loader" /></div>;
  if (error) return <div style={{ padding: 40, color: 'red', textAlign: 'center' }}>{error}</div>;
  if (!quiz || !slides.length) return <div style={{ padding: 40, color: 'red' }}>No quiz data found.</div>;

  if (finished) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #e0e7ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(60,60,100,0.10), 0 1.5px 6px rgba(0,0,0,0.03)', padding: 40, minWidth: 340, maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <h2 style={{ fontWeight: 800, fontSize: 32, color: '#4a6bff', marginBottom: 12 }}>Quiz Complete!</h2>
        <div style={{ margin: '24px 0' }}>
          <label htmlFor="username" style={{ fontWeight: 600, fontSize: 18 }}>Your Name:</label>
          <input id="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your name" style={{ padding: 12, borderRadius: 8, border: '1.5px solid #c7d2fe', marginLeft: 12, fontSize: 17, width: 200 }} />
        </div>
        <button onClick={handleSubmit} style={{ padding: '12px 36px', borderRadius: 10, background: 'linear-gradient(90deg, #4a6bff 0%, #2563eb 100%)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 18, boxShadow: '0 2px 8px rgba(74,107,255,0.10)', cursor: 'pointer', marginTop: 12 }}>Submit Responses</button>
      </div>
    </div>
  );

  const slide = slides[current];
  const options = Array.isArray(slide.options) ? slide.options : [];
  const progress = ((current + 1) / slides.length) * 100;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #e0e7ff 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', margin: '32px 0 18px 0', textAlign: 'center' }}>
          <h1 style={{ fontWeight: 800, fontSize: 32, color: '#4a6bff', marginBottom: 4, letterSpacing: '-1px' }}>{quiz.title}</h1>
          <div style={{ fontWeight: 500, color: '#888', fontSize: 17, marginBottom: 8, letterSpacing: '0.5px' }}>Question {current + 1} / {slides.length}</div>
          <div style={{ height: 8, width: '100%', background: '#e0e7ff', borderRadius: 8, overflow: 'hidden', margin: '0 auto 18px auto', maxWidth: 340 }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #4a6bff 0%, #2563eb 100%)', borderRadius: 8, transition: 'width 0.4s cubic-bezier(.4,2,.6,1)' }} />
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(60,60,100,0.10), 0 1.5px 6px rgba(0,0,0,0.03)', padding: '38px 28px 32px 28px', minWidth: 320, maxWidth: 420, width: '100%', margin: '0 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', transition: 'box-shadow 0.2s' }}>
          <div style={{ color: '#23272f', fontWeight: 700, fontSize: 22, margin: '0 0 18px 0', textAlign: 'center', letterSpacing: '-0.5px' }}>{slide.question}</div>
          <div style={{ width: '100%', marginTop: 8 }}>
            {options.length === 0 ? (
              <div style={{ color: 'red', textAlign: 'center' }}>No options available for this question.</div>
            ) : options.map((opt, idx) => (
              <button
                key={idx}
                disabled={submitted}
                style={{
                  display: 'block',
                  width: '100%',
                  margin: '10px 0',
                  padding: '16px 0',
                  borderRadius: 12,
                  background: selected === idx ? 'linear-gradient(90deg, #4a6bff 0%, #2563eb 100%)' : '#f3f4f6',
                  color: selected === idx ? '#fff' : '#23272f',
                  border: selected === idx ? '2.5px solid #4a6bff' : '2px solid #e0e0e0',
                  fontWeight: 700,
                  fontSize: 18,
                  boxShadow: selected === idx ? '0 2px 12px rgba(74,107,255,0.10)' : 'none',
                  cursor: submitted ? 'not-allowed' : 'pointer',
                  outline: selected === idx ? '2px solid #a5b4fc' : 'none',
                  transition: 'all 0.18s',
                }}
                onClick={() => handleAnswer(idx)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        .loader {
          border: 6px solid #e0e7ff;
          border-top: 6px solid #4a6bff;
          border-radius: 50%;
          width: 48px;
          height: 48px;
          animation: spin 1s linear infinite;
          margin: 80px auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default QuizFillPage; 