import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';

// GET: Retornar las configuraciones públicas (ej. si el turno de las 18hs está activo)
export async function GET() {
  try {
    const db = await getDb();
    const result = await db.execute({
      sql: 'SELECT value FROM settings WHERE key = ?',
      args: ['enable_18_weekday'],
    });

    const enable18 = result.rows[0]?.value === 'true';

    return NextResponse.json({ enable_18_weekday: enable18 });
  } catch (error) {
    console.error('Error in settings GET:', error);
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 });
  }
}

// POST: Actualizar configuración (requiere autenticación)
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;

    // Verificar token simple (usamos la contraseña de administrador como token por simplicidad)
    if (!token || token !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { enable_18_weekday } = body;

    if (enable_18_weekday === undefined) {
      return NextResponse.json({ error: 'Falta el campo enable_18_weekday' }, { status: 400 });
    }

    const db = await getDb();
    await db.execute({
      sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      args: ['enable_18_weekday', enable_18_weekday ? 'true' : 'false'],
    });

    return NextResponse.json({ success: true, enable_18_weekday });
  } catch (error) {
    console.error('Error in settings POST:', error);
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 });
  }
}
