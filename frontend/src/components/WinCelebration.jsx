import React from 'react';

const CONFETTI_COLORS = ['#FFC72C', '#FF6B00', '#FF206E', '#41D3BD', '#4C6EF5'];

function ConfettiPiece({ index }) {
  const left = Math.random() * 100;
  const delay = Math.random() * 0.5;
  const duration = 2 + Math.random() * 1.2;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const width = 5 + Math.random() * 5;
  const height = width * 1.6;
  const rotate = Math.random() * 360;

  return (
    <span
      className="absolute top-0 rounded-sm"
      style={{
        left: `${left}%`,
        width,
        height,
        backgroundColor: color,
        animation: `confettiFall ${duration}s ease-in ${delay}s forwards`,
        transform: `rotate(${rotate}deg)`
      }}
    />
  );
}

/**
 * itemName: the won item's name (falsy => component renders nothing)
 * onDismiss: optional — shows a "Dismiss" button if provided
 */
export default function WinCelebration({ itemName, onDismiss }) {
  if (!itemName) return null;

  const pieces = Array.from({ length: 30 });

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(170px) rotate(340deg); opacity: 0; }
        }
        @keyframes celebPop {
          0%   { transform: scale(0.85); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div className="absolute inset-x-0 -top-6 h-44 overflow-hidden pointer-events-none">
        {pieces.map((_, i) => (
          <ConfettiPiece key={i} index={i} />
        ))}
      </div>

      <div
        className="relative bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl px-5 py-4 text-center shadow-md"
        style={{ animation: 'celebPop 0.4s ease-out' }}
      >
        <p className="text-3xl mb-1">🎉</p>
        <p className="text-xs font-semibold tracking-widest text-amber-600 uppercase mb-1">
          You Won
        </p>
        <p className="text-lg font-extrabold text-gray-900 mb-3">{itemName}</p>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}