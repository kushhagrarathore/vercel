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
}) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleEdit = (e) => {
    if (e) e.stopPropagation();
    if (isForm) {
      navigate(`/builder/${formId}`);
    } else {
      navigate(`/quiz/create/${formId}`);
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
      navigate(`/quiz/results/${formId}`);
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

  // --- Grid View ---
  if (view === 'grid') {
    return (
      <div className={`form-card-balanced grid ${isForm ? 'my-forms-card' : 'my-quizzes-card'}`} onClick={handleEdit} tabIndex={0} role="button" style={{ outline: 'none' }}>
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
