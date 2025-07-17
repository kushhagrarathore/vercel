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
import { FiSun, FiMoon } from 'react-icons/fi';
import DeleteQuizButton from '../components/quiz/DeleteQuizButton';

// Debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const MemoFormCardRow = React.memo(FormCardRow);

const LiveQuizTemplateCard = ({ onClick }) => (
  <div className="template-section">
    <div
      className="template-card"
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <div
        className="file-icon"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 44,
          height: 44,
          borderRadius: 12,
          background: '#ffeaea',
          marginBottom: 0,
        }}
      >
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
      </div>
      <div
        className="template-label"
        style={{ fontWeight: 700, fontSize: 17 }}
      >
        Live Quiz
      </div>
      <div className="template-desc">
        Host a live, interactive quiz session.
      </div>
    </div>
  </div>
);

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

  const filteredForms = useMemo(() =>
    forms.filter((form) =>
      form.title?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    ), [forms, debouncedSearchTerm]);

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
    <div className="dashboard-animated-layout" style={{ background: isDarkMode ? '#181c24' : '#f8f9fb', minHeight: '100vh' }}>
      <Navbar activeTab={activeTab} onToggle={handleTabToggle} />

      <div className="dashboard-animated-content">
        <motion.h2
          className="dashboard-animated-title"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, type: 'spring' }}
        >
          {activeTab === 'forms'
            ? 'Form Templates'
            : activeTab === 'livequiz'
            ? 'Live Quizzes'
            : 'Quiz Templates'}
        </motion.h2>

        <motion.div
          className="dashboard-creation-bar"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, type: 'spring' }}
        >
          {activeTab === 'forms' && <FormCreationBar />}
          {activeTab === 'quizzes' && <QuizCreationBar />}
          {activeTab === 'livequiz' && (
            <LiveQuizTemplateCard
              onClick={() => navigate('/quiz/create')}
            />
          )}
        </motion.div>

        <div className="dashboard-controls-bar">
          <input
            className="dashboard-search"
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="dashboard-view-toggle">
            <button
              className={`dashboard-view-btn${
                viewMode === 'grid' ? ' active' : ''
              }`}
              onClick={() => setViewMode('grid')}
            >
              Grid
            </button>
            <button
              className={`dashboard-view-btn${
                viewMode === 'list' ? ' active' : ''
              }`}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
          </div>
          <button
            onClick={() => setIsDarkMode((prev) => !prev)}
            style={{
              background: isDarkMode ? '#2563eb' : '#f3f4f6',
              color: isDarkMode ? '#fff' : '#2563eb',
              border: 'none',
              borderRadius: 999,
              padding: '8px 16px',
              fontWeight: 700,
              fontSize: 17,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37,99,235,0.10)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginLeft: 16
            }}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <FiSun /> : <FiMoon />}
          </button>
        </div>

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
                    background: isDarkMode ? '#2a2d3a' : '#fff',
                    color: isDarkMode ? '#fff' : '#000',
                    borderRadius: 16,
                    boxShadow: '0 4px 24px #a5b4fc33',
                    padding: '16px 32px',
                    zIndex: 200,
                    display: 'flex',
                    gap: 18,
                    alignItems: 'center',
                    fontWeight: 700
                  }}>
                    <span>{selectedIds.length} selected</span>
                    {activeTab === 'livequiz' ? (
                      <DeleteQuizButton
                        quizIds={selectedIds}
                        label="Delete Quiz"
                        onDeleted={id => setLiveQuizzes(prev => prev.filter(q => q.id !== id))}
                      />
                    ) : (
                      <button onClick={handleBulkDelete} style={{ color: '#ef4444', background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
                    )}
                    {(activeTab === 'forms' || activeTab === 'quizzes') && (
                      <>
                        <button onClick={() => handleBulkActivate(true)} style={{ color: '#22c55e', background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Activate</button>
                        <button onClick={() => handleBulkActivate(false)} style={{ color: '#6366f1', background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Deactivate</button>
                      </>
                    )}
                    <button onClick={handleSelectAll} style={{ color: '#6366f1', background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Select All</button>
                    <button onClick={handleDeselectAll} style={{ color: '#6366f1', background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Clear</button>
                  </div>
                )}
                {currentData.map((item, idx) => (
                  activeTab === 'livequiz' ? (
                    <motion.div
                      key={item.id || idx}
                      initial={{ opacity: 0, scale: 0.96, y: 18 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 18 }}
                      transition={{ duration: 0.32, type: 'spring' }}
                      className="dashboard-animated-card"
                      style={{ 
                        position: 'relative', 
                        borderLeft: '6px solid #a78bfa', 
                        background: isDarkMode ? '#2a2d3a' : '#fff',
                        color: isDarkMode ? '#fff' : '#000',
                        borderRadius: 18, 
                        boxShadow: '0 2px 12px #a5b4fc22', 
                        padding: 18, 
                        minHeight: 120, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'center', 
                        gap: 8, 
                        marginBottom: 30,
                        cursor: 'pointer'
                      }}
                      onClick={() => navigate(`/livequiz/questions/${item.id}`)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={e => {
                          e.stopPropagation();
                          handleSelect(item.id, e.target.checked);
                        }}
                        onClick={e => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          top: 18,
                          right: 18,
                          zIndex: 2,
                          width: 20,
                          height: 20,
                        }}
                        title="Select"
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 18 }}>{item.title || 'Untitled Live Quiz'}</span>
                        <span style={{ background: '#fde68a', color: '#b45309', fontWeight: 600, fontSize: 13, borderRadius: 8, padding: '2px 10px', marginLeft: 6 }}>Draft</span>
                        <span style={{ background: '#a78bfa', color: '#fff', fontWeight: 600, fontSize: 13, borderRadius: 8, padding: '2px 10px', marginLeft: 4 }}>Live</span>
                      </div>
                      <div style={{ color: isDarkMode ? '#ccc' : '#555', fontSize: 15, wordBreak: 'break-all', marginBottom: 4 }}>Code: {item.code || item.id}</div>
                      <div style={{ color: isDarkMode ? '#888' : '#888', fontSize: 13, marginBottom: 8 }}>Created: {item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                        <button title="View" style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 18, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); navigate(`/livequiz/details/${item.id}`); }}><i className="fa fa-eye" /></button>
                        <button title="Results" style={{ background: 'none', border: 'none', color: '#22c55e', fontSize: 18, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); navigate(`/livequiz/details/${item.id}`); }}><i className="fa fa-bar-chart" /></button>
                        <button title="Link" style={{ background: 'none', border: 'none', color: '#0ea5e9', fontSize: 18, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(window.location.origin + `/livequiz/details/${item.id}`); toast('Link copied!', 'success'); }}><i className="fa fa-link" /></button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={item.id || idx}
                      initial={{ opacity: 0, scale: 0.96, y: 18 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 18 }}
                      transition={{ duration: 0.32, type: 'spring' }}
                      className="dashboard-animated-card"
                      style={{ marginBottom: 30 }}
                    >
                      <MemoFormCardRow
                        view={viewMode}
                        name={item.title}
                        timestamp={new Date(
                          item.created_at
                        ).toLocaleString()}
                        sharedWith={item.shared_with || []}
                        link={
                          activeTab === 'forms'
                            ? `/form/${item.id}`
                            : activeTab === 'quizzes'
                            ? `/userend?quizId=${item.id}`
                            : `/join/${item.id}`
                        }
                        creator={username}
                        formId={item.id}
                        isForm={activeTab === 'forms'}
                        onDelete={
                          activeTab === 'forms'
                            ? handleDeleteForm
                            : handleDeleteQuiz
                        }
                        isPublished={item.is_published}
                        onPublishToggle={
                          activeTab === 'forms'
                            ? handlePublishToggle
                            : handleQuizPublishToggle
                        }
                        quizType={
                          activeTab === 'quizzes'
                            ? item.type || 'blank'
                            : undefined
                        }
                        formType={
                          activeTab === 'forms'
                            ? item.type || 'Forms'
                            : undefined
                        }
                        expanded={expandedCardId === item.id}
                        setExpandedCardId={setExpandedCardId}
                        titleStyle={{ fontWeight: 400, color: isDarkMode ? '#fff' : '#222' }}
                        selected={selectedIds.includes(item.id)}
                        onSelect={handleSelect}
                      />
                    </motion.div>
                  )
                ))}
                <div style={{ height: 30 }} />
              </>
            ) : (
              <motion.div
                className="dashboard-empty-message"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{ color: isDarkMode ? '#ccc' : '#666' }}
              >
                {activeTab === 'forms'
                  ? 'No forms found.'
                  : activeTab === 'livequiz'
                  ? 'No live quizzes found.'
                  : 'No quizzes found.'}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;