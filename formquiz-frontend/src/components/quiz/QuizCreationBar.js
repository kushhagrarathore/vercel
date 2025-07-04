import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import '../forms/FormCreationBar.css';

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
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4a6bff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="20" rx="4" fill="#f3f4f8"/>
          <rect x="7" y="7" width="10" height="14" rx="2" fill="#fff"/>
          <rect x="9" y="10" width="6" height="2" rx="1" fill="#e0e7ff"/>
          <rect x="9" y="14" width="6" height="2" rx="1" fill="#e0e7ff"/>
        </svg>
      </span>
    ),
    onClick: (navigate) => navigate('/quiz'),
  },
];

const QuizCreationBar = () => {
  const navigate = useNavigate();
  return (
    <div className="template-section">
      {quizTemplates.map((tpl) => (
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
