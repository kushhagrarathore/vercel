import './App.css';
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { LiveQuizProvider } from './components/livequiz/LiveQuizContext';
import { QuizProvider } from './pages/livequiz/QuizContext';

import Login from './pages/Login';
import Signup from './pages/forms/Signup';
import FormBuilder from './pages/forms/FormBuilder';
import Dashboard from './pages/Dashboard';
import FormView from './pages/forms/FormView';
import ResultsPage from './pages/livequiz/ResultsPage';
import Quiz from './pages/livequiz/quiz';
import UserEnd from './pages/forms/userend';
import ResponsePage from './pages/livequiz/ResponsePage';
import CreateQuizPage from './pages/livequiz/CreateQuizPage';
import PresentQuizPage from './pages/livequiz/PresentQuizPage';
import PreviewQuizPage from './pages/livequiz/PreviewQuizPage';
import ViewResponses from './pages/forms/ViewResponses';
import Profile from './pages/Profile';
import JoinQuiz from './pages/join/JoinQuiz';
import Leaderboard from './pages/live/Leaderboard';
import QuizFillPage from './pages/QuizFillPage';

function App() {
  return (
    <ToastProvider>
      <LiveQuizProvider>
        <BrowserRouter>
          <Routes>
            {/* Auth */}
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Dashboard */}
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Form Builder */}
            <Route path="/builder" element={<FormBuilder />} /> {/* New form */}
            <Route path="/builder/:formId" element={<FormBuilder />} /> {/* Edit form */}

            {/* Form Views */}
            <Route path="/preview/:formId" element={<FormView />} /> {/* Internal preview */}
            <Route path="/form/:formId" element={<FormView />} /> {/* Public preview */}
            <Route path="/public/:formId" element={<FormView />} /> {/* Pre-published public preview */}

            {/* Quiz Builder: Blank Quiz card starts here */}
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/preview" element={<UserEnd />} /> {/* Preview for quiz/test form */}



            {/* Response Page */}
            <Route path="/respond/:formId" element={<ResponsePage />} />

          {/* Results */}
          <Route path="/results/:formId" element={<ResultsPage />} />

          
 

            {/* Future Features - Uncomment when ready */}
            {/* <Route path="/create" element={<CreateForm />} /> */}
            {/* <Route path="/edit/:id" element={<EditForm />} /> */}
            {/* <Route path="/view/:id" element={<ViewForm />} /> */}

            <Route path="/quiz/create" element={<CreateQuizPage />} />
            <Route path="/quiz/create/:quizId" element={<CreateQuizPage />} />
            <Route path="/quiz/present/:quizId" element={<PresentQuizPage />} />
            <Route path="/quiz/preview/:quizId" element={<PreviewQuizPage />} />
            <Route path="/quiz/results/:quizId" element={<ResultsPage />} />
            <Route path="/quiz/fill/:quizId" element={<QuizFillPage />} />

            {/* Profile */}
            <Route path="/profile" element={<Profile />} />

            {/* New live quiz routes */}
            <Route path="/join/:quizId" element={<JoinQuiz />} />
            <Route path="/live/leaderboard/:quizId" element={<Leaderboard />} />
          </Routes>
        </BrowserRouter>
      </LiveQuizProvider>
    </ToastProvider>
  );
}

// Helper component for quiz routes
function QuizRoutes() {
  return (
    <Routes>
      <Route path="/quiz/create/:quizId" element={<CreateQuizPage />} />
      <Route path="/admin/:quizId" element={<AdminPage />} />
      <Route path="/quiz/:quizId" element={<QuizPage />} />
    </Routes>
  );
}

export default App;
