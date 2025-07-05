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
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        background: isActive ? '#e0e7ff' : '#f5f7ff',
        borderRadius: 10,
        marginBottom: 12,
        boxShadow: isDragging ? '0 4px 16px rgba(59,130,246,0.10)' : '0 1px 4px rgba(30,50,80,0.04)',
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px 12px 14px',
        cursor: 'pointer',
        border: isActive ? '2px solid #3b82f6' : '1.5px solid #e5eaf0',
        minHeight: 48,
        position: 'relative',
      }}
      onClick={() => onSelect(index)}
    >
      <span {...attributes} {...listeners} style={{ marginRight: 10, cursor: 'grab', color: '#b6c3d1', fontSize: 18 }}><FaGripVertical /></span>
      <span style={{ fontWeight: 600, fontSize: 15, marginRight: 8, color: '#3b82f6' }}>Q{index + 1}</span>
      <input
        value={title}
        onChange={e => onRename(index, e.target.value)}
        style={{ flex: 1, fontWeight: 500, fontSize: 15, border: 'none', background: 'transparent', outline: 'none', color: '#222', minWidth: 0 }}
        placeholder="Question title..."
        onClick={e => e.stopPropagation()}
      />
      <button onClick={e => { e.stopPropagation(); onDuplicate(index); }} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#b6c3d1', fontSize: 16, padding: 4 }} title="Duplicate"><FaCopy /></button>
      <button onClick={e => { e.stopPropagation(); if (!disableDelete) onDelete(index); }} style={{ marginLeft: 6, background: 'none', border: 'none', cursor: disableDelete ? 'not-allowed' : 'pointer', color: disableDelete ? '#ccc' : '#ef4444', fontSize: 16, padding: 4 }} title="Delete" disabled={disableDelete}><FaTrash /></button>
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