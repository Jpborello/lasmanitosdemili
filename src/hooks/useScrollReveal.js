'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Hook simple para animar elementos cuando entran en el viewport al hacer scroll.
 * Devuelve una ref para colgar en el elemento y un booleano que pasa a true
 * la primera vez que el elemento se vuelve visible (se queda en true después,
 * para no repetir la animación cada vez que se hace scroll hacia arriba y abajo).
 */
export function useScrollReveal({ threshold = 0.15, rootMargin = '0px 0px -80px 0px' } = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Si el navegador no soporta IntersectionObserver, mostrar directamente
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(node);
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return [ref, isVisible];
}
