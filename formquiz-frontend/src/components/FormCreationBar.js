import React from 'react';
import { useNavigate } from 'react-router-dom';
import './FormCreationBar.css';

const FormCreationBar = () => {
  const navigate = useNavigate();

  const handleFormClick = () => navigate('/builder');

  const templates = [
    {
      type: 'Forms',
      label: 'Blank Form',
      tagClass: 'form',
      onClick: handleFormClick,
      icon: (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 44,
          height: 44,
          borderRadius: 12,
          background: '#f3f4f8',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="4" fill="#f3f4f8"/><rect x="7" y="7" width="10" height="10" rx="2" fill="#fff"/><rect x="9" y="10" width="6" height="2" rx="1" fill="#e0e7ff"/><rect x="9" y="14" width="6" height="2" rx="1" fill="#e0e7ff"/></svg>
        </span>
      ),
      desc: 'Start from scratch and build your own form.',
    },
    {
      type: 'Feedback',
      label: 'Feedback Form',
      tagClass: 'feedback',
      onClick: handleFormClick,
      icon: (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 44,
          height: 44,
          borderRadius: 12,
          background: '#eafaf3',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="4" fill="#eafaf3"/><path d="M8 12h8M8 16h5" stroke="#22c55e" strokeWidth="2"/><circle cx="9" cy="9" r="1.5" fill="#22c55e"/></svg>
        </span>
      ),
      desc: 'Collect feedback and suggestions easily.',
    },
    {
      type: 'Contact',
      label: 'Contact Form',
      tagClass: 'contact',
      onClick: handleFormClick,
      icon: (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 44,
          height: 44,
          borderRadius: 12,
          background: '#eafafc',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="4" fill="#eafafc"/><path d="M8 10h8M8 14h8" stroke="#06b6d4" strokeWidth="2"/><circle cx="9" cy="9" r="1.5" fill="#06b6d4"/></svg>
        </span>
      ),
      desc: 'Let users reach out to you quickly.',
    },
    {
      type: 'Survey',
      label: 'Survey Form',
      tagClass: 'survey',
      onClick: handleFormClick,
      icon: (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 44,
          height: 44,
          borderRadius: 12,
          background: '#f9f5ff',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="4" fill="#f9f5ff"/><path d="M8 12h8M8 16h5" stroke="#a855f7" strokeWidth="2"/><circle cx="9" cy="9" r="1.5" fill="#a855f7"/></svg>
        </span>
      ),
      desc: 'Create surveys to gather opinions and data.',
    },
  ];

  return (
    <div className="template-section">
      {templates.map((template, index) => (
        <div
          className="template-card"
          key={index}
          onClick={template.onClick}
          style={{ cursor: template.onClick ? 'pointer' : 'default' }}
        >
          <div className="file-icon">
            {template.icon}
          </div>
          <div className="template-label">{template.label}</div>
          <div className="template-desc">{template.desc}</div>
        </div>
      ))}
    </div>
  );
};

export default FormCreationBar;
