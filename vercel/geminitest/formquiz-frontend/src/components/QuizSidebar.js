import React from 'react';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FaGripVertical, FaCopy, FaTrash } from 'react-icons/fa';

function SortableSlide({ id, index, title, isActive, onSelect, onDuplicate, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        background: isActive ? '#e0e7ff' : '#fff',
        borderRadius: 10,
        marginBottom: 8,
        boxShadow: isDragging ? '0 4px 16px rgba(59,130,246,0.10)' : 'none',
        display: 'flex',
        alignItems: 'center',
        padding: '10px 12px',
        cursor: 'pointer',
        border: isActive ? '2px solid #3b82f6' : '1px solid #e5eaf0',
      }}
      onClick={() => onSelect(index)}
    >
      <span {...attributes} {...listeners} style={{ marginRight: 10, cursor: 'grab' }}><FaGripVertical /></span>
      <span style={{ flex: 1, fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Slide {index + 1}{title ? ': ' + title : ''}</span>
      <button onClick={e => { e.stopPropagation(); onDuplicate(index); }} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer' }}><FaCopy /></button>
      <button onClick={e => { e.stopPropagation(); onDelete(index); }} style={{ marginLeft: 4, background: 'none', border: 'none', cursor: 'pointer' }}><FaTrash /></button>
    </div>
  );
}

const QuizSidebar = ({ slides, currentSlide, onSelect, onReorder, onDuplicate, onDelete }) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const slideIds = slides.map((_, i) => i.toString());

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = parseInt(active.id);
      const newIndex = parseInt(over.id);
      onReorder(arrayMove(slides, oldIndex, newIndex));
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={slideIds}>
        {slides.map((slide, idx) => (
          <SortableSlide
            key={idx}
            id={idx.toString()}
            index={idx}
            title={slide.title || ''}
            isActive={currentSlide === idx}
            onSelect={onSelect}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
};

export default QuizSidebar; 