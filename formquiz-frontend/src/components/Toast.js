import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              minWidth: 220,
              margin: '8px 0',
              padding: '14px 28px',
              borderRadius: 10,
              background: toast.type === 'error' ? '#ef4444' : toast.type === 'success' ? '#22c55e' : '#6366f1',
              color: '#fff',
              fontWeight: 600,
              fontSize: 16,
              boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
              textAlign: 'center',
              opacity: 0.97,
              transition: 'all 0.2s',
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}; 