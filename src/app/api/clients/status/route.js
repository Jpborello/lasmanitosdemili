import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET: Endpoint público para que la web de reservas sepa si una clienta
// está confiable, restringida (debe pagar seña) o bloqueada, antes de
// dejarla avanzar con una reserva. Se consulta por teléfono.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({ error: 'Falta el teléfono' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) {
      return NextResponse.json({ trust_status: 'trusted' });
    }

    const db = await getDb();
    const result = await db.execute({
      sql: 'SELECT trust_status FROM clients WHERE phone = ?',
      args: [cleanPhone],
    });

    // Si la clienta todavía no existe en la base, es su primera vez: confiable por defecto.
    const trustStatus = result.rows.length > 0 ? result.rows[0].trust_status : 'trusted';

    return NextResponse.json({ trust_status: trustStatus || 'trusted' }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  } catch (error) {
    console.error('Error in clients status GET:', error);
    // Ante un error, no bloqueamos a la clienta: se comporta como confiable.
    return NextResponse.json({ trust_status: 'trusted' });
  }
}
