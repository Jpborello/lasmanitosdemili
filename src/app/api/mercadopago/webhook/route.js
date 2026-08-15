import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { notifyAdminNewAppointment, sendClientConfirmation } from '@/lib/whatsapp';
import { sendClientConfirmationEmail } from '@/lib/email';

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('Mercado Pago Webhook body:', JSON.stringify(body));

    // Obtener el ID del pago
    let paymentId = null;
    if (body.data && body.data.id) {
      paymentId = body.data.id;
    } else if (body.type === 'payment' && body.id) {
      paymentId = body.id;
    }

    if (!paymentId) {
      // Retornar 200 para avisarle a MP que recibimos la notificación vacía
      return NextResponse.json({ received: true });
    }

    const db = await getDb();

    // Obtener token de Mercado Pago desde la configuración
    const mpTokenResult = await db.execute("SELECT value FROM settings WHERE key = 'mp_access_token'");
    const accessToken = mpTokenResult.rows[0]?.value;

    if (!accessToken) {
      console.error('Mercado Pago access token not configured, cannot verify payment.');
      return NextResponse.json({ error: 'Pasarela no configurada' }, { status: 500 });
    }

    // Consultar el estado del pago directamente en la API de Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error('Failed to query payment status from Mercado Pago:', errorText);

      // Si es un error de cliente (400, 404, etc.), no reintentamos (retornamos 200)
      if (mpResponse.status >= 400 && mpResponse.status < 500 && mpResponse.status !== 429) {
        return NextResponse.json({ error: 'Consulta de pago inválida para el webhook', details: errorText });
      }
      return NextResponse.json({ error: 'Error al consultar pago en Mercado Pago' }, { status: 502 });
    }

    const paymentData = await mpResponse.json();
    console.log(`Payment ${paymentId} status: ${paymentData.status}, reference: ${paymentData.external_reference}`);

    // Si el pago está aprobado, confirmar el turno correspondiente
    if (paymentData.status === 'approved') {
      const appointmentId = paymentData.external_reference;

      if (appointmentId) {
        // Obtener el turno actual ANTES de actualizar, para chequear si ya estaba confirmado.
        // Mercado Pago puede reintentar el mismo webhook varias veces; sin este chequeo
        // se le reenviarían los WhatsApp de confirmación repetidamente a la clienta y a Mili.
        const apptResult = await db.execute({
          sql: 'SELECT * FROM appointments WHERE id = ?',
          args: [appointmentId],
        });

        if (apptResult.rows.length === 0) {
          console.warn(`Appointment ${appointmentId} no encontrado para el pago ${paymentId}.`);
        } else {
          const appt = apptResult.rows[0];

          if (appt.status === 'confirmed') {
            console.log(`Appointment ${appointmentId} ya estaba confirmado; se ignora notificación duplicada del webhook.`);
          } else {
            await db.execute({
              sql: "UPDATE appointments SET status = 'confirmed' WHERE id = ?",
              args: [appointmentId],
            });
            console.log(`Appointment ${appointmentId} confirmed successfully via webhook.`);

            notifyAdminNewAppointment(appt).catch(err => console.error('Error enviando WhatsApp admin en webhook:', err));
            sendClientConfirmation(appt).catch(err => console.error('Error enviando WhatsApp clienta en webhook:', err));
            if (appt.client_email) {
              sendClientConfirmationEmail(appt).catch(err => console.error('Error enviando email a clienta en webhook:', err));
            }
          }
        }
      } else {
        console.warn('Payment approved but external_reference (appointment ID) is missing.');
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in Mercado Pago webhook:', error);
    return NextResponse.json({ error: 'Error interno de procesamiento' }, { status: 500 });
  }
}
