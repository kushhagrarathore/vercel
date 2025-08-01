import React from 'react';
import { motion } from 'framer-motion';

export default function ResultsPoll({ question, responses, totalParticipants }) {
  if (!question || !responses || totalParticipants === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">No responses yet...</p>
      </div>
    );
  }

  // Calculate percentages for each option
  const optionStats = question.options.map((option, index) => {
    const count = responses[index] || 0;
    const percentage = totalParticipants > 0 ? Math.round((count / totalParticipants) * 100) : 0;
    return {
      option,
      count,
      percentage,
      isCorrect: index === question.correct_answer_index
    };
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-lg shadow-lg p-6"
      >
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Poll Results
        </h2>
        
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-700">
            {question.question_text}
          </h3>
          <p className="text-sm text-gray-500">
            {totalParticipants} participants responded
          </p>
        </div>

        <div className="space-y-4">
          {optionStats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`relative p-4 rounded-lg border-2 transition-all duration-300 ${
                stat.isCorrect 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`font-semibold ${
                  stat.isCorrect ? 'text-green-700' : 'text-gray-700'
                }`}>
                  {stat.option}
                  {stat.isCorrect && (
                    <span className="ml-2 text-green-600">✓ Correct</span>
                  )}
                </span>
                <span className="text-sm font-bold text-gray-600">
                  {stat.count} votes ({stat.percentage}%)
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stat.percentage}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  className={`h-3 rounded-full ${
                    stat.isCorrect ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                />
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Correct answer highlighted in green
          </p>
        </div>
      </motion.div>
    </div>
  );
} 