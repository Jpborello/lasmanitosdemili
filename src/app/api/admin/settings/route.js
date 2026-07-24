import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';

// GET: Retornar las configuraciones públicas
export async function GET() {
  try {
    const db = await getDb();
    const result = await db.execute('SELECT key, value FROM settings');
    
    const settings = {
      enable_18_weekday: true,
      blocked_weekdays: '0', // 0 = Domingo cerrado por defecto
      blocked_dates: '',
      blocked_slots: '',
    };

    for (const row of result.rows) {
      if (row.key === 'enable_18_weekday') {
        settings.enable_18_weekday = row.value === 'true';
      } else if (row.key === 'blocked_weekdays') {
        settings.blocked_weekdays = row.value;
      } else if (row.key === 'blocked_dates') {
        settings.blocked_dates = row.value;
      } else if (row.key === 'blocked_slots') {
        settings.blocked_slots = row.value;
      }
    }

    return NextResponse.json(settings);
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

    if (!token || token !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { enable_18_weekday, blocked_weekdays, blocked_dates, blocked_slots } = body;

    const db = await getDb();

    if (enable_18_weekday !== undefined) {
      await db.execute({
        sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        args: ['enable_18_weekday', enable_18_weekday ? 'true' : 'false'],
      });
    }

    if (blocked_weekdays !== undefined) {
      await db.execute({
        sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        args: ['blocked_weekdays', blocked_weekdays.toString()],
      });
    }

    if (blocked_dates !== undefined) {
      await db.execute({
        sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        args: ['blocked_dates', blocked_dates.toString()],
      });
    }

    if (blocked_slots !== undefined) {
      await db.execute({
        sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        args: ['blocked_slots', blocked_slots.toString()],
      });
    }

    // Obtener la configuración actualizada para responder
    const result = await db.execute('SELECT key, value FROM settings');
    const settings = {
      enable_18_weekday: true,
      blocked_weekdays: '0',
      blocked_dates: '',
      blocked_slots: '',
    };
    for (const row of result.rows) {
      if (row.key === 'enable_18_weekday') {
        settings.enable_18_weekday = row.value === 'true';
      } else if (row.key === 'blocked_weekdays') {
        settings.blocked_weekdays = row.value;
      } else if (row.key === 'blocked_dates') {
        settings.blocked_dates = row.value;
      } else if (row.key === 'blocked_slots') {
        settings.blocked_slots = row.value;
      }
    }

    return NextResponse.json({ success: true, ...settings });
  } catch (error) {
    console.error('Error in settings POST:', error);
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 });
  }
}
