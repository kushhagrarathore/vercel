import './App.css';
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/Toast';

import Login from './pages/Login';
import Signup from './pages/Signup';
import FormBuilder from './pages/FormBuilder';
import Dashboard from './pages/Dashboard';
import FormView from './pages/FormView';
import ResultsPage from './pages/ResultsPage';
import Quiz from './pages/quiz';
import UserEnd from './pages/userend';
import ResponsePage from './pages/ResponsePage';
import CreateQuizPage from './pages/CreateQuizPage';
import PresentQuizPage from './pages/PresentQuizPage';
import PreviewQuizPage from './pages/PreviewQuizPage';
import ViewResponses from './pages/ViewResponses';
import Profile from './pages/Profile';

function App() {
  return (
    <ToastProvider>
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

          <Route path="/quiz/create" element={<CreateQuizPage />} />
          <Route path="/quiz/present/:quizId" element={<PresentQuizPage />} />
          <Route path="/quiz/preview/:quizId" element={<PreviewQuizPage />} />
          <Route path="/quiz/results/:quizId" element={<ResultsPage />} />

          {/* Profile/Settings */}
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
