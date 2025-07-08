import React, { useState } from 'react';
import './FormsCardRow.css';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaCopy, FaLink, FaTrash } from 'react-icons/fa';
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
}) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const toggleRef = React.useRef(null);

  const handleEdit = (e) => {
    if (e) e.stopPropagation();
    if (isForm) {
      navigate(`/builder/${formId}`);
    } else {
      navigate(`/quiz/edit/${formId}`);
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

  // --- Toggle Switch ---
  const ToggleSwitch = () => (
    <label className={`toggle-switch${isPublished ? ' active' : ''}`} title={isPublished ? 'Deactivate' : 'Activate'} onClick={e => e.stopPropagation()}>
      <input type="checkbox" checked={!!isPublished} onChange={handleToggle} />
      <span className="slider" />
    </label>
  );

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
        onClick={handleEdit}
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
        {/* Always show toggle switch for all types (forms, quizzes, livequizzes) */}
        <div style={{ position: 'absolute', top: 16, right: 18, zIndex: 2 }} onClick={e => e.stopPropagation()}>
          <ToggleSwitch />
        </div>
        <div style={{ padding: '18px 18px 12px 28px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 400, fontSize: 20, color: '#3730a3', letterSpacing: -0.5 }}>{name}</span>
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
          <div className="pretty-popover portal-popover" style={{ position: 'absolute' }}>
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
        {/* Accent bar */}
        <div style={{
          width: 5,
          height: 44,
          background: accentColor,
          borderRadius: 8,
          marginRight: 18,
        }} />
        <span style={{ fontWeight: 400, fontSize: 18, color: '#3730a3', minWidth: 120 }}>{name}</span>
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
