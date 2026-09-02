import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { normalizePhone } from '@/lib/phone';

// GET: Endpoint público para que una clienta consulte sus propios turnos por teléfono
// (misma lógica de identificación por teléfono que ya usa /api/clients/status, no requiere
// contraseña porque las clientas no tienen cuenta con login en este sistema).
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) {
      return NextResponse.json({ error: 'Ingresá un número de teléfono válido' }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.execute({
      sql: `SELECT id, client_name, appointment_date, appointment_time, service, price, status, created_at
            FROM appointments
            WHERE client_phone = ?
            ORDER BY appointment_date DESC, appointment_time DESC`,
      args: [cleanPhone],
    });

    return NextResponse.json({ appointments: result.rows }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  } catch (error) {
    console.error('Error in appointments/mine GET:', error);
    return NextResponse.json({ error: 'Error al buscar tus turnos' }, { status: 500 });
  }
}
