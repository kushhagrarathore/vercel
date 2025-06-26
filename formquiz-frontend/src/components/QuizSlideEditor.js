import React from 'react';
import { FaRegCircle, FaRegSquare, FaPlus, FaCopy, FaTrash, FaCheckCircle } from 'react-icons/fa';

const MAX_OPTIONS = 4;

const QuizSlideEditor = ({ slide, onChange, slideIndex, totalSlides, onDuplicateOption, onRemoveOption, onAddOption }) => {
  const handleOptionChange = (idx, value) => {
    const newOpts = [...slide.options];
    newOpts[idx] = value;
    onChange({ ...slide, options: newOpts });
  };
  const setCorrect = idx => {
    onChange({ ...slide, correctAnswer: idx });
  };
  return (
    <div style={{ width: '100%', maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8, color: '#2563eb', letterSpacing: '-0.5px' }}>Slide {slideIndex + 1} of {totalSlides}</div>
      <textarea
        value={slide.question || ''}
        onChange={e => onChange({ ...slide, question: e.target.value })}
        placeholder="Type your question..."
        style={{ fontSize: 21, fontWeight: 500, width: '100%', minHeight: 56, border: '1.5px solid #e5eaf0', borderRadius: 12, padding: 16, marginBottom: 18, background: '#f8fafd', color: '#23272f', boxShadow: '0 1.5px 8px rgba(37,99,235,0.04)' }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {slide.options && slide.options.map((opt, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: '#f7faff',
              borderRadius: 999,
              padding: '10px 18px',
              boxShadow: '0 1.5px 8px rgba(37,99,235,0.04)',
              border: '1.2px solid #e5eaf0',
              transition: 'box-shadow 0.16s, border 0.16s, background 0.16s',
              minHeight: 44,
              position: 'relative',
              fontWeight: 400,
              fontSize: 17,
              color: '#23272f',
              cursor: 'pointer',
            }}
            onMouseOver={e => e.currentTarget.style.background = '#eaf3ff'}
            onMouseOut={e => e.currentTarget.style.background = '#f7faff'}
          >
            <button
              onClick={() => setCorrect(idx)}
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                cursor: 'pointer',
                color: slide.correctAnswer === idx ? '#2563eb' : '#b6c3d1',
                fontSize: 22,
                marginRight: 6,
                display: 'flex',
                alignItems: 'center',
                transition: 'color 0.18s',
              }}
              title="Mark as correct answer"
              type="button"
            >
              {slide.correctAnswer === idx ? <FaCheckCircle /> : <FaRegCircle />}
            </button>
            <input
              value={opt}
              onChange={e => handleOptionChange(idx, e.target.value)}
              placeholder={`Option ${idx + 1}`}
              style={{
                fontSize: 17,
                border: 'none',
                borderRadius: 999,
                padding: '10px 18px',
                background: 'transparent',
                color: '#23272f',
                flex: 1,
                outline: 'none',
                fontWeight: 400,
                minWidth: 0,
              }}
              autoFocus={false}
            />
            <button
              onClick={() => onDuplicateOption(idx)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#b6c3d1',
                fontSize: 17,
                padding: 4,
                marginLeft: 2,
                transition: 'color 0.18s',
              }}
              title="Duplicate option"
              type="button"
            >
              <FaCopy />
            </button>
            <button
              onClick={() => onRemoveOption(idx)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#ef4444',
                fontSize: 17,
                padding: 4,
                marginLeft: 2,
                transition: 'color 0.18s',
              }}
              title="Delete option"
              type="button"
            >
              <FaTrash />
            </button>
          </div>
        ))}
        <button
          onClick={onAddOption}
          disabled={slide.options.length >= MAX_OPTIONS}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#eaf3ff',
            color: '#2563eb',
            border: 'none',
            borderRadius: 999,
            padding: '10px 22px',
            marginTop: 8,
            cursor: slide.options.length >= MAX_OPTIONS ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: 16,
            boxShadow: '0 1.5px 8px rgba(37,99,235,0.07)',
            opacity: slide.options.length >= MAX_OPTIONS ? 0.5 : 1,
            transition: 'background 0.18s, color 0.18s, opacity 0.18s',
            outline: 'none',
          }}
        >
          <FaPlus /> Add Option
        </button>
      </div>
    </div>
  );
};

export default QuizSlideEditor; 