import React from 'react';

const LiveQuizCardRow = ({
  quiz, // { id, title, description, ... }
  selected = false,
  onSelect,
  onEdit,
  onDelete,
}) => {
  return (
    <div className={`flex items-center py-4 px-2 ${selected ? 'bg-blue-50' : ''}`} style={{ borderBottom: '1px solid #e5e7eb' }}>
      <input
        type="checkbox"
        className="mr-4"
        checked={selected}
        onChange={() => onSelect(quiz.id)}
      />
      <div className="flex-1">
        <div className="font-semibold text-gray-900">{quiz.title}</div>
        <div className="text-sm text-gray-500">{quiz.description}</div>
      </div>
      <button className="ml-4 text-blue-600 hover:underline" onClick={() => onEdit(quiz)}>
        Edit
      </button>
      <button className="ml-2 text-red-500 hover:underline" onClick={() => onDelete(quiz.id)}>
        Delete
      </button>
    </div>
  );
};

export default LiveQuizCardRow; 