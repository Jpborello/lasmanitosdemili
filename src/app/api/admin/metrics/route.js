import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';
import { isAdminAuthenticated } from '@/lib/auth';

// Función para obtener la fecha formateada en YYYY-MM-DD en la zona horaria de la estética (Argentina)
function getLocalDateString(date) {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
}

// Nombres de meses en español
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function formatMonthLabel(yearMonthStr) {
  if (!yearMonthStr) return '';
  const [year, month] = yearMonthStr.split('-');
  const monthIdx = parseInt(month, 10) - 1;
  return `${MONTH_NAMES[monthIdx] || month} ${year}`;
}

export async function GET() {
  try {
    // 1. Verificar autenticación
    const cookieStore = await cookies();
    const isAdmin = await isAdminAuthenticated(cookieStore);

    if (!isAdmin) {
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

    // Mes actual (YYYY-MM)
    const currentMonthStr = todayStr.substring(0, 7);
    const monthPattern = currentMonthStr + '-%';

    // Mes anterior (YYYY-MM)
    const [curYear, curMonthNum] = currentMonthStr.split('-').map(Number);
    let prevYear = curYear;
    let prevMonthNum = curMonthNum - 1;
    if (prevMonthNum === 0) {
      prevMonthNum = 12;
      prevYear -= 1;
    }
    const prevMonthStr = `${prevYear}-${String(prevMonthNum).padStart(2, '0')}`;
    const prevMonthPattern = prevMonthStr + '-%';

    // 3. Consultas de recaudación
    // (la recaudación excluye los turnos marcados como 'no_show', ya que esa clienta no pagó)
    const revenueSelect = `
      SUM(CASE WHEN status != 'no_show' THEN 1 ELSE 0 END) as count,
      COALESCE(SUM(CASE WHEN status != 'no_show' THEN price ELSE 0 END), 0) as revenue,
      SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show_count
    `;

    // A. Hoy
    const todayResult = await db.execute({
      sql: `SELECT ${revenueSelect}
            FROM appointments
            WHERE appointment_date = ?`,
      args: [todayStr],
    });

    // B. Semana
    const weekResult = await db.execute({
      sql: `SELECT ${revenueSelect}
            FROM appointments
            WHERE appointment_date BETWEEN ? AND ?`,
      args: [weekStart, weekEnd],
    });

    // C. Mes en curso
    const monthResult = await db.execute({
      sql: `SELECT ${revenueSelect}
            FROM appointments
            WHERE appointment_date LIKE ?`,
      args: [monthPattern],
    });

    // D. Mes anterior
    const prevMonthResult = await db.execute({
      sql: `SELECT ${revenueSelect}
            FROM appointments
            WHERE appointment_date LIKE ?`,
      args: [prevMonthPattern],
    });

    // E. Historial mensual agrupado (últimos 12 meses registrados)
    const historyResult = await db.execute({
      sql: `SELECT 
              substr(appointment_date, 1, 7) as month_key,
              SUM(CASE WHEN status != 'no_show' THEN 1 ELSE 0 END) as count,
              COALESCE(SUM(CASE WHEN status != 'no_show' THEN price ELSE 0 END), 0) as revenue,
              SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show_count
            FROM appointments
            WHERE appointment_date IS NOT NULL AND appointment_date != ''
            GROUP BY month_key
            ORDER BY month_key ASC`,
      args: [],
    });

    // Procesar comparativas y porcentajes de crecimiento cronológico
    const historyRows = historyResult.rows || [];
    let previousMonthRevenue = null;

    const monthlyHistory = historyRows.map((row) => {
      const rev = Number(row.revenue) || 0;
      const count = Number(row.count) || 0;
      const noShow = Number(row.no_show_count) || 0;
      const avgTicket = count > 0 ? Math.round(rev / count) : 0;
      const isFuture = row.month_key > currentMonthStr;

      let growthPercent = null;
      let diffAmount = null;

      // Solo calculamos comparativa vs mes previo si NO es un mes futuro (reservas anticipadas)
      if (!isFuture && previousMonthRevenue !== null) {
        diffAmount = rev - previousMonthRevenue;
        if (previousMonthRevenue > 0) {
          growthPercent = Math.round(((rev - previousMonthRevenue) / previousMonthRevenue) * 1000) / 10;
        } else if (rev > 0) {
          growthPercent = 100;
        } else {
          growthPercent = 0;
        }
      }

      // Solo actualizamos el acumulador de mes previo con meses cerrados o en curso
      if (!isFuture) {
        previousMonthRevenue = rev;
      }

      return {
        period: row.month_key,
        label: formatMonthLabel(row.month_key),
        isCurrent: row.month_key === currentMonthStr,
        isPrevious: row.month_key === prevMonthStr,
        isFuture,
        count,
        revenue: rev,
        noShowCount: noShow,
        avgTicket,
        growthPercent,
        diffAmount,
      };
    }).reverse(); // Mostramos el mes más reciente primero en la tabla

    // Crecimiento del mes actual vs mes anterior
    const currentRev = Number(monthResult.rows[0]?.revenue) || 0;
    const prevRev = Number(prevMonthResult.rows[0]?.revenue) || 0;
    let currentVsPrevGrowth = null;
    if (prevRev > 0) {
      currentVsPrevGrowth = Math.round(((currentRev - prevRev) / prevRev) * 1000) / 10;
    }

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
          noShowCount: todayResult.rows[0]?.no_show_count || 0,
        },
        week: {
          range: `${weekStart} a ${weekEnd}`,
          count: weekResult.rows[0]?.count || 0,
          revenue: weekResult.rows[0]?.revenue || 0,
          noShowCount: weekResult.rows[0]?.no_show_count || 0,
        },
        month: {
          period: currentMonthStr,
          label: formatMonthLabel(currentMonthStr),
          count: monthResult.rows[0]?.count || 0,
          revenue: currentRev,
          noShowCount: monthResult.rows[0]?.no_show_count || 0,
          growthVsPrev: currentVsPrevGrowth,
          diffVsPrev: currentRev - prevRev,
        },
        previousMonth: {
          period: prevMonthStr,
          label: formatMonthLabel(prevMonthStr),
          count: prevMonthResult.rows[0]?.count || 0,
          revenue: prevRev,
          noShowCount: prevMonthResult.rows[0]?.no_show_count || 0,
          avgTicket: (prevMonthResult.rows[0]?.count || 0) > 0 
            ? Math.round(prevRev / prevMonthResult.rows[0].count) 
            : 0,
        },
        history: monthlyHistory
      },
      ranking: rankingResult.rows
    });

  } catch (error) {
    console.error('Error in metrics GET:', error);
    return NextResponse.json({ error: 'Error al calcular métricas' }, { status: 500 });
  }
}

