import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabase';

const Lobby = () => {
  const { roomCode, participantId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { username, emoji } = location.state || {};
  const [lobbyParticipants, setLobbyParticipants] = useState([]);
  const [liveQuiz, setLiveQuiz] = useState(null);

  // Subscribe to all participants in the lobby (status: 'waiting') for this room
  useEffect(() => {
    if (!roomCode) return;
    let channel;
    const fetchLobbyParticipants = async () => {
      const { data } = await supabase
        .from('participants')
        .select('id, name, emoji')
        .eq('session_code', roomCode)
        .eq('status', 'waiting');
      setLobbyParticipants(data || []);
    };
    channel = supabase
      .channel('lobby-participants-' + roomCode)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `session_code=eq.${roomCode},status=eq.waiting` }, fetchLobbyParticipants)
      .subscribe();
    fetchLobbyParticipants();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [roomCode]);

  // Subscribe to session for phase change
  useEffect(() => {
    if (!roomCode || !participantId) return;
    let channel;
    const fetchSession = async () => {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', roomCode)
        .single();
      setLiveQuiz(data);
      if (data?.phase === 'question' && data.is_live) {
        // Host started quiz, navigate to quiz answering page
        navigate(`/quiz/live/${roomCode}/${participantId}`, { replace: true, state: { username, emoji } });
      }
    };
    channel = supabase
      .channel('live-quiz-' + roomCode)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `code=eq.${roomCode}` }, (payload) => {
        setLiveQuiz(payload.new);
        if (payload.new?.phase === 'question' && payload.new.is_live) {
          navigate(`/quiz/live/${roomCode}/${participantId}`, { replace: true, state: { username, emoji } });
        }
      })
      .subscribe();
    fetchSession();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [roomCode, participantId, navigate, username, emoji]);

  // Spiral layout calculation
  const spiralCoords = (idx, total, centerX, centerY, a = 18, b = 18) => {
    // Archimedean spiral: r = a + b*theta
    const theta = 1.5 * Math.PI + (2 * Math.PI * idx) / Math.max(1, total) * 2;
    const r = a + b * theta;
    return {
      left: centerX + r * Math.cos(theta),
      top: centerY + r * Math.sin(theta),
    };
  };
  const centerX = 120, centerY = 80;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(245,247,250,0.95)', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(60,60,100,0.10)', padding: 36, minWidth: 320, maxWidth: 420, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <div style={{ fontWeight: 800, fontSize: 28, color: '#2563eb', marginBottom: 18 }}>Waiting for host to start the quiz...</div>
        <div style={{ fontWeight: 600, fontSize: 20, color: '#374151', marginBottom: 8 }}>Hi, {username}!</div>
        <div style={{ color: '#888', fontSize: 16, marginBottom: 18 }}>Share this code to join:</div>
        <div style={{ fontWeight: 900, fontSize: 32, color: '#2563eb', marginBottom: 18, letterSpacing: 2, background: '#e0e7ff', borderRadius: 12, padding: '8px 24px', boxShadow: '0 2px 8px rgba(60,60,100,0.10)' }}>{roomCode}</div>
        <div style={{ position: 'relative', width: 260, height: 180, margin: '0 auto', overflow: 'visible' }}>
          {lobbyParticipants.map((p, idx) => {
            const { left, top } = spiralCoords(idx, lobbyParticipants.length, centerX, centerY);
            return (
              <div key={p.id} style={{
                position: 'absolute',
                left,
                top,
                transition: 'all 0.7s cubic-bezier(.68,-0.55,.27,1.55)',
                animation: `spiralbounce 1.2s ${0.1 * idx}s infinite alternate`,
                zIndex: 2,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}>
                <div style={{ fontSize: 38, background: '#f1f5f9', borderRadius: '50%', padding: 10, boxShadow: '0 2px 8px rgba(60,60,100,0.10)', border: '2.5px solid #dbeafe' }}>{p.emoji || '😀'}</div>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#374151', marginTop: 4 }}>{p.name}</div>
              </div>
            );
          })}
          <style>{`@keyframes spiralbounce { 0% { transform: translateY(0); } 100% { transform: translateY(-18px); } }`}</style>
        </div>
      </div>
    </div>
  );
};

export default Lobby; 