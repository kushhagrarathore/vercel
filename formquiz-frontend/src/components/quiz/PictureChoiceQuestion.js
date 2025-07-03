// src/components/PictureChoiceQuestion.js
import React, { useState } from 'react';
import '../PictureChoiceQuestion.css';

const PictureChoiceQuestion = ({ question, questionIndex, onRemove, onQuestionTextChange, customization }) => { // Added customization prop
  const [imageOptions, setImageOptions] = useState([
    { id: 1, url: 'https://via.placeholder.com/100x100?text=Image+1' },
    { id: 2, url: 'https://via.placeholder.com/100x100?text=Image+2' },
  ]);
  const [nextId, setNextId] = useState(3);
  // Destructure customization for easier access
  const { textColor, borderRadius, buttonColor, fontFamily } = customization;


  const addImageOption = () => {
    setImageOptions([...imageOptions, { id: nextId, url: `https://via.placeholder.com/100x100?text=Image+${nextId}` }]);
    setNextId(nextId + 1);
  };

  const removeImageOption = (idToRemove) => {
    setImageOptions(imageOptions.filter(option => option.id !== idToRemove));
  };

  return (
    <div
      className="question-block picture-choice-question-block"
      style={{
        borderColor: buttonColor, // Apply buttonColor to the left border
        borderRadius: borderRadius, // Apply borderRadius to the block
        fontFamily: fontFamily // Apply font family
      }}
    >
      <div className="question-header">
        <span className="question-number" style={{ color: textColor }}>Question {questionIndex}</span> {/* Apply textColor */}
        <button className="remove-question-button" onClick={onRemove}>✕</button>
      </div>
      <input
        type="text"
        placeholder="Type your question here..."
        className="question-input"
        value={question.name}
        onChange={(e) => onQuestionTextChange(question.id, e.target.value)}
        style={{
          color: textColor, // Apply textColor
          borderColor: buttonColor + '80', // Apply buttonColor to input border
          borderRadius: borderRadius, // Apply borderRadius
          fontFamily: fontFamily // Apply font family
        }}
      />

      <div className="image-options-grid">
        {imageOptions.map((option) => (
          <div
            key={option.id}
            className="image-option-card"
            style={{
              borderColor: buttonColor + '30', // Apply buttonColor to card border
              borderRadius: borderRadius, // Apply borderRadius
              color: textColor, // Apply textColor
              fontFamily: fontFamily // Apply font family
            }}
          >
            <img src={option.url} alt={`Option ${option.id}`} className="image-option-thumbnail" />
            <div className="image-option-controls">
              <input
                type="text"
                placeholder="Label"
                className="image-label-input"
                style={{
                  color: textColor, // Apply textColor
                  borderColor: buttonColor + '80', // Apply buttonColor to input border
                  borderRadius: borderRadius, // Apply borderRadius
                  fontFamily: fontFamily // Apply font family
                }}
              />
              <button
                className="remove-image-button"
                onClick={() => removeImageOption(option.id)}
                style={{ backgroundColor: buttonColor }} // Apply buttonColor to remove button
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        <div
          className="add-image-option-card"
          onClick={addImageOption}
          style={{
            borderColor: buttonColor, // Apply buttonColor to dashed border
            color: buttonColor, // Apply buttonColor to text
            borderRadius: borderRadius, // Apply borderRadius
            fontFamily: fontFamily // Apply font family
          }}
        >
          <span>+ Add Image</span>
        </div>
      </div>

      <div className="question-footer">
        <span className="required-label" style={{ color: textColor }}>Required</span> {/* Apply textColor */}
        <label className="switch">
          <input type="checkbox" />
          <span className="slider round" style={{ backgroundColor: buttonColor }}></span> {/* Apply buttonColor to slider */}
        </label>
      </div>
    </div>
  );
};

export default PictureChoiceQuestion;