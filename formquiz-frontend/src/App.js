import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { LiveQuizProvider } from './components/livequiz/LiveQuizContext';
import { QuizProvider } from './pages/livequiz/QuizContext';

import Login from './pages/Login';
import Signup from './pages/forms/Signup';
import Dashboard from './pages/Dashboard';
import FormBuilder from './pages/forms/FormBuilder';
import FormView from './pages/forms/FormView';
import ViewResponses from './pages/forms/ViewResponses';
import ResultsPage from './pages/livequiz/ResultsPage';
import ResponsePage from './pages/ResponsePage';
import UserEnd from './pages/forms/userend';

import Quiz from './pages/livequiz/quiz';
import CreateQuizPage from './pages/livequiz/QuestionsPage';
import PresentQuizPage from './pages/livequiz/PresentQuizPage';
import PreviewQuizPage from './pages/livequiz/PreviewQuizPage';
import QuizFillPage from './pages/livequiz/QuizFillPage';
import QuizPage from './pages/livequiz/QuizPage';
import Profile from './pages/Profile';
import JoinQuiz from './pages/livequiz/JoinQuiz';
import Leaderboard from './pages/livequiz/Leaderboard';
import LiveQuiz from './pages/livequiz/LiveQuiz';
import AdminPage from './pages/livequiz/AdminPage';
import QuizResultsPage from './pages/livequiz/ResultsPage';
import { supabase } from './supabase/client';
import QuestionsPage from './pages/livequiz/QuestionsPage';
import Plan from './pages/Plan';
import UpdatePassword from './pages/UpdatePassword';
import AdminSummaryPage from './pages/livequiz/AdminSummaryPage';
import QuizSessionsPage from './pages/livequiz/QuizSessionsPage';

// RequireAuth component for protected routes
function RequireAuth({ children }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
      } else {
        setAuthenticated(true);
      }
      setLoading(false);
    };
    checkSession();
    // eslint-disable-next-line
  }, []);

  if (loading) return null;
  return authenticated ? children : null;
}

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <LiveQuizProvider>
          <Routes>

            {/* Auth */}
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            {/* Public user quiz route */}
            <Route path="/userend" element={<UserEnd />} />
            {/* Protected routes */}
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/builder" element={<RequireAuth><FormBuilder /></RequireAuth>} />
            <Route path="/builder/:formId" element={<RequireAuth><FormBuilder /></RequireAuth>} />
            <Route path="/preview/:formId" element={<RequireAuth><FormView /></RequireAuth>} />
            <Route path="/form/:formId" element={<FormView />} />
            <Route path="/public/:formId" element={<RequireAuth><FormView /></RequireAuth>} />
            <Route path="/respond/:formId" element={<RequireAuth><ResponsePage /></RequireAuth>} />
            <Route path="/results/:formId" element={<RequireAuth><ResultsPage /></RequireAuth>} />
            <Route path="/forms/:formId/results" element={<RequireAuth><ViewResponses /></RequireAuth>} />
            <Route path="/view-responses" element={<RequireAuth><ViewResponses /></RequireAuth>} />
            {/* Quizzes */}
            <Route path="/quiz" element={<RequireAuth><Quiz /></RequireAuth>} />
            <Route path="/quiz/:quizId" element={<QuizProvider><QuizPage /></QuizProvider>} />
            <Route path="/quiz/create" element={<RequireAuth><QuizProvider><CreateQuizPage /></QuizProvider></RequireAuth>} />
            <Route path="/quiz/create/:quizId" element={<RequireAuth><QuizProvider><CreateQuizPage /></QuizProvider></RequireAuth>} />
            <Route path="/quiz/present/:quizId" element={<RequireAuth><PresentQuizPage /></RequireAuth>} />
            <Route path="/quiz/preview/:quizId" element={<RequireAuth><PreviewQuizPage /></RequireAuth>} />
            {/* The corrected route for quiz results */}
            <Route path="/quiz/:quizId/results" element={<RequireAuth><QuizResultsPage /></RequireAuth>} /> 
            <Route path="/quiz/fill/:quizId" element={<RequireAuth><QuizFillPage /></RequireAuth>} />
            <Route path="/quiz/edit/:quizId" element={<RequireAuth><Quiz /></RequireAuth>} />
            {/* This route was duplicated, keeping the more specific one above */}
            {/* <Route path="/quiz/:quizId/results" element={<RequireAuth><QuizResultsPage /></RequireAuth>} /> */}
            {/* Live Quiz Routes */}
            <Route path="/join/:quizId" element={<RequireAuth><JoinQuiz /></RequireAuth>} />
            <Route path="/live/leaderboard/:quizId" element={<RequireAuth><Leaderboard /></RequireAuth>} />
            <Route path="/live-quiz" element={<RequireAuth><LiveQuiz /></RequireAuth>} />
            <Route path="/livequiz/questions/:quizId" element={<RequireAuth><QuestionsPage /></RequireAuth>} />
            {/* Profile */}
            <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="/plans" element={<RequireAuth><Plan /></RequireAuth>} />
            {/* Live Quiz Admin */}
            <Route path="/admin/:quizId" element={<RequireAuth><QuizProvider><AdminPage /></QuizProvider></RequireAuth>} />
            <Route path="/admin/:quizId/summary" element={<RequireAuth><AdminSummaryPage /></RequireAuth>} />
            <Route path="/admin/:quizId/sessions" element={<RequireAuth><QuizSessionsPage /></RequireAuth>} />
            <Route path="/admin/:quizId/summary/:sessionId" element={<RequireAuth><AdminSummaryPage /></RequireAuth>} />

          </Routes>
        </LiveQuizProvider>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
