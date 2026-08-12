import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';

const WIN_COLOR = '#FFC72C';   // solid gold — prize slots
const LOSE_COLOR = '#FF6B00';  // solid orange — try-again slots

const POINTER_GOLD_LIGHT = '#FFE08A';
const POINTER_GOLD_DARK = '#E8890C';
const POINTER_OUTLINE = '#7A3E00';

const SPIN_DURATION_MS = 6000;
const EXTRA_FULL_SPINS = 9;

const TRY_AGAIN_TEXTS = ['Try Again', 'Next Time!', 'Try Again!', 'Next Time!', 'Try Again'];

export function buildWheelSegments(activeItems) {
  const items = activeItems || [];
  const segments = [];
  for (let i = 0; i < 5; i++) {
    const item = items[i];
    segments.push({
      id: item ? `WIN-${item.IDX}` : `WIN-${i}`,
      name: item ? `🎁 ${item.ITEM_NAME}` : '🎁 Gift',
      itemId: item ? item.IDX : null,
      itemName: item ? item.ITEM_NAME : null,
      isWin: true
    });
    segments.push({
      id: `T${i}`,
      name: TRY_AGAIN_TEXTS[i],
      isWin: false
    });
  }
  return segments;
}

function easeOutSpin(t) {
  return 1 - Math.pow(1 - t, 4);
}

const SpinWheel = forwardRef(function SpinWheel({
  segments,
  targetIndex,
  spinToken,
  onSpinComplete,
  onCenterClick,
  isSpinning
}, ref) {
  const wheelRef = useRef(null);
  const pointerRef = useRef(null);
  const containerRef = useRef(null);

  const rotationRef = useRef(0);
  const lastToken = useRef(null);
  const animFrame = useRef(null);
  const lastSegmentCrossed = useRef(0);
  const onSpinCompleteRef = useRef(onSpinComplete);

  const segmentAngle = 360 / segments.length;

  useEffect(() => {
    onSpinCompleteRef.current = onSpinComplete;
  }, [onSpinComplete]);

  useImperativeHandle(ref, () => ({
    scrollIntoView: () => {
      if (containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }));

  // Flat solid color per wedge — gold for prizes, orange for try-again.
  // Each wedge is a single clean color with hard edges, no blending.
  const gradient = useMemo(() => {
    const stops = segments.map((seg, i) => {
      const color = seg.isWin ? WIN_COLOR : LOSE_COLOR;
      const start = i * segmentAngle;
      const end = start + segmentAngle;
      return `${color} ${start}deg ${end}deg`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }, [segments, segmentAngle]);

  const flickPointer = () => {
    const el = pointerRef.current;
    if (!el) return;
    el.style.transition = 'transform 0.09s cubic-bezier(0.3, 0, 0.6, 1)';
    el.style.transform = 'translateX(-50%) rotate(-20deg) scale(0.95)';
    window.setTimeout(() => {
      if (el) el.style.transform = 'translateX(-50%) rotate(0deg) scale(1)';
    }, 90);
  };

  useEffect(() => {
    if (spinToken === null || spinToken === undefined) return;
    if (lastToken.current === spinToken) return;
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinToken]);

  useEffect(() => {
    if (spinToken === null || spinToken === undefined) return;
    if (lastToken.current === spinToken) return;
    lastToken.current = spinToken;

    const targetCenter = targetIndex * segmentAngle + segmentAngle / 2;
    const desiredMod = (((360 - targetCenter) % 360) + 360) % 360;
    const currentMod = ((rotationRef.current % 360) + 360) % 360;
    const diff = ((desiredMod - currentMod) % 360 + 360) % 360;

    const startRotation = rotationRef.current;
    const endRotation = startRotation + EXTRA_FULL_SPINS * 360 + diff;

    lastSegmentCrossed.current = Math.floor(startRotation / segmentAngle);

    const startTime = performance.now();
    if (animFrame.current) cancelAnimationFrame(animFrame.current);

    const step = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / SPIN_DURATION_MS, 1);
      const eased = easeOutSpin(t);
      const current = startRotation + (endRotation - startRotation) * eased;

      rotationRef.current = current;
      if (wheelRef.current) {
        wheelRef.current.style.transform = `rotate(${current}deg)`;
      }

      const segIndexNow = Math.floor(current / segmentAngle);
      if (segIndexNow !== lastSegmentCrossed.current) {
        lastSegmentCrossed.current = segIndexNow;
        flickPointer();
      }

      if (t < 1) {
        animFrame.current = requestAnimationFrame(step);
      } else {
        rotationRef.current = endRotation;
        if (wheelRef.current) {
          wheelRef.current.style.transform = `rotate(${endRotation}deg)`;
        }
        if (onSpinCompleteRef.current) onSpinCompleteRef.current();
      }
    };

    animFrame.current = requestAnimationFrame(step);

    return () => {
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinToken, targetIndex, segmentAngle]);

  const handleCenterClick = () => {
    if (isSpinning) return;
    if (onCenterClick) onCenterClick();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-[92vw] max-w-[26rem] sm:max-w-[30rem] aspect-square mx-auto select-none scroll-mt-24"
    >
      <style>{`
        @keyframes pointerIdleBob {
          0%, 100% { transform: translateX(-50%) translateY(0) rotate(0deg); }
          50% { transform: translateX(-50%) translateY(3px) rotate(0deg); }
        }
        @keyframes gemShine {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
      `}</style>

      <div
        ref={pointerRef}
        className="absolute left-1/2 -top-4 z-20"
        style={{
          transform: 'translateX(-50%) rotate(0deg)',
          transformOrigin: 'top center',
          animation: isSpinning ? 'none' : 'pointerIdleBob 1.6s ease-in-out infinite'
        }}
      >
        <svg width="44" height="54" viewBox="0 0 44 54" style={{ filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.35))' }}>
          <defs>
            <linearGradient id="pointerBodyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={POINTER_GOLD_LIGHT} />
              <stop offset="55%" stopColor="#FFC72C" />
              <stop offset="100%" stopColor={POINTER_GOLD_DARK} />
            </linearGradient>
            <radialGradient id="pointerGemGrad" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="45%" stopColor="#FFF3CE" />
              <stop offset="100%" stopColor={POINTER_GOLD_DARK} />
            </radialGradient>
          </defs>

          <path
            d="M22 3
               C 32 3, 39 10.5, 39 20.5
               C 39 30, 28 38, 22 51
               C 16 38, 5 30, 5 20.5
               C 5 10.5, 12 3, 22 3 Z"
            fill="url(#pointerBodyGrad)"
            stroke={POINTER_OUTLINE}
            strokeWidth="1.5"
          />

          <path
            d="M14 9 C 12 14, 12 19, 15 23"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
            opacity="0.55"
          />

          <circle cx="22" cy="19" r="7.5" fill="url(#pointerGemGrad)" stroke={POINTER_OUTLINE} strokeWidth="1" />
          <circle cx="19.5" cy="16.5" r="2" fill="#FFFFFF" opacity="0.85" style={{ animation: 'gemShine 1.8s ease-in-out infinite' }} />
        </svg>
      </div>

      <div
        className="w-full h-full rounded-full relative"
        style={{
          boxShadow: [
            '0 24px 55px -18px rgba(255, 107, 0, 0.5)',
            '0 0 0 6px #FFFFFF',
            '0 0 0 9px #FFD98A',
            '0 0 0 13px #C97A0F',
            '0 0 0 16px #FFFFFF'
          ].join(', ')
        }}
      >
        <div
          ref={wheelRef}
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{
            background: gradient,
            transform: `rotate(${rotationRef.current}deg)`
          }}
        >
          {segments.map((seg, i) => {
            const angle = i * segmentAngle + segmentAngle / 2 - 90;
            return (
              <React.Fragment key={seg.id ?? i}>
                <div
                  className="absolute top-1/2 left-1/2 h-[2px] w-1/2 origin-left"
                  style={{
                    transform: `rotate(${i * segmentAngle - 90}deg)`,
                    background: 'rgba(255,255,255,0.5)'
                  }}
                />
                <div
                  className="absolute top-1/2 left-1/2 h-9 w-[46%] origin-left flex items-center justify-end pr-4"
                  style={{ transform: `rotate(${angle}deg)` }}
                >
                  <span
                    className={`font-bold text-white tracking-wide whitespace-nowrap ${
                      seg.isWin ? 'text-[12px] sm:text-sm' : 'text-[14px] sm:text-base'
                    }`}
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.55)' }}
                  >
                    {seg.name}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.4), rgba(255,255,255,0) 45%)'
          }}
        />
      </div>

      <button
        type="button"
        onClick={handleCenterClick}
        disabled={isSpinning}
        aria-label="Spin the wheel"
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center z-10 transition-transform ${
          isSpinning ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:scale-105 active:scale-95'
        }`}
        style={{
          background: 'radial-gradient(circle at 35% 30%, #FFFFFF, #F1F1F6 60%, #E2E2EA 100%)',
          border: `4px solid ${POINTER_OUTLINE}`,
          boxShadow: '0 6px 14px rgba(0,0,0,0.25), inset 0 2px 3px rgba(255,255,255,0.9)'
        }}
      >
        <span
          className="font-extrabold tracking-wide text-sm sm:text-base"
          style={{ color: POINTER_OUTLINE }}
        >
          SPIN
        </span>
      </button>
    </div>
  );
});

export default SpinWheel;