import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // success, failure, pending
    const id = searchParams.get('id'); // ID del turno (external_reference)

    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;

    if (!id) {
      return NextResponse.redirect(`${baseUrl}?payment=error`);
    }

    if (status === 'success') {
      const db = await getDb();
      const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id');
      
      let verified = false;

      // Obtener token de Mercado Pago desde la configuración para verificación cruzada
      const mpTokenResult = await db.execute("SELECT value FROM settings WHERE key = 'mp_access_token'");
      const accessToken = mpTokenResult.rows[0]?.value;

      if (paymentId && accessToken) {
        try {
          const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });
          
          if (mpResponse.ok) {
            const paymentData = await mpResponse.json();
            // Verificar que esté aprobado y corresponda al ID de la cita
            if (paymentData.status === 'approved' && paymentData.external_reference === id) {
              verified = true;
            }
          }
        } catch (e) {
          console.error('Error verifying payment in feedback:', e);
        }
      }

      if (verified) {
        // Confirmar el turno inmediatamente por seguridad y velocidad para la UX
        await db.execute({
          sql: "UPDATE appointments SET status = 'confirmed' WHERE id = ?",
          args: [id],
        });
        return NextResponse.redirect(`${baseUrl}?payment=success&id=${id}`);
      } else {
        console.warn(`Bypass attempt or unverified payment in feedback redirect. ID: ${id}, PaymentID: ${paymentId}`);
        return NextResponse.redirect(`${baseUrl}?payment=error`);
      }
    } else if (status === 'pending') {
      return NextResponse.redirect(`${baseUrl}?payment=pending&id=${id}`);
    } else {
      // Fallo o cancelación de pago: liberamos el turno en la DB eliminándolo de inmediato
      const db = await getDb();
      await db.execute({
        sql: "DELETE FROM appointments WHERE id = ? AND status = 'pending_payment'",
        args: [id],
      });
      return NextResponse.redirect(`${baseUrl}?payment=failure`);
    }
  } catch (error) {
    console.error('Error in Mercado Pago feedback redirect:', error);
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    return NextResponse.redirect(`${protocol}://${host}?payment=error`);
  }
}
