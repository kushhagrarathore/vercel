import React, { useState } from 'react';
import './FormsCardRow.css';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaChartBar, FaTimes, FaCopy, FaLink } from 'react-icons/fa';

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
}) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

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
      navigate(`/preview/${formId}`);
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
  };

  const handleCopy = (e) => {
    e.stopPropagation();
    if (link) {
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
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
    if (!isPublished) return null;
    return link ? (
      <div className="share-link-row" onClick={e => e.stopPropagation()}>
        <FaLink style={{ marginRight: 6, color: 'var(--accent)' }} />
        <a href={link} target="_blank" rel="noopener noreferrer" className="share-link-url" style={{ color: '#2563eb', textDecoration: 'underline', wordBreak: 'break-all' }}>{link}</a>
        <button className="copy-link-btn" onClick={handleCopy} title="Copy link">
          {copied ? 'Copied!' : <FaCopy />}
        </button>
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

  // --- Grid View ---
  if (view === 'grid') {
    return (
      <div className={`form-card-balanced grid ${isForm ? 'my-forms-card' : 'my-quizzes-card'}`} onClick={handleEdit} tabIndex={0} role="button" style={{ outline: 'none', position: 'relative' }}>
        {isForm ? <FormTypeSymbol /> : <QuizTypeSymbol />}
        <div className="form-card-title-row">
          <span className={`form-title-balanced ${isForm ? 'my-forms-title' : 'my-quizzes-title'}`} onClick={handleEdit}>{name}</span>
          <ToggleSwitch />
        </div>
        <div className="form-card-date-balanced">{timestamp}</div>
        <ActionButtons />
        <LinkDisplay />
      </div>
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
