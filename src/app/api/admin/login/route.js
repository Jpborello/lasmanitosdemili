import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  getClientIdentifier,
  checkLoginAllowed,
  recordFailedLogin,
  clearLoginAttempts,
  createAdminSession,
  revokeAdminSession,
  isAdminAuthenticated,
} from '@/lib/auth';

export async function POST(request) {
  try {
    const identifier = getClientIdentifier(request);

    // 1. Verificar rate limiting antes de procesar el intento
    const { allowed, retryAfterSeconds } = await checkLoginAllowed(identifier);
    if (!allowed) {
      const minutes = Math.ceil(retryAfterSeconds / 60);
      return NextResponse.json(
        { error: `Demasiados intentos fallidos. Probá de nuevo en ${minutes} minuto${minutes === 1 ? '' : 's'}.` },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }

    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: 'La contraseña es requerida' }, { status: 400 });
    }

    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword || password !== adminPassword) {
      await recordFailedLogin(identifier);
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
    }

    // Login correcto: limpiar intentos previos y crear una sesión real
    await clearLoginAttempts(identifier);
    const { token, maxAgeSeconds } = await createAdminSession();

    const cookieStore = await cookies();
    cookieStore.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: maxAgeSeconds,
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in login API:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// GET: Verificar estado de autenticación
export async function GET() {
  try {
    const cookieStore = await cookies();
    const authenticated = await isAdminAuthenticated(cookieStore);
    return NextResponse.json({ authenticated });
  } catch (error) {
    return NextResponse.json({ authenticated: false });
  }
}

// DELETE: Cerrar sesión
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;
    await revokeAdminSession(token);
    cookieStore.delete('admin_token');
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al cerrar sesión' }, { status: 500 });
  }
}
