import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

            {/* Dashboard + Forms */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/builder" element={<FormBuilder />} />
            <Route path="/builder/:formId" element={<FormBuilder />} />
            <Route path="/preview/:formId" element={<FormView />} />
            <Route path="/form/:formId" element={<FormView />} />
            <Route path="/public/:formId" element={<FormView />} />
            <Route path="/respond/:formId" element={<ResponsePage />} />
            <Route path="/results/:formId" element={<ResultsPage />} />
            <Route path="/form/:formId/results" element={<ViewResponses />} />
            <Route path="/view-responses" element={<ViewResponses />} />
            <Route path="/userend" element={<UserEnd />} />

            {/* Quizzes */}
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/quiz/:quizId" element={<QuizProvider><QuizPage /></QuizProvider>} />
            <Route path="/quiz/create" element={<QuizProvider><CreateQuizPage /></QuizProvider>} />
            <Route path="/quiz/create/:quizId" element={<QuizProvider><CreateQuizPage /></QuizProvider>} />
            <Route path="/quiz/present/:quizId" element={<PresentQuizPage />} />
            <Route path="/quiz/preview/:quizId" element={<PreviewQuizPage />} />
            <Route path="/quiz/results/:quizId" element={<ResultsPage />} />
            <Route path="/quiz/fill/:quizId" element={<QuizFillPage />} />
            <Route path="/quiz/edit/:quizId" element={<Quiz />} />

            {/* Live Quiz Routes */}
            <Route path="/join/:quizId" element={<JoinQuiz />} />
            <Route path="/live/leaderboard/:quizId" element={<Leaderboard />} />
            <Route path="/live-quiz" element={<LiveQuiz />} />

            {/* Profile */}
            <Route path="/profile" element={<Profile />} />

            {/* Live Quiz Admin */}
            <Route path="/livequiz/admin/:quizId" element={<QuizProvider><AdminPage /></QuizProvider>} />

          </Routes>
        </LiveQuizProvider>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
