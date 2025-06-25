import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/navbar';
import FormCreationBar from '../components/FormCreationBar';
import FormCardRow from '../components/FormCardRow';
import './Dashboard.css';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';

const Dashboard = () => {
  const location = useLocation();
  const initialTab = location.state?.activeTab || 'forms';

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [username, setUsername] = useState('');
  const [forms, setForms] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark';
    setIsDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
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
        console.error('User not logged in:', userError);
      }
    };

    fetchUserData();
  }, []);
const deleteForm = async (formId) => {
  const { error } = await supabase
    .from('forms')
    .delete()
    .eq('id', formId);

  if (error) {
    console.error('Error deleting form:', error);
    alert('Failed to delete form');
  } else {
    // Update your UI state to remove the form locally after successful delete
    setForms((prevForms) => prevForms.filter(form => form.id !== formId));
  }
};

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

  const handleDeleteForm = (formId) => {
    setForms((prev) => prev.filter(f => f.id !== formId));
  };

  return (
    <>
      <Navbar username={username} setActiveTab={setActiveTab} activeTab={activeTab} />

      <div className="dashboard-container">
        <div className="dashboard-top">
          <h3 className="section-title text-accent">Templates</h3>
          <FormCreationBar />
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

          {viewMode === 'list' && (
            <div className="table-header text-muted">
              <span>File name</span>
              <span>Created</span>
              <span>Created by</span>
              <span>Shared</span>
              <span>Published</span>
            </div>
          )}

          <motion.div layout className={`table-body ${viewMode}`}>
            <AnimatePresence>
              {currentData.length > 0 ? (
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
                      published={item.is_published}
                      link={item.form_url || item.quiz_url}
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
