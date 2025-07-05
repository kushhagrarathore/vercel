import React from 'react';
import './LiveAudienceView.css';

const LiveAudienceView = ({ responses }) => (
  <div className="live-audience-view">
    <h2>Audience Responses</h2>
    <ul>
      {responses.map((resp, idx) => (
        <li key={idx} className="audience-response-item">
          <span className="audience-response-text">{resp.text}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default LiveAudienceView; 