import React from 'react';
import { motion } from 'framer-motion';
import './TimerBar.css';

const TimerBar = ({ duration, progress }) => {
  return (
    <div className="timer-bar-bg">
      <motion.div
        className="timer-bar-fill"
        initial={{ width: '100%' }}
        animate={{ width: `${progress * 100}%` }}
        transition={{ duration: 0.2 }}
      />
    </div>
  );
};

export default TimerBar; 