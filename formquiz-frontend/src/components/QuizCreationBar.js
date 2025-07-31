import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaRegListAlt, FaRobot } from 'react-icons/fa';
import { motion } from 'framer-motion';
import TemplateCard from './shared/TemplateCard';
import './shared/TemplateCard.css';
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
          whileHover={{ scale: 1.04, boxShadow: '0 6px 24px rgba(102,126,234,0.3)' }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <TemplateCard
            icon={<FaRobot size={28} color="white" />}
            label="Generate with AI"
            description="Create quiz questions using AI"
            onClick={() => setShowAIModal(true)}
            style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white'
            }}
          />
        </motion.div>

        {/* Blank Quiz Card */}
        <motion.div
          whileHover={{ scale: 1.04, boxShadow: '0 6px 24px rgba(74,107,255,0.13)' }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <TemplateCard
            icon={<FaRegListAlt size={28} color="#4a6bff" />}
            label="Blank Quiz"
            description="Start from scratch and build your own quiz."
            onClick={() => navigate('/quiz')}
          />
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