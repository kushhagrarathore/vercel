import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/navbar';
import FormCreationBar from '../components/FormCreationBar';
import FormCardRow from '../components/FormCardRow';
import QuizCreationBar from '../components/QuizCreationBar';
import './Dashboard.css';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';
import Skeleton from '../components/Skeleton';
import { useToast } from '../components/Toast';

const Dashboard = () => {
  const location = useLocation();
  const initialTab = localStorage.getItem('dashboardTab') || location.state?.activeTab || 'forms';

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [username, setUsername] = useState('');
  const [forms, setForms] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [activeTab, setActiveTab] = useState(initialTab);
  const toast = useToast();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem('dashboardTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark';
    setIsDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (user && user.email) {
          const { data: profile } = await supabase
            .from('users')
            .select('name')
            .eq('id', user.id)
            .single();
          if (profile?.name) setUsername(profile.name);

          const { data: formData } = await supabase
            .from('forms')
            .select('*')
            .eq('created_by', user.email)
            .order('created_at', { ascending: false });
          if (formData) setForms(formData);

          const { data: quizData } = await supabase
            .from('quizzes')
            .select('*')
            .eq('created_by', user.email)
            .order('created_at', { ascending: false });
          if (quizData) setQuizzes(quizData);
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

  const filteredForms = forms.filter((form) =>
    form.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredQuizzes = quizzes.filter((quiz) =>
    quiz.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentData = activeTab === 'forms' ? filteredForms : filteredQuizzes;

  const handlePublishToggle = async (formId, newStatus) => {
    await supabase.from('forms').update({ is_published: newStatus }).eq('id', formId);
    setForms((prev) => prev.map(f => f.id === formId ? { ...f, is_published: newStatus } : f));
  };

 // Alternative simpler fix for Dashboard.js - replace the existing handleDeleteForm function

// Updated handleDeleteForm function for Dashboard.js

const handleDeleteForm = async (formId) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      toast('User not found', 'error');
      return;
    }

    console.log("🧠 Deleting form:", formId, "for user:", user.id);

    // First, let's verify the form belongs to the current user
    const { data: formToDelete, error: fetchError } = await supabase
      .from('forms')
      .select('*')
      .eq('id', formId)
      .single();

    if (fetchError) {
      console.error("❌ Error fetching form:", fetchError.message);
      toast('Form not found', 'error');
      return;
    }

    // Check ownership using both user_id and created_by (email) for backward compatibility
    const isOwner = formToDelete.user_id === user.id || formToDelete.created_by === user.email;
    
    if (!isOwner) {
      console.error("❌ User doesn't own this form");
      toast('You do not have permission to delete this form', 'error');
      return;
    }

    // Delete associated questions first (if not using CASCADE)
    const { error: questionsDeleteError } = await supabase
      .from('questions')
      .delete()
      .eq('form_id', formId);

    if (questionsDeleteError) {
      console.error("❌ Error deleting questions:", questionsDeleteError.message);
      toast('Failed to delete form questions', 'error');
      return;
    }

    // Delete the form
    const { error: formDeleteError } = await supabase
      .from('forms')
      .delete()
      .eq('id', formId);

    if (formDeleteError) {
      console.error("❌ Delete error:", formDeleteError.message);
      toast('Failed to delete form', 'error');
      return;
    }

    // Update the local state
    setForms((prev) => prev.filter(f => f.id !== formId));
    toast('✅ Form deleted successfully!', 'success');

  } catch (err) {
    console.error("❌ Exception during delete:", err);
    toast('Failed to delete form', 'error');
  }
};



  const handleTabToggle = (tab) => {
    setActiveTab(tab);
  };

  return (
    <>
      <Navbar activeTab={activeTab} onToggle={handleTabToggle} />

      <div className="dashboard-container">
        <div className="dashboard-top">
          <h3 className="section-title text-accent">
            {activeTab === 'forms' ? 'Form Templates' : 'Quiz Templates'}
          </h3>
          {activeTab === 'forms' ? (
            <FormCreationBar />
          ) : (
            <QuizCreationBar />
          )}
        </div>

        <div className="dashboard-bottom">
          <div className="dashboard-controls-row">
            <div className="view-toggle">
              {['grid', 'list'].map((mode) => (
                <button
                  key={mode}
                  className={`toggle-button ${viewMode === mode ? 'active' : ''}`}
                  onClick={() => setViewMode(mode)}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>

            <input
              className="search-bar"
              type="text"
              placeholder="Filter and search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <h4 style={{ fontWeight: 700, fontSize: '1.2em', margin: '18px 0 8px 0' }}>
            {activeTab === 'forms' ? 'Your Forms' : 'Your Quizzes'}
          </h4>

          <motion.div layout className={`table-body ${viewMode}`}>
            <AnimatePresence>
              {loading ? (
                <Skeleton count={4} height={60} />
              ) : currentData.length > 0 ? (
                currentData.map((item, idx) => (
                  <motion.div
                    key={item.id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <FormCardRow
                      view={viewMode}
                      name={item.title}
                      timestamp={new Date(item.created_at).toLocaleString()}
                      sharedWith={item.shared_with || []}
                      link={item.form_url || `/form/${item.id}`}
                      creator={username}
                      formId={item.id}
                      isPublished={item.is_published}
                      onPublishToggle={handlePublishToggle}
                      isForm={activeTab === 'forms'}
                      onDelete={handleDeleteForm}
                    />
                  </motion.div>
                ))
              ) : (
                <p style={{ padding: '1rem', color: 'gray' }}>
                  No {activeTab === 'forms' ? 'forms' : 'quizzes'} created yet.
                </p>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
