import React from 'react';
import './TemplateCard.css';

const TemplateCard = ({ 
  icon, 
  label, 
  description, 
  onClick, 
  className = '', 
  style = {} 
}) => {
  return (
    <div
      className={`template-card ${className}`}
      onClick={onClick}
      style={{ 
        cursor: onClick ? 'pointer' : 'default',
        ...style 
      }}
    >
      <div className="file-icon">
        {icon}
      </div>
      <div className="template-label">{label}</div>
      <div className="template-desc">{description}</div>
    </div>
  );
};

export default TemplateCard; 