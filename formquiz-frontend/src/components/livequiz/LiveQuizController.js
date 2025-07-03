// components/LiveQuizController.jsx
import React from 'react';
import { supabase } from '../supabase';

const LiveQuizController = ({ quizId, currentIndex, totalSlides, setCurrentIndex }) => {
  const goToSlide = async (newIndex) => {
    if (newIndex >= 0 && newIndex < totalSlides) {
      setCurrentIndex(newIndex);
      await supabase
        .from('quizzes')
        .update({ current_slide_index: newIndex })
        .eq('id', quizId);
    }
  };

  return (
    <div style={{ padding: '16px', border: '1px solid #ddd', borderRadius: '8px' }}>
      <p><strong>Slide {currentIndex + 1}</strong> / {totalSlides}</p>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button disabled={currentIndex === 0} onClick={() => goToSlide(currentIndex - 1)}>Previous</button>
        <button disabled={currentIndex === totalSlides - 1} onClick={() => goToSlide(currentIndex + 1)}>Next</button>
      </div>
    </div>
  );
};

export default LiveQuizController;
