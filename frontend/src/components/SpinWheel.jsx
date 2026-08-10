import React, { useEffect, useMemo, useRef } from 'react';

// Fixed 10-segment wheel: 1 win slot + 9 "Try Again" slots (matches the real 1/10 backend odds)
export const WHEEL_SEGMENTS = [
  { id: 'WIN', name: '🎁 Gift', isWin: true },
  { id: 'T1', name: 'Try Again', isWin: false },
  { id: 'T2', name: 'Better Luck!', isWin: false },
  { id: 'T3', name: 'So Close!', isWin: false },
  { id: 'T4', name: 'Try Again', isWin: false },
  { id: 'T5', name: 'Next Time!', isWin: false },
  { id: 'T6', name: 'Try Again', isWin: false },
  { id: 'T7', name: 'Almost!', isWin: false },
  { id: 'T8', name: 'Try Again', isWin: false },
  { id: 'T9', name: 'Spin Again!', isWin: false }
];

const WIN_COLOR = '#FFC72C';                      // gold — the single winning slot
const TRY_AGAIN_COLORS = ['#FF6B00', '#FFB27A'];  // alternating orange shades
const POINTER_COLOR = '#1F2937';                  // dark charcoal — stands out from the wheel colors

const SPIN_DURATION_MS = 6000;
const EXTRA_FULL_SPINS = 9;

function colorForSegment(seg, index) {
  if (seg.isWin) return WIN_COLOR;
  return TRY_AGAIN_COLORS[index % TRY_AGAIN_COLORS.length];
}

// Strong deceleration curve — visually similar to the previous cubic-bezier(0.15,0.65,0.1,1)
function easeOutSpin(t) {
  return 1 - Math.pow(1 - t, 4);
}

/**
 * segments: fixed WHEEL_SEGMENTS array (10 items)
 * targetIndex: index in `segments` the wheel must land on (from backend result)
 * spinToken: change this value to trigger a new spin animation
 * onSpinComplete: called once the spin animation finishes
 * onCenterClick: called when the center "SPIN" hub is clicked (ignored while isSpinning)
 * isSpinning: disables/greys out the center hub while a spin is in progress
 *
 * NOTE: rotation is driven entirely by requestAnimationFrame (not CSS transition),
 * so the pointer can "tick" at the exact moment each segment boundary passes under it —
 * just like a real prize wheel.
 */
export default function SpinWheel({
  segments,
  targetIndex,
  spinToken,
  onSpinComplete,
  onCenterClick,
  isSpinning
}) {
  const wheelRef = useRef(null);
  const pointerRef = useRef(null);

  const rotationRef = useRef(0);     // current absolute wheel rotation, persists across spins
  const lastToken = useRef(null);
  const animFrame = useRef(null);
  const lastSegmentCrossed = useRef(0);
  const onSpinCompleteRef = useRef(onSpinComplete);

  const segmentAngle = 360 / segments.length;

  useEffect(() => {
    onSpinCompleteRef.current = onSpinComplete;
  }, [onSpinComplete]);

  const gradient = useMemo(() => {
    const stops = segments.map((seg, i) => {
      const color = colorForSegment(seg, i);
      const start = i * segmentAngle;
      const end = start + segmentAngle;
      return `${color} ${start}deg ${end}deg`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }, [segments, segmentAngle]);

  // Quick spring-like flick of the pointer, done via direct style writes (no re-render).
  const flickPointer = () => {
    const el = pointerRef.current;
    if (!el) return;
    el.style.transition = 'transform 0.09s cubic-bezier(0.3, 0, 0.6, 1)';
    el.style.transform = 'translateX(-50%) rotate(-22deg)';
    window.setTimeout(() => {
      if (el) el.style.transform = 'translateX(-50%) rotate(0deg)';
    }, 90);
  };

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

      // Fire a pointer flick each time a segment boundary passes under the pointer
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
    <div className="relative w-[92vw] max-w-[26rem] sm:max-w-[30rem] aspect-square mx-auto select-none">
      {/* Pointer — sits still, flicks briefly only when a segment boundary passes beneath it */}
      <div
        ref={pointerRef}
        className="absolute left-1/2 -top-3 z-10"
        style={{ transform: 'translateX(-50%) rotate(0deg)', transformOrigin: 'top center' }}
      >
        <div
          className="w-0 h-0 border-l-[18px] border-l-transparent border-r-[18px] border-r-transparent border-t-[32px] drop-shadow-md"
          style={{ borderTopColor: POINTER_COLOR }}
        />
      </div>

      {/* Static outer ring — carries the box-shadow so it never gets clipped */}
      <div
        className="w-full h-full rounded-full relative"
        style={{
          boxShadow:
            '0 24px 55px -18px rgba(255, 107, 0, 0.45), 0 0 0 10px #FFFFFF, 0 0 0 13px #EDEDF3'
        }}
      >
        {/* Rotating wheel — transform written directly via ref, no React re-render per frame */}
        <div
          ref={wheelRef}
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{
            background: gradient,
            transform: `rotate(${rotationRef.current}deg)`
          }}
        >
          {segments.map((seg, i) => {
            // -90 corrects for the offset between CSS rotate()'s 0deg (east)
            // and conic-gradient's 0deg (north), so labels line up with their color wedge.
            const angle = i * segmentAngle + segmentAngle / 2 - 90;
            return (
              <div
                key={seg.id ?? i}
                className="absolute top-1/2 left-1/2 h-9 w-[46%] origin-left flex items-center justify-end pr-5"
                style={{ transform: `rotate(${angle}deg)` }}
              >
                <span
                  className="text-[15px] sm:text-base font-bold text-white tracking-wide whitespace-nowrap"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                >
                  {seg.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Center hub — clickable "SPIN" button */}
      <button
        type="button"
        onClick={handleCenterClick}
        disabled={isSpinning}
        aria-label="Spin the wheel"
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white border-[5px] shadow-lg flex items-center justify-center z-10 transition-transform ${
          isSpinning ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:scale-105 active:scale-95'
        }`}
        style={{ borderColor: POINTER_COLOR }}
      >
        <span
          className="font-extrabold tracking-wide text-sm sm:text-base"
          style={{ color: POINTER_COLOR }}
        >
          SPIN
        </span>
      </button>
    </div>
  );
}