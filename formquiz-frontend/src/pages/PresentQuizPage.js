import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { generateLiveLink } from '../utils/generateLiveLink';
// TODO: Import TimerBar, Leaderboard, LiveAudienceView, etc.

const PresentQuizPage = () => {
  const { quizId } = useParams();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [slides, setSlides] = useState([]);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    // Fetch slides for this quiz
    const fetchSlides = async () => {
      const { data, error } = await supabase.from('slides').select('*').eq('quiz_id', quizId).order('slide_index');
      if (error) {
        console.error('Failed to load slides');
      } else {
        setSlides(data || []);
      }
    };
    fetchSlides();
  }, [quizId]);

  // Check live status
  useEffect(() => {
    const checkLive = async () => {
      const { data, error } = await supabase.from('live_quizzes').select('*').eq('quiz_id', quizId).single();
      if (data && data.is_live) {
        setIsLive(true);
        setCurrentQuestion(data.current_question_index || 0);
      }
    };
    checkLive();
  }, [quizId]);

  const handleStart = async () => {
    // Upsert live_quizzes row
    const { error } = await supabase.from('live_quizzes').upsert({
      quiz_id: quizId,
      is_live: true,
      current_question_index: 0,
      started_at: new Date().toISOString(),
    });
    if (error) {
      console.error('Failed to start live quiz');
    } else {
      setIsLive(true);
      setCurrentQuestion(0);
    }
  };

  const handleNext = async () => {
    if (currentQuestion < slides.length - 1) {
      const next = currentQuestion + 1;
      setCurrentQuestion(next);
      await supabase.from('live_quizzes').update({ current_question_index: next }).eq('quiz_id', quizId);
    }
  };

  const handleEnd = async () => {
    await supabase.from('live_quizzes').update({ is_live: false }).eq('quiz_id', quizId);
    setIsLive(false);
  };

  return (
    <div className="present-quiz-layout" style={{ maxWidth: 600, margin: '0 auto', padding: 32 }}>
      <h1 style={{ fontWeight: 700, marginBottom: 16 }}>Live Quiz Host Panel</h1>
      {!isLive ? (
        <button onClick={handleStart} style={{ padding: '12px 32px', fontSize: 18, borderRadius: 8, background: '#4a6bff', color: '#fff', border: 'none', fontWeight: 700, marginBottom: 24 }}>
          Start Live Quiz
        </button>
      ) : (
        <>
          <div style={{ marginBottom: 16, color: '#059669', fontWeight: 600 }}>Quiz is LIVE!</div>
          <div style={{ marginBottom: 16 }}>
            <b>Share this link with participants:</b><br />
            <a href={generateLiveLink(quizId)} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', wordBreak: 'break-all', fontSize: 16 }}>{generateLiveLink(quizId)}</a>
          </div>
          <div style={{ marginBottom: 24 }}>
            <b>Current Question:</b> {slides[currentQuestion]?.question || 'N/A'}
          </div>
          <button onClick={handleNext} disabled={currentQuestion >= slides.length - 1} style={{ padding: '10px 24px', borderRadius: 8, background: '#f59e42', color: '#fff', border: 'none', fontWeight: 700, marginRight: 12 }}>
            Next Question
          </button>
          <button onClick={handleEnd} style={{ padding: '10px 24px', borderRadius: 8, background: '#e11d48', color: '#fff', border: 'none', fontWeight: 700 }}>
            End Quiz
          </button>
        </>
      )}
    </div>
  );
};

export default PresentQuizPage; 