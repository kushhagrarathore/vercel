import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import './navbar.css';

const Navbar = ({ activeTab, setActiveTab }) => {
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

  const handleLogout = () => {
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
        <div className="logo">Inquizo</div>
      </div>

      <div className="navbar-right">
        <div className="toggle-theme-section">
          <button className="theme-toggle" onClick={toggleTheme}>
            {isDarkMode ? '☀️' : '🌙'}
          </button>

          <div className="form-quiz-toggle">
            <button
              className={`toggle-button ${activeTab === 'forms' ? 'active' : ''}`}
              onClick={() => setActiveTab('forms')}
            >
              My Forms
            </button>
            <button
              className={`toggle-button ${activeTab === 'quizzes' ? 'active' : ''}`}
              onClick={() => setActiveTab('quizzes')}
            >
              My Quiz
            </button>
          </div>
        </div>

        <button className="view-plans-btn" onClick={handleViewPlans}>
          View Plans
        </button>

        <div className="profile-wrapper" ref={dropdownRef}>
          <div className="profile-section" onClick={() => setDropdownOpen(!dropdownOpen)}>
            <span className="username">{name || 'User'}</span>
            <img
              src={`https://api.dicebear.com/7.x/initials/svg?seed=${name || 'User'}`}
              alt="Profile"
              className="profile-pic"
            />
            <svg className="dropdown-icon" width="16" height="16" viewBox="0 0 20 20">
              <path d="M5 7l5 5 5-5H5z" fill="currentColor" />
            </svg>
          </div>

          {dropdownOpen && (
            <div className="dropdown-menu">
              <div className="dropdown-item" onClick={handleProfile}>Profile</div>
              <div className="dropdown-item" onClick={handleLogout}>Logout</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
