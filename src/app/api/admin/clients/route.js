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

// PATCH: Editar los datos de una clienta (nombre, teléfono, email) y/o su estado de
// confianza (confiable / restringida / bloqueada). El teléfono es la clave primaria de
// la clienta, así que si se cambia (new_phone) hay que migrar también sus turnos para
// que no pierda su historial.
export async function PATCH(request) {
  try {
    const cookieStore = await cookies();
    const isAdmin = await isAdminAuthenticated(cookieStore);

    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { phone, trust_status, name, email, new_phone } = body;

    if (!phone) {
      return NextResponse.json({ error: 'Falta el teléfono de la clienta a modificar' }, { status: 400 });
    }

    const cleanPhone = normalizePhone(phone);
    const db = await getDb();

    const existing = await db.execute({
      sql: 'SELECT phone FROM clients WHERE phone = ?',
      args: [cleanPhone],
    });

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Clienta no encontrada' }, { status: 404 });
    }

    // Cambiar el estado de confianza (uso ya existente: switch de confiable/restringida y botón de bloqueo)
    if (trust_status !== undefined) {
      const allowedStatuses = ['trusted', 'restricted', 'blocked'];
      if (!allowedStatuses.includes(trust_status)) {
        return NextResponse.json({ error: 'Estado de confianza inválido' }, { status: 400 });
      }
      await db.execute({
        sql: 'UPDATE clients SET trust_status = ? WHERE phone = ?',
        args: [trust_status, cleanPhone],
      });
    }

    // Editar nombre y/o email
    if (name !== undefined || email !== undefined) {
      const fields = [];
      const args = [];

      if (name !== undefined) {
        if (!name.trim()) {
          return NextResponse.json({ error: 'El nombre no puede estar vacío' }, { status: 400 });
        }
        fields.push('name = ?');
        args.push(name.trim());
      }

      if (email !== undefined) {
        fields.push('email = ?');
        args.push(email.trim() ? email.trim() : null);
      }

      args.push(cleanPhone);
      await db.execute({
        sql: `UPDATE clients SET ${fields.join(', ')} WHERE phone = ?`,
        args,
      });
    }

    // Corregir el teléfono: al ser la clave primaria de la clienta, hay que migrar
    // también sus turnos existentes para que sigan asociados a la persona correcta.
    if (new_phone !== undefined) {
      const cleanNewPhone = normalizePhone(new_phone);

      if (!cleanNewPhone || cleanNewPhone.length < 8) {
        return NextResponse.json({ error: 'El nuevo teléfono no es válido' }, { status: 400 });
      }

      if (cleanNewPhone !== cleanPhone) {
        const conflict = await db.execute({
          sql: 'SELECT phone FROM clients WHERE phone = ?',
          args: [cleanNewPhone],
        });

        if (conflict.rows.length > 0) {
          return NextResponse.json({ error: 'Ya existe otra clienta registrada con ese teléfono' }, { status: 409 });
        }

        await db.execute({
          sql: 'UPDATE clients SET phone = ? WHERE phone = ?',
          args: [cleanNewPhone, cleanPhone],
        });
        await db.execute({
          sql: 'UPDATE appointments SET client_phone = ? WHERE client_phone = ?',
          args: [cleanNewPhone, cleanPhone],
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in admin clients PATCH:', error);
    return NextResponse.json({ error: 'Error al actualizar la clienta' }, { status: 500 });
  }
}
