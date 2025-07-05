import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaRegListAlt, FaRobot } from 'react-icons/fa';
import { motion } from 'framer-motion';
import './QuizCreationBar.css';
import AIGenerationModal from './AIGenerationModal';

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

        {/* Blank Quiz Card */}
        <motion.div
          className="template-card"
          style={{ cursor: 'pointer' }}
          whileHover={{ scale: 1.04, boxShadow: '0 6px 24px rgba(74,107,255,0.13)' }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          onClick={() => navigate('/quiz')}
        >
          <div className="file-icon" style={{ marginBottom: 8 }}>
            <FaRegListAlt size={28} color="#4a6bff" />
          </div>
          <div className="template-label" style={{ fontWeight: 700, fontSize: 17 }}>
            Blank Quiz
          </div>
          <div style={{ color: '#666', fontSize: 14, marginTop: 4 }}>
            Start from scratch and build your own quiz.
          </div>
        </motion.div>
      </div>

      <AIGenerationModal 
        isOpen={showAIModal} 
        onClose={() => setShowAIModal(false)} 
      />
    </>
  );
};

export default QuizCreationBar; 