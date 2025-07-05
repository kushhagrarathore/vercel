// pages/ParticipantJoin.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ParticipantJoin = () => {
  const [quizId, setQuizId] = useState('');
  const navigate = useNavigate();

  const handleJoin = () => {
    navigate(`/join/${quizId}`);
  };

  return (
    <div>
      <h2>Join a Quiz</h2>
      <input
        type="text"
        placeholder="Enter Quiz ID"
        value={quizId}
        onChange={(e) => setQuizId(e.target.value)}
      />
      <button onClick={handleJoin}>Join</button>
    </div>
  );
};

export default ParticipantJoin;
