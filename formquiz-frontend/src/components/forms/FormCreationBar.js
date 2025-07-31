import React from 'react';
import { useNavigate } from 'react-router-dom';
import TemplateCard from '../shared/TemplateCard';
import '../shared/TemplateCard.css';
import './FormCreationBar.css';

const FormCreationBar = () => {
  const navigate = useNavigate();

  const handleFormClick = () => navigate('/builder');

  const handleTemplateClick = (templateKey) => {
    // For now, just navigate to the builder
    handleFormClick();
  };

  const templates = [
    {
      type: 'Forms',
      label: 'Blank Form',
      tagClass: 'form',
      onClick: handleFormClick,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="2" fill="#fef2f2"/>
          <rect x="7" y="7" width="10" height="10" rx="1" fill="#ffffff"/>
          <rect x="9" y="10" width="6" height="1" rx="0.5" fill="#fecaca"/>
          <rect x="9" y="13" width="6" height="1" rx="0.5" fill="#fecaca"/>
        </svg>
      ),
      desc: 'Start from scratch and build your own form.',
      color: '#ef4444'
    },
    {
      type: 'Feedback',
      label: 'Feedback Form',
      tagClass: 'feedback',
      onClick: () => handleTemplateClick('feedback'),
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="2" fill="#f0fdf4"/>
          <path d="M8 12h8M8 16h5" stroke="#22c55e"/>
          <circle cx="9" cy="9" r="1.5" fill="#22c55e"/>
        </svg>
      ),
      desc: 'Collect feedback and suggestions easily.',
      color: '#22c55e'
    },
    {
      type: 'Contact',
      label: 'Contact Form',
      tagClass: 'contact',
      onClick: () => handleTemplateClick('contact'),
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="2" fill="#f0f9ff"/>
          <path d="M8 10h8M8 14h8" stroke="#06b6d4"/>
          <circle cx="9" cy="9" r="1.5" fill="#06b6d4"/>
        </svg>
      ),
      desc: 'Let users reach out to you quickly.',
      color: '#06b6d4'
    },
    {
      type: 'Survey',
      label: 'Survey Form',
      tagClass: 'survey',
      onClick: () => handleTemplateClick('survey'),
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="2" fill="#faf5ff"/>
          <path d="M8 12h8M8 16h5" stroke="#a855f7"/>
          <circle cx="9" cy="9" r="1.5" fill="#a855f7"/>
        </svg>
      ),
      desc: 'Create surveys to gather opinions and data.',
      color: '#a855f7'
    },
  ];

  return (
    <div className="template-section" style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '16px',
      justifyContent: 'flex-start',
      padding: '0'
    }}>
      {templates.map((template, index) => (
        <TemplateCard
          key={index}
          icon={template.icon}
          label={template.label}
          description={template.desc}
          onClick={template.onClick}
<<<<<<< HEAD
=======
          style={{ cursor: template.onClick ? 'pointer' : 'default' }}
<<<<<<< Updated upstream
<<<<<<< Updated upstream
=======
>>>>>>> 27fbc336d9e47fee18ffcdac7ab6d2b29c1c2d84
>>>>>>> Stashed changes
=======
>>>>>>> 27fbc336d9e47fee18ffcdac7ab6d2b29c1c2d84
>>>>>>> Stashed changes
        />
      ))}
    </div>
  );
};

export default FormCreationBar;
