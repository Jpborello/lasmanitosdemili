import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// Función para obtener la fecha formateada en YYYY-MM-DD en la zona horaria de la estética (Argentina)
function getLocalDateString(date) {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
}

export async function GET() {
  try {
    // 1. Verificar autenticación
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;
    const adminHash = crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || '').digest('hex');

    if (!token || token !== adminHash) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = await getDb();

    // 2. Calcular fechas
    const today = new Date();
    const todayStr = getLocalDateString(today);

    // Calcular lunes y domingo de la semana actual
    const dayOfWeek = today.getDay(); // 0: Dom, 1: Lun...
    const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    
    const monday = new Date(today);
    monday.setDate(diffToMonday);
    const weekStart = getLocalDateString(monday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const weekEnd = getLocalDateString(sunday);

    // Patrón del mes actual (YYYY-MM-%)
    const monthPattern = todayStr.substring(0, 7) + '-%';

    // 3. Ejecutar consultas de recaudación
    // A. Hoy
    const todayResult = await db.execute({
      sql: `SELECT COUNT(*) as count, COALESCE(SUM(price), 0) as revenue 
            FROM appointments 
            WHERE appointment_date = ?`,
      args: [todayStr],
    });

    // B. Semana
    const weekResult = await db.execute({
      sql: `SELECT COUNT(*) as count, COALESCE(SUM(price), 0) as revenue 
            FROM appointments 
            WHERE appointment_date BETWEEN ? AND ?`,
      args: [weekStart, weekEnd],
    });

    // C. Mes
    const monthResult = await db.execute({
      sql: `SELECT COUNT(*) as count, COALESCE(SUM(price), 0) as revenue 
            FROM appointments 
            WHERE appointment_date LIKE ?`,
      args: [monthPattern],
    });

    // 4. Obtener Ranking de Clientas (por volumen de gasto)
    const rankingResult = await db.execute({
      sql: `SELECT c.name as client_name, c.phone as client_phone, COALESCE(SUM(a.price), 0) as total_spent, COUNT(a.id) as visits_count 
            FROM clients c
            JOIN appointments a ON c.phone = a.client_phone 
            GROUP BY c.phone 
            ORDER BY total_spent DESC 
            LIMIT 15`,
      args: [],
    });

    return NextResponse.json({
      metrics: {
        today: {
          date: todayStr,
          count: todayResult.rows[0]?.count || 0,
          revenue: todayResult.rows[0]?.revenue || 0,
        },
        week: {
          range: `${weekStart} a ${weekEnd}`,
          count: weekResult.rows[0]?.count || 0,
          revenue: weekResult.rows[0]?.revenue || 0,
        },
        month: {
          period: todayStr.substring(0, 7),
          count: monthResult.rows[0]?.count || 0,
          revenue: monthResult.rows[0]?.revenue || 0,
        }
      },
      ranking: rankingResult.rows
    });

  } catch (error) {
    console.error('Error in metrics GET:', error);
    return NextResponse.json({ error: 'Error al calcular métricas' }, { status: 500 });
  }
}
