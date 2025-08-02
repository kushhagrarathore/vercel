import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaRobot, FaSpinner, FaTimes } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../supabase';
import { generateQuestions } from '../utils/generateQuestions';
import { useToast } from './Toast';

const AIGenerationModal = ({ isOpen, onClose }) => {
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [quizUrl, setQuizUrl] = useState('');
  const toast = useToast();

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast('Please enter a topic', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const sessionCode = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      let result;
      if (process.env.NODE_ENV === 'production') {
        // Use API route in production (Vercel)
        const apiUrl = `${window.location.origin}/api/generate`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic: topic.trim(),
            session_code: sessionCode,
          }),
        });
        result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to generate questions');
        }
      } else {
        // Call function directly in development
        try {
          const data = await generateQuestions(topic.trim(), sessionCode);
          result = { success: true, data };
        } catch (error) {
          throw new Error(error.message || 'Failed to generate questions');
        }
      }

      if (result.success) {
        toast('Quiz generated successfully!', 'success');
        // Extract quiz_id from the first question (all should have the same quiz_id)
        const quizId = result.data && result.data.length > 0 ? result.data[0].quiz_id : undefined;
        
        if (!quizId) {
          throw new Error('No quiz ID found in generated data');
        }
        
        // Generate and save quiz URL
        const url = `/quiz/${quizId}`;
        await supabase.from('quizzes').update({ form_url: url }).eq('id', quizId);
        setQuizUrl(window.location.origin + url);
        setShowQR(true);
        // Optionally, navigate to the quiz editor or dashboard
        // navigate(url);
        // onClose();
      } else {
        throw new Error(result.error || 'Generation failed');
      }
    } catch (error) {
      console.error('AI Generation error:', error);
      toast(`Failed to generate quiz: ${error.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isGenerating) {
      handleGenerate();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Show QR code and URL after creation */}
            {showQR ? (
              <div className="flex flex-col items-center justify-center gap-4">
                <h2 className="text-xl font-bold text-gray-800">Quiz Created!</h2>
                <QRCodeSVG value={quizUrl} size={120} />
                <div className="mt-2 text-blue-700 break-all text-center">
                  <a href={quizUrl} target="_blank" rel="noopener noreferrer" className="underline">{quizUrl}</a>
                </div>
                <button
                  onClick={() => { setShowQR(false); onClose(); }}
                  className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-all"
                >
                  Close
                </button>
              </div>
            ) : (
            <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg">
                  <FaRobot className="text-white text-xl" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Generate Quiz with AI</h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isGenerating}
              >
                <FaTimes size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What topic would you like to create a quiz about?
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="e.g., JavaScript Fundamentals, World History, Math Basics..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={isGenerating}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">What you'll get:</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 10 multiple choice questions</li>
                  <li>• 4 options per question</li>
                  <li>• Correct answers marked</li>
                  <li>• Ready to customize and publish</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !topic.trim()}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FaRobot />
                      Generate Quiz
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  disabled={isGenerating}
                  className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
            </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AIGenerationModal; 