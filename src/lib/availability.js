/**
 * Horarios libres calculados en el servidor, con las mismas reglas que el calendario
 * de la web (BookingCalendar) y que la validación de POST /api/appointments.
 * Lo usa el bot de WhatsApp para ofrecer turnos.
 */
import { parseSundaySlots, sundayTimesFor, SATURDAY_TIMES } from './domingos';
import { TURNO_20_TIME, parseTurno20Dates, todayAR } from './turno20';

const WEEKDAY_TIMES = ['08:00', '10:00', '14:30', '16:00'];

function splitList(value) {
  return (value || '').split(',').map(s => s.trim()).filter(Boolean);
}

export async function getBookingSettings(db) {
  const result = await db.execute('SELECT key, value FROM settings');
  const raw = Object.fromEntries(result.rows.map(r => [r.key, r.value]));
  return {
    enable_18_weekday: (raw.enable_18_weekday ?? 'true') === 'true',
    blocked_weekdays: splitList(raw.blocked_weekdays ?? '0').map(d => parseInt(d, 10)).filter(n => !isNaN(n)),
    blocked_dates: splitList(raw.blocked_dates),
    blocked_months: splitList(raw.blocked_months),
    blocked_slots: splitList(raw.blocked_slots),
    extra_slots: splitList(raw.extra_slots),
    slot_20_enabled: raw.slot_20_enabled === 'true',
    slot_20_dates: parseTurno20Dates(raw.slot_20_dates),
    sunday_slots: parseSundaySlots(raw.sunday_slots),
  };
}

/** Hora actual en Argentina, formato HH:MM */
function nowTimeAR() {
  return new Date().toLocaleTimeString('en-GB', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Horarios disponibles para una fecha YYYY-MM-DD.
 * Devuelve { available: string[], reason?: string }.
 */
export async function getAvailableTimes(db, dateStr, settings) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { available: [], reason: 'Fecha inválida, usar formato YYYY-MM-DD' };
  }
  const s = settings || (await getBookingSettings(db));
  const today = todayAR();
  if (dateStr < today) return { available: [], reason: 'La fecha ya pasó' };
  if (s.blocked_dates.includes(dateStr)) return { available: [], reason: 'Ese día Mili no atiende' };
  if (s.blocked_months.includes(dateStr.slice(0, 7))) return { available: [], reason: 'Ese mes no hay turnos disponibles por ahora' };

  const dayOfWeek = new Date(`${dateStr}T00:00:00`).getDay();
  const sundayTimes = dayOfWeek === 0 ? sundayTimesFor(s.sunday_slots, dateStr) : [];
  if (s.blocked_weekdays.includes(dayOfWeek) && sundayTimes.length === 0) {
    return { available: [], reason: 'Ese día de la semana no se atiende' };
  }

  let times;
  if (dayOfWeek === 0) {
    times = [...sundayTimes];
  } else if (dayOfWeek === 6) {
    times = [...SATURDAY_TIMES];
  } else {
    times = [...WEEKDAY_TIMES];
    if (s.enable_18_weekday) times.push('18:00');
  }

  const prefix = `${dateStr}_`;
  for (const entry of s.extra_slots) {
    if (entry.startsWith(prefix)) {
      const t = entry.slice(prefix.length);
      if (t && !times.includes(t)) times.push(t);
    }
  }
  if (s.slot_20_enabled && dayOfWeek !== 0 && s.slot_20_dates.includes(dateStr) && !times.includes(TURNO_20_TIME)) {
    times.push(TURNO_20_TIME);
  }

  const booked = await db.execute({
    sql: 'SELECT appointment_time FROM appointments WHERE appointment_date = ?',
    args: [dateStr],
  });
  const bookedTimes = new Set(booked.rows.map(r => r.appointment_time));
  const now = dateStr === today ? nowTimeAR() : null;

  const available = times
    .filter(t => !s.blocked_slots.includes(`${dateStr}_${t}`))
    .filter(t => !bookedTimes.has(t))
    .filter(t => !now || t > now)
    .sort();

  return { available, reason: available.length ? undefined : 'No quedan horarios libres ese día' };
}
