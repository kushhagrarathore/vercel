import React, { useState } from 'react';
import './SettingsPanel.css';

const fonts = ['Inter', 'Arial', 'Roboto', 'Georgia', 'Comic Sans MS'];

const sections = [
  { key: 'theme', label: 'Theme' },
  { key: 'font', label: 'Font' },
  { key: 'advanced', label: 'Advanced' },
];

const SettingsPanel = ({ globalSettings, setGlobalSettings, slide, onSlideSettingsChange, isMobile, onClose }) => {
  const [openSection, setOpenSection] = useState('theme');

  const renderSection = section => {
    switch (section) {
      case 'theme':
        return (
          <>
            <div className="settings-section">
              <label>Theme Color</label>
              <input
                type="color"
                value={slide.theme?.color || globalSettings.theme.color}
                onChange={e => onSlideSettingsChange({ theme: { ...slide.theme, color: e.target.value } })}
              />
            </div>
            <div className="settings-section">
              <label>Background Color</label>
              <input
                type="color"
                value={slide.theme?.backgroundColor || globalSettings.theme.backgroundColor || '#f5f7fa'}
                onChange={e => onSlideSettingsChange({ theme: { ...slide.theme, backgroundColor: e.target.value } })}
              />
            </div>
            <div className="settings-section">
              <label>Button Color</label>
              <input
                type="color"
                value={slide.theme?.buttonColor || globalSettings.theme.buttonColor || '#4a6bff'}
                onChange={e => onSlideSettingsChange({ theme: { ...slide.theme, buttonColor: e.target.value } })}
              />
            </div>
            <div className="settings-section">
              <label>Text Color</label>
              <input
                type="color"
                value={slide.theme?.textColor || globalSettings.theme.textColor || '#222'}
                onChange={e => onSlideSettingsChange({ theme: { ...slide.theme, textColor: e.target.value } })}
              />
            </div>
          </>
        );
      case 'font':
        return (
          <div className="settings-section">
            <label>Font</label>
            <select
              className="font-dropdown"
              value={slide.theme?.font || globalSettings.theme.font}
              onChange={e => onSlideSettingsChange({ theme: { ...slide.theme, font: e.target.value } })}
            >
              {fonts.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
            </select>
          </div>
        );
      case 'advanced':
        return (
          <>
            <div className="settings-section">
              <label>Border Radius</label>
              <div className="slider-row">
                <input
                  className="slider"
                  type="range"
                  min={0}
                  max={32}
                  value={slide.theme?.borderRadius || globalSettings.theme.borderRadius || 12}
                  onChange={e => onSlideSettingsChange({ theme: { ...slide.theme, borderRadius: e.target.value } })}
                />
                <span className="slider-value">{slide.theme?.borderRadius || globalSettings.theme.borderRadius || 12}px</span>
              </div>
            </div>
            <div className="settings-section">
              <label>Auto-Advance</label>
              <div
                className={`toggle-switch${globalSettings.autoAdvance ? ' on' : ''}`}
                onClick={() => setGlobalSettings({ ...globalSettings, autoAdvance: !globalSettings.autoAdvance })}
                tabIndex={0}
                role="button"
                aria-pressed={globalSettings.autoAdvance}
              >
                <div className="toggle-knob" />
              </div>
            </div>
            <div className="settings-section">
              <label>Timer (seconds)</label>
              <input
                type="number"
                min={5}
                max={120}
                value={slide.timer}
                onChange={e => onSlideSettingsChange({ timer: Number(e.target.value) })}
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <aside className={`settings-panel${isMobile ? ' mobile-drawer' : ''}`}> 
      {isMobile && (
        <button className="drawer-close-btn" onClick={onClose} aria-label="Close settings">×</button>
      )}
      <h2 style={{ marginBottom: 8 }}>Settings</h2>
      <div className="accordion-root">
        {sections.map(sec => (
          <div key={sec.key} className="accordion-section">
            <button
              className="accordion-header"
              onClick={() => setOpenSection(openSection === sec.key ? null : sec.key)}
              aria-expanded={openSection === sec.key}
            >
              {sec.label}
              <span className={`accordion-arrow${openSection === sec.key ? ' open' : ''}`}>▼</span>
            </button>
            {openSection === sec.key && (
              <div className="accordion-content">
                {renderSection(sec.key)}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="settings-preview" style={{
        background: slide.theme?.backgroundColor || globalSettings.theme.backgroundColor || '#f5f7fa',
        color: slide.theme?.textColor || globalSettings.theme.textColor || '#222',
        fontFamily: slide.theme?.font || globalSettings.theme.font,
        borderRadius: (slide.theme?.borderRadius || globalSettings.theme.borderRadius || 12) + 'px',
        border: '1.5px solid #e0e0e0',
        marginTop: 12
      }}>
        <span>Live Preview</span>
      </div>
    </aside>
  );
};

export default SettingsPanel; 