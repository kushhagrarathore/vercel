import React, { createContext, useContext, useState } from 'react';

const LiveQuizContext = createContext();

export function LiveQuizProvider({ children }) {
  const [quizState, setQuizState] = useState({
    isLive: false,
    currentQuestionIndex: 0,
    participants: [],
    leaderboard: [],
    quizId: null,
    // Add more as needed
  });

  return (
    <LiveQuizContext.Provider value={{ quizState, setQuizState }}>
      {children}
    </LiveQuizContext.Provider>
  );
}

export function useLiveQuiz() {
  return useContext(LiveQuizContext);
}
