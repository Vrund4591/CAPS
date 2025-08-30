/* eslint-disable no-unused-vars */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const toastVariants = {
  success: {
    bg: 'bg-green-100',
    border: 'border-green-500',
    text: 'text-green-800',
    icon: Check,
    iconBg: 'bg-green-500'
  },
  error: {
    bg: 'bg-red-100',
    border: 'border-red-500',
    text: 'text-red-800',
    icon: AlertCircle,
    iconBg: 'bg-red-500'
  },
  warning: {
    bg: 'bg-yellow-100',
    border: 'border-yellow-500',
    text: 'text-yellow-800',
    icon: AlertTriangle,
    iconBg: 'bg-yellow-500'
  },
  info: {
    bg: 'bg-blue-100',
    border: 'border-blue-500',
    text: 'text-blue-800',
    icon: Info,
    iconBg: 'bg-blue-500'
  }
};

export const Toast = ({ 
  type = 'info', 
  title, 
  message, 
  onClose, 
  autoClose = true,
  duration = 4000,
  actions = null
}) => {
  const variant = toastVariants[type];
  const IconComponent = variant.icon;

  React.useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`
        ${variant.bg} ${variant.border} ${variant.text}
        border-4 rounded-2xl p-4 shadow-lg max-w-md w-full
        backdrop-blur-sm
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`${variant.iconBg} p-2 rounded-xl border-2 border-black`}>
          <IconComponent className="w-5 h-5 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="font-black text-sm mb-1">{title}</h4>
          )}
          {message && (
            <p className="font-semibold text-sm leading-relaxed">{message}</p>
          )}
          {actions && (
            <div className="mt-3 flex space-x-2">
              {actions}
            </div>
          )}
        </div>
        
        <button
          onClick={onClose}
          className="p-1 hover:bg-black/10 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
