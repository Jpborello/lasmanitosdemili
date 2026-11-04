// Domingos especiales: Mili habilita domingos puntuales y elige los horarios de cada uno.
// Se guarda en settings como sunday_slots: 'YYYY-MM-DD_HH:MM,YYYY-MM-DD_HH:MM,...'
// (mismo formato que extra_slots). Un domingo sin horarios queda cerrado.
export const SUNDAY_TIME_OPTIONS = ['08:00', '10:00', '12:00', '14:30', '16:00', '18:00', '20:00'];
export const SATURDAY_TIMES = ['08:00', '10:00', '12:00', '14:30', '16:00', '18:00'];

export function parseSundaySlots(value) {
  return (value || '').split(',').map(s => s.trim()).filter(Boolean);
}

// Horarios habilitados para un domingo puntual, ordenados
export function sundayTimesFor(slots, dateStr) {
  const prefix = `${dateStr}_`;
  return slots
    .filter(s => s.startsWith(prefix))
    .map(s => s.slice(prefix.length))
    .filter(Boolean)
    .sort();
}

// Domingos que tienen al menos un horario, ordenados
export function sundayDates(slots) {
  return [...new Set(slots.map(s => s.split('_')[0]))].sort();
}
