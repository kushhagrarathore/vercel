import React from 'react';
import './TemplateCard.css';

const TemplateCard = ({ icon, label, description, onClick, style, children }) => {
  return (
    <div
      className="template-card"
      onClick={onClick}
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px',
        transition: 'all 0.2s ease',
        cursor: onClick ? 'pointer' : 'default',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '180px',
        ...style
      }}
      onMouseOver={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
        }
      }}
      onMouseOut={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
        }
      }}
    >
      {/* Accent line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: '#8b5cf6',
        borderTopLeftRadius: '16px',
        borderTopRightRadius: '16px'
      }} />
      
      <div 
        className="file-icon"
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          position: 'relative',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#8b5cf610',
          color: '#8b5cf6'
        }}
      >
        {icon}
      </div>
      
      <div 
        className="template-label"
        style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#1e293b',
          marginBottom: '8px',
          fontFamily: 'Inter, sans-serif'
        }}
      >
        {label}
      </div>
      
      <div 
        className="template-desc"
        style={{
          fontSize: '14px',
          color: '#64748b',
          lineHeight: '1.5',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          hyphens: 'auto',
          maxWidth: '100%',
          fontFamily: 'Inter, sans-serif',
          fontWeight: '400',
          flex: 1
        }}
      >
        {description}
      </div>
      
      {/* Use template button */}
      {onClick && (
        <button
          style={{
            background: 'none',
            border: 'none',
            color: '#8b5cf6',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            padding: '8px 0',
            marginTop: '16px',
            textAlign: 'left',
            transition: 'all 0.2s ease',
            fontFamily: 'Inter, sans-serif'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateX(4px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          Use template →
        </button>
      )}
      
      {children}
    </div>
  );
};

export default TemplateCard; 