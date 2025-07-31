import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSun, FiMoon, FiSearch, FiPlus, FiGrid, FiList, FiEdit3, FiCopy, FiTrash2, FiEye, FiShare2, FiSettings, FiUser } from 'react-icons/fi';
import { FaHistory, FaEye } from 'react-icons/fa';
import { supabase } from '../supabase';
import { useToast } from '../components/Toast';
import DeleteQuizButton from '../components/quiz/DeleteQuizButton';
import TemplateCard from '../components/shared/TemplateCard';
import '../components/shared/TemplateCard.css';

// Debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const LiveQuizTemplateCard = ({ onClick }) => {
  const liveQuizIcon = (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#ff6b81"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="6" fill="#fff0f3" />
      <path
        d="M12 8v4l3 2"
        stroke="#ff6b81"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="#ff6b81"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );

  return (
    <div className="template-section">
      <TemplateCard
        icon={liveQuizIcon}
        label="Live Quiz"
        description="Host a live, interactive quiz session."
        onClick={onClick}
      />
    </div>
  );
};

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initialTab = localStorage.getItem('dashboardTab') || location.state?.activeTab || 'forms';

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [username, setUsername] = useState('');
  const [forms, setForms] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [liveQuizzes, setLiveQuizzes] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark';
  });
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const debouncedSearchTerm = useDebounce(searchTerm, 250);
  const toast = useToast();

  useEffect(() => {
    localStorage.setItem('dashboardTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("Error fetching user:", userError);
          toast('Error fetching user data', 'error');
          return;
        }

        if (user && user.email) {
          // Fetch profile name
          try {
            const { data: profile, error: profileError } = await supabase
              .from('users')
              .select('name')
              .eq('id', user.id)
              .single();

            if (profileError && profileError.code !== 'PGRST116') {
              console.error("Error fetching profile:", profileError);
              toast('Error fetching profile', 'error');
            } else if (profile?.name) {
              setUsername(profile.name);
            }
          } catch (err) {
            console.error("Profile fetch error:", err);
          }

          // Fetch forms
          try {
            const { data: formData, error: formError } = await supabase
              .from('forms')
              .select('*')
              .or(
                `created_by.eq.${user.email},user_id.eq.${user.id}`,
                { foreignTable: undefined }
              )
              .order('created_at', { ascending: false });

            if (formError) {
              console.error("Error fetching forms:", formError);
              if (formError.code !== '409') {
                toast('Error fetching forms', 'error');
              }
            } else {
              setForms(formData || []);
            }
          } catch (err) {
            console.error("Forms fetch error:", err);
          }

          // Fetch quizzes
          try {
            const { data: quizData, error: quizError } = await supabase
              .from('quizzes')
              .select('*')
              .or(
                `created_by.eq.${user.email},user_id.eq.${user.id}`,
                { foreignTable: undefined }
              )
              .order('created_at', { ascending: false });

            if (quizError) {
              console.error("Error fetching quizzes:", quizError);
              if (quizError.code !== '409') {
                toast('Error fetching quizzes', 'error');
              }
            } else {
              setQuizzes(quizData || []);
            }
          } catch (err) {
            console.error("Quizzes fetch error:", err);
          }

          // Fetch live quizzes
          try {
            const { data: liveQuizData, error: liveQuizError } = await supabase
              .from('lq_quizzes')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false });

            if (liveQuizError) {
              console.error("Error fetching live quizzes:", liveQuizError);
              if (liveQuizError.code !== '409') {
                toast('Error fetching live quizzes', 'error');
              }
            } else {
              setLiveQuizzes(liveQuizData || []);
            }
          } catch (err) {
            console.error("Live quizzes fetch error:", err);
          }
        } else {
          toast('User not logged in', 'error');
        }
      } catch (err) {
        toast('Failed to fetch dashboard data', 'error');
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [toast]);

  const filteredAndSortedData = useMemo(() => {
    let data = [];
    if (activeTab === 'forms') {
      data = forms.filter((form) =>
        form.title?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    } else if (activeTab === 'quizzes') {
      data = quizzes.filter((quiz) =>
        quiz.title?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    } else if (activeTab === 'livequiz') {
      data = liveQuizzes.filter((quiz) =>
        quiz.title?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }

    // Sort data
    switch (sortBy) {
      case 'newest':
        return data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      case 'oldest':
        return data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      case 'name':
        return data.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      default:
        return data;
    }
  }, [activeTab, forms, quizzes, liveQuizzes, debouncedSearchTerm, sortBy]);

  const handleTabToggle = (tab) => {
    setActiveTab(tab);
    setSelectedIds([]);
  };

  const handleSelect = (id, checked) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
  };

  const handleSelectAll = () => {
    const ids = filteredAndSortedData.map(item => item.id);
    setSelectedIds(ids);
  };

  const handleDeselectAll = () => setSelectedIds([]);

  const handleDeleteForm = async (formId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast('User not authenticated', 'error');
        return;
      }

      const { error: questionsError } = await supabase
        .from('questions')
        .delete()
        .eq('form_id', formId);

      if (questionsError) {
        console.error('Error deleting questions:', questionsError);
        toast('Failed to delete form questions', 'error');
        return;
      }

      const { error: formError } = await supabase
        .from('forms')
        .delete()
        .eq('id', formId)
        .eq('user_id', user?.id);

      if (formError) {
        console.error('Error deleting form:', formError);
        toast('Failed to delete form', 'error');
        return;
      }

      setForms((prev) => prev.filter((f) => f.id !== formId));
      toast('Form deleted successfully!', 'success');
    } catch (err) {
      console.error('Error deleting form:', err);
      toast('Failed to delete form', 'error');
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast('User not authenticated', 'error');
        return;
      }

      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error deleting quiz:', error);
        toast('Failed to delete quiz', 'error');
        return;
      }
      
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      toast('Quiz deleted!', 'success');
    } catch (err) {
      toast('Failed to delete quiz', 'error');
      console.error(err);
    }
  };

  const handleDeleteLiveQuiz = async (quizId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast('User not authenticated', 'error');
        return;
      }

      const { error } = await supabase
        .from('lq_quizzes')
        .delete()
        .eq('id', quizId)
        .eq('user_id', user?.id);
      
      if (error) {
        console.error('Error deleting live quiz:', error);
        toast('Failed to delete live quiz', 'error');
        return;
      }
      
      setLiveQuizzes(prev => prev.filter(q => q.id !== quizId));
      toast('Live quiz deleted!', 'success');
    } catch (err) {
      toast('Failed to delete live quiz', 'error');
      console.error('Error deleting live quiz:', err);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm('Delete selected items?')) return;
    
    const deletePromises = selectedIds.map(async (id) => {
      try {
        if (activeTab === 'forms') {
          await handleDeleteForm(id);
        } else if (activeTab === 'quizzes') {
          await handleDeleteQuiz(id);
        } else if (activeTab === 'livequiz') {
          await handleDeleteLiveQuiz(id);
        }
      } catch (err) {
        console.error(`Error deleting item ${id}:`, err);
      }
    });

    await Promise.allSettled(deletePromises);
    setSelectedIds([]);
  };

  const tabItems = [
    { key: 'forms', label: 'My Forms', icon: '📋' },
    { key: 'livequiz', label: 'My LiveQuiz', icon: '🎯' },
    { key: 'quizzes', label: 'My Quizzes', icon: '🧠' }
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'name', label: 'Name A-Z' }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Top Navbar */}
      <motion.nav 
        className={`sticky top-0 z-50 backdrop-blur-lg border-b ${
          isDarkMode ? 'bg-gray-900/80 border-gray-700' : 'bg-white/80 border-gray-200'
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <motion.div 
              className="flex items-center space-x-3"
              whileHover={{ scale: 1.05 }}
            >
              <div className={`w-8 h-8 rounded-lg ${
                isDarkMode ? 'bg-blue-600' : 'bg-blue-500'
              } flex items-center justify-center`}>
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className="font-bold text-xl">FormQuiz</span>
            </motion.div>

            {/* Tab Navigation */}
            <div className="flex items-center space-x-1">
              {tabItems.map((tab) => (
                <motion.button
                  key={tab.key}
                  onClick={() => handleTabToggle(tab.key)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                    activeTab === tab.key
                      ? isDarkMode 
                        ? 'bg-blue-600 text-white shadow-lg' 
                        : 'bg-blue-500 text-white shadow-lg'
                      : isDarkMode
                        ? 'text-gray-300 hover:text-white hover:bg-gray-800'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span>{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </motion.button>
              ))}
            </div>

            {/* Right Side Controls */}
            <div className="flex items-center space-x-2">
              {/* Settings Button */}
              <motion.button
                onClick={() => navigate('/settings')}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  isDarkMode 
                    ? 'text-gray-300 hover:text-white hover:bg-gray-800' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Settings"
              >
                <FiSettings size={20} />
              </motion.button>

              {/* Profile Button */}
              <motion.button
                onClick={() => navigate('/profile')}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  isDarkMode 
                    ? 'text-gray-300 hover:text-white hover:bg-gray-800' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Profile"
              >
                <FiUser size={20} />
              </motion.button>

              {/* Dark Mode Toggle */}
              <motion.button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  isDarkMode 
                    ? 'text-gray-300 hover:text-white hover:bg-gray-800' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className={`text-3xl font-bold mb-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {activeTab === 'forms' ? 'Form Templates' : 
             activeTab === 'livequiz' ? 'Live Quizzes' : 'Quiz Templates'}
          </h1>
          <p className={`text-lg ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {activeTab === 'forms' ? 'Create and manage your forms with ease' :
             activeTab === 'livequiz' ? 'Host interactive live quiz sessions' :
             'Build engaging quiz experiences'}
          </p>
        </motion.div>

        {/* Search and Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4 mb-8"
        >
          {/* Search Bar */}
          <div className="flex-1 relative">
            <FiSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all duration-200 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500'
              }`}
            />
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`px-4 py-3 rounded-xl border transition-all duration-200 ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500 focus:ring-blue-500' 
                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500'
            }`}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* View Toggle */}
          <div className={`flex rounded-xl p-1 ${
            isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
          }`}>
            <motion.button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all duration-200 ${
                viewMode === 'grid'
                  ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                  : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiGrid size={18} />
            </motion.button>
            <motion.button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all duration-200 ${
                viewMode === 'list'
                  ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                  : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiList size={18} />
            </motion.button>
          </div>
        </motion.div>

        {/* Template Cards Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-12"
        >
          <h2 className={`text-xl font-semibold mb-6 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Templates
          </h2>
          
          {activeTab === 'forms' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {/* Blank Form Template */}
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                className={`p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
                  isDarkMode 
                    ? 'border-gray-600 hover:border-blue-500 bg-gray-800/50' 
                    : 'border-gray-300 hover:border-blue-500 bg-white'
                }`}
                onClick={() => navigate('/builder')}
              >
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center ${
                    isDarkMode ? 'bg-blue-600' : 'bg-blue-500'
                  }`}>
                    <span className="text-white text-xl">📝</span>
                  </div>
                  <h3 className={`font-semibold mb-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Blank Form
                  </h3>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Start from scratch
                  </p>
                </div>
              </motion.div>

              {/* Survey Template */}
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                className={`p-6 rounded-xl cursor-pointer transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-gray-800 hover:bg-gray-700 border border-gray-700' 
                    : 'bg-white hover:bg-gray-50 border border-gray-200'
                }`}
                onClick={() => navigate('/builder')}
              >
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center ${
                    isDarkMode ? 'bg-green-600' : 'bg-green-500'
                  }`}>
                    <span className="text-white text-xl">📊</span>
                  </div>
                  <h3 className={`font-semibold mb-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Survey
                  </h3>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Collect feedback
                  </p>
                </div>
              </motion.div>

              {/* Contact Form Template */}
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                className={`p-6 rounded-xl cursor-pointer transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-gray-800 hover:bg-gray-700 border border-gray-700' 
                    : 'bg-white hover:bg-gray-50 border border-gray-200'
                }`}
                onClick={() => navigate('/builder')}
              >
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center ${
                    isDarkMode ? 'bg-purple-600' : 'bg-purple-500'
                  }`}>
                    <span className="text-white text-xl">📧</span>
                  </div>
                  <h3 className={`font-semibold mb-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Contact Form
                  </h3>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Get in touch
                  </p>
                </div>
              </motion.div>
            </div>
          )}

          {activeTab === 'quizzes' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {/* Blank Quiz Template */}
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                className={`p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
                  isDarkMode 
                    ? 'border-gray-600 hover:border-blue-500 bg-gray-800/50' 
                    : 'border-gray-300 hover:border-blue-500 bg-white'
                }`}
                onClick={() => navigate('/quiz/create')}
              >
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center ${
                    isDarkMode ? 'bg-blue-600' : 'bg-blue-500'
                  }`}>
                    <span className="text-white text-xl">🧠</span>
                  </div>
                  <h3 className={`font-semibold mb-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Blank Quiz
                  </h3>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Start from scratch
                  </p>
                </div>
              </motion.div>

              {/* Knowledge Quiz Template */}
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                className={`p-6 rounded-xl cursor-pointer transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-gray-800 hover:bg-gray-700 border border-gray-700' 
                    : 'bg-white hover:bg-gray-50 border border-gray-200'
                }`}
                onClick={() => navigate('/quiz/create')}
              >
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center ${
                    isDarkMode ? 'bg-green-600' : 'bg-green-500'
                  }`}>
                    <span className="text-white text-xl">🎓</span>
                  </div>
                  <h3 className={`font-semibold mb-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Knowledge Quiz
                  </h3>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Test knowledge
                  </p>
                </div>
              </motion.div>
            </div>
          )}

          {activeTab === 'livequiz' && (
            <LiveQuizTemplateCard onClick={() => navigate('/quiz/create')} />
          )}
        </motion.div>

        {/* My Items Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-xl font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              My {activeTab === 'forms' ? 'Forms' : activeTab === 'livequiz' ? 'Live Quizzes' : 'Quizzes'}
            </h2>
            
            {selectedIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center space-x-2"
              >
                <span className={`text-sm ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {selectedIds.length} selected
                </span>
                <motion.button
                  onClick={handleSelectAll}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    isDarkMode 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Select All
                </motion.button>
                <motion.button
                  onClick={handleDeselectAll}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 text-white hover:bg-gray-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Clear
                </motion.button>
                <motion.button
                  onClick={handleBulkDelete}
                  className="px-3 py-1 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Delete
                </motion.button>
              </motion.div>
            )}
          </div>

          <AnimatePresence>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`h-48 rounded-xl ${
                      isDarkMode ? 'bg-gray-800 animate-pulse' : 'bg-gray-200 animate-pulse'
                    }`}
                  />
                ))}
              </div>
            ) : filteredAndSortedData.length > 0 ? (
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' 
                : 'space-y-4'
              }>
                {filteredAndSortedData.map((item, idx) => (
                  <motion.div
                    key={item.id || idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: idx * 0.1 }}
                    className={`group relative ${
                      viewMode === 'grid' 
                        ? 'p-6 rounded-xl border transition-all duration-200' 
                        : 'p-4 rounded-xl border transition-all duration-200'
                    } ${
                      isDarkMode 
                        ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' 
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                    whileHover={{ scale: 1.02, y: -2 }}
                  >
                    {/* Selection Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={(e) => handleSelect(item.id, e.target.checked)}
                      className="absolute top-4 right-4 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />

                    {/* Content */}
                    <div className={viewMode === 'grid' ? 'text-center' : 'flex items-center space-x-4'}>
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        isDarkMode ? 'bg-blue-600' : 'bg-blue-500'
                      }`}>
                        <span className="text-white text-lg">
                          {activeTab === 'forms' ? '📋' : activeTab === 'livequiz' ? '🎯' : '🧠'}
                        </span>
                      </div>
                      
                      <div className={viewMode === 'grid' ? 'mt-4' : 'flex-1'}>
                        <h3 className={`font-semibold mb-1 ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {item.title || 'Untitled'}
                        </h3>
                        <p className={`text-sm ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Created {new Date(item.created_at).toLocaleDateString()}
                        </p>
                        {activeTab === 'livequiz' && (
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                              Draft
                            </span>
                            <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                              Live
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className={`absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
                      isDarkMode ? 'bg-gray-800/90' : 'bg-white/90'
                    }`}>
                      <div className="flex space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className={`p-2 rounded-lg ${
                            isDarkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          onClick={() => navigate(`/${activeTab === 'forms' ? 'form' : 'quiz'}/${item.id}`)}
                        >
                          <FiEye size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className={`p-2 rounded-lg ${
                            isDarkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          onClick={() => navigate(`/${activeTab === 'forms' ? 'builder' : 'quiz/create'}`)}
                        >
                          <FiEdit3 size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className={`p-2 rounded-lg ${
                            isDarkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <FiCopy size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                          onClick={() => {
                            if (activeTab === 'forms') handleDeleteForm(item.id);
                            else if (activeTab === 'quizzes') handleDeleteQuiz(item.id);
                            else if (activeTab === 'livequiz') handleDeleteLiveQuiz(item.id);
                          }}
                        >
                          <FiTrash2 size={16} />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <div className={`w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                }`}>
                  <span className="text-3xl">📝</span>
                </div>
                <h3 className={`text-lg font-semibold mb-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  No {activeTab === 'forms' ? 'forms' : activeTab === 'livequiz' ? 'live quizzes' : 'quizzes'} found
                </h3>
                <p className={`${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Create your first {activeTab === 'forms' ? 'form' : activeTab === 'livequiz' ? 'live quiz' : 'quiz'} to get started
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Floating Action Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center ${
          isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
        } text-white z-50`}
        onClick={() => {
          if (activeTab === 'forms') navigate('/builder');
          else if (activeTab === 'quizzes' || activeTab === 'livequiz') navigate('/quiz/create');
        }}
      >
        <FiPlus size={24} />
      </motion.button>
    </div>
  );
};

export default Dashboard;