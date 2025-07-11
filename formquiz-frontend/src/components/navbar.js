import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { FiClipboard, FiMic, FiHelpCircle, FiChevronDown } from 'react-icons/fi';
import './navbar.css';

const Navbar = ({ activeTab, onToggle }) => {
  const [name, setName] = useState('');
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

  return (
    <nav className="modern-navbar">
      {/* Logo */}
      <div className="inquizo-logo">
        <img src="/MAINLOGO.png" alt="Inquizo Logo" className="inquizo-logo-img" />
      </div>

      {/* Navigation Pills */}
      <div className="nav-pills">
        <button className={`nav-pill${activeTab === 'forms' ? ' active' : ''}`} onClick={() => onToggle && onToggle('forms')}>
          <span className="nav-icon"><FiClipboard /></span>
          My Forms
        </button>
        <button className={`nav-pill${activeTab === 'livequiz' ? ' active' : ''}`} onClick={() => onToggle && onToggle('livequiz')}>
          <span className="nav-icon"><FiMic /></span>
          My Livequiz
        </button>
        <button className={`nav-pill${activeTab === 'quizzes' ? ' active' : ''}`} onClick={() => onToggle && onToggle('quizzes')}>
          <span className="nav-icon"><FiHelpCircle /></span>
          My Quizzes
        </button>
      </div>

      {/* User Profile */}
      <div className="user-profile" ref={dropdownRef}>
        <span className="user-name">{name || 'User'}</span>
        <span className="user-avatar-ring">
          <img
            src={`https://api.dicebear.com/7.x/initials/svg?seed=${name || 'User'}`}
            alt="Profile"
            className="user-avatar"
          />
        </span>
        <span className="dropdown-arrow" onClick={() => setDropdownOpen(!dropdownOpen)}>
          <FiChevronDown />
        </span>
        {dropdownOpen && (
          <div className="dropdown-menu">
            <div className="dropdown-item" onClick={handleProfile}>Profile</div>
            <div className="dropdown-item" onClick={handleViewPlans}>View Plans</div>
            <div className="dropdown-item" onClick={handleLogout}>Logout</div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
