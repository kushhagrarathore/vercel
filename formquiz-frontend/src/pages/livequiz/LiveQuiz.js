import React, { useState, useEffect } from 'react';
import { Play, Plus, Users, Trophy, Clock, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Mock data for demonstration
const mockQuizzes = [
  {
    id: '1',
    title: 'JavaScript Fundamentals',
    description: 'Test your knowledge of JavaScript basics',
    questions: 10,
    duration: 300,
    created_at: '2024-01-15',
    status: 'draft'
  },
  {
    id: '2',
    title: 'React Concepts',
    description: 'Understanding React hooks and components',
    questions: 8,
    duration: 240,
    created_at: '2024-01-20',
    status: 'published'
  }
];

const mockSessions = [
  {
    id: 's1',
    quiz_title: 'JavaScript Fundamentals',
    participants: 24,
    status: 'active',
    started_at: '10:30 AM'
  },
  {
    id: 's2',
    quiz_title: 'React Concepts',
    participants: 12,
    status: 'completed',
    started_at: '9:00 AM'
  }
];

// Question types for the form builder
const questionTypes = [
  { id: 'multiple-choice', name: 'Multiple Choice', icon: '◉' },
  { id: 'true-false', name: 'True/False', icon: '✓✗' },
  { id: 'short-answer', name: 'Short Answer', icon: '✎' }
];

// Main App Component
const LiveQuizApp = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [quizzes, setQuizzes] = useState(mockQuizzes);
  const [sessions, setSessions] = useState(mockSessions);
  const navigate = useNavigate();

  const renderView = () => {
    switch(currentView) {
      case 'dashboard':
        return <Dashboard 
          quizzes={quizzes} 
          sessions={sessions}
          setCurrentView={setCurrentView}
          onCreateQuiz={() => setCurrentView('builder')}
          onEditQuiz={(quiz) => {
            setSelectedQuiz(quiz);
            setCurrentView('builder');
          }}
          onStartLive={(quiz) => {
            setSelectedQuiz(quiz);
            setCurrentView('live-host');
          }}
          onJoinQuiz={() => setCurrentView('join')}
        />;
      case 'builder':
        return <QuizBuilder 
          quiz={selectedQuiz}
          onSave={(quiz) => {
            if (selectedQuiz) {
              setQuizzes(prev => prev.map(q => q.id === quiz.id ? quiz : q));
            } else {
              setQuizzes(prev => [...prev, { ...quiz, id: Date.now().toString() }]);
            }
            setCurrentView('dashboard');
            setSelectedQuiz(null);
          }}
          onCancel={() => {
            setCurrentView('dashboard');
            setSelectedQuiz(null);
          }}
        />;
      case 'live-host':
        return <LiveHost 
          quiz={selectedQuiz}
          onEnd={() => setCurrentView('dashboard')}
        />;
      case 'join':
        return <JoinQuiz onBack={() => setCurrentView('dashboard')} />;
      case 'player':
        return <QuizPlayer onComplete={() => setCurrentView('dashboard')} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="ml-3 px-3 py-1 rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors duration-150 text-sm font-medium border border-purple-200 flex items-center"
                  style={{ marginLeft: 12 }}
                >
                  <span style={{ fontSize: 18, marginRight: 6 }}>←</span> BACK TO DASHBOARD
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderView()}
      </main>
    </div>
  );
};

// Dashboard Component
const Dashboard = ({ quizzes, sessions, setCurrentView, onCreateQuiz, onEditQuiz, onStartLive, onJoinQuiz }) => {
  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Quizzes</p>
              <p className="text-2xl font-bold text-gray-900">{quizzes.length}</p>
            </div>
            <button className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center hover:bg-blue-200 transition" onClick={() => onEditQuiz(null)} title="Go to Quiz Builder">
              <Edit className="h-6 w-6 text-blue-600" />
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{sessions.filter(s => s.status === 'active').length}</p>
            </div>
            <button className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center hover:bg-green-200 transition" onClick={() => onStartLive(null)} title="Go to Live Sessions">
              <Play className="h-6 w-6 text-green-600" />
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Participants</p>
              <p className="text-2xl font-bold text-gray-900">{sessions.reduce((acc, s) => acc + s.participants, 0)}</p>
            </div>
            <button className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center hover:bg-purple-200 transition" onClick={() => setCurrentView('analytics')} title="View Participants/Analytics">
              <Users className="h-6 w-6 text-purple-600" />
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Score</p>
              <p className="text-2xl font-bold text-gray-900">78%</p>
            </div>
            <button className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center hover:bg-orange-200 transition" onClick={() => setCurrentView('analytics')} title="View Score Analytics">
              <Trophy className="h-6 w-6 text-orange-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={onCreateQuiz}
            className="flex items-center justify-center space-x-3 p-4 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 group"
          >
            <Plus className="h-5 w-5 text-blue-500 group-hover:text-blue-600" />
            <span className="font-medium text-blue-600 group-hover:text-blue-700">Create New Quiz</span>
          </button>
          
          <button 
            onClick={onJoinQuiz}
            className="flex items-center justify-center space-x-3 p-4 bg-gradient-to-r from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 text-white"
          >
            <Users className="h-5 w-5" />
            <span className="font-medium">Join Live Quiz</span>
          </button>
          
          <button className="flex items-center justify-center space-x-3 p-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 text-white">
            <Trophy className="h-5 w-5" />
            <span className="font-medium">View Analytics</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Quiz Builder Component
const QuizBuilder = ({ quiz, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: quiz?.title || '',
    description: quiz?.description || '',
    duration: quiz?.duration || 300,
    questions: quiz?.questions || []
  });

  const [currentQuestion, setCurrentQuestion] = useState({
    type: 'multiple-choice',
    question: '',
    options: ['', '', '', ''],
    correct_answer: 0,
    points: 10,
    time_limit: 30
  });

  const addQuestion = () => {
    if (currentQuestion.question.trim()) {
      setFormData(prev => ({
        ...prev,
        questions: [...prev.questions, { ...currentQuestion, id: Date.now() }]
      }));
      setCurrentQuestion({
        type: 'multiple-choice',
        question: '',
        options: ['', '', '', ''],
        correct_answer: 0,
        points: 10,
        time_limit: 30
      });
    }
  };

  const removeQuestion = (index) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    const quizData = {
      ...formData,
      id: quiz?.id || Date.now().toString(),
      created_at: quiz?.created_at || new Date().toISOString().split('T')[0],
      status: 'draft'
    };
    onSave(quizData);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {quiz ? 'Edit Quiz' : 'Create New Quiz'}
            </h1>
            <p className="text-gray-600 mt-1">Build an engaging quiz with multiple question types</p>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Save Quiz
            </button>
          </div>
        </div>

        {/* Quiz Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Title</label>
            <input 
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter quiz title..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration (seconds)</label>
            <input 
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea 
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
              placeholder="Enter quiz description..."
            />
          </div>
        </div>
      </div>

      {/* Question Builder */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Question</h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
              <select 
                value={currentQuestion.type}
                onChange={(e) => setCurrentQuestion(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {questionTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.icon} {type.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Points</label>
              <input 
                type="number"
                value={currentQuestion.points}
                onChange={(e) => setCurrentQuestion(prev => ({ ...prev, points: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Limit (sec)</label>
              <input 
                type="number"
                value={currentQuestion.time_limit}
                onChange={(e) => setCurrentQuestion(prev => ({ ...prev, time_limit: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
            <textarea 
              value={currentQuestion.question}
              onChange={(e) => setCurrentQuestion(prev => ({ ...prev, question: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
              placeholder="Enter your question..."
            />
          </div>
          
          {currentQuestion.type === 'multiple-choice' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Answer Options</label>
              <div className="space-y-2">
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input 
                      type="radio"
                      name="correct_answer"
                      checked={currentQuestion.correct_answer === index}
                      onChange={() => setCurrentQuestion(prev => ({ ...prev, correct_answer: index }))}
                      className="text-blue-600"
                    />
                    <input 
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...currentQuestion.options];
                        newOptions[index] = e.target.value;
                        setCurrentQuestion(prev => ({ ...prev, options: newOptions }));
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Option ${index + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <button 
            onClick={addQuestion}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
          >
            Add Question
          </button>
        </div>
      </div>

      {/* Questions List */}
      {formData.questions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Questions ({formData.questions.length})
          </h2>
          
          <div className="space-y-4">
            {formData.questions.map((q, index) => (
              <div key={q.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-medium text-gray-500">Q{index + 1}</span>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                        {questionTypes.find(t => t.id === q.type)?.name}
                      </span>
                      <span className="text-xs text-gray-500">{q.points} pts</span>
                      <span className="text-xs text-gray-500">{q.time_limit}s</span>
                    </div>
                    <p className="text-gray-900 font-medium mb-2">{q.question}</p>
                    {q.type === 'multiple-choice' && (
                      <div className="space-y-1">
                        {q.options.map((option, optIndex) => (
                          <div key={optIndex} className={`text-sm ${optIndex === q.correct_answer ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                            {optIndex === q.correct_answer ? '✓' : '○'} {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => removeQuestion(index)}
                    className="p-2 text-red-400 hover:text-red-600 transition-colors duration-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Live Host Component
const LiveHost = ({ quiz, onEnd }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [participants, setParticipants] = useState(24);
  const [responses, setResponses] = useState({});
  const [phase, setPhase] = useState('waiting'); // waiting, question, results, ended

  useEffect(() => {
    let timer;
    if (phase === 'question' && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (phase === 'question' && timeLeft === 0) {
      setPhase('results');
    }
    return () => clearTimeout(timer);
  }, [timeLeft, phase]);

  const startQuiz = () => {
    setPhase('question');
    setTimeLeft(30);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < 4) { // Mock 5 questions
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setPhase('question');
      setTimeLeft(30);
      setResponses({});
    } else {
      setPhase('ended');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{quiz?.title}</h1>
            <p className="text-gray-600">Live Quiz Session</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-green-600">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="font-medium">LIVE</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Users className="h-5 w-5" />
              <span>{participants} participants</span>
            </div>
            <button 
              onClick={onEnd}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
            >
              End Quiz
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {phase === 'waiting' && (
        <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-100 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Play className="h-10 w-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Start?</h2>
            <p className="text-gray-600 mb-8">
              {participants} participants have joined. Click the button below to begin the quiz.
            </p>
            <button 
              onClick={startQuiz}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-semibold text-lg"
            >
              Start Quiz
            </button>
          </div>
        </div>
      )}

      {phase === 'question' && (
        <div className="space-y-6">
          {/* Question Progress */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold text-gray-900">
                Question {currentQuestionIndex + 1} of 5
              </span>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-red-500" />
                  <span className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-gray-900'}`}>
                    {timeLeft}s
                  </span>
                </div>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / 5) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Current Question */}
          <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              What is the correct way to declare a variable in JavaScript?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {['var myVar = 5;', 'let myVar = 5;', 'const myVar = 5;', 'All of the above'].map((option, index) => (
                <div key={index} className="p-4 border-2 border-gray-200 rounded-lg text-center text-lg font-medium text-gray-700">
                  <span className="block text-2xl mb-2">{String.fromCharCode(65 + index)}</span>
                  {option}
                </div>
              ))}
            </div>
          </div>

          {/* Live Responses */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Responses</h3>
            <div className="grid grid-cols-4 gap-4">
              {['A', 'B', 'C', 'D'].map((option, index) => (
                <div key={option} className="text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {Math.floor(Math.random() * participants)}
                  </div>
                  <div className="text-sm text-gray-600">Option {option}</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className={`h-2 rounded-full ${index === 3 ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.random() * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {phase === 'results' && (
        <div className="space-y-6">
          {/* Question Results */}
          <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">✓</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Correct Answer: D</h2>
            <p className="text-gray-600 mb-8">All of the above are correct ways to declare variables in JavaScript!</p>
            
            {/* Detailed Results */}
            <div className="grid grid-cols-4 gap-6 max-w-2xl mx-auto mb-8">
              {[
                { option: 'A', count: 5, correct: false },
                { option: 'B', count: 8, correct: false },
                { option: 'C', count: 3, correct: false },
                { option: 'D', count: 8, correct: true }
              ].map((result) => (
                <div key={result.option} className="text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 ${result.correct ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                    <span className="text-xl font-bold">{result.option}</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">{result.count}</div>
                  <div className="text-sm text-gray-600">responses</div>
                </div>
              ))}
            </div>
            
            <button 
              onClick={nextQuestion}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
            >
              {currentQuestionIndex < 4 ? 'Next Question' : 'Show Final Results'}
            </button>
          </div>
        </div>
      )}

      {phase === 'ended' && (
        <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-100 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="h-10 w-10 text-purple-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Quiz Completed!</h2>
            <p className="text-gray-600 mb-8">
              Great job everyone! Here are the final results from this quiz session.
            </p>
            
            {/* Final Stats */}
            <div className="grid grid-cols-3 gap-8 mb-8">
              <div>
                <div className="text-3xl font-bold text-blue-600 mb-2">{participants}</div>
                <div className="text-gray-600">Participants</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600 mb-2">78%</div>
                <div className="text-gray-600">Avg Score</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-600 mb-2">5:32</div>
                <div className="text-gray-600">Duration</div>
              </div>
            </div>
            
            <div className="flex items-center justify-center space-x-4">
              <button 
                onClick={onEnd}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                Back to Dashboard
              </button>
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200">
                View Detailed Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Join Quiz Component
const JoinQuiz = ({ onBack }) => {
  const [gameCode, setGameCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = () => {
    if (gameCode && playerName) {
      setIsJoining(true);
      // Simulate joining
      setTimeout(() => {
        // Navigate to player view
      }, 1000);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Users className="h-8 w-8 text-green-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Join Live Quiz</h2>
        <p className="text-gray-600 mb-8">Enter the game code to join an active quiz</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Game Code</label>
            <input 
              type="text"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 text-center text-2xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="ABCD12"
              maxLength="6"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
            <input 
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Enter your name"
            />
          </div>
          
          <button 
            onClick={handleJoin}
            disabled={!gameCode || !playerName || isJoining}
            className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
          >
            {isJoining ? 'Joining...' : 'Join Quiz'}
          </button>
          
          <button 
            onClick={onBack}
            className="w-full py-3 text-gray-600 hover:text-gray-800 transition-colors duration-200"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

// Quiz Player Component
const QuizPlayer = ({ onComplete }) => {
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [timeLeft, setTimeLeft] = useState(30);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState('question'); // question, waiting, results

  useEffect(() => {
    let timer;
    if (phase === 'question' && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [timeLeft, phase]);

  const submitAnswer = (answerIndex) => {
    setSelectedAnswer(answerIndex);
    setPhase('waiting');
    // Simulate waiting for other players
    setTimeout(() => {
      setPhase('results');
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">JavaScript Fundamentals</h1>
            <p className="text-gray-600">Question {currentQuestion} of 5</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-gray-600">Your Score</div>
              <div className="text-xl font-bold text-green-600">{score}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Time Left</div>
              <div className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-gray-900'}`}>
                {timeLeft}s
              </div>
            </div>
          </div>
        </div>
      </div>

      {phase === 'question' && (
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            What is the correct way to declare a variable in JavaScript?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {[
              'var myVar = 5;',
              'let myVar = 5;', 
              'const myVar = 5;',
              'All of the above'
            ].map((option, index) => (
              <button
                key={index}
                onClick={() => submitAnswer(index)}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 text-left group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold group-hover:bg-blue-100 group-hover:text-blue-600">
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="text-lg font-medium text-gray-900">{option}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'waiting' && (
        <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-100 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Clock className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Answer Submitted!</h2>
          <p className="text-gray-600">Waiting for other players to answer...</p>
        </div>
      )}

      {phase === 'results' && (
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {selectedAnswer === 3 ? 'Correct!' : 'Incorrect'}
          </h2>
          <p className="text-gray-600 mb-8">
            The correct answer was: <strong>D - All of the above</strong>
          </p>
          
          {selectedAnswer === 3 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800">+100 points added to your score!</p>
            </div>
          )}
          
          <div className="text-lg text-gray-600 mb-8">
            Next question starting in 3 seconds...
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveQuizApp