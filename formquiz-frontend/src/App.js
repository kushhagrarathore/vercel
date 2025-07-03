import { BrowserRouter, Routes, Route } from 'react-router-dom';
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
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
=======
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
import { ToastProvider } from './context/ToastContext';
import { LiveQuizProvider } from './context/LiveQuizContext';

import Login from './pages/Login';
import FormView from './pages/FormView';
import ResultsPage from './pages/ResultsPage';
import UserEnd from './pages/UserEnd';
import Quiz from './pages/Quiz';
import CreateQuizPage from './pages/CreateQuizPage';
import PresentQuizPage from './pages/PresentQuizPage';
import PreviewQuizPage from './pages/PreviewQuizPage';
import ResponsePage from './pages/ResponsePage';
import ViewResponses from './pages/ViewResponses';
<<<<<<< Updated upstream
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
import Profile from './pages/Profile';
import JoinQuiz from './pages/join/JoinQuiz';
import Leaderboard from './pages/live/Leaderboard';
import QuizFillPage from './pages/QuizFillPage';
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
=======
import LiveQuiz from './pages/live/LiveQuiz';
>>>>>>> Stashed changes
=======
import LiveQuiz from './pages/live/LiveQuiz';
>>>>>>> Stashed changes
=======
import LiveQuiz from './pages/live/LiveQuiz';
>>>>>>> Stashed changes

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <LiveQuizProvider>
          <Routes>
            {/* Auth */}
            <Route path="/" element={<Login />} />

            {/* Form Views */}
            <Route path="/preview/:formId" element={<FormView />} /> {/* Internal preview */}
            <Route path="/form/:formId" element={<FormView />} /> {/* Public preview */}
            <Route path="/public/:formId" element={<FormView />} /> {/* Pre-published public preview */}

            {/* Quiz Mode */}
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/preview" element={<UserEnd />} /> {/* Preview for quiz/test form */}
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream


=======
>>>>>>> Stashed changes

=======

>>>>>>> Stashed changes
=======

>>>>>>> Stashed changes
            {/* Quiz by ID */}
            <Route path="/quiz/:quizId" element={<Quiz />} />
            <Route path="/quiz/create" element={<CreateQuizPage />} />
            <Route path="/quiz/create/:quizId" element={<CreateQuizPage />} />
            <Route path="/quiz/present/:quizId" element={<PresentQuizPage />} />
            <Route path="/quiz/preview/:quizId" element={<PreviewQuizPage />} />
            <Route path="/quiz/results/:quizId" element={<ResultsPage />} />
            <Route path="/quiz/fill/:quizId" element={<QuizFillPage />} />

            {/* User-end quiz preview */}
            <Route path="/userend" element={<UserEnd />} />
<<<<<<< Updated upstream
<<<<<<< Updated upstream

          {/* Results */}
          <Route path="/results/:formId" element={<ResultsPage />} />

<<<<<<< Updated upstream
          
 

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
=======
            {/* Response Page */}
            <Route path="/respond/:formId" element={<ResponsePage />} />
=======
>>>>>>> Stashed changes

=======

            {/* Results */}
            <Route path="/results/:formId" element={<ResultsPage />} />

            {/* Response Page */}
            <Route path="/respond/:formId" element={<ResponsePage />} />

<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
            {/* View responses */}
            <Route path="/view-responses" element={<ViewResponses />} />
>>>>>>> Stashed changes

            {/* Profile */}
            <Route path="/profile" element={<Profile />} />

<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
            {/* New live quiz routes */}
            <Route path="/join/:quizId" element={<JoinQuiz />} />
            <Route path="/live/leaderboard/:quizId" element={<Leaderboard />} />
=======
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
            {/* Live Quiz */}
            <Route path="/live-quiz" element={<LiveQuiz />} />
            <Route path="/join/:quizId" element={<JoinQuiz />} />
            <Route path="/live/leaderboard/:quizId" element={<Leaderboard />} />

            {/* Future Features - Uncomment when ready */}
            {/* <Route path="/create" element={<CreateForm />} /> */}
            {/* <Route path="/edit/:id" element={<EditForm />} /> */}
            {/* <Route path="/view/:id" element={<ViewForm />} /> */}
<<<<<<< Updated upstream
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
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
