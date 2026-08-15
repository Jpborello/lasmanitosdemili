'use client';

import { useScrollReveal } from '@/hooks/useScrollReveal';

/**
 * Envoltorio reutilizable que anima su contenido (fade + slide-up) la primera
 * vez que entra en el viewport. `delay` (en ms) permite escalonar animaciones
 * cuando se usa dentro de una grilla (tarjetas de servicios, galería, etc.).
 */
export default function Reveal({ children, delay = 0, className = '', as: Tag = 'div', ...rest }) {
  const [ref, isVisible] = useScrollReveal();

  return (
    <Tag
      ref={ref}
      className={`reveal ${isVisible ? 'reveal-visible' : ''} ${className}`}
      style={{ transitionDelay: isVisible ? `${delay}ms` : '0ms' }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
