/**
 * Reglas para que el WhatsApp automático se comporte como una persona y bajar el
 * riesgo de que Meta marque el número como bot o spam:
 * - demoras al azar (nunca dos respuestas con el mismo tiempo exacto)
 * - "escribiendo..." durante un tiempo proporcional al largo del mensaje
 * - respuestas largas partidas en varios mensajes cortos, como escribe la gente
 * - textos de avisos con pequeñas variaciones (no siempre el mismo mensaje idéntico)
 */

export const sleep = ms => new Promise(r => setTimeout(r, ms));

export function randomBetween(min, max) {
  return Math.round(min + Math.random() * (max - min));
}

export function pickOne(options) {
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Horario de descanso: de noche el bot no manda nada (como una persona que duerme).
 * Por defecto de 22:00 a 08:00 hora Argentina; configurable con BOT_QUIET_START / BOT_QUIET_END.
 * Los mensajes que llegan de noche se responden a la mañana (cron morning-replies).
 */
export function isQuietHours(date = new Date()) {
  const start = Number(process.env.BOT_QUIET_START ?? 22);
  const end = Number(process.env.BOT_QUIET_END ?? 8);
  const hour = Number(date.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires', hour: 'numeric', hour12: false })) % 24;
  return start > end ? hour >= start || hour < end : hour >= start && hour < end;
}

/**
 * Mensajes automáticos del sistema (confirmaciones, avisos a Mili, recordatorios, etc.).
 * Sirve de respaldo para no confundirlos con mensajes que Mili escribió a mano.
 */
const AUTOMATED_PREFIXES = [
  '💖 *¡Hola', '💅 *¡NUEVO TURNO', '⚠️ *SEÑA PENDIENTE', '❌ *TURNO CANCELADO',
  '🙋‍♀️ *Una clienta', '🌸 *¡Hola', '✨ *Hola', '💅 *¡Hola',
];

export function isAutomatedText(text) {
  const t = String(text || '').trim();
  return AUTOMATED_PREFIXES.some(p => t.startsWith(p));
}

/**
 * ¿El mensaje es un pedido de turno, consulta de horarios o cancelación?
 * Estos los atiende el bot siempre, aunque Mili haya estado escribiendo en ese chat.
 */
const BOOKING_INTENT = new RegExp(
  [
    'turno', 'reserv', 'agend', 'cancel', 'reprogram', 'suspend',
    'horario', 'disponib', 'lugar(cito)? para', 'hay lugar', 'ten[eé]s lugar',
    'a qu[eé] hora', 'qu[eé] d[ií]a', 'cambiar (el |la |de )?(d[ií]a|hora|fecha)',
    'no (voy a )?(poder|puedo) ir', 'no llego',
    // "¿tenés algo libre?", "¿te queda algún hueco?", "¿hay cupo?", "¿qué fecha tenés?"
    '\\blibres?\\b', '\\bcupos?\\b', '\\bhuecos?\\b', '\\bfechas?\\b',
    // "quiero sacar para kapping", "me querés anotar", "me anotás"
    '\\bsacar (para|un|una|uno)\\b', 'quiero sacar', '\\banot(ar|[aá]s|ame|arme)\\b',
  ].join('|'),
  'i'
);

export function isBookingIntent(text) {
  return BOOKING_INTENT.test(String(text || ''));
}

/** Tiempo de "escribiendo..." según el largo: ~35 ms por letra, con variación, entre 1,5 y 8 s. */
export function typingTimeFor(text) {
  const base = String(text || '').length * 35;
  const jitter = randomBetween(-400, 900);
  return Math.min(8000, Math.max(1500, base + jitter));
}

/**
 * Parte una respuesta en hasta `maxParts` mensajes, cortando por párrafos.
 * Los párrafos cortos se juntan para no mandar mensajes de una sola palabra.
 */
export function splitIntoMessages(text, maxParts = 3) {
  const paragraphs = String(text || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  if (paragraphs.length <= 1) return paragraphs;

  const parts = [];
  for (const p of paragraphs) {
    const last = parts[parts.length - 1];
    // Juntar con el anterior si alguno de los dos es muy corto o si ya llegamos al máximo
    if (last && (last.length < 60 || p.length < 40 || parts.length >= maxParts)) {
      parts[parts.length - 1] = `${last}\n\n${p}`;
    } else {
      parts.push(p);
    }
  }
  return parts;
}
