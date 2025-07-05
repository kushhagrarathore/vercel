import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QuizProvider } from './context/QuizContext';

// Lazy load components for better performance
const AdminPage = React.lazy(() => import('./components/Admin/AdminPage'));
const QuizPage = React.lazy(() => import('./components/Quiz/QuizPage'));
const QuestionsPage = React.lazy(() => import('./components/Questions/QuestionsPage'));

function App() {
  return (
    <QuizProvider>
      <Router>
        <React.Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/quiz" element={<QuizPage />} />
            <Route path="/questions" element={<QuestionsPage />} />
            <Route path="/" element={<QuizPage />} />
          </Routes>
        </React.Suspense>
      </Router>
    </QuizProvider>
  );
}

export default App;
