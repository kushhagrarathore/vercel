import React, { useState } from 'react';
import { ChromePicker } from 'react-color';
import './CustomizationPanel.css';

const TEMPLATES = [
  {
    name: 'Light Mode',
    classNames: 'bg-white text-black',
    customization: {
      backgroundColor: '#fff',
      textColor: '#232336',
      buttonColor: '#2563eb',
      buttonTextColor: '#fff',
      fontFamily: 'Inter, Arial, sans-serif',
      borderRadius: '18px',
    },
    preview: {
      bg: '#fff',
      text: '#232336',
      border: '#e5e7eb',
    },
  },
  {
    name: 'Ocean Blue',
    classNames: 'bg-blue-100 text-blue-900',
    customization: {
      backgroundColor: '#dbeafe',
      textColor: '#1e3a8a',
      buttonColor: '#2563eb',
      buttonTextColor: '#fff',
      fontFamily: 'Inter, Arial, sans-serif',
      borderRadius: '18px',
    },
    preview: {
      bg: '#dbeafe',
      text: '#1e3a8a',
      border: '#60a5fa',
    },
  },
  {
    name: 'Sunshine Yellow',
    classNames: 'bg-yellow-100 text-yellow-900',
    customization: {
      backgroundColor: '#fef9c3',
      textColor: '#a16207',
      buttonColor: '#facc15',
      buttonTextColor: '#fff',
      fontFamily: 'Georgia, serif',
      borderRadius: '18px',
    },
    preview: {
      bg: '#fef9c3',
      text: '#a16207',
      border: '#fde68a',
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
  const [bgImageError, setBgImageError] = useState('');
  const [logoImageError, setLogoImageError] = useState('');

  // Add local state for input fields to avoid locking input during validation
  const [bgImageInput, setBgImageInput] = useState(customization.backgroundImage || '');
  const [logoImageInput, setLogoImageInput] = useState(customization.logoImage || '');

  // Update local state on prop change (for editing existing forms)
  React.useEffect(() => {
    setBgImageInput(customization.backgroundImage || '');
  }, [customization.backgroundImage]);
  React.useEffect(() => {
    setLogoImageInput(customization.logoImage || '');
  }, [customization.logoImage]);

  const validateImageUrl = (url, cb) => {
    if (!url) {
      cb(false);
      return;
    }
    const img = new window.Image();
    img.onload = () => cb(true);
    img.onerror = () => cb(false);
    img.src = url;
  };

  const convertGoogleDriveLink = (url) => {
    // Match Google Drive share link
    const match = url.match(/https?:\/\/drive\.google\.com\/file\/d\/([\w-]+)\/view/);
    if (match) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
    return url;
  };

  const handleChange = (field, value) => {
    // Convert Google Drive share link to direct link
    const processedValue = convertGoogleDriveLink(value);
    if (field === 'backgroundImage') {
      if (!processedValue) {
        setBgImageError('');
        setCustomization(prev => ({ ...prev, backgroundImage: '' }));
        return;
      }
      validateImageUrl(processedValue, (isValid) => {
        if (isValid) {
          setBgImageError('');
          setCustomization(prev => ({ ...prev, backgroundImage: processedValue }));
        } else {
          setBgImageError('Invalid image URL. Please use a direct/public image link.');
        }
      });
    } else if (field === 'logoImage') {
      if (!processedValue) {
        setLogoImageError('');
        setCustomization(prev => ({ ...prev, logoImage: '' }));
        return;
      }
      validateImageUrl(processedValue, (isValid) => {
        if (isValid) {
          setLogoImageError('');
          setCustomization(prev => ({ ...prev, logoImage: processedValue }));
        } else {
          setLogoImageError('Invalid logo image URL. Please use a direct/public image link.');
        }
      });
    } else {
      setCustomization(prev => ({
        ...prev,
        [field]: processedValue
      }));
    }
  };

  // Validate on blur or Enter
  const handleImageInputBlur = (field, value) => {
    // Convert Google Drive share link to direct link
    const processedValue = convertGoogleDriveLink(value);
    if (!processedValue) {
      if (field === 'backgroundImage') setBgImageError('');
      if (field === 'logoImage') setLogoImageError('');
      setCustomization(prev => ({ ...prev, [field]: '' }));
      return;
    }
    validateImageUrl(processedValue, (isValid) => {
      if (field === 'backgroundImage') {
        if (isValid) {
          setBgImageError('');
          setCustomization(prev => ({ ...prev, backgroundImage: processedValue }));
        } else {
          setBgImageError('Invalid image URL. Please use a direct/public image link.');
        }
      } else if (field === 'logoImage') {
        if (isValid) {
          setLogoImageError('');
          setCustomization(prev => ({ ...prev, logoImage: processedValue }));
        } else {
          setLogoImageError('Invalid logo image URL. Please use a direct/public image link.');
        }
      }
    });
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
        <div className="template-panel-list">
          {TEMPLATES.map((tpl, idx) => {
            const isSelected = Object.entries(tpl.customization).every(([key, val]) => customization[key] === val);
            return (
              <div
                key={tpl.name}
                className={`template-panel-card${isSelected ? ' selected' : ''}`}
                onClick={() => {
                  // If dark mode, force textColor and backgroundColor
                  if (tpl.name === 'Dark Mode') {
                    setCustomization({
                      ...customization,
                      ...tpl.customization,
                      textColor: '#fff',
                      backgroundColor: '#18181b',
                    });
                  } else {
                    setCustomization({ ...customization, ...tpl.customization });
                  }
                }}
                style={{
                  background: tpl.preview.bg,
                  color: tpl.preview.text,
                  borderColor: isSelected ? '#2563eb' : tpl.preview.border,
                }}
              >
                <div className="template-panel-title">{tpl.name}</div>
                <div className="template-panel-class">{tpl.classNames}</div>
              </div>
            );
          })}
          <div className="template-panel-hint">Click a template to apply its style instantly.</div>
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
                  <label>Image URL (Google Drive or direct link):</label>
                  <input
                    type="text"
                    placeholder="Paste image URL here (e.g. Google Drive public link)"
                    value={bgImageInput}
                    onChange={e => setBgImageInput(e.target.value)}
                    onBlur={e => handleImageInputBlur('backgroundImage', e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.target.blur(); } }}
                  />
                  {bgImageError && <div style={{color: 'red', fontSize: 13, marginTop: 4}}>{bgImageError}</div>}
                  {customization.backgroundImage && !bgImageError && (
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
                <label>Logo Image URL (Google Drive or direct link):</label>
                <input
                  type="text"
                  placeholder="Paste logo image URL here (e.g. Google Drive public link)"
                  value={logoImageInput}
                  onChange={e => setLogoImageInput(e.target.value)}
                  onBlur={e => handleImageInputBlur('logoImage', e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.target.blur(); } }}
                />
                {logoImageError && <div style={{color: 'red', fontSize: 13, marginTop: 4}}>{logoImageError}</div>}
                {customization.logoImage && !logoImageError && (
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