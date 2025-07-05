import React from 'react';
import { generateLiveLink, LiveLinkQRCode } from '../../utils/generateLiveLink';

const ShareModal = ({ roomCode, open, onClose, fillLink, title }) => {
  if (!open) return null;
  // Always generate absolute link using window.location.origin
  const url = fillLink
    ? `${window.location.origin}${fillLink}`
    : generateLiveLink(roomCode);
  const modalTitle = title || 'Share Live Quiz';

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  const handlePreview = () => {
    window.open(url, '_blank');
  };

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content" style={{ background: '#fff', borderRadius: 12, padding: 32, minWidth: 320, position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>×</button>
        <h2 style={{ marginBottom: 16 }}>{modalTitle}</h2>
        <LiveLinkQRCode roomCode={roomCode} size={180} />
        <p style={{ margin: '16px 0', wordBreak: 'break-all', fontSize: 14 }}>{url}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleCopy} style={{ background: '#4a6bff', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, cursor: 'pointer' }}>Copy Link</button>
          <button onClick={handlePreview} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, cursor: 'pointer' }}>Preview Quiz</button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
