import React from 'react';
import './OptionInput.css';

const OptionInput = ({ value, onChange, onRemove, canRemove }) => (
  <div className="option-input">
    <input
      className="option-text-input"
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Option text..."
    />
    {canRemove && (
      <button className="remove-option-btn" onClick={onRemove}>✕</button>
    )}
  </div>
);

export default OptionInput; 