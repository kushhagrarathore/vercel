import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from './supabase'; // Ensure this path is correct

const Leaderboard = () => {
  const { quizId } = useParams(); // Or sessionId, depending on what leaderboard you want to show
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  // NOTE: Ensure you have a 'live_leaderboard' view/table in Supabase
  // that aggregates scores for a given quiz_id or session_id.
  // Example SQL for a basic view:
  // CREATE VIEW live_leaderboard AS
  // SELECT
  //     pa.session_id,
  //     pa.participant_id,
  //     p.player_name,
  //     SUM(pa.points_earned) AS total_points
  // FROM
  //     player_answers pa
  // JOIN
  //     participants p ON pa.participant_id = p.id
  // GROUP BY
  //     pa.session_id, pa.participant_id, p.player_name;
  // If you need it by quiz_id, you'd join with quiz_sessions as well.

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      // Fetching by session_id might be more appropriate for a live leaderboard
      // const { data, error } = await supabase
      //   .from('live_leaderboard')
      //   .select('*')
      //   .eq('session_id', sessionId) // If your leaderboard is session-specific
      //   .order('total_points', { ascending: false });

      const { data, error } = await supabase
        .from('live_leaderboard') // Assuming this view/table is set up in Supabase
        .select('player_name, total_points') // Select specific fields relevant to display
        .eq('quiz_id', quizId) // Filter by quiz_id if your view supports it
        .order('total_points', { ascending: false });

      if (!error) {
        setLeaders(data || []);
      } else {
        console.error("Error fetching leaderboard:", error);
      }
      setLoading(false);
    };
    fetchLeaderboard();

    // Subscribe to real-time updates for the leaderboard
    // The filter might need adjustment based on your 'live_leaderboard' view's columns
    const channel = supabase
      .channel('live-leaderboard-' + (quizId || 'all')) // Use quizId for specific leaderboards
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_leaderboard', filter: `quiz_id=eq.${quizId}` }, fetchLeaderboard)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [quizId]); // Re-run effect if quizId changes

  if (loading) return <div className="text-center p-8">Loading leaderboard...</div>;

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Leaderboard</h2>
        {leaders.length === 0 ? (
          <p className="text-gray-600">No players on the leaderboard yet.</p>
        ) : (
          <ol className="list-decimal list-inside text-left">
            {leaders.map((entry, idx) => (
              <li key={entry.participant_id || entry.player_name} className={`flex justify-between items-center py-3 px-4 rounded-lg mb-2 text-lg ${
                idx === 0 ? 'bg-yellow-100 font-bold text-yellow-800' : 'bg-gray-50 text-gray-700'
              }`}>
                <span>{idx + 1}. {entry.player_name}</span>
                <span className="font-semibold">{entry.total_points} pts</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;