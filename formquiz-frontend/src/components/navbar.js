import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { FaWpforms, FaQuestionCircle } from 'react-icons/fa';
import './navbar.css';

const Navbar = ({ activeTab, onToggle }) => {
  const [name, setName] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserName = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setName(data.name);
        }
      }
    };
    fetchUserName();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    navigate('/login');
  };

  const handleProfile = () => navigate('/profile');
  const handleViewPlans = () => navigate('/plans');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark';
    setIsDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme ? 'dark' : 'light');
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  return (
    <div className="top-navbar">
      <div className="navbar-left">
        <div className="logo" style={{ fontWeight: 500, color: '#7c3aed', opacity: 0.85, letterSpacing: '-0.5px' }}>Inquizo</div>
      </div>

      <div className="navbar-right">
        <div className="form-quiz-toggle modern-tabs">
          <button
            className={`tab-btn${activeTab === 'forms' ? ' active' : ''}`}
            onClick={() => onToggle && onToggle('forms')}
            aria-label="My Forms"
            style={{ fontWeight: activeTab === 'forms' ? 500 : 400, color: activeTab === 'forms' ? '#7c3aed' : '#7c3aed99', letterSpacing: '-0.2px' }}
          >
            <FaWpforms style={{ marginRight: 6, fontSize: 18, color: activeTab === 'forms' ? '#7c3aed' : '#7c3aed77' }} />
            My Forms
          </button>
          <button
            className={`tab-btn livequiz-switch${activeTab === 'livequiz' ? ' active' : ''}`}
            onClick={() => onToggle && onToggle('livequiz')}
            aria-label="My Livequiz"
            style={{ fontWeight: activeTab === 'livequiz' ? 500 : 400, color: activeTab === 'livequiz' ? '#ef4444' : '#ef444499', letterSpacing: '-0.2px' }}
          >
            <span style={{ marginRight: 6, fontSize: 18, color: activeTab === 'livequiz' ? '#ef4444' : '#ef444477' }}>🔴</span>
            My Livequiz
          </button>
          <button
            className={`tab-btn myquizzes${activeTab === 'quizzes' ? ' active' : ''}`}
            onClick={() => onToggle && onToggle('quizzes')}
            aria-label="My Quizzes"
            style={{ fontWeight: activeTab === 'quizzes' ? 500 : 400, color: activeTab === 'quizzes' ? '#7c3aed' : '#7c3aed99', letterSpacing: '-0.2px' }}
          >
            <FaQuestionCircle style={{ marginRight: 6, fontSize: 18, color: activeTab === 'quizzes' ? '#7c3aed' : '#7c3aed77' }} />
            My Quizzes
          </button>
        </div>

        <div className="profile-wrapper" ref={dropdownRef}>
          <div className="profile-section" onClick={() => setDropdownOpen(!dropdownOpen)}>
            <span className="username" style={{ fontWeight: 400, color: '#3b3663' }}>{name || 'User'}</span>
            <img
              src={`https://api.dicebear.com/7.x/initials/svg?seed=${name || 'User'}`}
              alt="Profile"
              className="profile-pic"
              style={{ border: '1px solid #ede9fe', opacity: 0.92 }}
            />
            <svg className="dropdown-icon" width="16" height="16" viewBox="0 0 20 20">
              <path d="M5 7l5 5 5-5H5z" fill="currentColor" />
            </svg>
          </div>

          {dropdownOpen && (
            <div className="dropdown-menu">
              <div className="dropdown-item" onClick={handleProfile} style={{ fontWeight: 400 }}>Profile</div>
              <div className="dropdown-item" onClick={toggleTheme} style={{ fontWeight: 400 }}>
                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
              </div>
              <div className="dropdown-item" onClick={handleViewPlans} style={{ fontWeight: 400 }}>View Plans</div>
              <div className="dropdown-item" onClick={handleLogout} style={{ fontWeight: 400 }}>Logout</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
