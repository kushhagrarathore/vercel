import './App.css';
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Login from './pages/Login';
import Signup from './pages/Signup';
import FormBuilder from './pages/FormBuilder';
import LiveQuiz from './pages/LiveQuiz';
import Dashboard from './pages/Dashboard';
import FormView from './pages/FormView';
import ResultsPage from './pages/ResultsPage';
import Quiz from './pages/quiz';
import UserEnd from './pages/userend';

function App() {
  return (
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

        {/* Live Quiz */}
        <Route path="/live/:id" element={<LiveQuiz />} />

        {/* Results */}
        <Route path="/results/:formId" element={<ResultsPage />} />

        {/* Quiz Mode */}
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/preview" element={<UserEnd />} /> {/* Preview for quiz/test form */}

        {/* Future Features - uncomment when ready */}
        {/* <Route path="/create" element={<CreateForm />} /> */}
        {/* <Route path="/edit/:id" element={<EditForm />} /> */}
        {/* <Route path="/view/:id" element={<ViewForm />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
