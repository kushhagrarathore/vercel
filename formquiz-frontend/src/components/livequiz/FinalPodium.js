import React from 'react';
import { motion } from 'framer-motion';

export default function FinalPodium({ participants, scores }) {
  if (!participants || participants.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">No participants found...</p>
      </div>
    );
  }

  // Sort participants by score
  const sortedParticipants = participants
    .map(p => ({ ...p, score: scores[p.id] || 0 }))
    .sort((a, b) => b.score - a.score);

  const top3 = sortedParticipants.slice(0, 3);
  const remaining = sortedParticipants.slice(3);

  const podiumPositions = [
    { rank: 2, color: 'bg-gray-300', medal: '🥈', delay: 0.2 },
    { rank: 1, color: 'bg-yellow-400', medal: '🥇', delay: 0 },
    { rank: 3, color: 'bg-orange-400', medal: '🥉', delay: 0.4 }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-lg shadow-lg p-8"
      >
        <h2 className="text-4xl font-bold text-center mb-8 text-gray-800">
          🏆 Final Results
        </h2>

        {/* Podium */}
        <div className="flex justify-center items-end space-x-4 mb-12">
          {podiumPositions.map(({ rank, color, medal, delay }, index) => {
            const participant = top3[index];
            if (!participant) return null;

            return (
              <motion.div
                key={participant.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay }}
                className="flex flex-col items-center"
              >
                <div className={`w-32 h-32 ${color} rounded-t-full flex items-center justify-center mb-4 shadow-lg`}>
                  <div className="text-center">
                    <div className="text-4xl mb-2">{medal}</div>
                    <div className="text-2xl font-bold text-white">
                      {participant.score}
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-800">
                    {participant.username}
                  </div>
                  <div className="text-sm text-gray-600">
                    {participant.score} points
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Remaining Participants */}
        {remaining.length > 0 && (
          <div className="mt-8">
            <h3 className="text-2xl font-bold text-center mb-6 text-gray-700">
              Other Participants
            </h3>
            <div className="max-h-64 overflow-y-auto">
              <div className="grid gap-3">
                {remaining.map((participant, index) => (
                  <motion.div
                    key={participant.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.6 + index * 0.05 }}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-lg font-bold text-gray-500">
                        #{index + 4}
                      </div>
                      <div className="text-lg font-semibold text-gray-800">
                        {participant.username}
                      </div>
                    </div>
                    <div className="text-lg font-bold text-blue-600">
                      {participant.score} pts
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-8 p-6 bg-blue-50 rounded-lg"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {participants.length}
              </div>
              <div className="text-sm text-gray-600">Total Participants</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {Math.max(...Object.values(scores))}
              </div>
              <div className="text-sm text-gray-600">Highest Score</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / participants.length)}
              </div>
              <div className="text-sm text-gray-600">Average Score</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
} 