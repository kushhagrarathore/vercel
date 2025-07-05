import React from "react";
import './FormCustomizer.css';

const fontOptions = [
  { label: "Inter", value: "Inter" },
  { label: "Arial", value: "Arial" },
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Georgia", value: "Georgia" },
  { label: "Helvetica", value: "Helvetica" },
];

const buttonShapeOptions = [
  { label: "Rounded", value: "rounded" },
  { label: "Square", value: "square" },
  { label: "Pill", value: "pill" },
];

const FormCustomizer = ({ customization, onCustomizationChange }) => {
  const updateCustomization = (key, value) => {
    onCustomizationChange({ ...customization, [key]: value });
  };

  return (
    <div className="customizer-card">
      <h3>🎨 Customize Form</h3>

      {/* Background */}
      <label>
        Background Color:
        <div className="color-row">
          <input
            type="color"
            value={customization.backgroundColor}
            onChange={(e) => updateCustomization("backgroundColor", e.target.value)}
          />
          <input
            type="text"
            value={customization.backgroundColor}
            onChange={(e) => updateCustomization("backgroundColor", e.target.value)}
            placeholder="#ffffff"
          />
        </div>
      </label>

      {/* Text */}
      <label>
        Text Color:
        <div className="color-row">
          <input
            type="color"
            value={customization.textColor}
            onChange={(e) => updateCustomization("textColor", e.target.value)}
          />
          <input
            type="text"
            value={customization.textColor}
            onChange={(e) => updateCustomization("textColor", e.target.value)}
            placeholder="#000000"
          />
        </div>
      </label>

      {/* Button */}
      <label>
        Button Color:
        <div className="color-row">
          <input
            type="color"
            value={customization.buttonColor}
            onChange={(e) => updateCustomization("buttonColor", e.target.value)}
          />
          <input
            type="text"
            value={customization.buttonColor}
            onChange={(e) => updateCustomization("buttonColor", e.target.value)}
            placeholder="#3b82f6"
          />
        </div>
      </label>

      <label>
        Font Family:
        <select
          value={customization.fontFamily}
          onChange={(e) => updateCustomization("fontFamily", e.target.value)}
        >
          {fontOptions.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Font Size (px):
        <input
          type="number"
          min="12"
          max="36"
          value={customization.fontSize}
          onChange={(e) => updateCustomization("fontSize", e.target.value)}
        />
      </label>

      <label>
        Button Shape:
        <select
          value={customization.buttonShape}
          onChange={(e) => updateCustomization("buttonShape", e.target.value)}
        >
          {buttonShapeOptions.map((shape) => (
            <option key={shape.value} value={shape.value}>
              {shape.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};

export default FormCustomizer;
