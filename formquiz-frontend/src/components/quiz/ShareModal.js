import React from 'react';
import { generateLiveLink, LiveLinkQRCode } from '../../utils/generateLiveLink';

const ShareModal = ({ quizId, open, onClose }) => {
  if (!open) return null;
  const url = generateLiveLink(quizId);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content" style={{ background: '#fff', borderRadius: 12, padding: 32, minWidth: 320, position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>×</button>
        <h2 style={{ marginBottom: 16 }}>Share Live Quiz</h2>
        <LiveLinkQRCode quizId={quizId} size={180} />
        <p style={{ margin: '16px 0', wordBreak: 'break-all', fontSize: 14 }}>{url}</p>
        <button onClick={handleCopy} style={{ background: '#4a6bff', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, cursor: 'pointer' }}>Copy Link</button>
      </div>
    </div>
  );
};

export default ShareModal;
