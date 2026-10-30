// Turno especial de las 20:00 hs: Mili lo prende/apaga desde el admin y marca
// a mano los días puntuales en que lo ofrece (lunes a sábado).
// Se guarda en settings como: slot_20_enabled ('true'/'false'),
// slot_20_dates ('YYYY-MM-DD,YYYY-MM-DD,...') y slot_20_notice (texto opcional del aviso).
export const TURNO_20_TIME = '20:00';

export function parseTurno20Dates(value) {
  return (value || '').split(',').map(d => d.trim()).filter(Boolean);
}

// Fecha de hoy en Argentina, formato YYYY-MM-DD
export function todayAR() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
}

// Días con turno de 20hs que todavía no pasaron (si el turno está activo)
export function upcomingTurno20Dates(enabled, dates) {
  if (!enabled) return [];
  const today = todayAR();
  return [...dates]
    .filter(d => d >= today && new Date(`${d}T00:00:00`).getDay() !== 0)
    .sort();
}

// "1, 3 y 5 de diciembre" / "30 de noviembre, 2 y 4 de diciembre"
export function formatTurno20Dates(dates) {
  const groups = [];
  for (const d of dates) {
    const date = new Date(`${d}T00:00:00`);
    const monthName = date.toLocaleDateString('es-AR', { month: 'long' });
    const last = groups[groups.length - 1];
    if (last && last.month === monthName) {
      last.days.push(date.getDate());
    } else {
      groups.push({ month: monthName, days: [date.getDate()] });
    }
  }
  const parts = groups.map(g => {
    const days = g.days.length > 1
      ? `${g.days.slice(0, -1).join(', ')} y ${g.days[g.days.length - 1]}`
      : `${g.days[0]}`;
    return `${days} de ${g.month}`;
  });
  return parts.length > 1
    ? `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`
    : (parts[0] || '');
}
