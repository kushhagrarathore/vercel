import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QuizArenaLayout from '../../components/quiz/QuizArenaLayout';

const QuizPreviewPage = ({ quiz, slides }) => {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const slide = slides[current];

  const handleAnswer = idx => {
    setSelected(idx);
    setSubmitted(true);
    setTimeout(() => {
      if (current < slides.length - 1) setCurrent(current + 1);
    }, 1200);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color, #f5f7fa)', color: 'var(--text-color, #222)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', padding: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 8 }}>{quiz.title}</div>
        <div style={{ fontWeight: 500, color: '#888', fontSize: 16, marginBottom: 18 }}>Question {current + 1} / {slides.length}</div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={slide.id || current}
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.45 } }}
            exit={{ opacity: 0, y: -40, scale: 0.98, transition: { duration: 0.3 } }}
            style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(60,60,100,0.10)', padding: '38px 28px 32px 28px', minWidth: 320, maxWidth: 420, width: '100%', margin: '0 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}
          >
            <div style={{ width: '100%', height: 6, background: '#e5eaf0', borderRadius: 4, marginBottom: 18 }}>
              <div style={{ width: `${((current + 1) / slides.length) * 100}%`, height: '100%', background: '#3b82f6', borderRadius: 4, transition: 'width 0.3s' }} />
            </div>
            <h2 style={{ color: '#222', fontWeight: 700, fontSize: 22, margin: '18px 0 18px 0', textAlign: 'center' }}>{slide.question}</h2>
            <div style={{ width: '100%', marginTop: 8 }}>
              {slide.options.map((opt, idx) => (
                <motion.button
                  key={idx}
                  style={{
                    background: selected === idx ? '#3b82f6' : '#fff',
                    color: selected === idx ? '#fff' : '#222',
                    borderRadius: 12,
                    border: '2px solid #e0e0e0',
                    margin: '10px 0',
                    fontWeight: 600,
                    width: '100%',
                    fontSize: 17,
                    boxShadow: selected === idx ? '0 2px 12px rgba(74,107,255,0.10)' : 'none',
                    transition: 'background 0.18s, color 0.18s',
                  }}
                  disabled={submitted}
                  onClick={() => handleAnswer(idx)}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.03 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  {opt}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default QuizPreviewPage; 