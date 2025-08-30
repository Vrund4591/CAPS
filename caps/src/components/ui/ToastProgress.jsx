/* eslint-disable no-unused-vars */
import React from 'react';
import { motion } from 'framer-motion';
import { Upload, X, Check } from 'lucide-react';

export const ToastProgress = ({ 
  progress = 0, 
  title = "Uploading...", 
  message,
  onCancel,
  completed = false,
  error = false
}) => {
  const getIconAndColors = () => {
    if (error) {
      return {
        icon: X,
        bg: 'bg-red-100',
        border: 'border-red-500',
        text: 'text-red-800',
        iconBg: 'bg-red-500'
      };
    }
    if (completed) {
      return {
        icon: Check,
        bg: 'bg-green-100',
        border: 'border-green-500',
        text: 'text-green-800',
        iconBg: 'bg-green-500'
      };
    }
    return {
      icon: Upload,
      bg: 'bg-blue-100',
      border: 'border-blue-500',
      text: 'text-blue-800',
      iconBg: 'bg-blue-500'
    };
  };

  const { icon: IconComponent, bg, border, text, iconBg } = getIconAndColors();

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
            <p className="font-semibold text-xs mb-2">{message}</p>
          )}
          
          {!completed && !error && (
            <div className="mb-2">
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-white rounded-full h-2 border-2 border-black">
                <motion.div
                  className="bg-blue-500 h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}
          
          {onCancel && !completed && (
            <button
              onClick={onCancel}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-xl border-2 border-black text-xs transition-all duration-200"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
