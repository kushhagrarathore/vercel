import React, { createContext, useContext, useState } from 'react';

const QuizContext = createContext();

export function QuizProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [quizPhase, setQuizPhase] = useState('waiting'); // waiting, question, results, ended

  const value = {
    user,
    setUser,
    session,
    setSession,
    currentQuestion,
    setCurrentQuestion,
    participants,
    setParticipants,
    quizPhase,
    setQuizPhase,
  };

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}

export function useQuiz() {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error('useQuiz must be used within a QuizProvider');
  }
  return context;
} 