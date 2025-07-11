import React, { useState } from 'react';
import './FormsCardRow.css';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaChartBar, FaTimes, FaCopy, FaLink, FaEdit, FaTrash, FaCheck } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import ReactDOM from 'react-dom';

const typeColors = {
  Feedback: '#34d399',
  Survey: '#a78bfa',
  Contact: '#60a5fa',
  Blank: '#fbbf24',
  Forms: '#6366f1',
  Quiz: '#7c3aed',
  Live: '#ef4444',
  blank: '#7c3aed',
};

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
  titleStyle, // add this prop
  selected = false, // add selected prop
  onSelect, // add onSelect prop
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
      navigate(`/forms/${formId}/results`);
    } else {
      navigate(`/quiz/${formId}/results`);
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
    // Remove logic that opens popover on activation
    setPopoverOpen(false);
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

  // Fix fullLink construction to avoid duplicate domains
  const fullLink = link
    ? link.startsWith('http://') || link.startsWith('https://')
      ? link
      : `${window.location.origin}${link}`
    : '';

  const handleShare = (e) => {
    e.stopPropagation();
    if (fullLink) {
      navigator.clipboard.writeText(fullLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  const handlePreviewOnly = (e) => {
    e.stopPropagation();
    if (isForm) {
      navigate(`/preview/${formId}?mode=preview`);
    } else {
      navigate(`/quiz/preview/${formId}`);
    }
  };

  // Add main card click handler
  const handleCardClick = (e) => {
    if (isForm) {
      navigate(`/builder/${formId}`);
    } else {
      navigate(`/quiz/edit/${formId}`);
    }
  };

  // Update ActionButtons to be minimal:
  const ActionButtons = () => (
    <div className="card-actions-big" style={{ display: 'flex', gap: 10, marginTop: 8 }}>
      <button
        className="card-action-btn"
        title="Preview"
        onClick={handlePreview}
        tabIndex={-1}
        style={{
          background: 'none',
          border: 'none',
          padding: 6,
          borderRadius: 6,
          color: '#6366f1',
          fontSize: 18,
          cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseOver={e => { e.currentTarget.style.background = '#ede9fe'; e.currentTarget.style.color = '#4f46e5'; }}
        onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#6366f1'; }}
      >
        <FaEye size={18} />
      </button>
      <button
        className="card-action-btn"
        title="Results"
        onClick={handleResults}
        tabIndex={-1}
        style={{
          background: 'none',
          border: 'none',
          padding: 6,
          borderRadius: 6,
          color: '#22c55e',
          fontSize: 18,
          cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseOver={e => { e.currentTarget.style.background = '#e0f2fe'; e.currentTarget.style.color = '#16a34a'; }}
        onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#22c55e'; }}
      >
        <FaChartBar size={18} />
      </button>
      <button
        className="card-action-btn"
        title="Link"
        onClick={handleShare}
        tabIndex={-1}
        style={{
          background: 'none',
          border: 'none',
          padding: 6,
          borderRadius: 6,
          color: '#0ea5e9',
          fontSize: 18,
          cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseOver={e => { e.currentTarget.style.background = '#e0f2fe'; e.currentTarget.style.color = '#0369a1'; }}
        onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#0ea5e9'; }}
      >
        <FaLink size={18} />
      </button>
      <button
        className="card-action-btn delete"
        title="Delete"
        onClick={handleDelete}
        tabIndex={-1}
        style={{
          background: 'none',
          border: 'none',
          padding: 6,
          borderRadius: 6,
          color: '#ef4444',
          fontSize: 18,
          cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseOver={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#b91c1c'; }}
        onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#ef4444'; }}
      >
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
    // Determine accent color and type label
    const accentColor = isForm
      ? typeColors[formType] || '#6366f1'
      : quizType === 'live'
        ? typeColors['Live']
        : typeColors[quizType] || typeColors['Quiz'];
    const typeLabel = isForm
      ? formType || 'Forms'
      : quizType === 'live'
        ? 'Live Quiz'
        : quizType || 'Quiz';

    return (
      <div
        className={`modern-form-card${expanded ? ' expanded' : ''}`}
        style={{
          boxShadow: '0 4px 24px rgba(80, 80, 180, 0.08)',
          borderRadius: 18,
          background: '#fff',
          border: '1.5px solid #f3f4f6',
          transition: 'box-shadow 0.22s, transform 0.18s',
          position: 'relative',
          overflow: 'hidden',
          minHeight: 120,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          cursor: 'pointer',
          ...(expanded ? { boxShadow: '0 8px 32px rgba(80,80,180,0.16)', transform: 'scale(1.03)' } : {}),
        }}
        onClick={handleCardClick}
        tabIndex={0}
        role="button"
      >
        {/* Accent bar */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: 6,
          background: accentColor,
          borderTopLeftRadius: 18,
          borderBottomLeftRadius: 18,
        }} />
        {/* Top-right flex container for checkbox and toggle */}
        <div className="formcard-topright-controls">
          <div
            className={`formcard-checkbox${selected ? ' selected' : ''}`}
            onClick={e => {
              e.stopPropagation();
              onSelect && onSelect(formId, !selected);
            }}
            title="Select"
            tabIndex={0}
            aria-checked={selected}
            role="checkbox"
            onKeyDown={e => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                onSelect && onSelect(formId, !selected);
              }
            }}
          >
            {selected && <FaCheck color="#fff" size={16} style={{ transition: 'opacity 0.18s' }} />}
          </div>
          <ToggleSwitch />
        </div>
        <div style={{ padding: '18px 18px 12px 28px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            {/* Multi-select button (circle) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Title */}
              <div className="form-card-title" style={titleStyle || { fontWeight: 400, color: '#222' }}>{name}</div>
            </div>
            {/* Toggle Switch */}
            <ToggleSwitch />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              color: isPublished ? '#22c55e' : '#f59e42',
              background: isPublished ? 'rgba(34,197,94,0.08)' : 'rgba(251,191,36,0.10)',
              borderRadius: 8,
              padding: '2px 10px',
            }}>{isPublished ? 'Published' : 'Draft'}</span>
            <span style={{ fontSize: 12, color: accentColor, fontWeight: 600, background: 'rgba(99,102,241,0.07)', borderRadius: 8, padding: '2px 8px' }}>{typeLabel}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
            <button className="card-action-btn edit" title="Preview" onClick={handlePreviewOnly} tabIndex={-1} style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 18, cursor: 'pointer' }}>
              <FaEye />
            </button>
            <button className="card-action-btn results" title="Results" onClick={handleResults} tabIndex={-1} style={{ background: 'none', border: 'none', color: '#22c55e', fontSize: 18, cursor: 'pointer' }}>
              <FaChartBar />
            </button>
            <button className="card-action-btn share" title={copied ? 'Copied!' : fullLink} onClick={handleShare} tabIndex={-1} style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: 18, cursor: 'pointer' }}>
              {copied ? 'Copied!' : <FaLink />}
            </button>
            <button className="card-action-btn delete" title="Delete" onClick={handleDelete} tabIndex={-1} style={{ background: 'none', border: 'none', color: '#f87171', fontSize: 18, cursor: 'pointer' }}>
              <FaTrash />
            </button>
          </div>
        </div>
        {/* Always show the link for all cards */}
        {fullLink && (
          <div style={{ fontSize: 13, color: '#18181a', marginTop: 6, wordBreak: 'break-all', background: '#f3f4f6', borderRadius: 8, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }} className="card-url-link">
            <FaLink style={{ fontSize: 14 }} />
            <a href={fullLink} target="_blank" rel="noopener noreferrer" style={{ color: '#18181a', textDecoration: 'underline', fontWeight: 500 }}>
              {fullLink}
            </a>
          </div>
        )}
        {/* Popover and other overlays remain unchanged */}
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
      </div>
    );
  }

  // --- List View ---
  if (view === 'list') {
    // Horizontal, modern list view
    const accentColor = isForm
      ? typeColors[formType] || '#6366f1'
      : quizType === 'live'
        ? typeColors['Live']
        : typeColors[quizType] || typeColors['Quiz'];
    const typeLabel = isForm
      ? formType || 'Forms'
      : quizType === 'live'
        ? 'Live Quiz'
        : quizType || 'Quiz';
    return (
      <div
        className={`modern-form-card-list`}
        style={{
          boxShadow: '0 2px 12px rgba(120,130,150,0.08)',
          borderRadius: 16,
          background: '#f7f8fa',
          border: '1px solid #e2e4ea',
          display: 'flex',
          alignItems: 'center',
          padding: '14px 24px',
          marginBottom: 18,
          gap: 18,
          minHeight: 64,
          position: 'relative',
        }}
      >
        {/* Checkbox for both views */}
        <input
          type="checkbox"
          checked={selected}
          onChange={e => onSelect && onSelect(formId, e.target.checked)}
          style={{
            marginLeft: 18,
            marginRight: 18,
            width: 18,
            height: 18,
            accentColor: '#6366f1',
            cursor: 'pointer',
            boxShadow: selected ? '0 0 0 2px #6366f1' : 'none',
            background: selected ? '#ede9fe' : '#fff',
            borderRadius: 4,
            border: '1.5px solid #e0e0e0',
          }}
          title="Select for bulk actions"
        />
        {/* Accent bar */}
        <div style={{
          width: 5,
          height: 44,
          background: accentColor,
          borderRadius: 8,
          marginRight: 18,
        }} />
        <span style={{ fontWeight: 700, fontSize: 18, color: '#3730a3', minWidth: 120 }}>{name}</span>
        <span style={{
          fontSize: 13,
          fontWeight: 600,
          color: isPublished ? '#22c55e' : '#f59e42',
          background: isPublished ? 'rgba(34,197,94,0.08)' : 'rgba(251,191,36,0.10)',
          borderRadius: 8,
          padding: '2px 10px',
          marginLeft: 10,
        }}>{isPublished ? 'Published' : 'Draft'}</span>
        <span style={{ fontSize: 12, color: accentColor, fontWeight: 600, background: 'rgba(99,102,241,0.07)', borderRadius: 8, padding: '2px 8px', marginLeft: 10 }}>{typeLabel}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginLeft: 18 }}>
          <button className="card-action-btn edit" title="Preview" onClick={handlePreviewOnly} tabIndex={-1} style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 18, cursor: 'pointer' }}>
            <FaEye />
          </button>
          <button className="card-action-btn results" title="Results" onClick={handleResults} tabIndex={-1} style={{ background: 'none', border: 'none', color: '#22c55e', fontSize: 18, cursor: 'pointer' }}>
            <FaChartBar />
          </button>
          <button className="card-action-btn share" title={copied ? 'Copied!' : fullLink} onClick={handleShare} tabIndex={-1} style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: 18, cursor: 'pointer' }}>
            {copied ? 'Copied!' : <FaLink />}
          </button>
          <button className="card-action-btn delete" title="Delete" onClick={handleDelete} tabIndex={-1} style={{ background: 'none', border: 'none', color: '#f87171', fontSize: 18, cursor: 'pointer' }}>
            <FaTrash />
          </button>
          <div style={{ marginLeft: 18 }}>
            <a href={fullLink} target="_blank" rel="noopener noreferrer" style={{ color: '#18181a', textDecoration: 'underline', fontWeight: 500, fontSize: 13, wordBreak: 'break-all' }}>
              {fullLink}
            </a>
          </div>
        </div>
        {/* Toggle Switch for all types */}
        <div style={{ position: 'absolute', top: 16, right: 18, zIndex: 2 }} onClick={e => e.stopPropagation()}>
          <ToggleSwitch />
        </div>
      </div>
    );
  }
};

export default FormCardRow;
