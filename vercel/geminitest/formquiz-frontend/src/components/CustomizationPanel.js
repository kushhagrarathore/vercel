import React from 'react';
import { ChromePicker } from 'react-color';
import './CustomizationPanel.css';

const CustomizationPanel = ({ customization, setCustomization }) => {
    const handleChange = (field, value) => {
        setCustomization(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleImageUpload = async (field, e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Here you would typically upload to a server or Supabase storage
        // For now, we'll just create a local URL
        const imageUrl = URL.createObjectURL(file);
        handleChange(field, imageUrl);
    };

    return (
        <div className="customization-panel">
            <div className="customization-section">
                <h4>Background</h4>
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
            </div>

            <div className="customization-section">
                <h4>Text</h4>
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
                        <option value="Arial, sans-serif">Arial</option>
                        <option value="Helvetica, sans-serif">Helvetica</option>
                        <option value="Georgia, serif">Georgia</option>
                        <option value="Times New Roman, serif">Times New Roman</option>
                        <option value="Courier New, monospace">Courier New</option>
                    </select>
                </div>
            </div>

            <div className="customization-section">
                <h4>Buttons</h4>
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
                        max="20" 
                        value={parseInt(customization.borderRadius)} 
                        onChange={(e) => handleChange('borderRadius', `${e.target.value}px`)}
                    />
                    <span>{customization.borderRadius}</span>
                </div>
            </div>

            <div className="customization-section">
                <h4>Logo</h4>
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
            </div>
        </div>
    );
};

export default CustomizationPanel;