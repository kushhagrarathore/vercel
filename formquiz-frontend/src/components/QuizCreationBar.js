import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaRegListAlt, FaBroadcastTower, FaCheckSquare, FaPoll, FaStar } from 'react-icons/fa';
import { motion } from 'framer-motion';
import './FormCreationBar.css';

const quizTemplates = [
  {
    title: 'Blank Quiz',
    desc: 'Start from scratch and build your own quiz.',
    icon: <FaRegListAlt size={28} color="#4a6bff" />,
    onClick: (navigate) => navigate('/quiz/create'),
  },
  {
    title: 'Live Quiz',
    desc: 'Host a live, interactive quiz session.',
    icon: <FaBroadcastTower size={28} color="#4a6bff" />,
    onClick: (navigate) => navigate('/quiz/create?type=live'),
  },
  {
    title: 'MCQ Quiz',
    desc: 'Multiple choice quiz template.',
    icon: <FaCheckSquare size={28} color="#4a6bff" />,
    onClick: (navigate) => navigate('/quiz/create?type=mcq'),
  },
  {
    title: 'Poll',
    desc: 'Quick poll for instant feedback.',
    icon: <FaPoll size={28} color="#4a6bff" />,
    onClick: (navigate) => navigate('/quiz/create?type=poll'),
  },
  {
    title: 'Trivia',
    desc: 'Fun trivia quiz template.',
    icon: <FaStar size={28} color="#4a6bff" />,
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
          <div style={{ color: '#666', fontSize: 14, marginTop: 4 }}>{tpl.desc}</div>
        </motion.div>
      ))}
    </div>
  );
};

export default QuizCreationBar; 