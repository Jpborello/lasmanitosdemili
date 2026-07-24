import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// GET: Obtener turnos
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // Formato: YYYY-MM-DD
    const all = searchParams.get('all') === 'true'; // Para ver lista general

    // Verificar si es administrador mediante cookie
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;
    const isAdmin = token && token === process.env.ADMIN_PASSWORD;

    const db = await getDb();

    // 1. Caso Admin: Ver lista completa de próximos turnos
    if (isAdmin && all) {
      // Obtener todos los turnos desde hoy en adelante (o todos ordenados)
      const today = new Date().toISOString().split('T')[0];
      const result = await db.execute({
        sql: `SELECT * FROM appointments 
              WHERE appointment_date >= ? 
              ORDER BY appointment_date ASC, appointment_time ASC`,
        args: [today],
      });
      return NextResponse.json({ appointments: result.rows });
    }

    // 2. Caso por Fecha (Público o Admin)
    if (date) {
      const result = await db.execute({
        sql: 'SELECT * FROM appointments WHERE appointment_date = ? ORDER BY appointment_time ASC',
        args: [date],
      });

      if (isAdmin) {
        // El administrador ve todos los datos de las reservas
        return NextResponse.json({ appointments: result.rows });
      } else {
        // Las clientas sólo ven qué horas ya están reservadas para no mostrarlas en el calendario
        const bookedTimes = result.rows.map(row => row.appointment_time);
        return NextResponse.json({ bookedTimes });
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
    
    // Obtener configuraciones de bloqueos
    const settingsResult = await db.execute('SELECT key, value FROM settings');
    const settings = {
      enable_18_weekday: true,
      blocked_weekdays: '0', // 0 = Domingo cerrado por defecto
      blocked_dates: '',
      blocked_slots: '',
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
    const validWeekdayTimes = ['08:00', '10:00', '14:00', '16:00', '18:00'];
    const validSaturdayTimes = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'];

    if (dayOfWeek === 6) {
      // Sábado
      if (!validSaturdayTimes.includes(appointment_time)) {
        return NextResponse.json({ error: 'Horario inválido para días sábados' }, { status: 400 });
      }
    } else {
      // Lunes a Viernes
      if (!validWeekdayTimes.includes(appointment_time)) {
        return NextResponse.json({ error: 'Horario inválido para días de semana' }, { status: 400 });
      }

      // Si es el turno de las 18:00hs, validar si está activo
      if (appointment_time === '18:00' && !settings.enable_18_weekday) {
        return NextResponse.json({ error: 'El turno de las 18:00hs en días de semana no está disponible actualmente' }, { status: 400 });
      }
    }

    // 3. Validar que la fecha no sea pasada
    const todayStr = new Date().toISOString().split('T')[0];
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

    // Obtener precio correspondiente al servicio configurado en la base de datos
    const serviceResult = await db.execute({
      sql: 'SELECT price FROM services WHERE id = ?',
      args: [service],
    });
    const price = serviceResult.rows.length > 0 ? serviceResult.rows[0].price : (body.price || 0);

    await db.execute({
      sql: `INSERT INTO appointments (id, client_name, client_phone, client_email, appointment_date, appointment_time, service, price, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, client_name, client_phone, client_email || null, appointment_date, appointment_time, service, price, created_at],
    });

    return NextResponse.json({
      success: true,
      appointment: { id, client_name, client_phone, client_email, appointment_date, appointment_time, service, price }
    });

  } catch (error) {
    console.error('Error in appointments POST:', error);
    return NextResponse.json({ error: 'Error al reservar el turno' }, { status: 500 });
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
    const token = cookieStore.get('admin_token')?.value;

    if (!token || token !== process.env.ADMIN_PASSWORD) {
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
