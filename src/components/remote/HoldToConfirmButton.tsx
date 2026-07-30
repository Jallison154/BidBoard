import { useRef, useState } from 'react';

interface HoldToConfirmButtonProps {
  label: string;
  holdMs?: number;
  onConfirm: () => void;
}

/** A destructive action button that requires a deliberate press-and-hold
 * instead of a single tap, so an accidental touch can't clear the audience
 * display. */
export function HoldToConfirmButton({ label, holdMs = 1100, onConfirm }: HoldToConfirmButtonProps) {
  const [progress, setProgress] = useState(0);
  const frameRef = useRef<number | null>(null);
  const startRef = useRef(0);

  const cancel = () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    setProgress(0);
  };

  const start = () => {
    startRef.current = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const pct = Math.min(1, elapsed / holdMs);
      setProgress(pct);
      if (pct >= 1) {
        cancel();
        onConfirm();
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  };

  return (
    <button
      type="button"
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      className="relative min-h-12 overflow-hidden rounded-md border border-red-500/40 text-sm font-semibold text-red-300 select-none"
    >
      <span
        className="absolute inset-y-0 left-0 bg-red-500/25 transition-[width]"
        style={{ width: `${progress * 100}%` }}
      />
      <span className="relative">{progress > 0 ? 'Hold to clear…' : label}</span>
    </button>
  );
}
