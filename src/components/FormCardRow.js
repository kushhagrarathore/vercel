import React, { useState } from 'react';
import './FormsCardRow.css';
import { useNavigate } from 'react-router-dom';
import {
  FaEdit, FaEye, FaChartBar, FaCopy, FaExternalLinkAlt,
  FaCheckCircle, FaSpinner, FaTimes
} from 'react-icons/fa';
import { supabase } from '../supabase';

const FormCardRow = ({ view, name, timestamp, sharedWith, published, link, creator, formId, isPublished, onPublishToggle, isForm, onDelete }) => {
  const navigate = useNavigate();
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleEdit = (e) => {
    if (e) e.stopPropagation();
    navigate(`/builder/${formId}`);
  };

  const handlePreview = (e) => {
    if (e) e.stopPropagation();
    navigate(`/preview/${formId}`);
  };

  const handleResults = (e) => {
    if (e) e.stopPropagation();
    navigate(`/results/${formId}`);
  };

  const handlePublishToggle = async (e) => {
    e.stopPropagation();
    setPublishing(true);
    if (onPublishToggle) {
      await onPublishToggle(formId, !isPublished);
    }
    setPublishing(false);
  };

  const publicUrl = `${window.location.origin}/public/${formId}`;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this form?')) return;
    setDeleting(true);
    await supabase.from('forms').delete().eq('id', formId);
    setDeleting(false);
    if (onDelete) onDelete(formId);
  };

  const Switch = ({ checked, onChange, disabled }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', cursor: disabled ? 'not-allowed' : 'pointer', marginRight: 8 }}>
      <span
        tabIndex={0}
        role="checkbox"
        aria-checked={checked}
        onClick={disabled ? undefined : onChange}
        onKeyDown={e => { if ((e.key === ' ' || e.key === 'Enter') && !disabled) onChange(e); }}
        style={{
          width: 36, height: 20, borderRadius: 12,
          background: checked ? '#4caf50' : '#ccc',
          display: 'inline-block', position: 'relative',
          transition: 'background 0.2s', outline: 'none'
        }}
      >
        <span style={{
          position: 'absolute', left: checked ? 18 : 2, top: 2,
          width: 16, height: 16, borderRadius: '50%',
          background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          transition: 'left 0.2s'
        }} />
      </span>
    </span>
  );

  const StatusBadge = ({ published }) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: published ? '#e6f9ed' : '#fff6e6',
      color: published ? '#219150' : '#b26a00',
      borderRadius: 12, fontSize: 12, fontWeight: 600,
      padding: '2px 10px', marginLeft: 8
    }}>
      {published ? <FaCheckCircle style={{ marginRight: 4, color: '#219150' }} /> : null}
      {published ? 'Published' : 'Draft'}
    </span>
  );

  const Spinner = () => (
    <FaSpinner className="spin" style={{ marginLeft: 6, color: '#2196f3', fontSize: 16, verticalAlign: 'middle' }} />
  );

  const Controls = () => (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'center',
      background: '#f7fafd', borderRadius: 8,
      padding: '6px 10px', marginTop: 8, flexWrap: 'wrap',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
    }}>
      <button aria-label="Edit" onClick={handleEdit} disabled={publishing} style={btnStyle}><FaEdit /> Edit</button>
      <button aria-label="Preview" onClick={handlePreview} disabled={publishing} style={btnStyle}><FaEye /> Preview</button>
      <button aria-label="Results" onClick={handleResults} disabled={publishing} style={btnStyle}><FaChartBar /> Results</button>
      <Switch checked={isPublished} onChange={handlePublishToggle} disabled={publishing} />
      <span style={{ fontSize: 13 }}>{publishing ? <Spinner /> : <StatusBadge published={isPublished} />}</span>
      <button aria-label="Delete form" onClick={handleDelete} disabled={deleting} style={{ background: 'none', border: 'none', color: '#e53935', fontSize: 18, cursor: 'pointer', marginLeft: 6, padding: 0, display: 'flex', alignItems: 'center' }}>
        <FaTimes />
      </button>
    </div>
  );

  const btnStyle = {
    background: '#2979ff', color: 'white', border: 'none', borderRadius: 6,
    padding: '4px 12px', fontWeight: 500, fontSize: 13,
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
    transition: 'background 0.2s', flexShrink: 0
  };

  const CopyableLink = () => (
    <div style={{ display: 'flex', alignItems: 'center', marginTop: 6, gap: 6, flexWrap: 'wrap' }}>
      <input
        type="text"
        value={publicUrl}
        readOnly
        style={{ fontSize: 12, border: '1px solid #d0d7de', borderRadius: 6,
          padding: '2px 8px', width: 200, background: '#f7fafd', color: '#333' }}
        aria-label="Public form link"
        onClick={e => { e.target.select(); }}
      />
      <button aria-label="Copy link" onClick={handleCopy} style={{ ...btnStyle, background: copied ? '#43a047' : '#e0e0e0', color: copied ? 'white' : '#333', padding: '4px 8px', fontSize: 12 }}>
        <FaCopy /> {copied ? 'Copied!' : 'Copy'}
      </button>
      <a href={publicUrl} target="_blank" rel="noopener noreferrer" aria-label="Open form in new tab" style={{ color: '#2979ff', fontSize: 15 }}>
        <FaExternalLinkAlt />
      </a>
    </div>
  );

  if (view === 'grid') {
    return (
      <div className="form-card-grid" style={{ cursor: 'pointer', position: 'relative' }} onClick={handleEdit}>
        <h4 className="form-title clickable-title">{name}</h4>
        <p className="form-meta">{timestamp}</p>
        <p className="form-meta">By {creator}</p>
        <p className="form-meta">{sharedWith.length} users</p>
        {isForm && <Controls />}
        {isForm && isPublished && <CopyableLink />}
      </div>
    );
  }

  return (
    <div className="table-row list" style={{ position: 'relative', cursor: 'pointer' }} onClick={handleEdit}>
      <span className="cell clickable-title">{name}</span>
      <span className="cell">{timestamp}</span>
      <span className="cell">{creator}</span>
      <span className="cell">{sharedWith.length} users</span>
      <span className="cell" style={{ minWidth: 220 }}>
        {isForm && <Controls />}
        {isForm && isPublished && <CopyableLink />}
      </span>
    </div>
  );
};

export default FormCardRow;
