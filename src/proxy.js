import { NextResponse } from 'next/server';
import { SITE_PAUSED } from '@/lib/pausa';

// Pausa general (ver src/lib/pausa.js): todas las páginas, incluido /admin,
// muestran la pantalla de no disponible y las APIs responden 503.
export function proxy(request) {
  if (!SITE_PAUSED) return;

  const { pathname } = request.nextUrl;
  if (pathname === '/no-disponible') return;

  if (pathname.startsWith('/api/')) {
    return Response.json({ error: 'Sitio no disponible por el momento' }, { status: 503 });
  }

  return NextResponse.rewrite(new URL('/no-disponible', request.url));
}

export const config = {
  // Todo menos los archivos estáticos (JS/CSS de Next, imágenes, íconos, etc.)
  matcher: ['/((?!_next/static|_next/image|.*\.[a-zA-Z0-9]+$).*)'],
};
