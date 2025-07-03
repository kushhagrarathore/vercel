// pages/HostLiveQuiz.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import LiveQuizController from '../components/live/LiveQuizController';
const HostLiveQuiz = () => {
  const { quizId } = useParams();
  const [slides, setSlides] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchSlides = async () => {
      const { data, error } = await supabase
        .from('quiz_slides')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order', { ascending: true });

      if (data) setSlides(data);
    };
    fetchSlides();
  }, [quizId]);

  const goToNextSlide = async () => {
    const newIndex = currentIndex + 1;
    if (newIndex < slides.length) {
      setCurrentIndex(newIndex);
      await supabase
        .from('quizzes')
        .update({ current_slide_index: newIndex })
        .eq('id', quizId);
    }
  };

  const currentSlide = slides[currentIndex];
return (
  <div style={{ padding: '20px' }}>
    <h2>Live Quiz Host View</h2>

    {currentSlide ? (
      <>
        {/* Question Display */}
        <div style={{ marginBottom: '20px' }}>
          <h3>{currentSlide.question}</h3>
          <ul>
            {currentSlide.options.map((opt, i) => (
              <li key={i}>{opt}</li>
            ))}
          </ul>
        </div>

        {/* 👇 Live controller here */}
        <LiveQuizController
          quizId={quizId}
          currentIndex={currentIndex}
          totalSlides={slides.length}
          setCurrentIndex={setCurrentIndex}
        />
      </>
    ) : (
      <p>Loading slides...</p>
    )}
  </div>
);
}
export default HostLiveQuiz;
