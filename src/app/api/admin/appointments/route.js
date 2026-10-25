import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';
import { isAdminAuthenticated } from '@/lib/auth';
import { normalizePhone, isNoPhone } from '@/lib/phone';
import { DEFAULT_SERVICES } from '@/lib/constants';

// POST: Crear un turno manual desde el panel de administración
export async function POST(request) {
  try {
    // 1. Verificar autenticación
    const cookieStore = await cookies();
    const isAdmin = await isAdminAuthenticated(cookieStore);

    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      client_name,
      client_phone,
      has_no_phone,
      client_email,
      appointment_date,
      appointment_time,
      service,
      price,
    } = body;

    // 2. Validaciones básicas de campos obligatorios
    if (!client_name || !client_name.trim()) {
      return NextResponse.json({ error: 'El nombre de la clienta es obligatorio' }, { status: 400 });
    }

    if (!appointment_date || !appointment_time) {
      return NextResponse.json({ error: 'La fecha y el horario son obligatorios' }, { status: 400 });
    }

    if (!service) {
      return NextResponse.json({ error: 'Debes seleccionar un servicio' }, { status: 400 });
    }

    // Validar formato de fecha (YYYY-MM-DD) y hora (HH:MM)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!dateRegex.test(appointment_date) || !timeRegex.test(appointment_time)) {
      return NextResponse.json({ error: 'Formato de fecha u hora inválido' }, { status: 400 });
    }

    // 3. Manejo seguro del teléfono
    let finalPhone = '';
    const ownerPhone = normalizePhone(process.env.MILI_PHONE_NUMBER || '3413022674');

    if (has_no_phone) {
      // Para personas mayores o clientas sin celular: se genera un identificador único seguro
      // Esto previene que se use el número de Mili o un número falso que colisione.
      // Si la clienta ya existía con un identificador 'sintel_', lo reutilizamos para no fragmentar su historial.
      if (client_phone && isNoPhone(client_phone)) {
        finalPhone = client_phone;
      } else {
        const timestamp = Date.now();
        const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        finalPhone = `sintel_${timestamp}_${randomSuffix}`;
      }
    } else {
      if (!client_phone || !client_phone.trim()) {
        return NextResponse.json(
          { error: 'Ingresá el número de teléfono o marcá la opción "No tiene celular"' },
          { status: 400 }
        );
      }

      finalPhone = normalizePhone(client_phone);

      if (!finalPhone || finalPhone.length < 6) {
        return NextResponse.json({ error: 'El número de teléfono ingresado es muy corto o inválido' }, { status: 400 });
      }

      // Safeguard crítico: Bloquear expresamente el uso del número personal de Mili
      if (finalPhone === ownerPhone) {
        return NextResponse.json(
          {
            error:
              'No podés usar el teléfono de Mili para agendar a una clienta. Si la clienta no tiene celular, tildá la opción "No tiene celular / WhatsApp".',
          },
          { status: 400 }
        );
      }
    }

    const db = await getDb();

    // 4. Verificar si el slot de fecha y hora ya está ocupado
    const checkResult = await db.execute({
      sql: 'SELECT id, client_name FROM appointments WHERE appointment_date = ? AND appointment_time = ?',
      args: [appointment_date, appointment_time],
    });

    if (checkResult.rows.length > 0) {
      const existingClient = checkResult.rows[0].client_name;
      return NextResponse.json(
        {
          error: `Ese horario ya está ocupado por ${existingClient}. Por favor elegí otro horario.`,
          conflict: true,
          existingClient,
        },
        { status: 409 }
      );
    }

    // 5. Determinar el precio
    let finalPrice = 0;
    if (price !== undefined && price !== null && price !== '') {
      finalPrice = parseInt(price, 10) || 0;
    } else {
      const serviceResult = await db.execute({
        sql: 'SELECT price FROM services WHERE id = ?',
        args: [service],
      });
      if (serviceResult.rows.length > 0) {
        finalPrice = serviceResult.rows[0].price;
      } else {
        const defaultService = DEFAULT_SERVICES.find(s => s.id === service);
        if (defaultService) finalPrice = defaultService.price;
      }
    }

    const createdAt = new Date().toISOString();
    const id = crypto.randomUUID();

    // 6. Registrar o actualizar la clienta en la tabla clients
    await db.execute({
      sql: `INSERT INTO clients (phone, name, email, created_at, trust_status)
            VALUES (?, ?, ?, ?, 'trusted')
            ON CONFLICT(phone) DO UPDATE SET
              name = excluded.name,
              email = COALESCE(excluded.email, clients.email)`,
      args: [
        finalPhone,
        client_name.trim(),
        client_email ? client_email.trim() : null,
        createdAt,
      ],
    });

    // 7. Insertar el turno confirmado
    await db.execute({
      sql: `INSERT INTO appointments (
              id, client_name, client_phone, client_email,
              appointment_date, appointment_time, service, price, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)`,
      args: [
        id,
        client_name.trim(),
        finalPhone,
        client_email ? client_email.trim() : null,
        appointment_date,
        appointment_time,
        service,
        finalPrice,
        createdAt,
      ],
    });

    return NextResponse.json({
      success: true,
      message: 'Turno agendado exitosamente',
      appointment: {
        id,
        client_name: client_name.trim(),
        client_phone: finalPhone,
        appointment_date,
        appointment_time,
        service,
        price: finalPrice,
        status: 'confirmed',
      },
    });
  } catch (error) {
    console.error('Error in admin appointments POST:', error);
    return NextResponse.json({ error: 'Error al registrar el turno manual' }, { status: 500 });
  }
}
