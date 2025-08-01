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
    <nav className="modern-navbar" style={{ padding: '0 2vw', minHeight: 72, maxHeight: 72, boxShadow: '0 1px 8px 0 rgba(0,0,0,0.04)', background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {/* Logo */}
      <div className="inquizo-logo" style={{ minWidth: 80, display: 'flex', alignItems: 'center', height: 72, overflow: 'hidden' }}>
        <img src="/MAINLOGO.png" alt="Inquizo Logo" className="inquizo-logo-img" style={{ maxHeight: 48, width: 'auto', margin: '0 12px', objectFit: 'contain', display: 'block', verticalAlign: 'middle' }} />
      </div>

      {/* Navigation Tabs (true tabs, no button look) */}
      <div className="nav-tabs" style={{ display: 'flex', alignItems: 'flex-end', gap: 0, background: 'transparent', borderRadius: 0, minWidth: 340, maxWidth: 480, height: 56, padding: 0, borderBottom: '2.5px solid #e0e7ef' }}>
        <div
          className={`nav-tab${activeTab === 'forms' ? ' active' : ''}`}
          style={{
            flex: 1,
            padding: '0 32px 0 32px',
            height: 54,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: activeTab === 'forms' ? 700 : 500,
            fontSize: activeTab === 'forms' ? 18 : 16,
            color: activeTab === 'forms' ? '#6366f1' : '#64748b',
            border: 'none',
            background: 'none',
            outline: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'forms' ? '3.5px solid #6366f1' : '3.5px solid transparent',
            transition: 'all 0.18s',
          }}
          onClick={() => onToggle && onToggle('forms')}
        >
          <span className="nav-icon" style={{ marginRight: 7, fontSize: 20 }}><FiClipboard /></span> My Forms
        </div>
        <div
          className={`nav-tab${activeTab === 'livequiz' ? ' active' : ''}`}
          style={{
            flex: 1,
            padding: '0 32px 0 32px',
            height: 54,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: activeTab === 'livequiz' ? 700 : 500,
            fontSize: activeTab === 'livequiz' ? 18 : 16,
            color: activeTab === 'livequiz' ? '#6366f1' : '#64748b',
            border: 'none',
            background: 'none',
            outline: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'livequiz' ? '3.5px solid #6366f1' : '3.5px solid transparent',
            transition: 'all 0.18s',
          }}
          onClick={() => onToggle && onToggle('livequiz')}
        >
          <span className="nav-icon" style={{ marginRight: 7, fontSize: 20 }}><FiMic /></span> My Livequiz
        </div>
        <div
          className={`nav-tab${activeTab === 'quizzes' ? ' active' : ''}`}
          style={{
            flex: 1,
            padding: '0 32px 0 32px',
            height: 54,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: activeTab === 'quizzes' ? 700 : 500,
            fontSize: activeTab === 'quizzes' ? 18 : 16,
            color: activeTab === 'quizzes' ? '#6366f1' : '#64748b',
            border: 'none',
            background: 'none',
            outline: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'quizzes' ? '3.5px solid #6366f1' : '3.5px solid transparent',
            transition: 'all 0.18s',
          }}
          onClick={() => onToggle && onToggle('quizzes')}
        >
          <span className="nav-icon" style={{ marginRight: 7, fontSize: 20 }}><FiHelpCircle /></span> My Quizzes
        </div>
      </div>

      {/* User Profile */}
      <div className="user-profile" ref={dropdownRef} style={{ minWidth: 120, justifyContent: 'flex-end' }}>
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
