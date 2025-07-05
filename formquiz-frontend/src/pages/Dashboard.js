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

  const toast = useToast();

  useEffect(() => {
    localStorage.setItem('dashboardTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        console.log("Fetched current user:", user);

        if (user && user.email) {
          // Fetch profile name
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('name')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.error("Error fetching profile:", profileError);
          } else if (profile?.name) {
            setUsername(profile.name);
          }

          // Fetch forms where created_by = email OR user_id = id
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
            toast('Error fetching forms', 'error');
          } else {
            console.log("Fetched forms:", formData);
            setForms(formData || []);
          }

          // Fetch quizzes where created_by = email OR user_id = id
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
            toast('Error fetching quizzes', 'error');
          } else {
            console.log("Fetched quizzes:", quizData);
            setQuizzes(quizData || []);
          }

          // Fetch live quizzes
          const { data: liveQuizData, error: liveQuizError } = await supabase
            .from('live_quizzes')
            .select('quiz_id, is_live')
            .eq('is_live', true);

          if (liveQuizError) {
            console.error("Error fetching live quizzes:", liveQuizError);
          } else {
            console.log("Fetched live quizzes:", liveQuizData);
            setLiveQuizzes(liveQuizData || []);
          }
        } else {
          toast('User not logged in', 'error');
          console.error('User not logged in:', userError);
        }
      } catch (err) {
        toast('Failed to fetch dashboard data', 'error');
        console.error(err);
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

  let currentData;
  if (activeTab === 'forms') {
    currentData = filteredForms;
  } else if (activeTab === 'livequiz') {
    const liveQuizIds = new Set(liveQuizzes.map((lq) => lq.quiz_id));
    currentData = quizzes.filter((q) => liveQuizIds.has(q.id));
  } else if (activeTab === 'quizzes') {
    currentData = filteredQuizzes;
  } else {
    currentData = [];
  }

  const handlePublishToggle = async (formId, newStatus) => {
    await supabase
      .from('forms')
      .update({ is_published: newStatus })
      .eq('id', formId);
    setForms((prev) =>
      prev.map((f) =>
        f.id === formId ? { ...f, is_published: newStatus } : f
      )
    );
  };

  const handleDeleteForm = (formId) => {
    setForms((prev) => prev.filter((f) => f.id !== formId));
  };

  const handleDeleteQuiz = async (quizId) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId)
        .eq('user_id', user?.id);

      if (error) {
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

  const handleQuizPublishToggle = async (quizId, newStatus) => {
    await supabase
      .from('quizzes')
      .update({ is_published: newStatus })
      .eq('id', quizId);
    setQuizzes((prev) =>
      prev.map((q) =>
        q.id === quizId ? { ...q, is_published: newStatus } : q
      )
    );
  };

  const handleTabToggle = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="dashboard-animated-layout">
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
        </div>

        <section
          className={`dashboard-animated-section ${viewMode}`}
        >
          <AnimatePresence>
            {loading ? (
              <Skeleton count={4} height={60} />
            ) : currentData.length > 0 ? (
              currentData.map((item, idx) => (
                <motion.div
                  key={item.id || idx}
                  initial={{ opacity: 0, scale: 0.96, y: 18 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 18 }}
                  transition={{
                    duration: 0.32,
                    type: 'spring',
                  }}
                  className="dashboard-animated-card"
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
                        : item.is_published
                        ? `${window.location.origin}/join/${item.id}`
                        : ''
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
                  />
                </motion.div>
              ))
            ) : (
              <motion.div
                className="dashboard-empty-message"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
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
