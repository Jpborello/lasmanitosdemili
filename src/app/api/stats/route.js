import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET: Estadísticas públicas y agregadas para la franja de confianza de la landing.
// No expone datos sensibles (nombres, teléfonos, etc.), sólo conteos y promedios.
export async function GET() {
  try {
    const db = await getDb();

    const clientsResult = await db.execute('SELECT COUNT(*) as count FROM clients');
    const totalClients = clientsResult.rows[0]?.count || 0;

    const appointmentsResult = await db.execute(
      "SELECT COUNT(*) as count FROM appointments WHERE status = 'confirmed'"
    );
    const totalAppointments = appointmentsResult.rows[0]?.count || 0;

    const reviewsResult = await db.execute(
      "SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE status = 'approved'"
    );
    const reviewsCount = reviewsResult.rows[0]?.count || 0;
    const avgRating = reviewsCount > 0
      ? Math.round((reviewsResult.rows[0].avg_rating || 0) * 10) / 10
      : null;

    return NextResponse.json(
      { totalClients, totalAppointments, avgRating, reviewsCount },
      { headers: { 'Cache-Control': 'public, max-age=300' } }
    );
  } catch (error) {
    console.error('Error in stats GET:', error);
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 });
  }
}
