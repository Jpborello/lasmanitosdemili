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
