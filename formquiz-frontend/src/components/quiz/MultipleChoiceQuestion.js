// src/components/MultipleChoiceQuestion.js
import React from 'react';
import '../MultipleChoiceQuestion.css';

const MultipleChoiceQuestion = ({
  question,
  questionIndex,
  onRemove,
  onQuestionTextChange,
  onUpdateQuestion,
  onAddOption,
  customization
}) => {
  const { textColor, borderRadius, buttonColor, fontFamily } = customization;

  const handleOptionChange = (index, value) => {
    const newOptions = [...question.options];
    newOptions[index] = value;
    onUpdateQuestion(question.id, 'options', newOptions);
  };

  const removeOption = (indexToRemove) => {
    const newOptions = question.options.filter((_, index) => index !== indexToRemove);
    onUpdateQuestion(question.id, 'options', newOptions);
  };

  const addOption = () => {
    onAddOption(question.id);
  };

  return (
    <div
      className="question-block multiple-choice-question-block"
      style={{
        borderColor: buttonColor,
        borderRadius: borderRadius,
        fontFamily: fontFamily
      }}
    >
      <div className="question-header">
        <span className="question-number" style={{ color: textColor }}>Question {questionIndex}</span>
        <button className="remove-question-button" onClick={onRemove}>✕</button>
      </div>

      {/* ✅ Fixed: using question.label */}
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

      <div className="options-container">
        {question.options.map((option, index) => (
          <div
            key={index}
            className="option-item"
            style={{
              backgroundColor: buttonColor + '10',
              borderColor: buttonColor + '30',
              borderRadius: borderRadius,
              color: textColor,
              fontFamily: fontFamily
            }}
          >
            <input
              type="radio"
              disabled
              className={`option-radio${Array.isArray(question.correct_answers) && question.correct_answers[0] === index ? ' checked' : ''}`}
              style={{ accentColor: buttonColor }}
              checked={Array.isArray(question.correct_answers) && question.correct_answers[0] === index}
              readOnly
            />
            <input
              type="text"
              placeholder={`Option ${index + 1}`}
              value={option}
              onChange={(e) => handleOptionChange(index, e.target.value)}
              className="option-input-field"
              style={{
                color: textColor,
                borderColor: buttonColor + '80',
                borderRadius: borderRadius,
                fontFamily: fontFamily
              }}
            />
            {question.options.length > 1 && (
              <button className="remove-option-button" onClick={() => removeOption(index)}>✕</button>
            )}
          </div>
        ))}
        <button
          className="add-option-button"
          onClick={addOption}
          style={{
            backgroundColor: buttonColor + '20',
            color: buttonColor,
            borderColor: buttonColor + '50',
            borderRadius: borderRadius,
            fontFamily: fontFamily
          }}
        >
          + Add option
        </button>
        {/* You can implement "Other" option functionality later */}
      </div>

      {/* ✅ Required toggle */}
      <div className="question-footer">
        <span className="required-label" style={{ color: textColor }}>Required</span>
        <label className="switch">
          <input
            type="checkbox"
            checked={question.required}
            onChange={(e) => onUpdateQuestion(question.id, 'required', e.target.checked)}
          />
          <span className="slider round" style={{ backgroundColor: buttonColor }}></span>
        </label>
      </div>
    </div>
  );
};

export default MultipleChoiceQuestion;
