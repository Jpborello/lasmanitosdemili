/**
 * Genera y manda la respuesta del bot a un chat, comportándose como una persona:
 * marca leído, espera un momento, y manda la respuesta en partes con "escribiendo...".
 * La usan el webhook (respuesta en el momento) y el cron de la mañana (mensajes de la noche).
 */
import { generateReply } from './bot';
import { sendEvolutionText, markEvolutionRead } from './whatsapp';
import { sleep, randomBetween, typingTimeFor, splitIntoMessages } from './humanize';

// Tope de "escribiendo..." sumando todas las partes, para no pasarnos del maxDuration
const MAX_TOTAL_TYPING_MS = 18000;

export async function replyToChat({ chat, client, phone, readJid, readId, pauseHours, extraContext }) {
  if (readJid && readId) await markEvolutionRead(readJid, readId);
  await sleep(randomBetween(1000, 3000));

  const reply = await generateReply({ chat, client, pauseHours, extraContext });
  if (!reply) return false;

  const parts = splitIntoMessages(reply);
  let typingBudget = MAX_TOTAL_TYPING_MS;
  for (let i = 0; i < parts.length; i++) {
    const typingMs = Math.min(typingTimeFor(parts[i]), Math.max(1000, typingBudget));
    typingBudget -= typingMs;
    await sendEvolutionText(phone, parts[i], { typingMs });
    if (i < parts.length - 1) await sleep(randomBetween(400, 1500));
  }
  return true;
}
