'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Hook para animar un número contando hacia arriba desde 0 hasta `target`.
 * Sólo arranca la animación cuando `start` es true (pensado para dispararse
 * junto con useScrollReveal, cuando el elemento entra en pantalla).
 */
export function useCountUp(target, { start = false, duration = 1400 } = {}) {
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!start || startedRef.current) return;
    startedRef.current = true;

    const numericTarget = Number(target) || 0;
    if (numericTarget <= 0) {
      setValue(numericTarget);
      return;
    }

    let rafId;
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing suave de salida (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(numericTarget * eased));

      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [start, target, duration]);

  return value;
}
