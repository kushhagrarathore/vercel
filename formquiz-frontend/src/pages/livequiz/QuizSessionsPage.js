import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase.js';

export default function QuizSessionsPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchSessions() {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('lq_sessions')
          .select('*')
          .eq('quiz_id', quizId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setSessions(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, [quizId]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-red-500 text-center">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 flex flex-col items-center w-full">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow p-4 mb-8">
        <div className="font-bold text-2xl mb-4 text-center">Past Sessions</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-2">Session ID</th>
                <th className="py-2 px-2">Date & Time</th>
                <th className="py-2 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(session => (
                <tr key={session.id} className="hover:bg-blue-50 border-b border-gray-100 transition">
                  <td className="py-2 px-2 font-mono text-xs">{session.id}</td>
                  <td className="py-2 px-2">{session.created_at ? new Date(session.created_at).toLocaleString() : '-'}</td>
                  <td className="py-2 px-2">
                    <button
                      className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-800 transition-all font-semibold"
                      onClick={() => navigate(`/admin/${quizId}/summary/${session.id}`)}
                    >
                      View Summary
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <button onClick={() => navigate(-1)} className="px-6 py-3 bg-gray-700 text-white rounded-xl font-bold shadow hover:bg-gray-900 transition-all">Back</button>
    </div>
  );
} 