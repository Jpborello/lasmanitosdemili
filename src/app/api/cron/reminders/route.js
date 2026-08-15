import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendClientReminder } from '@/lib/whatsapp';
import { sendClientReminderEmail } from '@/lib/email';

export async function GET(request) {
  try {
    // Verificar token secreto del Cron para evitar ejecuciones no autorizadas
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const secretParam = searchParams.get('secret');

    const expectedSecret = process.env.CRON_SECRET;

    // Fallar cerrado: si no hay CRON_SECRET configurado, no se ejecuta el cron.
    // (Antes, si faltaba la variable de entorno, el endpoint quedaba abierto sin autenticación.)
    if (!expectedSecret) {
      console.error('CRON_SECRET no está configurado: se rechaza la ejecución del cron por seguridad.');
      return NextResponse.json(
        { error: 'CRON_SECRET no configurado en el servidor. Configuralo en las variables de entorno.' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${expectedSecret}` && secretParam !== expectedSecret) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Calcular la fecha de mañana en zona horaria Argentina
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

    console.log(`⏰ Cron Job: Buscando turnos para recordar fecha: ${tomorrowStr}`);

    const db = await getDb();
    const result = await db.execute({
      sql: `SELECT * FROM appointments
            WHERE appointment_date = ?
              AND status = 'confirmed'`,
      args: [tomorrowStr],
    });

    const appointments = result.rows;
    let sentCount = 0;

    for (const appt of appointments) {
      try {
        const res = await sendClientReminder(appt);
        if (res?.success) {
          sentCount++;
        }
      } catch (err) {
        console.error(`Error enviando recordatorio de WhatsApp a ${appt.client_name}:`, err);
      }

      if (appt.client_email) {
        try {
          await sendClientReminderEmail(appt);
        } catch (err) {
          console.error(`Error enviando recordatorio por email a ${appt.client_name}:`, err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Recordatorios procesados para ${tomorrowStr}`,
      found: appointments.length,
      sent: sentCount,
    });
  } catch (error) {
    console.error('Error en Cron Job de recordatorios:', error);
    return NextResponse.json({ error: 'Error procesando recordatorios' }, { status: 500 });
  }
}
