import React from 'react';
import './Leaderboard.css';

const Leaderboard = ({ players }) => (
  <div className="leaderboard">
    <h2>Leaderboard</h2>
    <ul>
      {players.map((player, idx) => (
        <li key={player.id} className="leaderboard-item">
          <span className="leaderboard-rank">{idx + 1}</span>
          <span className="leaderboard-name">{player.name}</span>
          <span className="leaderboard-score">{player.score}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default Leaderboard; 