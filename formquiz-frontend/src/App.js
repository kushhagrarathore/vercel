import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast'; // Atharva branch
import { LiveQuizProvider } from './components/livequiz/LiveQuizContext'; // Atharva branch
import { QuizProvider } from './pages/livequiz/QuizContext';

import Login from './pages/Login'; // CombineBuild
import Signup from './pages/forms/Signup'; // CombineBuild
import Dashboard from './pages/Dashboard'; // CombineBuild
import FormBuilder from './pages/forms/FormBuilder';
import FormView from './pages/forms/FormView'; // CombineBuild
import ViewResponses from './pages/forms/ViewResponses'; // CombineBuild
import ResultsPage from './pages/livequiz/ResultsPage';
import ResponsePage from './pages/ResponsePage';
import UserEnd from './pages/forms/userend'; // CombineBuild (case sensitive)

import Quiz from './pages/livequiz/quiz'; // CombineBuild
import CreateQuizPage from './pages/livequiz/QuestionsPage'; // Atharva branch
import PresentQuizPage from './pages/livequiz/PresentQuizPage'; // CombineBuild
import PreviewQuizPage from './pages/livequiz/PreviewQuizPage'; // CombineBuild
import QuizFillPage from './pages/livequiz/QuizFillPage'; // CombineBuild
import QuizPage from './pages/livequiz/QuizPage';
import Profile from './pages/Profile';
import JoinQuiz from './pages/livequiz/JoinQuiz'; // Atharva branch
import Leaderboard from './pages/livequiz/Leaderboard'; // Atharva branch
import LiveQuiz from './pages/livequiz/LiveQuiz'; // Atharva branch
import AdminPage from './pages/livequiz/AdminPage';
import QuizResultsPage from './pages/livequiz/ResultsPage';
import React, { useEffect, useState } from 'react';
import { supabase } from './supabase/client';

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
            {/* Public user quiz route */}
            <Route path="/userend" element={<UserEnd />} />
            {/* Protected routes */}
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/builder" element={<RequireAuth><FormBuilder /></RequireAuth>} />
            <Route path="/builder/:formId" element={<RequireAuth><FormBuilder /></RequireAuth>} />
            <Route path="/preview/:formId" element={<RequireAuth><FormView /></RequireAuth>} />
            <Route path="/form/:formId" element={<RequireAuth><FormView /></RequireAuth>} />
            <Route path="/public/:formId" element={<RequireAuth><FormView /></RequireAuth>} />
            <Route path="/respond/:formId" element={<RequireAuth><ResponsePage /></RequireAuth>} />
            <Route path="/results/:formId" element={<RequireAuth><ResultsPage /></RequireAuth>} />
            <Route path="/forms/:formId/results" element={<RequireAuth><ViewResponses /></RequireAuth>} />
            <Route path="/view-responses" element={<RequireAuth><ViewResponses /></RequireAuth>} />
            {/* Quizzes */}
            <Route path="/quiz" element={<RequireAuth><Quiz /></RequireAuth>} />
            <Route path="/quiz/:quizId" element={<RequireAuth><QuizProvider><QuizPage /></QuizProvider></RequireAuth>} />
            <Route path="/quiz/create" element={<RequireAuth><QuizProvider><CreateQuizPage /></QuizProvider></RequireAuth>} />
            <Route path="/quiz/create/:quizId" element={<RequireAuth><QuizProvider><CreateQuizPage /></QuizProvider></RequireAuth>} />
            <Route path="/quiz/present/:quizId" element={<RequireAuth><PresentQuizPage /></RequireAuth>} />
            <Route path="/quiz/preview/:quizId" element={<RequireAuth><PreviewQuizPage /></RequireAuth>} />
            <Route path="/quiz/results/:quizId" element={<RequireAuth><ResultsPage /></RequireAuth>} />
            <Route path="/quiz/fill/:quizId" element={<RequireAuth><QuizFillPage /></RequireAuth>} />
            <Route path="/quiz/edit/:quizId" element={<RequireAuth><Quiz /></RequireAuth>} />
            <Route path="/quiz/:quizId/results" element={<RequireAuth><QuizResultsPage /></RequireAuth>} />
            {/* Live Quiz Routes */}
            <Route path="/join/:quizId" element={<RequireAuth><JoinQuiz /></RequireAuth>} />
            <Route path="/live/leaderboard/:quizId" element={<RequireAuth><Leaderboard /></RequireAuth>} />
            <Route path="/live-quiz" element={<RequireAuth><LiveQuiz /></RequireAuth>} />
            {/* Profile */}
            <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
            {/* Live Quiz Admin */}
            <Route path="/Admin" element={<RequireAuth><QuizProvider><AdminPage /></QuizProvider></RequireAuth>} />

          </Routes>
        </LiveQuizProvider>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
