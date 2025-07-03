import './App.css';
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { LiveQuizProvider } from './context/LiveQuizContext';

import Login from './pages/Login';
import Signup from './pages/Signup';
import FormBuilder from './pages/FormBuilder';
import Dashboard from './pages/Dashboard';
import FormView from './pages/FormView';
import ResultsPage from './pages/ResultsPage';
import Quiz from './pages/quiz';
import UserEnd from './pages/userend';
import CreateQuizPage from './pages/CreateQuizPage';
import PresentQuizPage from './pages/PresentQuizPage';
import PreviewQuizPage from './pages/PreviewQuizPage';
import ViewResponses from './pages/ViewResponses';
import Profile from './pages/Profile';
import LiveQuiz from './pages/live/LiveQuiz';
import ResponsePage from './pages/ResponsePage';

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
            {/* Quiz by ID (edit/view existing quiz) */}
            <Route path="/quiz/:quizId" element={<Quiz />} />
            {/* Quiz creation (legacy or alternate flow) */}
            <Route path="/quiz/create" element={<CreateQuizPage />} />
            {/* Present quiz (host view) */}
            <Route path="/quiz/present/:quizId" element={<PresentQuizPage />} />
            {/* Preview quiz (admin preview) */}
            <Route path="/quiz/preview/:quizId" element={<PreviewQuizPage />} />
            {/* Quiz results (admin view) */}
            <Route path="/quiz/results/:quizId" element={<ResultsPage />} />

            {/* Response Page */}
            <Route path="/respond/:formId" element={<ResponsePage />} />

            {/* Results */}
            <Route path="/results/:formId" element={<ResultsPage />} />

            {/* Live Quiz */}
            <Route path="/live-quiz" element={<LiveQuiz />} />

            {/* User-end preview (public quiz taking) */}
            <Route path="/userend" element={<UserEnd />} />

            {/* View responses (optional future feature) */}
            <Route path="/view-responses" element={<ViewResponses />} />

            {/* Profile */}
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </BrowserRouter>
      </LiveQuizProvider>
    </ToastProvider>
  );
}

export default App;
