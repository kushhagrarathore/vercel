import React, { useState } from 'react';
import { deleteLiveQuizCascade } from '../../utils/deleteQuiz';

export default function DeleteQuizButton({ quizId, quizIds, onDeleted, label }) {
  const [loading, setLoading] = useState(false);

  async function onClickDelete() {
    const isBulk = Array.isArray(quizIds) && quizIds.length > 0;
    const idsToDelete = isBulk ? quizIds : [quizId];
    if (!window.confirm(isBulk
      ? `Are you sure you want to delete ${idsToDelete.length} quizzes? This action is irreversible.`
      : 'Are you sure you want to delete this quiz? This action is irreversible.'
    )) return;
    setLoading(true);
    let allSuccess = true;
    let errors = [];
    for (const id of idsToDelete) {
      const result = await deleteLiveQuizCascade(id);
      if (!result.success) {
        allSuccess = false;
        errors.push({ id, error: result.error });
      } else if (onDeleted) {
        onDeleted(id);
      }
    }
    setLoading(false);
    if (allSuccess) {
      alert(isBulk ? 'All selected quizzes deleted successfully.' : 'Quiz deleted successfully.');
    } else {
      alert(`Some quizzes could not be deleted:\n${errors.map(e => `ID: ${e.id} - ${e.error}`).join('\n')}`);
    }
  }

  return (
    <button onClick={onClickDelete} disabled={loading} style={{ color: '#b91c1c', background: 'none', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', textTransform: 'uppercase', fontSize: 18 }}>
      {loading ? 'Deleting...' : (label || 'DELETE QUIZ')}
    </button>
  );
} 