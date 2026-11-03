import { NextResponse } from 'next/server';

// Candado general: con SITE_LOCKED=true (variable de entorno en Vercel) la web
// pública Y el panel de admin quedan fuera de servicio, y todas las APIs
// responden 503 (incluido el cron de recordatorios). No se borra ningún dato:
// para volver, se saca la variable y se hace un redeploy.
export function proxy(request) {
  if (process.env.SITE_LOCKED !== 'true') return;

  const { pathname } = request.nextUrl;
  if (pathname === '/no-disponible') return;

  if (pathname.startsWith('/api/')) {
    return Response.json({ error: 'Sitio no disponible por el momento' }, { status: 503 });
  }

  return NextResponse.rewrite(new URL('/no-disponible', request.url));
}

export const config = {
  // Todo menos los archivos estáticos (JS/CSS de Next, imágenes, íconos, etc.)
  matcher: ['/((?!_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)'],
};
