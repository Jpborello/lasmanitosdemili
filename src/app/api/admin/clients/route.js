import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';
import { isAdminAuthenticated } from '@/lib/auth';
import { normalizePhone } from '@/lib/phone';

export async function GET() {
  try {
    // 1. Verificar autenticación
    const cookieStore = await cookies();
    const isAdmin = await isAdminAuthenticated(cookieStore);

    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = await getDb();

    // 2. Obtener lista consolidada de clientas por celular usando la tabla clients
    const result = await db.execute(`
      SELECT
        c.name as client_name,
        c.phone as client_phone,
        c.email as client_email,
        c.trust_status as trust_status,
        COUNT(a.id) as visits_count,
        COALESCE(SUM(a.price), 0) as total_spent,
        MAX(a.appointment_date || ' ' || a.appointment_time) as last_visit
      FROM clients c
      LEFT JOIN appointments a ON c.phone = a.client_phone
      GROUP BY c.phone
      ORDER BY c.name ASC
    `);

    return NextResponse.json({ clients: result.rows });
  } catch (error) {
    console.error('Error in admin clients GET:', error);
    return NextResponse.json({ error: 'Error al obtener listado de clientas' }, { status: 500 });
  }
}

// PATCH: Cambiar manualmente el estado de confianza de una clienta (confiable / restringida / bloqueada)
export async function PATCH(request) {
  try {
    const cookieStore = await cookies();
    const isAdmin = await isAdminAuthenticated(cookieStore);

    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { phone, trust_status } = body;

    const allowedStatuses = ['trusted', 'restricted', 'blocked'];
    if (!phone || !allowedStatuses.includes(trust_status)) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const cleanPhone = normalizePhone(phone);
    const db = await getDb();

    const result = await db.execute({
      sql: 'UPDATE clients SET trust_status = ? WHERE phone = ?',
      args: [trust_status, cleanPhone],
    });

    if (result.rowsAffected === 0) {
      return NextResponse.json({ error: 'Clienta no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, trust_status });
  } catch (error) {
    console.error('Error in admin clients PATCH:', error);
    return NextResponse.json({ error: 'Error al actualizar el estado de la clienta' }, { status: 500 });
  }
}
