import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase.js';
// import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'; // Uncomment if recharts is installed

export default function AdminSummaryPage() {
  const { quizId, sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        let sessionData;
        if (sessionId) {
          // Fetch specific session by ID
          const { data, error } = await supabase
            .from('lq_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();
          if (error || !data) throw new Error('Session not found');
          sessionData = data;
        } else {
          // Fetch latest session for quiz
          const { data, error } = await supabase
            .from('lq_sessions')
            .select('*')
            .eq('quiz_id', quizId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          if (error || !data) throw new Error('Session not found');
          sessionData = data;
        }
        setSession(sessionData);
        // Fetch participants
        const { data: partData, error: partError } = await supabase
          .from('lq_session_participants')
          .select('*')
          .eq('session_id', sessionData.id);
        if (partError) throw partError;
        setParticipants(partData || []);
        // Fetch questions
        const { data: qData, error: qError } = await supabase
          .from('lq_questions')
          .select('*')
          .eq('quiz_id', quizId)
          .order('created_at', { ascending: true });
        if (qError) throw qError;
        setQuestions(qData || []);
        // Fetch responses
        const { data: respData, error: respError } = await supabase
          .from('lq_live_responses')
          .select('*')
          .eq('session_id', sessionData.id);
        if (respError) throw respError;
        setResponses(respData || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [quizId, sessionId]);

  // Helper: build leaderboard data
  const leaderboard = participants.map(p => {
    const userResponses = responses.filter(r => r.participant_id === p.id);
    const correct = userResponses.filter(r => {
      const q = questions.find(q => q.id === r.question_id);
      return q && r.selected_option_index === q.correct_answer_index;
    }).length;
    const wrong = userResponses.length - correct;
    const score = userResponses.reduce((sum, r) => sum + (r.points_awarded || 0), 0);
    return {
      ...p,
      score,
      correct,
      wrong,
    };
  }).sort((a, b) => b.score - a.score);

  // Helper: poll breakdown per question
  function getPollData(q) {
    const counts = Array(q.options.length).fill(0);
    responses.forEach(r => {
      if (r.question_id === q.id && typeof r.selected_option_index === 'number') {
        counts[r.selected_option_index]++;
      }
    });
    return counts;
  }

  // Export as CSV (optional)
  function exportCSV() {
    let csv = 'Name,Score,Correct,Wrong\n';
    leaderboard.forEach(row => {
      csv += `${row.username || ''},${row.score},${row.correct},${row.wrong}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz-summary-${quizId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-red-500 text-center">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 flex flex-col items-center w-full">
      {/* Session Details */}
      <div className="w-full max-w-5xl bg-white rounded-xl shadow p-4 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="font-bold text-lg text-blue-700">Quiz Code: <span className="text-gray-800">{session.code}</span></div>
          <div className="text-gray-600 text-sm">Session ID: {session.id}</div>
          <div className="text-gray-600 text-sm">Participants: {participants.length}</div>
          <div className="text-gray-600 text-sm">Questions: {questions.length}</div>
        </div>
        <div className="text-gray-600 text-sm">
          <div>Start: {session.created_at ? new Date(session.created_at).toLocaleString() : '-'}</div>
          <div>End: {session.ended_at ? new Date(session.ended_at).toLocaleString() : '-'}</div>
        </div>
        <button onClick={exportCSV} className="px-4 py-2 bg-green-600 text-white rounded font-bold shadow hover:bg-green-700 transition-all">Export CSV</button>
      </div>
      {/* Leaderboard Table */}
      <div className="w-full max-w-5xl bg-white rounded-xl shadow p-4 mb-8 overflow-x-auto">
        <div className="font-bold text-2xl mb-4 text-center">Full Leaderboard</div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-2">#</th>
              <th className="py-2 px-2">Name</th>
              <th className="py-2 px-2">Score</th>
              <th className="py-2 px-2">Correct</th>
              <th className="py-2 px-2">Wrong</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((row, i) => (
              <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="py-2 px-2 font-bold">{i + 1}</td>
                <td className="py-2 px-2">{row.username || '—'}</td>
                <td className="py-2 px-2">{row.score}</td>
                <td className="py-2 px-2">{row.correct}</td>
                <td className="py-2 px-2">{row.wrong}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Question Polls Accordion */}
      <div className="w-full max-w-5xl bg-white rounded-xl shadow p-4 mb-8">
        <div className="font-bold text-2xl mb-4 text-center">Question Breakdown</div>
        {questions.map((q, idx) => {
          const poll = getPollData(q);
          const total = poll.reduce((a, b) => a + b, 0) || 1;
          return (
            <details key={q.id} className="mb-4 border rounded-lg">
              <summary className="cursor-pointer font-semibold text-lg px-4 py-2 bg-gray-100 rounded-t-lg">Q{idx + 1}: {q.question_text}</summary>
              <div className="p-4">
                <ul className="mb-4">
                  {q.options.map((opt, i) => (
                    <li key={i} className="flex items-center gap-4 mb-2">
                      <span className={`px-3 py-1 rounded-lg font-semibold ${i === q.correct_answer_index ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{opt}</span>
                      <div className="flex-1 h-4 bg-gray-200 rounded overflow-hidden">
                        <div
                          className={i === q.correct_answer_index ? 'bg-green-400' : 'bg-blue-400'}
                          style={{ width: `${Math.round((poll[i] / total) * 100)}%`, height: '100%' }}
                        />
                      </div>
                      <span className="w-10 text-right">{poll[i]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          );
        })}
      </div>
      <button onClick={() => navigate(-1)} className="px-6 py-3 bg-gray-700 text-white rounded-xl font-bold shadow hover:bg-gray-900 transition-all">Back</button>
    </div>
  );
} 