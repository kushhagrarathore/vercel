import React, { useState } from 'react';
import './FormsCardRow.css';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaChartBar, FaTimes, FaCopy, FaLink, FaEdit, FaTrash, FaCheck, FaShare } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import ReactDOM from 'react-dom';

const typeColors = {
  Feedback: '#10b981',
  Survey: '#8b5cf6',
  Contact: '#06b6d4',
  Blank: '#f59e0b',
  Forms: '#3b82f6',
  Quiz: '#8b5cf6',
  Live: '#ef4444',
  blank: '#8b5cf6',
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
  titleStyle,
  selected = false,
  onSelect,
}) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [sharePopupOpen, setSharePopupOpen] = useState(false);
  const [sharePopupPosition, setSharePopupPosition] = useState({ x: 0, y: 0 });
  const shareButtonRef = React.useRef(null);

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
  };

  const fullLink = link
    ? link.startsWith('http://') || link.startsWith('https://')
      ? link
      : `${window.location.origin}${link}`
    : '';

  const handleShare = (e) => {
    e.stopPropagation();
    if (shareButtonRef.current) {
      const rect = shareButtonRef.current.getBoundingClientRect();
      setSharePopupPosition({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 10
      });
    }
    setSharePopupOpen(true);
  };

  const handleCopyLink = (e) => {
    e.stopPropagation();
    if (fullLink) {
      navigator.clipboard.writeText(fullLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

  // Close popup when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (sharePopupOpen && !event.target.closest('.share-popup')) {
        setSharePopupOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sharePopupOpen]);

  const ActionButtons = () => (
    <div className="card-actions-big" style={{ 
      display: 'flex', 
      gap: '6px', 
      marginTop: '12px',
      opacity: '0',
      transition: 'opacity 0.3s ease'
    }}>
      <button
        className="card-action-btn"
        title="Preview"
        onClick={handlePreview}
        tabIndex={-1}
        style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: 'none',
          padding: '6px',
          borderRadius: '6px',
          color: '#3b82f6',
          fontSize: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}
        onMouseOver={e => { 
          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'; 
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseOut={e => { 
          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'; 
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <FaEye size={12} />
      </button>
      <button
        className="card-action-btn"
        title="Results"
        onClick={handleResults}
        tabIndex={-1}
        style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: 'none',
          padding: '6px',
          borderRadius: '6px',
          color: '#10b981',
          fontSize: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(16, 185, 129, 0.2)'
        }}
        onMouseOver={e => { 
          e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)'; 
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseOut={e => { 
          e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; 
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <FaChartBar size={12} />
      </button>
      <button
        ref={shareButtonRef}
        className="card-action-btn share-popup"
        title="Share"
        onClick={handleShare}
        tabIndex={-1}
        style={{
          background: 'rgba(6, 182, 212, 0.1)',
          border: 'none',
          padding: '6px',
          borderRadius: '6px',
          color: '#06b6d4',
          fontSize: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(6, 182, 212, 0.2)',
          position: 'relative'
        }}
        onMouseOver={e => { 
          e.currentTarget.style.background = 'rgba(6, 182, 212, 0.15)'; 
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseOut={e => { 
          e.currentTarget.style.background = 'rgba(6, 182, 212, 0.1)'; 
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <FaShare size={12} />
      </button>
      <button
        className="card-action-btn delete"
        title="Delete"
        onClick={handleDelete}
        tabIndex={-1}
        style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: 'none',
          padding: '6px',
          borderRadius: '6px',
          color: '#ef4444',
          fontSize: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}
        onMouseOver={e => { 
          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; 
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseOut={e => { 
          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; 
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <FaTrash size={12} />
      </button>
    </div>
  );

  const ToggleSwitch = () => (
    <label 
      className={`toggle-switch${isPublished ? ' active' : ''}`} 
      title={isPublished ? 'Deactivate' : 'Activate'} 
      onClick={e => e.stopPropagation()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        cursor: 'pointer',
        opacity: isPublished ? '1' : '0.6',
        transition: 'all 0.3s ease'
      }}
    >
      <input type="checkbox" checked={!!isPublished} onChange={handleToggle} style={{ display: 'none' }} />
      <span className="slider" style={{
        width: '28px',
        height: '16px',
        background: isPublished ? 'linear-gradient(135deg, #10b981, #059669)' : '#e5e7eb',
        borderRadius: '999px',
        position: 'relative',
        transition: 'all 0.3s ease',
        boxShadow: isPublished ? '0 2px 6px rgba(16, 185, 129, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <span style={{
          content: '',
          position: 'absolute',
          left: isPublished ? '12px' : '2px',
          top: '2px',
          width: '12px',
          height: '12px',
          background: '#ffffff',
          borderRadius: '50%',
          transition: 'all 0.3s ease',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }} />
      </span>
    </label>
  );

  const SharePopup = () => {
    if (!sharePopupOpen) return null;

    const handleSocialShare = (platform) => {
      const text = `Check out this form: ${name}`;
      const url = fullLink;
      
      let shareUrl = '';
      switch (platform) {
        case 'twitter':
          shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
          break;
        case 'facebook':
          shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
          break;
        case 'linkedin':
          shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
          break;
        case 'whatsapp':
          shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
          break;
        case 'telegram':
          shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
          break;
        case 'email':
          shareUrl = `mailto:?subject=${encodeURIComponent('Check out this form')}&body=${encodeURIComponent(text + '\n\n' + url)}`;
          break;
        default:
          return;
      }
      
      window.open(shareUrl, '_blank', 'width=600,height=400');
    };

    return ReactDOM.createPortal(
      <>
        {/* Backdrop with blur */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setSharePopupOpen(false)}
        />
        
                {/* Glassmorphism popup */}
        <div
          className="share-popup"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(24px)',
            borderRadius: '16px',
            boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            padding: '24px',
            zIndex: 1000,
            minWidth: '320px',
            maxWidth: '380px',
            fontFamily: 'Inter, sans-serif',
            animation: 'popupSlideIn 0.3s ease-out'
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              letterSpacing: '-0.025em'
            }}>
              Share Form
            </h3>
            <button
              onClick={() => setSharePopupOpen(false)}
              style={{
                background: 'rgba(0, 0, 0, 0.04)',
                border: 'none',
                fontSize: '16px',
                color: '#6b7280',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px'
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.08)';
                e.currentTarget.style.color = '#374151';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)';
                e.currentTarget.style.color = '#6b7280';
              }}
            >
              <FaTimes />
            </button>
          </div>

          {/* Form Link Section with Copy Icon */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.6)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: '10px',
            padding: '12px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px'
            }}>
              <div style={{
                fontSize: '13px',
                color: '#374151',
                fontWeight: '600'
              }}>
                Form Link
              </div>
              <button
                onClick={handleCopyLink}
                style={{
                  background: 'none',
                  border: 'none',
                  color: copied ? '#10b981' : '#3b82f6',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title={copied ? 'Copied!' : 'Copy Link'}
              >
                {copied ? (
                  <div style={{ fontSize: '14px' }}>✓</div>
                ) : (
                  <FaCopy style={{ fontSize: '12px' }} />
                )}
              </button>
            </div>
            <div style={{
              fontSize: '12px',
              color: '#111827',
              wordBreak: 'break-all',
              fontFamily: 'monospace',
              background: 'rgba(0, 0, 0, 0.02)',
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              lineHeight: '1.3'
            }}>
              {fullLink}
            </div>
          </div>

          {/* QR Code Section */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '20px'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.8)',
              padding: '16px',
              borderRadius: '10px',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
            }}>
              <QRCodeSVG
                value={fullLink}
                size={180}
                level="M"
                style={{ display: 'block' }}
              />
            </div>
          </div>

                    {/* Social Media Sharing */}
          <div style={{
            borderTop: '1px solid rgba(0, 0, 0, 0.08)',
            paddingTop: '20px'
          }}>
            
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '16px'
            }}>
              {/* Twitter */}
              <button
                onClick={() => handleSocialShare('twitter')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1da1f2',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = 'rgba(29, 161, 242, 0.1)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title="Share on Twitter"
              >
                <div style={{ fontSize: '18px' }}>𝕏</div>
              </button>

              {/* Facebook */}
              <button
                onClick={() => handleSocialShare('facebook')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1877f2',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = 'rgba(24, 119, 242, 0.1)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title="Share on Facebook"
              >
                <div style={{ fontSize: '18px' }}>f</div>
              </button>

              {/* LinkedIn */}
              <button
                onClick={() => handleSocialShare('linkedin')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0077b5',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = 'rgba(0, 119, 181, 0.1)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title="Share on LinkedIn"
              >
                <div style={{ fontSize: '18px' }}>in</div>
              </button>

              {/* WhatsApp */}
              <button
                onClick={() => handleSocialShare('whatsapp')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#25d366',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = 'rgba(37, 211, 102, 0.1)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title="Share on WhatsApp"
              >
                <div style={{ fontSize: '18px' }}>💬</div>
              </button>

              {/* Telegram */}
              <button
                onClick={() => handleSocialShare('telegram')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0088cc',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = 'rgba(0, 136, 204, 0.1)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title="Share on Telegram"
              >
                <div style={{ fontSize: '18px' }}>✈️</div>
              </button>

              {/* Email */}
              <button
                onClick={() => handleSocialShare('email')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ea4335',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = 'rgba(234, 67, 53, 0.1)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title="Share via Email"
              >
                <div style={{ fontSize: '18px' }}>✉️</div>
              </button>
            </div>
          </div>
        </div>

        {/* CSS Animation */}
        <style>
          {`
            @keyframes popupSlideIn {
              from {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.9);
              }
              to {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
              }
            }
          `}
        </style>
      </>,
      document.body
    );
  };

  if (view === 'grid') {
    const accentColor = isForm
      ? typeColors[formType] || '#3b82f6'
      : quizType === 'live'
        ? typeColors['Live']
        : typeColors[quizType] || typeColors['Quiz'];
    const typeLabel = isForm
      ? formType || 'Forms'
      : quizType === 'live'
        ? 'Live Quiz'
        : quizType || 'Quiz';

    return (
      <>
      <div
        className={`modern-form-card${expanded ? ' expanded' : ''}`}
        style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden',
            minHeight: '160px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          cursor: 'pointer',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
            ...(expanded ? { 
              boxShadow: '0 8px 12px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              transform: 'scale(1.01)',
              borderColor: accentColor
            } : {}),
        }}
        onClick={handleEdit}
        tabIndex={0}
        role="button"
          onMouseOver={(e) => {
            e.currentTarget.style.transform = expanded ? 'scale(1.01)' : 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 12px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
            e.currentTarget.style.borderColor = accentColor;
            e.currentTarget.querySelector('.card-actions-big').style.opacity = '1';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = expanded ? 'scale(1.01)' : 'translateY(0)';
            e.currentTarget.style.boxShadow = expanded ? '0 8px 12px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)';
            e.currentTarget.style.borderColor = expanded ? accentColor : '#e5e7eb';
            e.currentTarget.querySelector('.card-actions-big').style.opacity = '0';
          }}
        >
          {/* Accent line */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
            width: '3px',
            background: isPublished ? accentColor : '#e5e7eb',
            borderTopLeftRadius: '12px',
            borderBottomLeftRadius: '12px',
          }} />
          
          {/* Top controls - only toggle switch, no checkbox */}
          <div className="formcard-topright-controls" style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            display: 'flex',
            alignItems: 'center',
            zIndex: 20
          }}>
            <ToggleSwitch />
          </div>
          
          {/* Main content */}
          <div style={{ padding: '16px 16px 12px 20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
            {/* Title */}
            <div style={{ marginBottom: '10px' }}>
              <div className="form-card-title" style={titleStyle || { 
                fontWeight: '600', 
                color: '#111827',
                fontSize: '15px',
                lineHeight: '1.3'
              }}>
                {name}
              </div>
            </div>
            
            {/* Status badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <span style={{
                fontSize: '10px',
                fontWeight: '600',
                color: isPublished ? '#059669' : '#d97706',
                background: isPublished ? '#d1fae5' : '#fef3c7',
                borderRadius: '10px',
                padding: '2px 6px',
              }}>
                {isPublished ? 'Published' : 'Draft'}
              </span>
            <span style={{
                fontSize: '10px', 
                color: accentColor, 
                fontWeight: '600', 
                background: `${accentColor}10`, 
                borderRadius: '10px', 
                padding: '2px 6px'
              }}>
                {typeLabel}
              </span>
            </div>
            
            {/* Timestamp */}
            <div style={{ 
              fontSize: '11px', 
              color: '#6b7280', 
              marginBottom: '10px',
              lineHeight: '1.3'
            }}>
              Created: {timestamp}
          </div>
            
            {/* Action buttons - visible on hover for all cards */}
            <ActionButtons />
          </div>
        </div>
        <SharePopup />
      </>
    );
  }

  if (view === 'list') {
    const accentColor = isForm
      ? typeColors[formType] || '#3b82f6'
      : quizType === 'live'
        ? typeColors['Live']
        : typeColors[quizType] || typeColors['Quiz'];
    const typeLabel = isForm
      ? formType || 'Forms'
      : quizType === 'live'
        ? 'Live Quiz'
        : quizType || 'Quiz';
        
    return (
      <>
      <div
        className={`modern-form-card-list`}
        style={{
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
            padding: '12px 16px',
            marginBottom: '6px',
            gap: '12px',
            minHeight: '56px',
          position: 'relative',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
            e.currentTarget.style.borderColor = accentColor;
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)';
            e.currentTarget.style.borderColor = '#e5e7eb';
          }}
        >
        <input
          type="checkbox"
          checked={selected}
          onChange={e => onSelect && onSelect(formId, e.target.checked)}
          style={{
              width: '14px',
              height: '14px',
              accentColor: accentColor,
            cursor: 'pointer',
              border: `2px solid ${selected ? accentColor : '#d1d5db'}`,
              borderRadius: '3px'
          }}
          title="Select for bulk actions"
        />
          
        {/* Accent bar */}
        <div style={{
            width: '3px',
            height: '32px',
            background: isPublished ? accentColor : '#e5e7eb',
            borderRadius: '2px',
            marginRight: '12px',
          }} />
          
          {/* Title */}
          <span style={{ 
            fontWeight: '600', 
            fontSize: '14px', 
            color: '#111827', 
            minWidth: '160px',
            flex: '1'
          }}>
            {name}
          </span>
          
          {/* Status badge */}
          <span style={{
            fontSize: '10px',
            fontWeight: '600',
            color: isPublished ? '#059669' : '#d97706',
            background: isPublished ? '#d1fae5' : '#fef3c7',
            borderRadius: '10px',
            padding: '2px 6px',
            whiteSpace: 'nowrap'
          }}>
            {isPublished ? 'Published' : 'Draft'}
          </span>
          
          {/* Type badge */}
        <span style={{
            fontSize: '10px', 
            color: accentColor, 
            fontWeight: '600', 
            background: `${accentColor}10`, 
            borderRadius: '10px', 
            padding: '2px 6px',
            whiteSpace: 'nowrap'
          }}>
            {typeLabel}
          </span>
          
          {/* Action buttons - visible on hover for all cards */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px', 
            marginLeft: '12px',
            opacity: '0',
            transition: 'opacity 0.3s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
          onMouseOut={(e) => e.currentTarget.style.opacity = '0'}
          >
            <button 
              className="card-action-btn edit" 
              title="Preview" 
              onClick={handlePreviewOnly} 
              tabIndex={-1} 
              style={{ 
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                color: '#3b82f6', 
                fontSize: '12px', 
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
            <FaEye />
          </button>
            <button 
              className="card-action-btn results" 
              title="Results" 
              onClick={handleResults} 
              tabIndex={-1} 
              style={{ 
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                color: '#10b981', 
                fontSize: '12px', 
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
            <FaChartBar />
          </button>
            <button 
              ref={shareButtonRef}
              className="card-action-btn share share-popup" 
              title="Share" 
              onClick={handleShare} 
              tabIndex={-1} 
              style={{ 
                background: 'rgba(6, 182, 212, 0.1)',
                border: '1px solid rgba(6, 182, 212, 0.2)',
                color: '#06b6d4', 
                fontSize: '12px', 
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = 'rgba(6, 182, 212, 0.15)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'rgba(6, 182, 212, 0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <FaShare />
          </button>
            <button 
              className="card-action-btn delete" 
              title="Delete" 
              onClick={handleDelete} 
              tabIndex={-1} 
              style={{ 
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#ef4444', 
                fontSize: '12px', 
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
            <FaTrash />
          </button>
          </div>
          
          {/* Toggle switch */}
          <div style={{ 
            position: 'absolute', 
            top: '12px', 
            right: '12px', 
            zIndex: 2 
          }} onClick={e => e.stopPropagation()}>
          <ToggleSwitch />
        </div>
      </div>
        <SharePopup />
      </>
    );
  }
};

export default FormCardRow;
