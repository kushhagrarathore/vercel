import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaRegListAlt, FaBroadcastTower, FaCheckSquare, FaPoll, FaStar, FaRobot } from 'react-icons/fa';
import { motion } from 'framer-motion';
import './FormCreationBar.css';
import AIGenerationModal from './AIGenerationModal';

const quizTemplates = [
  {
    title: 'Blank Quiz',
    desc: 'Start from scratch and build your own quiz.',
    icon: <FaRegListAlt size={28} color="#4a6bff" />,
    onClick: (navigate) => navigate('/quiz'),
  },
  {
    title: 'Live Quiz',
    desc: 'Host a live, interactive quiz session.',
    icon: <FaBroadcastTower size={28} color="#4a6bff" />,
    onClick: (navigate) => navigate('/quiz/create'),
  },
  {
    title: 'MCQ Quiz',
    desc: 'Multiple choice quiz template.',
    icon: <FaCheckSquare size={28} color="#4a6bff" />,
    onClick: (navigate) => navigate('/quiz/create'),
  },
  {
    title: 'Poll',
    desc: 'Quick poll for instant feedback.',
    icon: <FaPoll size={28} color="#4a6bff" />,
    onClick: (navigate) => navigate('/quiz/create'),
  },
  {
    title: 'Trivia',
    desc: 'Fun trivia quiz template.',
    icon: <FaStar size={28} color="#4a6bff" />,
    onClick: (navigate) => navigate('/quiz/create'),
  },
];

const QuizCreationBar = () => {
  const navigate = useNavigate();
  const [showAIModal, setShowAIModal] = useState(false);

  return (
    <>
      <div className="template-section">
        {/* AI Generation Card - Special styling */}
        <motion.div
          className="template-card"
          style={{ 
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}
          whileHover={{ scale: 1.04, boxShadow: '0 6px 24px rgba(102,126,234,0.3)' }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          onClick={() => setShowAIModal(true)}
        >
          <div className="file-icon" style={{ marginBottom: 8 }}>
            <FaRobot size={28} color="white" />
          </div>
          <div className="template-label" style={{ fontWeight: 700, fontSize: 17, color: 'white' }}>
            Generate with AI
          </div>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 }}>
            Create quiz questions using AI
          </div>
        </motion.div>

        {/* Regular template cards */}
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

      <AIGenerationModal 
        isOpen={showAIModal} 
        onClose={() => setShowAIModal(false)} 
      />
    </>
  );
};

export default QuizCreationBar; 