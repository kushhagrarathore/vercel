import React from 'react';
import { FaFont, FaPalette, FaClock } from 'react-icons/fa';
import '../forms/CustomizationPanel.css';

const fonts = [
  { name: 'Inter', style: { fontFamily: 'Inter, sans-serif' } },
  { name: 'Roboto', style: { fontFamily: 'Roboto, sans-serif' } },
  { name: 'Montserrat', style: { fontFamily: 'Montserrat, sans-serif' } },
  { name: 'Lato', style: { fontFamily: 'Lato, sans-serif' } },
];

const MinimalSection = ({ icon, title, children }) => (
  <div className="quiz-settings-minimal-section">
    <div className="quiz-settings-minimal-header">
      <span className="quiz-settings-minimal-icon">{icon}</span>
      <span className="quiz-settings-minimal-title">{title}</span>
    </div>
    <div className="quiz-settings-minimal-controls">{children}</div>
  </div>
);

const ColorSwatch = ({ value }) => (
  <span className="quiz-settings-color-swatch" style={{ background: value }} />
);

const QuizSettingsPanel = ({ settings, onChange }) => {
  return (
    <div className="quiz-settings-panel quiz-settings-panel-minimal">
      <MinimalSection icon={<FaFont />} title="Text Style">
        <select
          value={settings.font}
          onChange={e => onChange({ ...settings, font: e.target.value })}
          className="quiz-settings-minimal-select"
        >
          {fonts.map(f => (
            <option key={f.name} value={f.name} style={f.style}>{f.name}</option>
          ))}
        </select>
        <input
          type="number"
          min={14}
          max={36}
          value={settings.fontSize}
          onChange={e => onChange({ ...settings, fontSize: +e.target.value })}
          className="quiz-settings-minimal-input"
          placeholder="Size"
        />
      </MinimalSection>
      <MinimalSection icon={<FaPalette />} title="Colors">
        <div className="quiz-settings-minimal-color-group">
          <label className="quiz-settings-minimal-color-label">
            <ColorSwatch value={settings.backgroundColor} />
            <input
              type="color"
              value={settings.backgroundColor}
              onChange={e => onChange({ ...settings, backgroundColor: e.target.value })}
              className="quiz-settings-minimal-color"
            />
          </label>
          <label className="quiz-settings-minimal-color-label">
            <ColorSwatch value={settings.textColor} />
            <input
              type="color"
              value={settings.textColor}
              onChange={e => onChange({ ...settings, textColor: e.target.value })}
              className="quiz-settings-minimal-color"
            />
          </label>
        </div>
      </MinimalSection>
      <MinimalSection icon={<FaClock />} title="Timer">
        <select
          value={settings.timer}
          onChange={e => onChange({ ...settings, timer: +e.target.value })}
          className="quiz-settings-minimal-select"
        >
          {[10, 15, 20, 30, 45, 60].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </MinimalSection>
    </div>
  );
};

export default QuizSettingsPanel; 