import React, { useState } from 'react';
import { ChromePicker } from 'react-color';
import './CustomizationPanel.css';

const TEMPLATES = [
  {
    name: 'Classic Blue',
    customization: {
      backgroundColor: '#f7fafc',
      textColor: '#22223b',
      buttonColor: '#2563eb',
      buttonTextColor: '#fff',
      backgroundImage: '',
      logoImage: '',
      fontFamily: 'Inter, Arial, sans-serif',
      borderRadius: '16px',
    },
    preview: {
      bg: '#f7fafc',
      text: '#22223b',
      button: '#2563eb',
      font: 'Inter, Arial, sans-serif',
    },
  },
  {
    name: 'Dark Mode',
    customization: {
      backgroundColor: '#18181b',
      textColor: '#f1f5f9',
      buttonColor: '#60a5fa',
      buttonTextColor: '#232336',
      backgroundImage: '',
      logoImage: '',
      fontFamily: 'Inter, Arial, sans-serif',
      borderRadius: '16px',
    },
    preview: {
      bg: '#18181b',
      text: '#f1f5f9',
      button: '#60a5fa',
      font: 'Inter, Arial, sans-serif',
    },
  },
  {
    name: 'Sunshine',
    customization: {
      backgroundColor: '#fffbe6',
      textColor: '#a16207',
      buttonColor: '#facc15',
      buttonTextColor: '#fff',
      backgroundImage: '',
      logoImage: '',
      fontFamily: 'Georgia, serif',
      borderRadius: '20px',
    },
    preview: {
      bg: '#fffbe6',
      text: '#a16207',
      button: '#facc15',
      font: 'Georgia, serif',
    },
  },
  {
    name: 'Ocean',
    customization: {
      backgroundColor: '#dbeafe',
      textColor: '#1e3a8a',
      buttonColor: '#3b82f6',
      buttonTextColor: '#fff',
      backgroundImage: '',
      logoImage: '',
      fontFamily: 'Helvetica, sans-serif',
      borderRadius: '18px',
    },
    preview: {
      bg: '#dbeafe',
      text: '#1e3a8a',
      button: '#3b82f6',
      font: 'Helvetica, sans-serif',
    },
  },
  {
    name: 'Minimal',
    customization: {
      backgroundColor: '#fff',
      textColor: '#23272f',
      buttonColor: '#4a6bff',
      buttonTextColor: '#fff',
      backgroundImage: '',
      logoImage: '',
      fontFamily: 'Arial, sans-serif',
      borderRadius: '8px',
    },
    preview: {
      bg: '#fff',
      text: '#23272f',
      button: '#4a6bff',
      font: 'Arial, sans-serif',
    },
  },
];

const CustomizationPanel = ({ customization, setCustomization }) => {
  const [mode, setMode] = useState('basic'); // 'basic' or 'advanced'
  const [openSection, setOpenSection] = useState({
    background: true,
    text: false,
    button: false,
    logo: false,
  });

  const handleChange = (field, value) => {
    setCustomization(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = async (field, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const imageUrl = URL.createObjectURL(file);
    handleChange(field, imageUrl);
  };

  return (
    <div className="customization-panel">
      <div className="customization-toggle-row">
        <button className={`customization-toggle-btn${mode === 'basic' ? ' active' : ''}`} onClick={() => setMode('basic')}>Basic</button>
        <button className={`customization-toggle-btn${mode === 'advanced' ? ' active' : ''}`} onClick={() => setMode('advanced')}>Advanced</button>
      </div>
      {mode === 'basic' ? (
        <div className="template-card-list">
          {TEMPLATES.map((tpl, idx) => (
            <div
              key={tpl.name}
              className="template-card-preview"
              onClick={() => setCustomization({ ...customization, ...tpl.customization })}
              style={{ cursor: 'pointer', border: '2px solid #e0e0e0', borderRadius: 12, marginBottom: 18, background: tpl.preview.bg }}
            >
              <div style={{ padding: 18, textAlign: 'center' }}>
                <div style={{ fontFamily: tpl.preview.font, color: tpl.preview.text, fontWeight: 700, fontSize: 18 }}>{tpl.name}</div>
                <div style={{ margin: '12px 0' }}>
                  <span style={{ display: 'inline-block', width: 32, height: 32, background: tpl.preview.button, borderRadius: 8, marginRight: 8 }}></span>
                  <span style={{ fontFamily: tpl.preview.font, color: tpl.preview.text, fontSize: 15 }}>Aa</span>
                </div>
                <div style={{ fontSize: 12, color: tpl.preview.text, opacity: 0.7 }}>{tpl.preview.font.split(',')[0]}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {/* Advanced mode: group controls under headings/accordions */}
          <div className="customization-section">
            <h4 onClick={() => setOpenSection(s => ({ ...s, background: !s.background }))} className="customization-accordion-title">Background {openSection.background ? '▼' : '▶'}</h4>
            {openSection.background && (
              <>
                <div className="color-picker-row">
                  <label>Color:</label>
                  <ChromePicker
                    color={customization.backgroundColor}
                    onChangeComplete={(color) => handleChange('backgroundColor', color.hex)}
                  />
                </div>
                <div className="image-upload-row">
                  <label>Image:</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload('backgroundImage', e)}
                  />
                  {customization.backgroundImage && (
                    <div className="image-preview"
                      style={{ backgroundImage: `url(${customization.backgroundImage})` }} />
                  )}
                </div>
              </>
            )}
          </div>
          <div className="customization-section">
            <h4 onClick={() => setOpenSection(s => ({ ...s, text: !s.text }))} className="customization-accordion-title">Text {openSection.text ? '▼' : '▶'}</h4>
            {openSection.text && (
              <>
                <div className="color-picker-row">
                  <label>Color:</label>
                  <ChromePicker
                    color={customization.textColor}
                    onChangeComplete={(color) => handleChange('textColor', color.hex)}
                  />
                </div>
                <div className="font-selector">
                  <label>Font Family:</label>
                  <select
                    value={customization.fontFamily}
                    onChange={(e) => handleChange('fontFamily', e.target.value)}
                  >
                    <option value="Inter, Arial, sans-serif">Inter</option>
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="Helvetica, sans-serif">Helvetica</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="Times New Roman, serif">Times New Roman</option>
                    <option value="Courier New, monospace">Courier New</option>
                  </select>
                </div>
              </>
            )}
          </div>
          <div className="customization-section">
            <h4 onClick={() => setOpenSection(s => ({ ...s, button: !s.button }))} className="customization-accordion-title">Buttons {openSection.button ? '▼' : '▶'}</h4>
            {openSection.button && (
              <>
                <div className="color-picker-row">
                  <label>Button Color:</label>
                  <ChromePicker
                    color={customization.buttonColor}
                    onChangeComplete={(color) => handleChange('buttonColor', color.hex)}
                  />
                </div>
                <div className="color-picker-row">
                  <label>Button Text Color:</label>
                  <ChromePicker
                    color={customization.buttonTextColor}
                    onChangeComplete={(color) => handleChange('buttonTextColor', color.hex)}
                  />
                </div>
                <div className="border-radius">
                  <label>Border Radius:</label>
                  <input
                    type="range"
                    min="0"
                    max="32"
                    value={parseInt(customization.borderRadius)}
                    onChange={(e) => handleChange('borderRadius', `${e.target.value}px`)}
                  />
                  <span>{customization.borderRadius}</span>
                </div>
              </>
            )}
          </div>
          <div className="customization-section">
            <h4 onClick={() => setOpenSection(s => ({ ...s, logo: !s.logo }))} className="customization-accordion-title">Logo {openSection.logo ? '▼' : '▶'}</h4>
            {openSection.logo && (
              <div className="image-upload-row">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload('logoImage', e)}
                />
                {customization.logoImage && (
                  <div className="logo-preview">
                    <img src={customization.logoImage} alt="Logo preview" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomizationPanel;