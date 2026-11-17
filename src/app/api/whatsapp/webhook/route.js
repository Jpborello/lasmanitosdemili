import { NextResponse, after } from 'next/server';
import { findRegisteredClient } from '@/lib/bot';
import { replyToChat } from '@/lib/botReply';
import { sendEvolutionText, markEvolutionRead, hasRecentManualReply, resolvePhoneFromLid } from '@/lib/whatsapp';
import { sleep, randomBetween, pickOne, isBookingIntent, isQuietHours, isAutomatedText } from '@/lib/humanize';
import {
  saveIncoming, saveAssistant, wasSentBySystem, pauseChat, resumeChat, isChatPaused, isChatTurnedOff,
  getResumedAt, isLatestUserMessage, sentAudioNoticeRecently,
} from '@/lib/botStore';

// El bot llama a OpenRouter (a veces varias veces por las herramientas): damos margen.
export const maxDuration = 60;

// Cuánto espera el bot antes de responder (al azar, como una persona), y de paso junta
// varios mensajes seguidos de la misma clienta en una sola respuesta.
const DEBOUNCE_MIN_MS = 3000;
const DEBOUNCE_MAX_MS = 7000;
// Mensajes con más de esta antigüedad al llegar no se contestan (llegaron con demora)
const STALE_MESSAGE_MS = 30 * 60 * 1000;

function extractText(message) {
  if (!message) return '';
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.buttonsResponseMessage?.selectedDisplayText ||
    message.listResponseMessage?.title ||
    ''
  ).trim();
}

function isAudio(message) {
  return Boolean(message?.audioMessage || message?.pttMessage);
}

/** Número real de la clienta: si WhatsApp manda un @lid, Evolution suele incluir el número aparte. */
function resolvePhone(key) {
  const candidates = [key?.remoteJid, key?.remoteJidAlt, key?.senderPn, key?.participantAlt];
  for (const jid of candidates) {
    if (typeof jid === 'string' && jid.endsWith('@s.whatsapp.net')) {
      return jid.split('@')[0];
    }
  }
  return null;
}

/**
 * Evolution manda en cada evento la apikey de la instancia: si coincide con la nuestra,
 * el evento es legítimo. Opcionalmente también se acepta ?secret=EVOLUTION_WEBHOOK_SECRET.
 */
function isAuthorized(request, payload) {
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const { searchParams } = new URL(request.url);
  if (secret && searchParams.get('secret') === secret) return true;
  if (apiKey && payload?.apikey === apiKey) return true;
  return false;
}

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!isAuthorized(request, payload)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const instance = process.env.EVOLUTION_INSTANCE;
  if (instance && payload?.instance && payload.instance !== instance) {
    return NextResponse.json({ ok: true, ignored: 'otra instancia' });
  }

  const event = String(payload?.event || '').toLowerCase().replace(/_/g, '.');
  if (event !== 'messages.upsert') {
    return NextResponse.json({ ok: true, ignored: event || 'sin evento' });
  }

  // Evolution puede mandar un mensaje o una lista
  const items = Array.isArray(payload.data) ? payload.data : [payload.data];
  const pauseHours = Number(process.env.BOT_PAUSE_HOURS) || 12;
  const botEnabled = process.env.BOT_ENABLED !== 'false';
  const skipped = [];
  let processed = 0;

  for (const data of items) {
    const key = data?.key;
    const rawJid = key?.remoteJid;
    if (!rawJid || rawJid.endsWith('@g.us') || rawJid === 'status@broadcast' || rawJid.endsWith('@newsletter')) continue;

    // Identificamos cada chat por el número (WhatsApp a veces manda @lid y a veces el número)
    // Si solo vino el @lid, se intenta encontrar el número por el nombre de perfil
    const phone = resolvePhone(key) || (await resolvePhoneFromLid(rawJid));
    const chat = phone ? `${phone}@s.whatsapp.net` : rawJid;

    const text = extractText(data.message);

    // Mensaje enviado desde el WhatsApp de Mili
    if (key.fromMe) {
      after(async () => {
        try {
          // El eco de un mensaje del bot puede llegar antes de que guardemos su id:
          // esperamos un poco antes de decidir si lo escribió Mili a mano.
          await new Promise(r => setTimeout(r, 3000));
          if (await wasSentBySystem(key.id)) return; // lo mandó el bot o un aviso automático
          if (isAutomatedText(text)) return; // confirmación / aviso automático (respaldo)
          const command = text.toLowerCase();
          if (command === '#bot' || command === '#bot on') {
            await resumeChat(chat);
          } else if (command === '#bot off') {
            await pauseChat(chat, 24 * 365);
          } else {
            // Mili escribió a mano: el bot se corre para no pisarla
            await pauseChat(chat, pauseHours);
          }
        } catch (err) {
          console.error('Error procesando mensaje propio de WhatsApp:', err);
        }
      });
      continue;
    }

    if (!botEnabled) { skipped.push('bot apagado (BOT_ENABLED=false)'); continue; }

    if (!phone) { skipped.push('no se pudo obtener el número'); continue; }

    // Solo responde a clientas registradas en la web. Al resto le contesta Mili a mano.
    const client = await findRegisteredClient(phone);
    if (!client) { skipped.push('número no registrado como clienta'); continue; }

    // Mili lo apagó a mano en este chat con "#bot off": no responde nunca
    if (await isChatTurnedOff(chat)) { skipped.push('bot apagado en este chat (#bot off)'); continue; }

    // Mensajes que llegan con mucha demora (por ejemplo, cuando WhatsApp reconecta y
    // entrega todo lo atrasado de golpe): no se contestan, porque seguramente ya los
    // respondió Mili o ya no tienen sentido.
    const sentAt = Number(data.messageTimestamp) * 1000;
    if (sentAt && Date.now() - sentAt > STALE_MESSAGE_MS) {
      skipped.push('mensaje viejo (llegó con demora)');
      continue;
    }

    if (isBookingIntent(text)) {
      // Pedido de turno, horarios o cancelación: el bot responde SIEMPRE, aunque Mili haya
      // estado escribiendo. Se reactiva el chat para que la charla siga fluida (ej. el "sí"
      // de confirmación que viene después).
      if (await isChatPaused(chat)) await resumeChat(chat);
    } else {
      if (await isChatPaused(chat)) { skipped.push('chat pausado (Mili está respondiendo)'); continue; }

      // Si Mili le escribió a mano a esta clienta hace poco (aunque haya sido antes de que
      // existiera el bot, o desde su celu sin que nos llegara el aviso), el bot no se mete.
      // Solo cuentan los mensajes posteriores al último "#bot" o al último pedido de turno.
      const resumedAt = await getResumedAt(chat);
      const manualWindowHours = resumedAt
        ? Math.min(pauseHours, (Date.now() - new Date(resumedAt).getTime()) / 3600000)
        : pauseHours;
      if (await hasRecentManualReply([rawJid, chat], manualWindowHours)) {
        await pauseChat(chat, pauseHours);
        skipped.push('Mili le escribió a mano hace poco');
        continue;
      }
    }

    const quiet = isQuietHours();

    if (!text) {
      if (!isAudio(data.message)) { skipped.push('mensaje sin texto'); continue; }
      if (quiet) { skipped.push('audio en horario nocturno'); continue; }

      // Audios: un solo aviso aunque manden varios seguidos, y no más de uno cada 30 min
      const isNewAudio = await saveIncoming(chat, '[audio]', key.id);
      if (!isNewAudio) { skipped.push('mensaje repetido'); continue; }
      after(async () => {
        try {
          await sleep(randomBetween(4000, 9000));
          if (!(await isLatestUserMessage(chat, key.id))) return;
          if (await sentAudioNoticeRecently(chat)) return;
          await markEvolutionRead(rawJid, key.id);
          const notice = pickOne([
            'Perdón, no puedo escuchar audios 🙈 ¿Me lo escribís así te ayudo? 💅',
            'Ay, los audios no los puedo escuchar 😅 ¿Me lo pasás por escrito?',
            '¡Hola! No puedo abrir audios por acá 🙈 Escribime y te ayudo 💅',
          ]);
          await saveAssistant(chat, notice);
          await sendEvolutionText(phone, notice, { typingMs: randomBetween(2000, 3500) });
        } catch (err) {
          console.error('Error respondiendo un audio:', err);
        }
      });
      skipped.push('audio: se pide que lo escriba');
      continue;
    }

    const isNew = await saveIncoming(chat, text, key.id);
    if (!isNew) { skipped.push('mensaje repetido'); continue; }

    // De noche no se responde: el mensaje queda guardado y lo contesta el cron de la mañana
    if (quiet) { skipped.push('horario nocturno: se responde a la mañana'); continue; }
    processed++;

    after(async () => {
      try {
        await sleep(randomBetween(DEBOUNCE_MIN_MS, DEBOUNCE_MAX_MS));

        // Si la clienta mandó otro mensaje mientras esperábamos, responde ese otro
        if (!(await isLatestUserMessage(chat, key.id))) return;
        if (await isChatPaused(chat)) return;

        await replyToChat({ chat, client, phone, readJid: rawJid, readId: key.id, pauseHours });
      } catch (err) {
        console.error('Error respondiendo con el bot de WhatsApp:', err);
      }
    });
  }

  return NextResponse.json({ ok: true, processed, skipped });
}
