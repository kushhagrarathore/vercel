import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/Toast'; // Atharva branch
import { QuizProvider } from './pages/livequiz/QuizContext';

import Login from './pages/Login'; // CombineBuild
import Signup from './pages/forms/Signup'; // CombineBuild
import Dashboard from './pages/Dashboard'; // CombineBuild
import FormBuilder from './pages/forms/FormBuilder';
import FormView from './pages/forms/FormView'; // CombineBuild
import ViewResponses from './pages/forms/ViewResponses'; // CombineBuild
import ResponsePage from './pages/ResponsePage';
import UserEnd from './pages/forms/userend'; // CombineBuild (case sensitive)

import Quiz from './pages/livequiz/quiz'; // CombineBuild
import CreateQuizPage from './pages/livequiz/QuestionsPage'; // Atharva branch
import PreviewQuizPage from './pages/livequiz/PreviewQuizPage'; // CombineBuild
import QuizPage from './pages/livequiz/QuizPage';
import Profile from './pages/Profile';
import AdminPage from './pages/livequiz/AdminPage';

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>

            {/* Auth */}
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Dashboard + Forms */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/builder" element={<FormBuilder />} />
            <Route path="/builder/:formId" element={<FormBuilder />} />
            <Route path="/preview/:formId" element={<FormView />} />
            <Route path="/form/:formId" element={<FormView />} />
            <Route path="/public/:formId" element={<FormView />} />
            <Route path="/respond/:formId" element={<ResponsePage />} />
            <Route path="/results/:formId" element={<ViewResponses />} />
            <Route path="/form/:formId/results" element={<ViewResponses />} />
            <Route path="/view-responses" element={<ViewResponses />} />
            <Route path="/userend" element={<UserEnd />} />

            {/* Quizzes */}
            <Route path="/quiz" element={<QuizProvider><Quiz /></QuizProvider>} />
            <Route path="/quiz/:quizId" element={<QuizProvider><QuizPage /></QuizProvider>} />
            <Route path="/quiz/create" element={<QuizProvider><CreateQuizPage /></QuizProvider>} />
            <Route path="/quiz/create/:quizId" element={<QuizProvider><CreateQuizPage /></QuizProvider>} />
            <Route path="/quiz/present/:quizId" element={<PreviewQuizPage />} />
            <Route path="/quiz/preview/:quizId" element={<PreviewQuizPage />} />
            <Route path="/quiz/results/:quizId" element={<ViewResponses />} />
            <Route path="/quiz/edit/:quizId" element={<QuizProvider><Quiz /></QuizProvider>} />

            {/* Profile */}
            <Route path="/profile" element={<Profile />} />

            {/* Live Quiz Admin */}
            <Route path="/Admin" element={<QuizProvider><AdminPage /></QuizProvider>} />

          </Routes>
        </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
