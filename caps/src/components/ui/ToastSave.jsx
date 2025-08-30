/* eslint-disable no-unused-vars */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle, Loader2 } from 'lucide-react';

const InfoIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    className="text-current"
  >
    <g
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      stroke="currentColor"
    >
      <circle cx="9" cy="9" r="7.25"></circle>
      <line x1="9" y1="12.819" x2="9" y2="8.25"></line>
      <path
        d="M9,6.75c-.552,0-1-.449-1-1s.448-1,1-1,1,.449,1,1-.448,1-1,1Z"
        fill="currentColor"
        data-stroke="none"
        stroke="none"
      ></path>
    </g>
  </svg>
);

const springConfig = {
  type: "spring",
  stiffness: 500,
  damping: 30,
  mass: 1,
};

export const ToastSave = ({
  state = "initial",
  onReset,
  onSave,
  loadingText = "Saving...",
  successText = "Changes Saved!",
  initialText = "Unsaved changes",
  resetText = "Reset",
  saveText = "Save",
  className = "",
  ...props
}) => {
  return (
    <motion.div
      className={`
        inline-flex h-12 items-center justify-center overflow-hidden rounded-2xl
        bg-white border-4 border-black shadow-lg
        ${className}
      `}
      initial={false}
      animate={{ width: "auto" }}
      transition={springConfig}
      {...props}
    >
      <div className="flex h-full items-center justify-between px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={state}
            className="flex items-center gap-3 text-gray-900"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {state === "loading" && (
              <>
                <div className="bg-blue-500 p-2 rounded-xl border-2 border-black">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                </div>
                <div className="text-sm font-bold whitespace-nowrap">
                  {loadingText}
                </div>
              </>
            )}
            {state === "success" && (
              <>
                <div className="bg-green-500 p-2 rounded-xl border-2 border-black">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <div className="text-sm font-bold whitespace-nowrap">
                  {successText}
                </div>
              </>
            )}
            {state === "initial" && (
              <>
                <div className="bg-yellow-500 p-2 rounded-xl border-2 border-black">
                  <InfoIcon />
                </div>
                <div className="text-sm font-bold whitespace-nowrap">
                  {initialText}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
        
        <AnimatePresence>
          {state === "initial" && (
            <motion.div
              className="ml-4 flex items-center gap-2"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={springConfig}
            >
              <button
                onClick={onReset}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-xl border-2 border-black transition-all duration-200"
              >
                {resetText}
              </button>
              <button
                onClick={onSave}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-xl border-2 border-black shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
              >
                {saveText}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
