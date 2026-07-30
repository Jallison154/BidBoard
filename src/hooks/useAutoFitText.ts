import { useLayoutEffect, type RefObject } from 'react';

interface AutoFitOptions {
  minPx: number;
  maxPx: number;
  step: number;
}

/** Shrinks an element's font-size until it fits its container on one line;
 * if it still doesn't fit at the minimum size, allows wrapping instead of
 * shrinking further. Re-runs whenever the text or container size changes. */
export function useAutoFitText(ref: RefObject<HTMLElement | null>, text: string, options: AutoFitOptions) {
  useLayoutEffect(() => {
    const el = ref.current;
    const container = el?.parentElement;
    if (!el || !container) return;

    const fit = () => {
      let size = options.maxPx;
      el.style.whiteSpace = 'nowrap';
      el.style.fontSize = `${size}px`;
      while (size > options.minPx && el.scrollWidth > container.clientWidth) {
        size -= options.step;
        el.style.fontSize = `${size}px`;
      }
      if (el.scrollWidth > container.clientWidth) {
        el.style.whiteSpace = 'normal';
      }
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    return () => observer.disconnect();
  }, [ref, text, options.minPx, options.maxPx, options.step]);
}
