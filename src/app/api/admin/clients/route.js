import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function GET() {
  try {
    // 1. Verificar autenticación
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;
    const adminHash = crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || '').digest('hex');

    if (!token || token !== adminHash) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = await getDb();

    // 2. Obtener lista consolidada de clientas por celular
    const result = await db.execute(`
      SELECT 
        client_name, 
        client_phone, 
        MAX(client_email) as client_email,
        COUNT(*) as visits_count, 
        COALESCE(SUM(price), 0) as total_spent,
        MAX(appointment_date || ' ' || appointment_time) as last_visit
      FROM appointments
      GROUP BY client_phone
      ORDER BY client_name ASC
    `);

    return NextResponse.json({ clients: result.rows });
  } catch (error) {
    console.error('Error in admin clients GET:', error);
    return NextResponse.json({ error: 'Error al obtener listado de clientas' }, { status: 500 });
  }
}
