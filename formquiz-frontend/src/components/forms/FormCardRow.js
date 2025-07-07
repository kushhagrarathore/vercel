import React, { useState } from 'react';
import './FormsCardRow.css';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaChartBar, FaTimes, FaCopy, FaLink } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import ReactDOM from 'react-dom';

const FormCardRow = ({
  view,
  name,
  timestamp,
  formId,
  isForm,
  onDelete,
  isPublished,
  link,
  onPublishToggle,
  quizType,
  formType,
  expanded,
  setExpandedCardId,
}) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const toggleRef = React.useRef(null);
  const [popoverStyle, setPopoverStyle] = useState({});
  const [popoverCoords, setPopoverCoords] = useState({ top: 0, left: 0 });

  const handleEdit = (e) => {
    if (e) e.stopPropagation();
    if (isForm) {
      navigate(`/builder/${formId}`);
    } else {
      navigate(`/quiz/edit/${formId}`);
    }
  };

  const handlePreview = (e) => {
    e.stopPropagation();
    if (isForm) {
      navigate(`/preview/${formId}?mode=preview`);
    } else {
      navigate(`/quiz/preview/${formId}`);
    }
  };

  const handleResults = (e) => {
    e.stopPropagation();
    if (isForm) {
      navigate(`/results/${formId}`);
    } else {
      navigate(`/quiz/${formId}?tab=results`);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this form?')) return;
    if (onDelete) onDelete(formId);
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    if (onPublishToggle) onPublishToggle(formId, !isPublished);
    if (!isPublished) {
      setTimeout(() => {
        if (toggleRef.current) {
          const rect = toggleRef.current.getBoundingClientRect();
          setPopoverCoords({
            top: rect.bottom + 8,
            left: rect.left + rect.width / 2 - 160 // center popover horizontally
          });
        }
        setPopoverOpen(true);
      }, 100);
    } else {
      setPopoverOpen(false);
    }
  };

  const handleCopy = (e) => {
    e.stopPropagation();
    if (link) {
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  const handleCloseExpand = (e) => {
    e.stopPropagation();
    setExpandedCardId(null);
  };

  const ActionButtons = () => (
    <div className="card-actions-big">
      <button className="card-action-btn" title="Preview" onClick={handlePreview} tabIndex={-1}>
        <FaEye size={18} />
      </button>
      <button className="card-action-btn" title="Results" onClick={handleResults} tabIndex={-1}>
        <FaChartBar size={18} />
      </button>
      <button className="card-action-btn delete" title="Delete" onClick={handleDelete} tabIndex={-1}>
        <FaTimes size={18} />
      </button>
    </div>
  );

  // --- Toggle Switch ---
  const ToggleSwitch = () => (
    <label className={`toggle-switch${isPublished ? ' active' : ''}`} title={isPublished ? 'Deactivate' : 'Activate'} onClick={e => e.stopPropagation()}>
      <input type="checkbox" checked={!!isPublished} onChange={handleToggle} />
      <span className="slider" />
    </label>
  );

  // --- Link Display ---
  const LinkDisplay = () => {
    if (!isPublished || !expanded) return null;
    return link ? (
      <div className="enhanced-share-section">
        <div className="enhanced-share-header">
          <span>Share this form</span>
          <button className="enhanced-close-btn" onClick={handleCloseExpand} title="Close">&times;</button>
        </div>
        <div className="enhanced-link-box">
          <FaLink style={{ marginRight: 8, color: 'var(--accent)' }} />
          <span className="enhanced-link-text">{link}</span>
          <button className="enhanced-copy-btn" onClick={handleCopy} title="Copy link">
            {copied ? 'Copied!' : <FaCopy />}
          </button>
        </div>
        <div className="enhanced-qr-section">
          <QRCodeSVG value={window.location.origin + link} size={80} />
        </div>
      </div>
    ) : (
      <div className="share-link-row" style={{ color: '#aaa', fontStyle: 'italic', fontSize: 13 }}>No public link available</div>
    );
  };

  // --- Quiz Type Symbol ---
  const QuizTypeSymbol = () => {
    if (isForm || !quizType) return null;
    if (quizType === 'live') {
      return (
        <span className="quiz-type-symbol" title="Live Quiz">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff6b81" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="6" fill="#fff0f3"/><path d="M12 8v4l3 2" stroke="#ff6b81" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="10" stroke="#ff6b81" strokeWidth="1.5" fill="none"/></svg>
        </span>
      );
    }
    // Default to blank quiz
    return (
      <span className="quiz-type-symbol" title="Blank Quiz">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4a6bff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="20" rx="4" fill="#f3f4f8"/><rect x="7" y="7" width="10" height="14" rx="2" fill="#fff"/><rect x="9" y="10" width="6" height="2" rx="1" fill="#e0e7ff"/><rect x="9" y="14" width="6" height="2" rx="1" fill="#e0e7ff"/></svg>
      </span>
    );
  };

  // --- Form Type Symbol ---
  const FormTypeSymbol = () => {
    if (!isForm || !formType) return null;
    if (formType === 'Feedback') {
      return (
        <span className="form-type-symbol" title="Feedback Form">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="4" fill="#eafaf3"/><path d="M8 12h8M8 16h5" stroke="#22c55e" strokeWidth="2"/><circle cx="9" cy="9" r="1.5" fill="#22c55e"/></svg>
        </span>
      );
    }
    if (formType === 'Contact') {
      return (
        <span className="form-type-symbol" title="Contact Form">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="4" fill="#eafafc"/><path d="M8 10h8M8 14h8" stroke="#06b6d4" strokeWidth="2"/><circle cx="9" cy="9" r="1.5" fill="#06b6d4"/></svg>
        </span>
      );
    }
    if (formType === 'Survey') {
      return (
        <span className="form-type-symbol" title="Survey Form">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="4" fill="#f9f5ff"/><path d="M8 12h8M8 16h5" stroke="#a855f7" strokeWidth="2"/><circle cx="9" cy="9" r="1.5" fill="#a855f7"/></svg>
        </span>
      );
    }
    // Default to blank form
    return (
      <span className="form-type-symbol" title="Blank Form">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="4" fill="#f3f4f8"/><rect x="7" y="7" width="10" height="10" rx="2" fill="#fff"/><rect x="9" y="10" width="6" height="2" rx="1" fill="#fecaca"/><rect x="9" y="14" width="6" height="2" rx="1" fill="#fecaca"/></svg>
      </span>
    );
  };

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (popoverOpen && toggleRef.current && !toggleRef.current.contains(event.target)) {
        setPopoverOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [popoverOpen]);

  // --- Grid View ---
  if (view === 'grid') {
    return (
      <>
        <div className={`form-card-balanced grid ${isForm ? 'my-forms-card' : 'my-quizzes-card'}`} onClick={handleEdit} tabIndex={0} role="button" style={{ outline: 'none', position: 'relative' }}>
          {isForm ? <FormTypeSymbol /> : <QuizTypeSymbol />}
          <div className="form-card-title-row">
            <span className={`form-title-balanced ${isForm ? 'my-forms-title' : 'my-quizzes-title'}`} onClick={handleEdit}>{name}</span>
            <label ref={toggleRef} className={`toggle-switch${isPublished ? ' active' : ''}`} title={isPublished ? 'Deactivate' : 'Activate'} onClick={handleToggle} style={{zIndex: 2, position: 'relative'}}>
              <input type="checkbox" checked={!!isPublished} onChange={handleToggle} />
              <span className="slider" />
            </label>
          </div>
          <div className="form-card-date-balanced">{timestamp}</div>
          <ActionButtons />
        </div>
        {popoverOpen && isPublished && !!link && ReactDOM.createPortal(
          <div className="pretty-popover portal-popover" style={{ top: popoverCoords.top, left: popoverCoords.left, position: 'absolute' }}>
            <div className="popover-arrow portal-arrow" />
            <button className="popover-close-btn" onClick={() => setPopoverOpen(false)} title="Close">&times;</button>
            <div className="popover-title">Share this form</div>
            <div className="pretty-link-box">
              <FaLink style={{ marginRight: 8, color: 'var(--accent)' }} />
              <span className="pretty-link-text">{link}</span>
              <button className="pretty-copy-btn" onClick={handleCopy} title="Copy link">
                {copied ? 'Copied!' : <FaCopy />}
              </button>
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  // --- List View ---
  return (
    <div className={`form-card-balanced list minimal-row ${isForm ? 'my-forms-card' : 'my-quizzes-card'}`} onClick={handleEdit} tabIndex={0} role="button" style={{ outline: 'none' }}>
      <div className="minimal-cell" style={{ flex: 2, minWidth: 0 }}>
        <span className={`form-title-balanced ${isForm ? 'my-forms-title' : 'my-quizzes-title'}`} onClick={handleEdit}>{name}</span>
      </div>
      <div className="minimal-cell" style={{ flex: 1 }}>
        <span className="form-card-date-balanced">{timestamp}</span>
      </div>
      <div className="minimal-cell"><ToggleSwitch /></div>
      <div className="minimal-cell"><ActionButtons /></div>
      <div className="minimal-cell"><LinkDisplay /></div>
    </div>
  );
};

export default FormCardRow;
