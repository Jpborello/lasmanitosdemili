import { NextResponse } from 'next/server';
import { findRegisteredClient } from '@/lib/bot';
import { replyToChat } from '@/lib/botReply';
import { hasRecentManualReply } from '@/lib/whatsapp';
import { sleep, randomBetween, isBookingIntent } from '@/lib/humanize';
import { getUnansweredChats, isChatPaused, isChatTurnedOff, resumeChat } from '@/lib/botStore';

export const maxDuration = 60;

/**
 * Corre a la mañana (ver vercel.json): responde los mensajes que las clientas mandaron
 * durante la noche, cuando el bot no contesta. Arranca con "buen día", de a una clienta
 * por vez y con pausas, como haría una persona al revisar el celular.
 */
export async function GET(request) {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 500 });
  }
  const { searchParams } = new URL(request.url);
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${expectedSecret}` && searchParams.get('secret') !== expectedSecret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  if (process.env.BOT_ENABLED === 'false') {
    return NextResponse.json({ ok: true, skipped: 'bot apagado' });
  }

  const pauseHours = Number(process.env.BOT_PAUSE_HOURS) || 12;
  const startedAt = Date.now();
  // Mensajes de las últimas 14 hs (desde la tarde/noche anterior)
  const since = new Date(Date.now() - 14 * 3600 * 1000).toISOString();
  const pending = await getUnansweredChats(since);
  const results = [];

  for (const item of pending) {
    // Dejar margen para no cortar una respuesta a la mitad por el límite de tiempo
    if (Date.now() - startedAt > 40000) { results.push({ chat: item.chat, result: 'sin tiempo, queda para Mili' }); continue; }

    const phone = item.chat.endsWith('@s.whatsapp.net') ? item.chat.split('@')[0] : null;
    if (!phone) { results.push({ chat: item.chat, result: 'sin número' }); continue; }

    const client = await findRegisteredClient(phone);
    if (!client) { results.push({ chat: item.chat, result: 'no registrada' }); continue; }
    if (await isChatTurnedOff(item.chat)) { results.push({ chat: item.chat, result: '#bot off' }); continue; }

    const asksForBooking = item.texts.some(isBookingIntent);
    if (asksForBooking) {
      if (await isChatPaused(item.chat)) await resumeChat(item.chat);
    } else if ((await isChatPaused(item.chat)) || (await hasRecentManualReply([item.chat], pauseHours))) {
      results.push({ chat: item.chat, result: 'Mili está llevando el chat' });
      continue;
    }

    try {
      const sent = await replyToChat({
        chat: item.chat, client, phone, readJid: item.chat, readId: item.lastWaId, pauseHours,
        extraContext: 'La clienta escribió durante la noche y recién ahora, a la mañana, le estás respondiendo. Arrancá con un "¡Buen día!" (sin pedir disculpas largas) y respondé lo que pidió.',
      });
      results.push({ chat: item.chat, result: sent ? 'respondido' : 'sin respuesta' });
    } catch (err) {
      console.error('Error en respuesta de la mañana:', err);
      results.push({ chat: item.chat, result: 'error' });
    }
    await sleep(randomBetween(3000, 7000));
  }

  return NextResponse.json({ ok: true, pending: pending.length, results });
}
