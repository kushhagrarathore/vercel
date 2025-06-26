import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './PublishModal.css';

const PublishModal = ({ open, onClose, link }) => {
  if (!open) return null;
  return (
    <div className="publish-modal-overlay" onClick={onClose}>
      <div className="publish-modal-card" onClick={e => e.stopPropagation()}>
        <button className="publish-modal-close" onClick={onClose} aria-label="Close">×</button>
        <h2 className="publish-modal-title">Quiz Published!</h2>
        <div className="publish-modal-link-row">
          <input className="publish-modal-link" value={link} readOnly />
          <button className="publish-modal-copy" onClick={() => {navigator.clipboard.writeText(link)}}>Copy</button>
        </div>
        <div className="publish-modal-qr">
          <QRCodeSVG value={link} size={120} />
        </div>
        <a className="publish-modal-golive" href={link} target="_blank" rel="noopener noreferrer">Go to Live Quiz</a>
      </div>
    </div>
  );
};

export default PublishModal; 