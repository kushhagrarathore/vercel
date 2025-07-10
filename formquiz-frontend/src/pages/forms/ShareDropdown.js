import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const ShareDropdown = ({ responses }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(responses);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Responses');
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    saveAs(blob, 'form_responses.xlsx');
    setOpen(false);
  };

  const shareLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    alert('Link copied to clipboard!');
    setOpen(false);
  };

  return (
    <div className="share-dropdown-relative" ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: '#6b63ff',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '10px',
          fontWeight: 600,
          fontSize: '1.13rem',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 2px 8px #a5b4fc22',
        }}
      >
        Share Results
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          right: 0,
          marginTop: 8,
          width: 220,
          background: '#fff',
          borderRadius: 10,
          boxShadow: '0 4px 16px #a5b4fc33',
          border: '1px solid #e0e7ef',
          zIndex: 10,
        }}>
          <button
            onClick={exportToExcel}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '12px 18px',
              background: 'none',
              border: 'none',
              fontSize: '1rem',
              cursor: 'pointer',
              borderBottom: '1px solid #f3f4f6',
            }}
          >
            📥 Export to Excel
          </button>
          <button
            onClick={shareLink}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '12px 18px',
              background: 'none',
              border: 'none',
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            🔗 Share Results Link
          </button>
        </div>
      )}
    </div>
  );
};

export default ShareDropdown; 