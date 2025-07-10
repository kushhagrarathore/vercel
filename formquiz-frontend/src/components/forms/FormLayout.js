import React from 'react';
import './FormLayout.css';

const FormLayout = ({ children, customization = {} }) => {
  const defaultCustomization = {
    backgroundColor: '#f7fafc',
    textColor: '#22223b',
    buttonColor: '#2563eb',
    buttonTextColor: '#fff',
    backgroundImage: '',
    logoImage: '',
    fontFamily: 'Inter, Arial, sans-serif',
    borderRadius: '16px',
  };

  const mergedCustomization = { ...defaultCustomization, ...customization };

  const containerStyle = {
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: mergedCustomization.backgroundColor,
    backgroundImage: mergedCustomization.backgroundImage ? `url(${mergedCustomization.backgroundImage})` : undefined,
    backgroundSize: mergedCustomization.backgroundImage ? 'cover' : undefined,
    backgroundPosition: mergedCustomization.backgroundImage ? 'center' : undefined,
    backgroundRepeat: mergedCustomization.backgroundImage ? 'no-repeat' : undefined,
    fontFamily: mergedCustomization.fontFamily,
    transition: 'background 0.3s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    color: mergedCustomization.textColor,
  };

  const cardStyle = {
    borderRadius: mergedCustomization.borderRadius,
    fontFamily: mergedCustomization.fontFamily,
    color: mergedCustomization.textColor,
    boxShadow: '0 8px 32px 0 rgba(44,62,80,0.13)',
    maxWidth: 700,
    width: '100%',
    minWidth: 0,
    margin: '40px 0',
    padding: '48px 40px',
    transition: 'box-shadow 0.2s',
    position: 'relative',
    zIndex: 2,
  };

  return (
    <div className="form-layout-container" style={containerStyle}>
      <div className="form-layout-card" style={cardStyle}>
        {children}
      </div>
    </div>
  );
};

export default FormLayout; 