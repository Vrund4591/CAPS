/* eslint-disable no-unused-vars */
import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Check, X } from 'lucide-react';

export const ToastAction = ({
  type = 'warning',
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger' // 'danger', 'success', 'primary'
}) => {
  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          bg: 'bg-red-100',
          border: 'border-red-500',
          text: 'text-red-800',
          icon: AlertTriangle,
          iconBg: 'bg-red-500'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-100',
          border: 'border-yellow-500',
          text: 'text-yellow-800',
          icon: AlertTriangle,
          iconBg: 'bg-yellow-500'
        };
      case 'success':
        return {
          bg: 'bg-green-100',
          border: 'border-green-500',
          text: 'text-green-800',
          icon: Check,
          iconBg: 'bg-green-500'
        };
      default:
        return {
          bg: 'bg-blue-100',
          border: 'border-blue-500',
          text: 'text-blue-800',
          icon: AlertTriangle,
          iconBg: 'bg-blue-500'
        };
    }
  };

  const getConfirmStyles = () => {
    switch (confirmVariant) {
      case 'danger':
        return 'bg-red-500 hover:bg-red-600';
      case 'success':
        return 'bg-green-500 hover:bg-green-600';
      default:
        return 'bg-blue-500 hover:bg-blue-600';
    }
  };

  const { bg, border, text, icon: IconComponent, iconBg } = getTypeStyles();

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.95 }}
      className={`${bg} ${border} ${text} border-4 rounded-2xl p-4 shadow-lg max-w-md w-full`}
    >
      <div className="flex items-start gap-3">
        <div className={`${iconBg} p-2 rounded-xl border-2 border-black`}>
          <IconComponent className="w-5 h-5 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-black text-sm mb-1">{title}</h4>
          {message && (
            <p className="font-semibold text-sm leading-relaxed mb-3">{message}</p>
          )}
          
          <div className="flex space-x-2">
            <button
              onClick={onCancel}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-3 rounded-xl border-2 border-black text-xs transition-all duration-200"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`${getConfirmStyles()} text-white font-bold py-2 px-3 rounded-xl border-2 border-black text-xs shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
