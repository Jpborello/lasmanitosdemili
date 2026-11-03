import { connection } from 'next/server';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Sitio no disponible',
};

// Pantalla neutra que muestra el candado general (ver src/proxy.js).
export default async function NoDisponible() {
  await connection();
  // Si el candado no está puesto, esta página no tiene sentido: a la home
  if (process.env.SITE_LOCKED !== 'true') redirect('/');

  return (
    <main
      data-pausa
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '420px' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: '1.8rem', marginBottom: '10px' }}>
          Sitio no disponible
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Esta web no está disponible por el momento.
        </p>
      </div>
    </main>
  );
}
