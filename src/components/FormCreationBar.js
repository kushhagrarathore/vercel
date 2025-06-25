import React from 'react';
import { useNavigate } from 'react-router-dom';
import './FormCreationBar.css';

const FormCreationBar = () => {
  const navigate = useNavigate();

const handleFormClick = () => navigate('/builder');
const handleQuizClick = () => navigate('/quiz');

const templates = [
  {
    type: 'Forms',
    label: 'Blank Form',
    tagClass: 'form',
    onClick: handleFormClick,
  },
  {
    type: 'Quiz',
    label: 'Quiz',
    tagClass: 'xls',
   
  },
  {
    type: 'Live Quiz',
    label: 'Live Quiz',
    tagClass: 'ppt',
     onClick: handleQuizClick,
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
