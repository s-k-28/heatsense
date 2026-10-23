import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { EASE_OUT } from '@/lib/motion-engine';

/**
 * A number that glides from its old value to a new one (700 ms, ease-out) instead of jumping:
 * for values that change rarely and mean something (a new WBGT reading, a season total). The
 * first value shows as it is. Not for values that change every second.
 */
export function useTweenedNumber(value: number, duration = 700) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const current = useRef(value);
  useEffect(() => {
    if (reduced || from.current === value) { from.current = value; current.current = value; const id = requestAnimationFrame(() => setShown(value)); return () => cancelAnimationFrame(id); }
    const start = current.current;
    const began = Date.now();
    let frame = 0;
    const step = () => {
      const p = Math.min(1, (Date.now() - began) / duration);
      current.current = start + (value - start) * EASE_OUT(p);
      setShown(current.current);
      if (p < 1) frame = requestAnimationFrame(step);
      else from.current = value;
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [duration, reduced, value]);
  return shown;
}
