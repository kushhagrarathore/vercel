// src/components/ShortTextQuestion.js
import React from 'react';
import '../ShortTextQuestion.css';

const ShortTextQuestion = ({
  question,
  questionIndex,
  onRemove,
  onQuestionTextChange,
  onUpdateQuestion,
  customization
}) => {
  const { textColor, borderRadius, buttonColor, fontFamily } = customization;

  return (
    <div
      className="question-block short-text-question-block"
      style={{
        borderColor: buttonColor,
        borderRadius: borderRadius,
        fontFamily: fontFamily
      }}
    >
      <div className="question-header">
        <span className="question-number" style={{ color: textColor }}>
          Question {questionIndex}
        </span>
        <button className="remove-question-button" onClick={onRemove}>✕</button>
      </div>

      {/* ✅ Fixed: Now using question.label instead of question.name */}
      <input
        type="text"
        placeholder="Type your question here..."
        className="question-input"
        value={question.label}
        onChange={(e) => onQuestionTextChange(question.id, e.target.value)}
        style={{
          color: textColor,
          borderColor: buttonColor + '80',
          borderRadius: borderRadius,
          fontFamily: fontFamily
        }}
      />

      <input
        type="text"
        placeholder="Short text answer will appear here..."
        className="short-text-input"
        readOnly
        style={{
          color: textColor,
          borderColor: buttonColor + '80',
          fontFamily: fontFamily
        }}
      />

      {/* ✅ Required toggle implemented */}
      <div className="question-footer">
        <span className="required-label" style={{ color: textColor }}>Required</span>
        <label className="switch">
          <input
            type="checkbox"
            checked={question.required}
            onChange={(e) =>
              onUpdateQuestion(question.id, 'required', e.target.checked)
            }
          />
          <span className="slider round" style={{ backgroundColor: buttonColor }}></span>
        </label>
      </div>
    </div>
  );
};

export default ShortTextQuestion;
