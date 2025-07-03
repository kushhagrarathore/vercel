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
    },
    {
      type: 'Feedback',
      label: 'Feedback Form',
      tagClass: 'feedback',
      onClick: handleFormClick, // Replace with template duplication logic if needed
    },
    {
      type: 'Contact',
      label: 'Contact Form',
      tagClass: 'contact',
      onClick: handleFormClick, // Replace with template duplication logic if needed
    },
    {
      type: 'Survey',
      label: 'Survey Form',
      tagClass: 'survey',
      onClick: handleFormClick, // Replace with template duplication logic if needed
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
            <span className={`file-tag ${template.tagClass}`}>{template.type}</span>
          </div>
          <button className="create-button">
            {template.onClick ? '→' : '→'}
          </button>
          <div className="template-label">{template.label}</div>
        </div>
      ))}
    </div>
  );
};

export default FormCreationBar;
