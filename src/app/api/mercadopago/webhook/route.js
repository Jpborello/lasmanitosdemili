import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

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
        // Actualizar el estado del turno a 'confirmed'
        await db.execute({
          sql: "UPDATE appointments SET status = 'confirmed' WHERE id = ?",
          args: [appointmentId],
        });
        console.log(`Appointment ${appointmentId} confirmed successfully via webhook.`);
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
