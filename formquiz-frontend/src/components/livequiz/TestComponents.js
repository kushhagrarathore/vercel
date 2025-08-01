import React from 'react';
import ResultsPoll from './ResultsPoll';
import FinalPodium from './FinalPodium';

// Test data for ResultsPoll
const testQuestion = {
  id: 1,
  question_text: "What is the capital of France?",
  options: ["London", "Paris", "Berlin", "Madrid"],
  correct_answer_index: 1
};

const testResponses = [5, 15, 3, 2]; // 25 total participants
const testParticipants = 25;

// Test data for FinalPodium
const testParticipantsData = [
  { id: 1, username: "Alice" },
  { id: 2, username: "Bob" },
  { id: 3, username: "Charlie" },
  { id: 4, username: "Diana" },
  { id: 5, username: "Eve" },
  { id: 6, username: "Frank" },
  { id: 7, username: "Grace" },
  { id: 8, username: "Henry" }
];

const testScores = {
  1: 450, // Alice - 1st place
  2: 380, // Bob - 2nd place
  3: 320, // Charlie - 3rd place
  4: 280, // Diana - 4th place
  5: 250, // Eve - 5th place
  6: 220, // Frank - 6th place
  7: 180, // Grace - 7th place
  8: 150  // Henry - 8th place
};

export default function TestComponents() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        <h1 className="text-4xl font-bold text-center mb-8">Component Test Page</h1>
        
        {/* Test ResultsPoll */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6">ResultsPoll Component Test</h2>
          <ResultsPoll 
            question={testQuestion}
            responses={testResponses}
            totalParticipants={testParticipants}
          />
        </div>

        {/* Test FinalPodium */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6">FinalPodium Component Test</h2>
          <FinalPodium 
            participants={testParticipantsData}
            scores={testScores}
          />
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">Test Instructions</h3>
          <ul className="space-y-2 text-gray-700">
            <li>• Verify that the ResultsPoll shows animated progress bars</li>
            <li>• Check that the correct answer (Paris) is highlighted in green</li>
            <li>• Confirm that the FinalPodium displays the top 3 on a podium</li>
            <li>• Verify that remaining participants are listed below</li>
            <li>• Check that animations work smoothly</li>
            <li>• Test responsive design on different screen sizes</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 