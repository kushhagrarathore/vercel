import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../supabase';

const Leaderboard = () => {
  const { quizId } = useParams();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('live_leaderboard')
        .select('*')
        .eq('quiz_id', quizId)
        .order('total_points', { ascending: false });
      if (!error) setLeaders(data || []);
      setLoading(false);
    };
    fetchLeaderboard();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('live-leaderboard-' + quizId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_leaderboard', filter: `quiz_id=eq.${quizId}` }, fetchLeaderboard)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [quizId]);

  if (loading) return <div>Loading leaderboard...</div>;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <h2>Leaderboard</h2>
      <ol style={{ padding: 0, listStyle: 'none' }}>
        {leaders.map((entry, idx) => (
          <li key={entry.user_id} style={{
            background: idx === 0 ? '#fef08a' : '#f3f4f6',
            margin: '8px 0',
            padding: 12,
            borderRadius: 8,
            fontWeight: idx === 0 ? 700 : 500,
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <span>{idx + 1}. {entry.username || 'Anonymous'}</span>
            <span>{entry.total_points} pts</span>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default Leaderboard;
