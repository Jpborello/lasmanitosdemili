/**
 * Confetti liviano hecho a mano con Canvas (sin dependencias externas).
 * Pensado para el momento de "¡Turno Confirmado!" en la reserva.
 */

const BRAND_COLORS = ['#dcae96', '#c5a880', '#ffb3c6', '#ffffff', '#f6eee5'];

export function fireConfetti({ durationMs = 2200, particleCount = 90 } = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  const resize = () => {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
  };
  resize();

  const particles = Array.from({ length: particleCount }, () => ({
    x: Math.random() * window.innerWidth,
    y: -20 - Math.random() * window.innerHeight * 0.3,
    size: 5 + Math.random() * 6,
    color: BRAND_COLORS[Math.floor(Math.random() * BRAND_COLORS.length)],
    speedY: 2 + Math.random() * 2.5,
    speedX: (Math.random() - 0.5) * 2,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 8,
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
  }));

  const startTime = performance.now();
  let rafId;

  const draw = (now) => {
    const elapsed = now - startTime;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const fadeStart = durationMs * 0.7;
    const opacity = elapsed > fadeStart ? Math.max(0, 1 - (elapsed - fadeStart) / (durationMs - fadeStart)) : 1;

    particles.forEach((p) => {
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotationSpeed;

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    if (elapsed < durationMs) {
      rafId = requestAnimationFrame(draw);
    } else {
      canvas.remove();
    }
  };

  rafId = requestAnimationFrame(draw);

  // Seguridad: si algo falla, no dejar el canvas colgado más de la cuenta
  setTimeout(() => {
    if (rafId) cancelAnimationFrame(rafId);
    canvas.remove();
  }, durationMs + 500);
}
