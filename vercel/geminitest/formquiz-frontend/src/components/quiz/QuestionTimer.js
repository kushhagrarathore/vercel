import React, { useEffect, useState } from 'react';

const QuestionTimer = ({ seconds, onExpire, isLocked }) => {
  const [timeLeft, setTimeLeft] = useState(seconds);

  useEffect(() => {
    if (isLocked) return;
    if (timeLeft === 0) {
      onExpire && onExpire();
      return;
    }
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, isLocked, onExpire]);

  useEffect(() => {
    setTimeLeft(seconds);
  }, [seconds]);

  return (
    <div style={{ fontWeight: 700, fontSize: 20, color: timeLeft <= 5 ? '#e11d48' : '#222' }}>
      Time Left: {timeLeft}s
    </div>
  );
};

export default QuestionTimer;
