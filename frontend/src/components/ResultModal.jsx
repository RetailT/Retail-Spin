import React, { useEffect } from 'react';

/**
 * result: { isWinner, wonItemId, wonItemName, spinRecordId, insertTime, expiredTime } | null
 * onClose: called when user dismisses the modal (Close button, backdrop click, or Enter key)
 */
export default function ResultModal({ result, onClose }) {
  // Close on Enter key instead of auto-dismissing after a timeout
  useEffect(() => {
    if (!result) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [result, onClose]);

  if (!result) return null;

  const { isWinner, wonItemName } = result;

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

        {isWinner ? (
          <>
            <div className="text-6xl mb-3">🎉</div>
            <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-1">
              Congratulations!
            </p>
            <h2 className="text-gray-900 text-2xl font-extrabold mb-2">
              You Won a Gift!
            </h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl py-4 px-4 mb-4">
              <p className="text-xs text-amber-600 font-medium mb-1">Your Gift</p>
              <p className="text-xl font-bold text-amber-700">
                {wonItemName || 'Gift Item'}
              </p>
            </div>
            <p className="text-gray-500 text-sm">
              Please collect your gift.
            </p>
          </>
        ) : (
          <>
            <div className="text-6xl mb-3">😔</div>
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">
              Better Luck Next Time
            </p>
            <h2 className="text-gray-900 text-2xl font-extrabold mb-2">
              No Gift This Time
            </h2>
            <p className="text-gray-500 text-sm">
              Thank you for playing! Try again on your next purchase.
            </p>
          </>
        )}

        <button
          onClick={onClose}
          autoFocus
          className="mt-6 w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 rounded-xl transition"
        >
          Close <span className="text-gray-400 font-normal"></span>
        </button>
      </div>
    </div>
  );
}