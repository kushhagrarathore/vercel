// components/LiveQuestionDisplay.jsx
import React from 'react';

const LiveQuestionDisplay = ({ slide }) => {
  if (!slide) return <p>Waiting for the host to start the quiz...</p>;

  return (
    <div style={{ padding: '20px', border: '1px solid #eee', borderRadius: '10px' }}>
      <h3>{slide.question}</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {slide.options.map((opt, i) => (
          <li key={i} style={{
            padding: '10px 14px',
            margin: '10px 0',
            border: '1px solid #ccc',
            borderRadius: '8px',
            background: '#f9f9f9'
          }}>
            {opt}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LiveQuestionDisplay;
