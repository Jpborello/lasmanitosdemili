import { redirect } from 'next/navigation';
import { SITE_PAUSED } from '@/lib/pausa';
import { MILI_WHATSAPP_NUMBER } from '@/lib/constants';

export const metadata = {
  title: 'No disponible de momento',
  robots: { index: false },
};

// Pantalla negra que muestra la pausa general (ver src/lib/pausa.js y src/proxy.js).
export default function NoDisponible() {
  // Sin pausa, esta página no tiene sentido: a la home
  if (!SITE_PAUSED) redirect('/');

  const waLink = `https://wa.me/${MILI_WHATSAPP_NUMBER}?text=${encodeURIComponent('¡Hola! Quiero sacar un turno.')}`;

  return (
    <main
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#000',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '420px' }}>
        <h1 style={{ fontWeight: 500, fontSize: '1.7rem', marginBottom: '12px', color: '#fff' }}>
          No disponible de momento
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '28px', lineHeight: 1.6 }}>
          Por el momento los turnos se toman únicamente por WhatsApp.
        </p>
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            backgroundColor: '#25D366',
            color: '#fff',
            fontWeight: 600,
            padding: '14px 28px',
            borderRadius: '50px',
            textDecoration: 'none',
          }}
        >
          Escribir por WhatsApp
        </a>
      </div>
    </main>
  );
}
