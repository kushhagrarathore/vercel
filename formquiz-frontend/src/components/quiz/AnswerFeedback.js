import React from 'react';

const AnswerFeedback = ({ isCorrect, correctAnswer, feedbackText }) => {
  return (
    <div style={{
      background: isCorrect ? '#d1fae5' : '#fee2e2',
      color: isCorrect ? '#065f46' : '#b91c1c',
      borderRadius: 8,
      padding: 16,
      margin: '16px 0',
      fontWeight: 600,
      textAlign: 'center',
      fontSize: 18,
    }}>
      {isCorrect ? '✅ Correct!' : '❌ Incorrect.'}
      {typeof correctAnswer !== 'undefined' && !isCorrect && (
        <div style={{ fontSize: 15, marginTop: 8 }}>Correct Answer: <b>{correctAnswer}</b></div>
      )}
      {feedbackText && <div style={{ fontSize: 15, marginTop: 8 }}>{feedbackText}</div>}
    </div>
  );
};

export default AnswerFeedback;
