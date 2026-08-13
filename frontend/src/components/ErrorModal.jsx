import React, { useEffect } from 'react';

/**
 * message: error text to show (falsy => component renders nothing)
 * onClose: called when user dismisses the modal (Close button, backdrop click, or Enter key)
 */
export default function ErrorModal({ message, onClose }) {
  useEffect(() => {
    if (!message) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm p-6 sm:p-8 text-center shadow-2xl animate-[popIn_0.35s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes popIn {
            0% { transform: scale(0.85); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>

        <div className="text-5xl mb-3">⚠️</div>
        <h2 className="text-gray-900 text-xl font-extrabold mb-2">
          Something Went Wrong
        </h2>
        <p className="text-gray-500 text-sm mb-6">{message}</p>

        <button
          onClick={onClose}
          autoFocus
          className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 rounded-xl transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}