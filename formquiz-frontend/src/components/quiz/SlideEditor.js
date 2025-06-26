import React from 'react';
import OptionInput from './OptionInput';
import { FaCheckCircle, FaRegCircle } from 'react-icons/fa';
import './SlideEditor.css';

const MAX_OPTIONS = 4;

const SlideEditor = ({ slide, onChange }) => {
  const handleOptionChange = (idx, value) => {
    const newOptions = [...slide.options];
    newOptions[idx] = value;
    onChange({ ...slide, options: newOptions });
  };
  const addOption = () => {
    if (slide.options.length >= MAX_OPTIONS) return;
    onChange({ ...slide, options: [...slide.options, ''] });
  };
  const removeOption = (idx) => {
    if (slide.options.length <= 2) return;
    const newOptions = slide.options.filter((_, i) => i !== idx);
    onChange({ ...slide, options: newOptions });
  };
  const setCorrect = (idx) => {
    onChange({ ...slide, correctAnswer: idx });
  };
  return (
    <section className="slide-editor">
      <label className="slide-label">Question</label>
      <input
        className="slide-question-input"
        type="text"
        value={slide.question}
        onChange={e => onChange({ ...slide, question: e.target.value })}
        placeholder="Enter your question..."
      />
      <label className="slide-label">Options (max 4)</label>
      <div className="options-list">
        {slide.options.map((opt, idx) => (
          <div key={idx} className="option-row">
            <OptionInput
              value={opt}
              onChange={val => handleOptionChange(idx, val)}
              onRemove={() => removeOption(idx)}
              canRemove={slide.options.length > 2}
            />
            <button
              className={`correct-btn${slide.correctAnswer === idx ? ' selected' : ''}`}
              type="button"
              onClick={() => setCorrect(idx)}
              title="Mark as correct answer"
            >
              {slide.correctAnswer === idx ? <FaCheckCircle /> : <FaRegCircle />}
            </button>
          </div>
        ))}
        <button
          className="add-option-btn"
          onClick={addOption}
          disabled={slide.options.length >= MAX_OPTIONS}
        >
          + Add Option
        </button>
      </div>
      <label className="slide-label">Timer (seconds)</label>
      <input
        className="slide-timer-input"
        type="number"
        min={5}
        max={120}
        value={slide.timer}
        onChange={e => onChange({ ...slide, timer: Number(e.target.value) })}
      />
    </section>
  );
};

export default SlideEditor; 