import React from 'react';
import './Leaderboard.css';

const Leaderboard = ({ players, showScores = true, topN = null, showAvatars = false }) => {
  const displayPlayers = topN ? players.slice(0, topN) : players;
  return (
    <div className="leaderboard">
      <h2>Leaderboard</h2>
      <ul>
        {displayPlayers.map((player, idx) => (
          <li key={player.id || idx} className="leaderboard-item">
            <span className="leaderboard-rank">{idx + 1}</span>
            {showAvatars && (
              <span className="leaderboard-avatar" style={{
                display: 'inline-block',
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#dbeafe',
                color: '#2563eb',
                fontWeight: 700,
                fontSize: 18,
                textAlign: 'center',
                lineHeight: '28px',
                marginRight: 8
              }}>{player.name?.[0]?.toUpperCase() || '?'}</span>
            )}
            <span className="leaderboard-name">{player.name}</span>
            {showScores && <span className="leaderboard-score">{player.score}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Leaderboard; 