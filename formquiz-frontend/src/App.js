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
import JoinQuiz from './pages/livequiz/JoinQuiz';
import Leaderboard from './pages/livequiz/Leaderboard';
import QuizFillPage from './pages/livequiz/QuizFillPage';
import Lobby from './pages/livequiz/Lobby';
import LiveQuizParticipant from './pages/livequiz/LiveQuizParticipant';
import AdminPage from './pages/livequiz/AdminPage';
import QuizPage from './pages/livequiz/QuizPage';

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

            {/* Dashboard */}
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Form Builder */}
            <Route path="/builder" element={<FormBuilder />} /> {/* New form */}
            <Route path="/builder/:formId" element={<FormBuilder />} /> {/* Edit form */}

            {/* Form Views */}
            <Route path="/preview/:formId" element={<FormView />} /> {/* Internal preview */}
            <Route path="/form/:formId" element={<FormView />} /> {/* Public preview (published) */}
            <Route path="/public/:formId" element={<FormView />} /> {/* Public preview (pre-published) */}

            {/* Quiz Mode */}
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/preview" element={<UserEnd />} /> {/* Preview for quiz/test form */}

            {/* Results */}
            <Route path="/results/:formId" element={<ViewResponses />} />

            {/* Response Page */}
            <Route path="/respond/:formId" element={<ResponsePage />} />

            {/* Future Features - Uncomment when ready */}
            {/* <Route path="/create" element={<CreateForm />} /> */}
            {/* <Route path="/edit/:id" element={<EditForm />} /> */}
            {/* <Route path="/view/:id" element={<ViewForm />} /> */}

            {/* Only allow /livequiz/create for new live quiz creation, always wrapped in QuizProvider */}
            <Route path="/livequiz/create" element={<QuizProvider><CreateQuizPage /></QuizProvider>} />

            {/* New quiz flow wrapped in QuizProvider */}
            <Route element={<QuizProvider><QuizRoutes /></QuizProvider>} />

            {/* Profile/Settings */}
            <Route path="/profile" element={<Profile />} />

            {/* New live quiz routes */}
            <Route path="/join/:roomCode" element={<JoinQuiz />} />
            <Route path="/lobby/:roomCode/:participantId" element={<Lobby />} />
            {/* <Route path="/live/leaderboard/:quizId" element={<Leaderboard />} /> */}
            <Route path="/quiz/live/:roomCode/:participantId" element={<LiveQuizParticipant />} />

            {/* Always wrap /admin/:quizId in QuizProvider */}
            <Route path="/admin/:quizId" element={<QuizProvider><AdminPage /></QuizProvider>} />

            {/* Always wrap /quiz/:quizId in QuizProvider for QuizPage */}
            <Route path="/quiz/:quizId" element={<QuizProvider><QuizPage /></QuizProvider>} />
          </Routes>
        </LiveQuizProvider>
      </BrowserRouter>
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
