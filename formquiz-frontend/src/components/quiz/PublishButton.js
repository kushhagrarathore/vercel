import React from 'react';

const PublishButton = ({ onPublish, loading }) => (
  <button onClick={onPublish} disabled={loading} style={{ fontWeight: 700, fontSize: 17, padding: '10px 24px', borderRadius: 8, background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(59,130,246,0.10)' }}>
    {loading ? 'Publishing...' : 'Publish Quiz'}
  </button>
);

export default PublishButton; 