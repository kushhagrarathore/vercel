import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaRegListAlt, FaBroadcastTower, FaCheckSquare, FaPoll, FaStar } from 'react-icons/fa';
import { motion } from 'framer-motion';
import './FormCreationBar.css';

const quizTemplates = [
  {
    title: 'Blank Quiz',
    desc: 'Start from scratch and build your own quiz.',
    icon: (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 44,
        borderRadius: 12,
        background: '#f3f4f8',
        marginBottom: 0,
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4a6bff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="20" rx="4" fill="#f3f4f8"/><rect x="7" y="7" width="10" height="14" rx="2" fill="#fff"/><rect x="9" y="10" width="6" height="2" rx="1" fill="#e0e7ff"/><rect x="9" y="14" width="6" height="2" rx="1" fill="#e0e7ff"/></svg>
      </span>
    ),
    onClick: (navigate) => navigate('/quiz/create'),
  },
  {
    title: 'Live Quiz',
    desc: 'Host a live, interactive quiz session.',
    icon: (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 44,
        borderRadius: 12,
        background: '#ffeaea',
        marginBottom: 0,
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff6b81" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="6" fill="#fff0f3"/><path d="M12 8v4l3 2" stroke="#ff6b81" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="10" stroke="#ff6b81" strokeWidth="1.5" fill="none"/></svg>
      </span>
    ),
    onClick: (navigate) => navigate('/live-quiz'),
  },
  {
    title: 'MCQ Quiz',
    desc: 'Multiple choice quiz template.',
    icon: (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 44,
        borderRadius: 12,
        background: '#eafaf3',
        marginBottom: 0,
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="4" fill="#eafaf3"/><polyline points="8 12 11 15 16 10" stroke="#22c55e" strokeWidth="2" fill="none"/></svg>
      </span>
    ),
    onClick: (navigate) => navigate('/quiz/create?type=mcq'),
  },
  {
    title: 'Poll',
    desc: 'Quick poll for instant feedback.',
    icon: (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 44,
        borderRadius: 12,
        background: '#eafafc',
        marginBottom: 0,
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10" width="3" height="8" rx="1.5" fill="#e0f7fa"/><rect x="10.5" y="6" width="3" height="12" rx="1.5" fill="#b2f5ea"/><rect x="16" y="13" width="3" height="5" rx="1.5" fill="#67e8f9"/></svg>
      </span>
    ),
    onClick: (navigate) => navigate('/quiz/create?type=poll'),
  },
  {
    title: 'Trivia',
    desc: 'Fun trivia quiz template.',
    icon: (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 44,
        borderRadius: 12,
        background: '#f9f5ff',
        marginBottom: 0,
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8" fill="#f3e8ff"/><path d="M12 8v4l2 2" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </span>
    ),
    onClick: (navigate) => navigate('/quiz/create?type=trivia'),
  },
];

const QuizCreationBar = () => {
  const navigate = useNavigate();
  return (
    <div className="template-section">
      {quizTemplates.map((tpl, idx) => (
        <motion.div
          className="template-card"
          key={tpl.title}
          whileHover={{ scale: 1.04, boxShadow: '0 6px 24px rgba(74,107,255,0.13)' }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          onClick={() => tpl.onClick(navigate)}
          style={{ cursor: 'pointer' }}
        >
          <div className="file-icon" style={{ marginBottom: 8 }}>{tpl.icon}</div>
          <div className="template-label" style={{ fontWeight: 700, fontSize: 17 }}>{tpl.title}</div>
          <div className="template-desc">{tpl.desc}</div>
        </motion.div>
      ))}
    </div>
  );
};

export default QuizCreationBar; 