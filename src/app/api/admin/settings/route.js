import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// GET: Retornar las configuraciones públicas
export async function GET() {
  try {
    const db = await getDb();
    const result = await db.execute('SELECT key, value FROM settings');
    
    // Verificar si es administrador para retornar tokens sensibles
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;
    const adminHash = crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || '').digest('hex');
    const isAdmin = token && token === adminHash;

    const settings = {
      enable_18_weekday: true,
      blocked_weekdays: '0', // 0 = Domingo cerrado por defecto
      blocked_dates: '',
      blocked_slots: '',
      mp_enabled: false,
      mp_public_key: '',
      mp_deposit_amount: 2000,
      ...(isAdmin ? { mp_access_token: '' } : {})
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
      } else if (row.key === 'mp_enabled') {
        settings.mp_enabled = row.value === 'true';
      } else if (row.key === 'mp_public_key') {
        settings.mp_public_key = row.value;
      } else if (row.key === 'mp_deposit_amount') {
        settings.mp_deposit_amount = parseInt(row.value, 10) || 2000;
      } else if (row.key === 'mp_access_token' && isAdmin) {
        settings.mp_access_token = row.value;
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

    const adminHash = crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || '').digest('hex');
    if (!token || token !== adminHash) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      enable_18_weekday, 
      blocked_weekdays, 
      blocked_dates, 
      blocked_slots,
      mp_enabled,
      mp_access_token,
      mp_public_key,
      mp_deposit_amount
    } = body;

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

    if (mp_enabled !== undefined) {
      await db.execute({
        sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        args: ['mp_enabled', mp_enabled ? 'true' : 'false'],
      });
    }

    if (mp_access_token !== undefined) {
      await db.execute({
        sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        args: ['mp_access_token', mp_access_token.toString()],
      });
    }

    if (mp_public_key !== undefined) {
      await db.execute({
        sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        args: ['mp_public_key', mp_public_key.toString()],
      });
    }

    if (mp_deposit_amount !== undefined) {
      await db.execute({
        sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        args: ['mp_deposit_amount', mp_deposit_amount.toString()],
      });
    }

    // Obtener la configuración actualizada para responder
    const result = await db.execute('SELECT key, value FROM settings');
    const settings = {
      enable_18_weekday: true,
      blocked_weekdays: '0',
      blocked_dates: '',
      blocked_slots: '',
      mp_enabled: false,
      mp_public_key: '',
      mp_deposit_amount: 2000,
      mp_access_token: '',
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
      } else if (row.key === 'mp_enabled') {
        settings.mp_enabled = row.value === 'true';
      } else if (row.key === 'mp_public_key') {
        settings.mp_public_key = row.value;
      } else if (row.key === 'mp_deposit_amount') {
        settings.mp_deposit_amount = parseInt(row.value, 10) || 2000;
      } else if (row.key === 'mp_access_token') {
        settings.mp_access_token = row.value;
      }
    }

    return NextResponse.json({ success: true, ...settings });
  } catch (error) {
    console.error('Error in settings POST:', error);
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 });
  }
}
