import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { notifyAdminNewAppointment, sendClientConfirmation } from '@/lib/whatsapp';
import { sendClientConfirmationEmail } from '@/lib/email';
import { isAdminAuthenticated } from '@/lib/auth';

// GET: Obtener turnos
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // Formato: YYYY-MM-DD
    const all = searchParams.get('all') === 'true'; // Para ver lista general

    // Verificar si es administrador mediante cookie
    const cookieStore = await cookies();
    const isAdmin = await isAdminAuthenticated(cookieStore);

    const db = await getDb();

    // Limpiar reservas pendientes expiradas (más de 15 minutos sin pagar)
    try {
      await db.execute(`
        DELETE FROM appointments
        WHERE status = 'pending_payment'
          AND datetime(created_at) <= datetime('now', '-15 minutes')
      `);
    } catch (cleanError) {
      console.error('Error cleaning up expired pending appointments in GET:', cleanError);
    }

    // 1. Caso Admin: Ver lista completa de próximos turnos
    if (isAdmin && all) {
      // Obtener todos los turnos desde hoy en adelante (o todos ordenados)
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
      const result = await db.execute({
        sql: `SELECT * FROM appointments
              WHERE appointment_date >= ?
              ORDER BY appointment_date ASC, appointment_time ASC`,
        args: [today],
      });
      return NextResponse.json({ appointments: result.rows }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        }
      });
    }

    // 2. Caso por Fecha (Público o Admin)
    if (date) {
      const result = await db.execute({
        sql: 'SELECT * FROM appointments WHERE appointment_date = ? ORDER BY appointment_time ASC',
        args: [date],
      });

      if (isAdmin) {
        // El administrador ve todos los datos de las reservas
        return NextResponse.json({ appointments: result.rows }, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          }
        });
      } else {
        // Las clientas sólo ven qué horas ya están reservadas para no mostrarlas en el calendario
        const bookedTimes = result.rows.map(row => row.appointment_time);
        return NextResponse.json({ bookedTimes }, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          }
        });
      }
    }

    return NextResponse.json({ error: 'Falta parámetro de búsqueda (date o all)' }, { status: 400 });
  } catch (error) {
    console.error('Error in appointments GET:', error);
    return NextResponse.json({ error: 'Error al obtener turnos' }, { status: 500 });
  }
}

// POST: Crear un nuevo turno (Reserva)
export async function POST(request) {
  try {
    const body = await request.json();
    const { client_name, client_phone, client_email, appointment_date, appointment_time, service } = body;

    // Validar campos obligatorios
    if (!client_name || !client_phone || !appointment_date || !appointment_time || !service) {
      return NextResponse.json({ error: 'Faltan campos obligatorios para la reserva' }, { status: 400 });
    }

    // Validar formato de fecha (YYYY-MM-DD) y hora (HH:MM)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!dateRegex.test(appointment_date) || !timeRegex.test(appointment_time)) {
      return NextResponse.json({ error: 'Formato de fecha u hora inválido' }, { status: 400 });
    }

    const bookingDate = new Date(`${appointment_date}T00:00:00`);
    const dayOfWeek = bookingDate.getDay(); // 0: Domingo, 1: Lunes, ..., 6: Sábado

    const db = await getDb();

    // Limpiar reservas pendientes expiradas (más de 15 minutos sin pagar)
    try {
      await db.execute(`
        DELETE FROM appointments
        WHERE status = 'pending_payment'
          AND datetime(created_at) <= datetime('now', '-15 minutes')
      `);
    } catch (cleanError) {
      console.error('Error cleaning up expired pending appointments in POST:', cleanError);
    }

    // Obtener configuraciones de bloqueos y Mercado Pago
    const settingsResult = await db.execute('SELECT key, value FROM settings');
    const settings = {
      enable_18_weekday: true,
      blocked_weekdays: '0', // 0 = Domingo cerrado por defecto
      blocked_dates: '',
      blocked_slots: '',
      extra_slots: '',
      mp_enabled: false,
      mp_access_token: '',
      mp_deposit_amount: 2000,
    };
    for (const row of settingsResult.rows) {
      if (row.key === 'enable_18_weekday') {
        settings.enable_18_weekday = row.value === 'true';
      } else if (row.key === 'blocked_weekdays') {
        settings.blocked_weekdays = row.value;
      } else if (row.key === 'blocked_dates') {
        settings.blocked_dates = row.value;
      } else if (row.key === 'blocked_slots') {
        settings.blocked_slots = row.value;
      } else if (row.key === 'extra_slots') {
        settings.extra_slots = row.value;
      } else if (row.key === 'mp_enabled') {
        settings.mp_enabled = row.value === 'true';
      } else if (row.key === 'mp_access_token') {
        settings.mp_access_token = row.value;
      } else if (row.key === 'mp_deposit_amount') {
        settings.mp_deposit_amount = parseInt(row.value, 10) || 2000;
      }
    }

    // 1. Validar si la fecha del turno está en la lista de fechas bloqueadas
    const blockedDatesArray = settings.blocked_dates.split(',').map(d => d.trim()).filter(Boolean);
    if (blockedDatesArray.includes(appointment_date)) {
      return NextResponse.json({ error: 'La fecha seleccionada no está disponible (día bloqueado)' }, { status: 400 });
    }

    // 2. Validar si el día de la semana está bloqueado
    const blockedWeekdaysArray = settings.blocked_weekdays.split(',').map(d => parseInt(d.trim(), 10)).filter(n => !isNaN(n));
    if (blockedWeekdaysArray.includes(dayOfWeek)) {
      const dayNames = ['Domingos', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábados'];
      return NextResponse.json({ error: `Los días ${dayNames[dayOfWeek]} no están disponibles para reservar` }, { status: 400 });
    }

    // 3. Validar si el slot específico (fecha + hora) está bloqueado
    const blockedSlotsArray = settings.blocked_slots.split(',').map(s => s.trim()).filter(Boolean);
    const currentSlotStr = `${appointment_date}_${appointment_time}`;
    if (blockedSlotsArray.includes(currentSlotStr)) {
      return NextResponse.json({ error: 'El horario seleccionado en esta fecha no está disponible (bloqueado)' }, { status: 400 });
    }

    // 3. Validar horas según el día
    const validWeekdayTimes = ['08:00', '10:00', '14:30', '16:00', '18:00'];
    const validSaturdayTimes = ['08:00', '10:00', '12:00', '14:30', '16:00', '18:00'];

    // Horarios extra habilitados puntualmente para esta fecha específica (fuera del horario fijo,
    // o incluso el 18:00hs de semana cuando el interruptor general está apagado)
    const extraSlotsArray = settings.extra_slots.split(',').map(s => s.trim()).filter(Boolean);
    const isExtraSlotForThisDate = extraSlotsArray.includes(`${appointment_date}_${appointment_time}`);

    if (dayOfWeek === 6) {
      // Sábado
      if (!validSaturdayTimes.includes(appointment_time) && !isExtraSlotForThisDate) {
        return NextResponse.json({ error: 'Horario inválido para días sábados' }, { status: 400 });
      }
    } else {
      // Lunes a Viernes
      const isStandardWeekdayTime = validWeekdayTimes.includes(appointment_time);
      if (!isStandardWeekdayTime && !isExtraSlotForThisDate) {
        return NextResponse.json({ error: 'Horario inválido para días de semana' }, { status: 400 });
      }

      // Si es el turno de las 18:00hs dentro del horario estándar, validar si está activo
      // (si se habilitó explícitamente como horario extra para esta fecha, se permite igual)
      if (appointment_time === '18:00' && isStandardWeekdayTime && !settings.enable_18_weekday && !isExtraSlotForThisDate) {
        return NextResponse.json({ error: 'El turno de las 18:00hs en días de semana no está disponible actualmente' }, { status: 400 });
      }
    }

    // 3. Validar que la fecha no sea pasada
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
    if (appointment_date < todayStr) {
      return NextResponse.json({ error: 'No se pueden reservar turnos en fechas pasadas' }, { status: 400 });
    }

    // 4. Validar doble reserva (evitar que dos personas reserven el mismo slot)
    const checkResult = await db.execute({
      sql: 'SELECT id FROM appointments WHERE appointment_date = ? AND appointment_time = ?',
      args: [appointment_date, appointment_time],
    });

    if (checkResult.rows.length > 0) {
      return NextResponse.json({ error: 'Este horario ya está reservado' }, { status: 409 });
    }

    // 5. Insertar turno en la base de datos
    const id = crypto.randomUUID();
    const created_at = new Date().toISOString();
    const cleanPhone = client_phone.replace(/\D/g, '');

    // Obtener precio correspondiente al servicio configurado en la base de datos
    const serviceResult = await db.execute({
      sql: 'SELECT price FROM services WHERE id = ?',
      args: [service],
    });
    const price = serviceResult.rows.length > 0 ? serviceResult.rows[0].price : (body.price || 0);

    // Registrar o actualizar clienta en la tabla clients
    await db.execute({
      sql: `INSERT INTO clients (phone, name, email, created_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(phone) DO UPDATE SET
              name = excluded.name,
              email = COALESCE(excluded.email, clients.email)`,
      args: [cleanPhone, client_name.trim(), client_email ? client_email.trim() : null, created_at],
    });

    // Validar si requiere cobro de seña con Mercado Pago
    let paymentRequired = false;
    let paymentUrl = null;

    if (settings.mp_enabled && settings.mp_access_token) {
      paymentRequired = true;
      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      const host = request.headers.get('host');
      const domain = `${protocol}://${host}`;

      try {
        const mpResponse = await fetch('https://api.mercadopago.com/v1/preferences', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${settings.mp_access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: [
              {
                id: 'deposit',
                title: 'Seña de Turno - Las Manitos de Mili',
                quantity: 1,
                unit_price: settings.mp_deposit_amount,
                currency_id: 'ARS',
              }
            ],
            back_urls: {
              success: `${domain}/api/mercadopago/feedback?status=success&id=${id}`,
              failure: `${domain}/api/mercadopago/feedback?status=failure&id=${id}`,
              pending: `${domain}/api/mercadopago/feedback?status=pending&id=${id}`,
            },
            auto_return: 'approved',
            external_reference: id,
            notification_url: `${domain}/api/mercadopago/webhook`,
          }),
        });

        const mpData = await mpResponse.json();
        if (!mpResponse.ok) {
          console.error('Mercado Pago API error:', mpData);
          throw new Error(mpData.message || 'Error al generar la preferencia de pago');
        }

        paymentUrl = mpData.init_point;
      } catch (mpError) {
        console.error('Failed to create Mercado Pago preference:', mpError);
        return NextResponse.json({ error: 'Error al conectar con Mercado Pago para cobrar la seña' }, { status: 502 });
      }
    }

    const appointmentStatus = paymentRequired ? 'pending_payment' : 'confirmed';

    try {
      await db.execute({
        sql: `INSERT INTO appointments (id, client_name, client_phone, client_email, appointment_date, appointment_time, service, price, created_at, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [id, client_name.trim(), cleanPhone, client_email || null, appointment_date, appointment_time, service, price, created_at, appointmentStatus],
      });

      // Si el turno queda confirmado automáticamente (sin seña previa), enviar WhatsApps y email
      if (appointmentStatus === 'confirmed') {
        const appointmentObj = { id, client_name: client_name.trim(), client_phone: cleanPhone, client_email, appointment_date, appointment_time, service, price, status: appointmentStatus };
        notifyAdminNewAppointment(appointmentObj).catch(err => console.error('Error enviando WhatsApp a Mili:', err));
        sendClientConfirmation(appointmentObj).catch(err => console.error('Error enviando WhatsApp a clienta:', err));
        if (client_email) {
          sendClientConfirmationEmail(appointmentObj).catch(err => console.error('Error enviando email a clienta:', err));
        }
      }
    } catch (dbError) {
      if (
        dbError.message && (
          dbError.message.includes('UNIQUE constraint failed') ||
          dbError.code === 'SQLITE_CONSTRAINT' ||
          dbError.code === 'SQLITE_CONSTRAINT_UNIQUE'
        )
      ) {
        return NextResponse.json({ error: 'Este horario ya está reservado por otra clienta' }, { status: 409 });
      }
      throw dbError;
    }

    return NextResponse.json({
      success: true,
      paymentRequired,
      paymentUrl,
      appointment: { id, client_name: client_name.trim(), client_phone: cleanPhone, client_email, appointment_date, appointment_time, service, price, status: appointmentStatus }
    });

  } catch (error) {
    console.error('Error in appointments POST:', error);
    return NextResponse.json({ error: 'Error al reservar el turno' }, { status: 500 });
  }
}

// PATCH: Actualizar el estado de un turno (ej. marcar como 'no_show'), requiere admin
export async function PATCH(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Falta el ID del turno' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const isAdmin = await isAdminAuthenticated(cookieStore);

    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    const allowedStatuses = ['confirmed', 'no_show'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }

    const db = await getDb();
    await db.execute({
      sql: 'UPDATE appointments SET status = ? WHERE id = ?',
      args: [status, id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in appointments PATCH:', error);
    return NextResponse.json({ error: 'Error al actualizar el turno' }, { status: 500 });
  }
}

// DELETE: Cancelar un turno (requiere autenticación de admin)
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Falta el ID del turno a cancelar' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const isAdmin = await isAdminAuthenticated(cookieStore);

    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = await getDb();
    await db.execute({
      sql: 'DELETE FROM appointments WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, message: 'Turno cancelado exitosamente' });
  } catch (error) {
    console.error('Error in appointments DELETE:', error);
    return NextResponse.json({ error: 'Error al cancelar turno' }, { status: 500 });
  }
}
