import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastContainer } from '../components/ui/ToastContainer';

const ToastContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const newToast = { id, ...toast };
    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const toast = {
    success: (title, message, options = {}) => addToast({ type: 'success', title, message, ...options }),
    error: (title, message, options = {}) => addToast({ type: 'error', title, message, ...options }),
    warning: (title, message, options = {}) => addToast({ type: 'warning', title, message, ...options }),
    info: (title, message, options = {}) => addToast({ type: 'info', title, message, ...options }),
    custom: (options) => addToast(options)
  };

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};
