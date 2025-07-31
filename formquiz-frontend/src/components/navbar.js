import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { FiClipboard, FiMic, FiHelpCircle, FiChevronDown } from 'react-icons/fi';

const Navbar = ({
  activeTab,
  onToggle,
  iconSize = 28,
  iconHoverEffect = false,
}) => {
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
    <nav className="px-8 min-h-[72px] max-h-[72px] shadow-sm bg-white border-b border-gray-200 flex items-center justify-between">
      {/* Logo */}
      <div className="min-w-20 flex items-center h-18 overflow-hidden">
        <img
          src="/MAINLOGO.png"
          alt="Inquizo Logo"
          className="max-h-12 w-auto mx-3 object-contain block align-middle"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-end gap-0 bg-transparent rounded-none min-w-[340px] max-w-[480px] h-14 p-0 border-b-2 border-gray-200">
        <div
          className={`flex-1 px-8 h-[54px] flex items-center justify-center font-medium text-base border-none bg-none outline-none cursor-pointer border-b-[3.5px] transition-all duration-200 ${
            activeTab === 'forms'
              ? 'font-bold text-lg text-indigo-600 border-indigo-600'
              : 'text-gray-500 border-transparent'
          }`}
          onClick={() => onToggle && onToggle('forms')}
        >
          <span
            className={`mr-2.5 flex items-center transition-all duration-200 ${
              iconHoverEffect
                ? 'hover:text-blue-500 hover:scale-110'
                : ''
            } ${
              activeTab === 'forms' ? 'text-indigo-600' : 'text-gray-500'
            }`}
            style={{ fontSize: iconSize }}
          >
            <FiClipboard />
          </span>
          My Forms
        </div>
        <div
          className={`flex-1 px-8 h-[54px] flex items-center justify-center font-medium text-base border-none bg-none outline-none cursor-pointer border-b-[3.5px] transition-all duration-200 ${
            activeTab === 'livequiz'
              ? 'font-bold text-lg text-indigo-600 border-indigo-600'
              : 'text-gray-500 border-transparent'
          }`}
          onClick={() => onToggle && onToggle('livequiz')}
        >
          <span
            className={`mr-2.5 flex items-center transition-all duration-200 ${
              iconHoverEffect
                ? 'hover:text-blue-500 hover:scale-110'
                : ''
            } ${
              activeTab === 'livequiz' ? 'text-indigo-600' : 'text-gray-500'
            }`}
            style={{ fontSize: iconSize }}
          >
            <FiMic />
          </span>
          My Livequiz
        </div>
        <div
          className={`flex-1 px-8 h-[54px] flex items-center justify-center font-medium text-base border-none bg-none outline-none cursor-pointer border-b-[3.5px] transition-all duration-200 ${
            activeTab === 'quizzes'
              ? 'font-bold text-lg text-indigo-600 border-indigo-600'
              : 'text-gray-500 border-transparent'
          }`}
          onClick={() => onToggle && onToggle('quizzes')}
        >
          <span
            className={`mr-2.5 flex items-center transition-all duration-200 ${
              iconHoverEffect
                ? 'hover:text-blue-500 hover:scale-110'
                : ''
            } ${
              activeTab === 'quizzes' ? 'text-indigo-600' : 'text-gray-500'
            }`}
            style={{ fontSize: iconSize }}
          >
            <FiHelpCircle />
          </span>
          My Quizzes
        </div>
      </div>

      {/* User Profile */}
      <div className="min-w-[120px] justify-end flex items-center gap-3" ref={dropdownRef}>
        <span className="text-gray-700 font-medium">{name || 'User'}</span>
        <div className="w-8 h-8 rounded-full ring-2 ring-gray-200 overflow-hidden">
          <img
            src={`https://api.dicebear.com/7.x/initials/svg?seed=${name || 'User'}`}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>
        <button
          className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <FiChevronDown />
        </button>
        {dropdownOpen && (
          <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
            <button
              className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors duration-200"
              onClick={handleProfile}
            >
              Profile
            </button>
            <button
              className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors duration-200"
              onClick={handleViewPlans}
            >
              View Plans
            </button>
            <button
              className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors duration-200"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
