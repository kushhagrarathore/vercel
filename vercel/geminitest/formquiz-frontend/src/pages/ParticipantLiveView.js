// pages/ParticipantLiveView.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabase';

const ParticipantLiveView = () => {
  const { quizId } = useParams();
  const [slides, setSlides] = useState([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  useEffect(() => {
    const fetchSlides = async () => {
      const { data } = await supabase
        .from('quiz_slides')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order', { ascending: true });

      if (data) setSlides(data);
    };

    fetchSlides();

    const channel = supabase
      .channel('realtime-quiz')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quizzes',
          filter: `id=eq.${quizId}`,
        },
        (payload) => {
          setCurrentSlideIndex(payload.new.current_slide_index);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [quizId]);

  const currentSlide = slides[currentSlideIndex];

  return (
    <div>
      <h2>Live Quiz</h2>
      {currentSlide ? (
        <>
          <h3>{currentSlide.question}</h3>
          <ul>
            {currentSlide.options.map((opt, i) => (
              <li key={i}>{opt}</li>
            ))}
          </ul>
        </>
      ) : (
        <p>Waiting for question...</p>
      )}
    </div>
  );
};

export default ParticipantLiveView;
