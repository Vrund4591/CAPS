import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Toast } from './Toast';

export const ToastContainer = ({ toasts, onRemove }) => {
  return createPortal(
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={() => onRemove(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
};
