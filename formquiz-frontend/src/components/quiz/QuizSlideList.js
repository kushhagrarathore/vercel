import React from 'react';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FaGripVertical, FaCopy, FaTrash, FaPlus } from 'react-icons/fa';

function SortableSlide({ id, index, title, isActive, onSelect, onRename, onDuplicate, onDelete, disableDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`slide-list-item${isActive ? ' selected' : ''}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        boxShadow: isDragging ? '0 4px 16px rgba(59,130,246,0.10)' : '0 1px 4px rgba(30,50,80,0.04)',
      }}
      onClick={() => onSelect(index)}
    >
      <span {...attributes} {...listeners} className="slide-number" style={{ cursor: 'grab' }}>{(index + 1).toString().padStart(2, '0')}</span>
      <input
        value={title}
        onChange={e => onRename(index, e.target.value)}
        className="slide-title"
        placeholder="Question title..."
        onClick={e => e.stopPropagation()}
      />
      <span className="slide-icons">
        <button onClick={e => { e.stopPropagation(); onDuplicate(index); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b6c3d1', fontSize: 16, padding: 4 }} title="Duplicate"><FaCopy /></button>
        <button onClick={e => { e.stopPropagation(); if (!disableDelete) onDelete(index); }} className="remove-slide-btn" title="Delete" disabled={disableDelete}><FaTrash /></button>
      </span>
    </div>
  );
}

const QuizSlideList = ({ slides, current, onSelect, onRename, onReorder, onDuplicate, onDelete, onAdd }) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const slideIds = slides.map((_, i) => i.toString());
  const disableDelete = slides.length === 1;

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = parseInt(active.id);
      const newIndex = parseInt(over.id);
      onReorder(arrayMove(slides, oldIndex, newIndex));
    }
  };

  return (
    <div style={{ width: '100%', maxHeight: 'calc(100vh - 80px)', overflowY: 'auto', paddingRight: 2 }}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={slideIds}>
          {slides.map((slide, idx) => (
            <SortableSlide
              key={idx}
              id={idx.toString()}
              index={idx}
              title={slide.question || ''}
              isActive={current === idx}
              onSelect={onSelect}
              onRename={onRename}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              disableDelete={disableDelete}
            />
          ))}
        </SortableContext>
      </DndContext>
      <button onClick={onAdd} style={{ width: '100%', marginTop: 10, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><FaPlus /> Add Slide</button>
    </div>
  );
};

export default QuizSlideList; 