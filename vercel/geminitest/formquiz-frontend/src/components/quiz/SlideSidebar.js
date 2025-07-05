import React from 'react';
import './SlideSidebar.css';

const SlideSidebar = ({ slides, selected, onSelect, onAdd, onRemove, onReorder }) => {
  return (
    <aside className="slide-sidebar">
      <div className="sidebar-header">
        <h2>Slides</h2>
        <button className="add-slide-btn" onClick={() => onAdd()}>+ Add</button>
      </div>
      <ul className="slide-list">
        {slides.map((slide, idx) => (
          <li
            key={slide.id}
            className={`slide-list-item${selected === idx ? ' selected' : ''}`}
            onClick={() => onSelect(idx)}
          >
            <div className="slide-type">{slide.type.replace('_', ' ').toUpperCase()}</div>
            <div className="slide-title">{slide.question || 'Untitled'}</div>
            <div className="slide-actions">
              <button
                className="reorder-btn"
                title="Move up"
                disabled={idx === 0}
                onClick={e => { e.stopPropagation(); onReorder(idx, -1); }}
                aria-label="Move up"
              >
                
              </button>
              <button
                className="reorder-btn"
                title="Move down"
                disabled={idx === slides.length - 1}
                onClick={e => { e.stopPropagation(); onReorder(idx, 1); }}
                aria-label="Move down"
              >
                
              </button>
              <button className="remove-slide-btn" onClick={e => { e.stopPropagation(); onRemove(idx); }}></button>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default SlideSidebar; 