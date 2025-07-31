import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import FormCreationBar from '../components/forms/FormCreationBar';
import FormCardRow from '../components/forms/FormCardRow';
import QuizCreationBar from '../components/QuizCreationBar';
import Skeleton from '../components/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';
import { useToast } from '../components/Toast';
import './Dashboard.css';
import { FiSun, FiMoon, FiSearch, FiPlus, FiChevronDown } from 'react-icons/fi';
import DeleteQuizButton from '../components/quiz/DeleteQuizButton';
import { FaHistory, FaEye } from 'react-icons/fa';
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

// Template metadata for enhanced UI
const templateMeta = [
  {
    type: 'Blank',
    icon: (
      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <rect x="4" y="4" width="16" height="16" rx="4" strokeWidth="2" />
        <path d="M8 12h8" strokeWidth="2" />
      </svg>
    ),
    title: 'Blank Form',
    desc: 'Start from scratch with an empty form.',
  },
  {
    type: 'Contact',
    icon: (
      <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <rect x="3" y="5" width="18" height="14" rx="3" strokeWidth="2" />
        <path d="M3 7l9 6 9-6" strokeWidth="2" />
      </svg>
    ),
    title: 'Contact Form',
    desc: 'Collect contact info and messages.',
  },
  {
    type: 'Survey',
    icon: (
      <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <rect x="4" y="4" width="16" height="16" rx="4" strokeWidth="2" />
        <path d="M8 9h8M8 13h6M8 17h4" strokeWidth="2" />
      </svg>
    ),
    title: 'Survey Form',
    desc: 'Get feedback and opinions.',
  },
  {
    type: 'Feedback',
    icon: (
      <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <rect x="3" y="5" width="18" height="14" rx="3" strokeWidth="2" />
        <path d="M8 10h.01M12 10h.01M16 10h.01M8 14h8" strokeWidth="2" />
      </svg>
    ),
    title: 'Feedback Form',
    desc: 'Let users share their thoughts.',
  },
];

// Status badge helper
const statusBadge = (status) => {
  if (status === 'Draft') return <span className="inline-block px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 text-xs font-semibold">Draft</span>;
  if (status === 'Published') return <span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-semibold">Published</span>;
  if (status === 'Archived') return <span className="inline-block px-2 py-0.5 rounded bg-gray-200 text-gray-600 text-xs font-semibold">Archived</span>;
  return null;
};

const MemoFormCardRow = React.memo(FormCardRow);

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
  const initialTab =
    localStorage.getItem('dashboardTab') ||
    location.state?.activeTab ||
    'forms';

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 250);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('Newest');
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

        console.log("Fetched current user:", user);

        if (userError) {
          console.error("Error fetching user:", userError);
          toast('Error fetching user data', 'error');
          return;
        }

        if (user && user.email) {
          // Fetch profile name with error handling
          try {
            const { data: profile, error: profileError } = await supabase
              .from('users')
              .select('name')
              .eq('id', user.id)
              .single();

            if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is "not found"
              console.error("Error fetching profile:", profileError);
              toast('Error fetching profile', 'error');
            } else if (profile?.name) {
              setUsername(profile.name);
            }
          } catch (err) {
            console.error("Profile fetch error:", err);
          }

          // Fetch forms with improved error handling
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
              if (formError.code !== '409') { // Don't show toast for 409 errors
                toast('Error fetching forms', 'error');
              }
            } else {
              console.log("Fetched forms:", formData);
              setForms(formData || []);
            }
          } catch (err) {
            console.error("Forms fetch error:", err);
          }

          // Fetch quizzes with improved error handling
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
              if (quizError.code !== '409') { // Don't show toast for 409 errors
                toast('Error fetching quizzes', 'error');
              }
            } else {
              console.log("Fetched quizzes:", quizData);
              setQuizzes(quizData || []);
            }
          } catch (err) {
            console.error("Quizzes fetch error:", err);
          }

          // Fetch live quizzes with improved error handling
          try {
            const { data: liveQuizData, error: liveQuizError } = await supabase
              .from('lq_quizzes')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false });

            if (liveQuizError) {
              console.error("Error fetching live quizzes:", liveQuizError);
              if (liveQuizError.code !== '409') { // Don't show toast for 409 errors
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
          console.error('User not logged in:', userError);
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

  // Sort and filter logic for forms
  const filteredForms = useMemo(() => {
    let arr = forms.filter((form) =>
      form.title?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
    if (sortBy === 'Newest') arr = arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (sortBy === 'Oldest') arr = arr.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    if (sortBy === 'Name A-Z') arr = arr.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    return arr;
  }, [forms, debouncedSearchTerm, sortBy]);

  const filteredQuizzes = useMemo(() =>
    quizzes.filter((quiz) =>
      quiz.title?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    ), [quizzes, debouncedSearchTerm]);

  const filteredLiveQuizzes = useMemo(() =>
    liveQuizzes.filter((quiz) =>
      quiz.title?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    ), [liveQuizzes, debouncedSearchTerm]);

  let currentData;
  if (activeTab === 'forms') {
    currentData = filteredForms;
  } else if (activeTab === 'livequiz') {
    currentData = filteredLiveQuizzes;
  } else if (activeTab === 'quizzes') {
    currentData = filteredQuizzes;
  } else {
    currentData = [];
  }

  const handlePublishToggle = async (formId, newStatus) => {
    try {
      const { error } = await supabase
        .from('forms')
        .update({ is_published: newStatus })
        .eq('id', formId);
      
      if (error) {
        console.error("Error updating form publish status:", error);
        toast('Error updating form status', 'error');
        return;
      }

      setForms((prev) =>
        prev.map((f) =>
          f.id === formId ? { ...f, is_published: newStatus } : f
        )
      );
      setExpandedCardId(newStatus ? formId : null);
    } catch (err) {
      console.error("Publish toggle error:", err);
      toast('Error updating form status', 'error');
    }
  };

  const handleDeleteForm = async (formId) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast('User not authenticated', 'error');
        return;
      }

      // First delete all questions associated with this form
      const { error: questionsError } = await supabase
        .from('questions')
        .delete()
        .eq('form_id', formId);

      if (questionsError) {
        console.error('Error deleting questions:', questionsError);
        toast('Failed to delete form questions', 'error');
        return;
      }

      // Then delete the form itself
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

      // Update UI state
      setForms((prev) => prev.filter((f) => f.id !== formId));
      toast('Form deleted successfully!', 'success');
    } catch (err) {
      console.error('Error deleting form:', err);
      toast('Failed to delete form', 'error');
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
        console.error('Error deleting live quiz:', error?.message || JSON.stringify(error, null, 2));
        toast('Failed to delete live quiz', 'error');
        return;
      }
      
      setLiveQuizzes(prev => prev.filter(q => q.id !== quizId));
      toast('Live quiz deleted!', 'success');
    } catch (err) {
      toast('Failed to delete live quiz', 'error');
      console.error('Error deleting live quiz:', err?.message || JSON.stringify(err, null, 2));
    }
  };

  const handleQuizPublishToggle = async (quizId, newStatus) => {
    try {
      const { error } = await supabase
        .from('quizzes')
        .update({ is_published: newStatus })
        .eq('id', quizId);
      
      if (error) {
        console.error("Error updating quiz publish status:", error);
        toast('Error updating quiz status', 'error');
        return;
      }

      setQuizzes((prev) =>
        prev.map((q) =>
          q.id === quizId ? { ...q, is_published: newStatus } : q
        )
      );
      setExpandedCardId(newStatus ? quizId : null);
    } catch (err) {
      console.error("Quiz publish toggle error:", err);
      toast('Error updating quiz status', 'error');
    }
  };

  const handleTabToggle = (tab) => {
    setActiveTab(tab);
    setSelectedIds([]); // Clear selections when switching tabs
  };

  // Handler for selecting/deselecting a card
  const handleSelect = (id, checked) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
  };
  
  // Handler for select all
  const handleSelectAll = () => {
    const ids = currentData.map(item => item.id);
    setSelectedIds(ids);
  };
  
  const handleDeselectAll = () => setSelectedIds([]);
  
  // Bulk delete with improved error handling
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

  // Bulk activate/deactivate with improved error handling
  const handleBulkActivate = async (activate) => {
    const updatePromises = selectedIds.map(async (id) => {
      try {
        if (activeTab === 'forms') {
          await handlePublishToggle(id, activate);
        } else if (activeTab === 'quizzes') {
          await handleQuizPublishToggle(id, activate);
        }
      } catch (err) {
        console.error(`Error updating item ${id}:`, err);
      }
    });

    await Promise.allSettled(updatePromises);
    setSelectedIds([]);
  };

  return (
    <div className="dashboard-animated-layout" style={{ 
      background: isDarkMode ? '#0f172a' : '#ffffff', 
      minHeight: '100vh',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    }}>
      <Navbar 
        activeTab={activeTab} 
        onToggle={handleTabToggle} 
        iconSize={28}
        iconHoverEffect
      />

      <div className="dashboard-animated-content">
        <motion.h2
          className="dashboard-animated-title"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, type: 'spring' }}
          style={{
            fontSize: '28px',
            fontWeight: '700',
            color: isDarkMode ? '#f8fafc' : '#1e293b',
            marginBottom: '8px',
            letterSpacing: '-0.025em'
          }}
        >
          {activeTab === 'forms'
            ? 'Form Templates'
            : activeTab === 'livequiz'
            ? 'Live Quizzes'
            : 'Quiz Templates'}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, type: 'spring' }}
          style={{
            fontSize: '16px',
            color: isDarkMode ? '#94a3b8' : '#64748b',
            marginBottom: '32px',
            fontWeight: '400'
          }}
        >
          {activeTab === 'forms'
            ? 'Create and manage your forms with ease'
            : activeTab === 'livequiz'
            ? 'Host interactive live quiz sessions'
            : 'Build engaging quiz experiences'}
        </motion.p>

        {activeTab === 'forms' ? (
          // Enhanced Forms Tab UI
          <div className="relative">
            {/* Templates Section */}
            <div className="mb-10">
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2 ml-1">Templates</h3>
              <div className="flex gap-6 mb-8">
                {templateMeta.map((tpl, i) => (
        <motion.div
                    key={tpl.type}
                    whileHover={{ scale: 1.045, boxShadow: '0 8px 32px 0 rgba(16,30,54,0.10)' }}
                    className="bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer px-6 py-5 flex flex-col items-center w-56"
                    onClick={() => {
                      if (tpl.type === 'Blank') navigate('/builder');
                      if (tpl.type === 'Contact') navigate('/builder?template=contact');
                      if (tpl.type === 'Survey') navigate('/builder?template=survey');
                      if (tpl.type === 'Feedback') navigate('/builder?template=feedback');
                    }}
                  >
                    <div className="mb-2">{tpl.icon}</div>
                    <div className="font-bold text-base mb-1">{tpl.title}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 text-center">{tpl.desc}</div>
        </motion.div>
                ))}
              </div>
            </div>

            {/* My Forms Section */}
            <div className="flex items-center justify-between mb-4 mt-12">
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 ml-1">My Forms</h3>
              {/* FAB */}
              <motion.button
                whileHover={{ scale: 1.08, boxShadow: '0 4px 16px 0 rgba(59,130,246,0.18)' }}
                className="fixed bottom-8 right-8 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg p-5 flex items-center justify-center transition-all"
                title="Create New Form"
                onClick={() => navigate('/builder')}
              >
                <FiPlus size={28} />
              </motion.button>
            </div>

            {/* Search & Sort */}
            <div className="flex flex-wrap gap-4 items-center mb-8">
              <div className="relative flex-1 min-w-[220px] max-w-[340px]">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
            <input
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all outline-none"
              type="text"
                  placeholder="Search forms..."
              value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
              <div className="relative">
                <select
                  className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all outline-none"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                >
                  <option>Newest</option>
                  <option>Oldest</option>
                  <option>Name A-Z</option>
                </select>
                <FiChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <div className="flex gap-2 ml-auto">
            <button
                  className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${viewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300'
                    }`}
              onClick={() => setViewMode('grid')}
            >
              Grid
            </button>
            <button
                  className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300'
                    }`}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
              </div>
          </div>
          
                         {/* Forms List */}
             <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-7' : 'flex flex-col gap-4'}>
               <AnimatePresence>
                 {loading ? (
                   <Skeleton count={4} height={60} />
                 ) : currentData.length > 0 ? (
                   <>
                     {/* Bulk Selection Bar */}
                     {selectedIds.length > 0 && (
                       <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center gap-4">
                         <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{selectedIds.length} selected</span>
          <button
                           onClick={handleBulkDelete} 
                           className="text-red-600 hover:text-red-700 font-semibold text-sm transition-colors"
                         >
                           Delete
                         </button>
                         <button 
                           onClick={() => handleBulkActivate(true)} 
                           className="text-green-600 hover:text-green-700 font-semibold text-sm transition-colors"
                         >
                           Activate
                         </button>
                         <button 
                           onClick={() => handleBulkActivate(false)} 
                           className="text-blue-600 hover:text-blue-700 font-semibold text-sm transition-colors"
                         >
                           Deactivate
                         </button>
                         <button 
                           onClick={handleSelectAll} 
                           className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm transition-colors"
                         >
                           Select All
                         </button>
                         <button 
                           onClick={handleDeselectAll} 
                           className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm transition-colors"
                         >
                           Clear
                         </button>
                       </div>
                     )}
                     {currentData.map((form, idx) => (
                       <motion.div
                         key={form.id || idx}
                         initial={{ opacity: 0, scale: 0.96, y: 18 }}
                         animate={{ opacity: 1, scale: 1, y: 0 }}
                         exit={{ opacity: 0, scale: 0.95, y: 18 }}
                         transition={{ duration: 0.32, type: 'spring' }}
                         whileHover={{
                           boxShadow: '0 10px 24px -3px rgba(59,130,246,0.10), 0 4px 8px -2px rgba(59,130,246,0.08)',
                           scale: 1.025,
                           zIndex: 10
                         }}
                         className="relative bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer p-5 flex items-center gap-4 min-h-[120px]"
                         onClick={() => navigate(`/form/${form.id}`)}
                       >
                         {/* Checkbox for selection */}
                         <input
                           type="checkbox"
                           checked={selectedIds.includes(form.id)}
                           onChange={e => {
                             e.stopPropagation();
                             handleSelect(form.id, e.target.checked);
                           }}
                           onClick={e => e.stopPropagation()}
                           className="absolute top-4 right-4 w-5 h-5 accent-blue-600"
                           title="Select form"
                         />
                         {/* Thumbnail */}
                         <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-2xl font-bold text-blue-600 dark:text-blue-300 shadow">
                           {form.title?.[0]?.toUpperCase() || 'F'}
                         </div>
                         <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2">
                             <span className="font-semibold text-base text-slate-800 dark:text-slate-100 truncate">{form.title || 'Untitled Form'}</span>
                             {statusBadge(form.is_published ? 'Published' : 'Draft')}
                           </div>
                           <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                             Created: {form.created_at ? new Date(form.created_at).toLocaleDateString() : 'N/A'}
                           </div>
                         </div>
                         {/* Activate/Deactivate button in bottom right */}
                         <button
                           onClick={e => {
                             e.stopPropagation();
                             handlePublishToggle(form.id, !form.is_published);
                           }}
                           className={`absolute bottom-4 right-4 px-3 py-1 rounded text-xs font-semibold shadow transition-all duration-150
                             ${form.is_published
                               ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                               : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                             }`}
                           style={{ minWidth: 70 }}
                           title={form.is_published ? 'Deactivate' : 'Activate'}
                         >
                           {form.is_published ? 'Deactivate' : 'Activate'}
                         </button>
                       </motion.div>
                     ))}
                   </>
                 ) : (
                  // Empty State
                  <motion.div
                    className="w-full flex flex-col items-center justify-center py-24"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    {/* Illustration */}
                    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                      <rect x="10" y="30" width="100" height="60" rx="16" fill="#e0e7ef" />
                      <rect x="25" y="45" width="70" height="10" rx="4" fill="#c7d2fe" />
                      <rect x="25" y="60" width="40" height="10" rx="4" fill="#c7d2fe" />
                      <circle cx="100" cy="80" r="8" fill="#a5b4fc" />
                    </svg>
                    <div className="mt-8 text-lg font-semibold text-slate-500 dark:text-slate-400">No forms found</div>
                    <div className="mt-2 text-slate-400 dark:text-slate-500">Create your first form in seconds!</div>
                    <button
                      className="mt-6 px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow transition-all"
                      onClick={() => navigate('/builder')}
                    >
                      Create Form
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          // Original content for other tabs
          <motion.div
            className="dashboard-creation-bar"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, type: 'spring' }}
          >
            {activeTab === 'quizzes' && <QuizCreationBar />}
            {activeTab === 'livequiz' && (
              <LiveQuizTemplateCard
                onClick={() => navigate('/quiz/create')}
              />
            )}
          </motion.div>
        )}

        {/* Dark mode toggle for non-forms tabs */}
        {activeTab !== 'forms' && (
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setIsDarkMode((prev) => !prev)}
              className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg p-3 flex items-center justify-center transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
              {isDarkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
          </button>
        </div>
        )}

        {/* Content for non-forms tabs */}
        {activeTab !== 'forms' && (
        <section
          className={`dashboard-animated-section ${viewMode}`}
          style={{ paddingBottom: 30 }}
        >
          <AnimatePresence>
            {loading ? (
              <Skeleton count={4} height={60} />
            ) : currentData.length > 0 ? (
              <>
                {selectedIds.length > 0 && (
                  <div style={{
                    position: 'fixed',
                    bottom: 32,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: isDarkMode ? '#1e293b' : '#ffffff',
                    color: isDarkMode ? '#f1f5f9' : '#1e293b',
                    borderRadius: '16px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    padding: '16px 24px',
                    zIndex: 200,
                    display: 'flex',
                    gap: '16px',
                    alignItems: 'center',
                    fontWeight: '600',
                    fontSize: '14px',
                    border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                    fontFamily: 'Inter, sans-serif'
                  }}>
                    <span>{selectedIds.length} selected</span>
                    {activeTab === 'livequiz' ? (
                      <DeleteQuizButton
                        quizIds={selectedIds}
                        label="Delete Quiz"
                        onDeleted={id => setLiveQuizzes(prev => prev.filter(q => q.id !== id))}
                      />
                    ) : (
                      <button 
                        onClick={handleBulkDelete} 
                        style={{ 
                          color: '#ef4444', 
                          background: 'none', 
                          border: 'none', 
                          fontWeight: '600', 
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontFamily: 'Inter, sans-serif'
                        }}
                      >
                        Delete
                      </button>
                    )}
                    {(activeTab === 'forms' || activeTab === 'quizzes') && (
                      <>
                        <button 
                          onClick={() => handleBulkActivate(true)} 
                          style={{ 
                            color: '#10b981', 
                            background: 'none', 
                            border: 'none', 
                            fontWeight: '600', 
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontFamily: 'Inter, sans-serif'
                          }}
                        >
                          Activate
                        </button>
                        <button 
                          onClick={() => handleBulkActivate(false)} 
                          style={{ 
                            color: '#6366f1', 
                            background: 'none', 
                            border: 'none', 
                            fontWeight: '600', 
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontFamily: 'Inter, sans-serif'
                          }}
                        >
                          Deactivate
                        </button>
                      </>
                    )}
                    <button 
                      onClick={handleSelectAll} 
                      style={{ 
                        color: '#6366f1', 
                        background: 'none', 
                        border: 'none', 
                        fontWeight: '600', 
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontFamily: 'Inter, sans-serif'
                      }}
                    >
                      Select All
                    </button>
                    <button 
                      onClick={handleDeselectAll} 
                      style={{ 
                        color: '#6366f1', 
                        background: 'none', 
                        border: 'none', 
                        fontWeight: '600', 
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontFamily: 'Inter, sans-serif'
                      }}
                    >
                      Clear
                    </button>
                  </div>
                )}
                {currentData.map((item, idx) => (
                  <motion.div
    key={item.id || idx}
    initial={{ opacity: 0, scale: 0.96, y: 18 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95, y: 18 }}
    transition={{ duration: 0.32, type: 'spring' }}
    whileHover={{
      boxShadow: '0 10px 24px -3px rgba(59,130,246,0.10), 0 4px 8px -2px rgba(59,130,246,0.08)',
      scale: 1.025,
      zIndex: 10
    }}
    className={`relative bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer p-5 flex items-center gap-4 min-h-[120px]`}
    onClick={() => {
      if (activeTab === 'forms') navigate(`/form/${item.id}`);
      else if (activeTab === 'quizzes') navigate(`/userend?quizId=${item.id}`);
      else if (activeTab === 'livequiz') navigate(`/livequiz/questions/${item.id}`);
    }}
  >
    {/* Checkbox for selection */}
    <input
      type="checkbox"
      checked={selectedIds.includes(item.id)}
      onChange={e => {
        e.stopPropagation();
        handleSelect(item.id, e.target.checked);
      }}
      onClick={e => e.stopPropagation()}
      className="absolute top-4 right-4 w-5 h-5 accent-blue-600"
      title="Select"
    />
    {/* Thumbnail */}
    <div className={`flex-shrink-0 w-12 h-12 rounded-full ${activeTab === 'forms' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : activeTab === 'quizzes' ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300' : 'bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300'} flex items-center justify-center text-2xl font-bold shadow`}>
      {item.title?.[0]?.toUpperCase() || (activeTab === 'forms' ? 'F' : activeTab === 'quizzes' ? 'Q' : 'L')}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-base text-slate-800 dark:text-slate-100 truncate">{item.title || (activeTab === 'forms' ? 'Untitled Form' : activeTab === 'quizzes' ? 'Untitled Quiz' : 'Untitled Live Quiz')}</span>
        {statusBadge(activeTab === 'forms' || activeTab === 'quizzes' ? (item.is_published ? 'Published' : 'Draft') : (item.status || 'Draft'))}
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Created: {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
      </div>
    </div>
    {/* Action button for quizzes only */}
    {activeTab === 'quizzes' && (
      <button
        onClick={e => {
          e.stopPropagation();
          handleQuizPublishToggle(item.id, !item.is_published);
        }}
        className={`absolute bottom-4 right-4 px-3 py-1 rounded text-xs font-semibold shadow transition-all duration-150
          ${item.is_published
            ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
            : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
          }`}
        style={{ minWidth: 70 }}
        title={item.is_published ? 'Deactivate' : 'Activate'}
      >
        {item.is_published ? 'Deactivate' : 'Activate'}
      </button>
    )}
    {/* For livequiz, leave bottom right empty for now */}
  </motion.div>
))}
                <div style={{ height: 30 }} />
              </>
            ) : (
              <motion.div
                className="dashboard-empty-message"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{ 
                  color: isDarkMode ? '#94a3b8' : '#64748b',
                  fontSize: '16px',
                  textAlign: 'center',
                  padding: '60px 0',
                  fontWeight: '500',
                  fontFamily: 'Inter, sans-serif'
                }}
              >
                {activeTab === 'forms'
                  ? 'No forms found. Create your first form to get started.'
                  : activeTab === 'livequiz'
                  ? 'No live quizzes found. Create your first live quiz session.'
                  : 'No quizzes found. Create your first quiz to get started.'}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
        )}
      </div>
    </div>
  );
};

export default Dashboard;