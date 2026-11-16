import { NextResponse, after } from 'next/server';
import { generateReply } from '@/lib/bot';
import { sendEvolutionText } from '@/lib/whatsapp';
import { getBotDb, saveIncoming, wasSentBySystem, pauseChat, resumeChat, isChatPaused } from '@/lib/botStore';

// El bot llama a OpenRouter (a veces varias veces por las herramientas): damos margen.
export const maxDuration = 60;

// Cuánto espera el bot antes de responder, para juntar varios mensajes seguidos
// de la misma clienta en una sola respuesta.
const DEBOUNCE_MS = 4000;

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

function allowedNumber(phone) {
  const list = (process.env.BOT_ALLOWED_NUMBERS || '').split(',').map(s => s.replace(/\D/g, '')).filter(Boolean);
  if (list.length === 0) return true; // sin lista: responde a todas
  return Boolean(phone && list.some(n => phone.endsWith(n) || n.endsWith(phone)));
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

  for (const data of items) {
    const key = data?.key;
    const chat = key?.remoteJid;
    if (!chat || chat.endsWith('@g.us') || chat === 'status@broadcast' || chat.endsWith('@newsletter')) continue;

    const text = extractText(data.message);

    // Mensaje enviado desde el WhatsApp de Mili
    if (key.fromMe) {
      after(async () => {
        try {
          // El eco de un mensaje del bot puede llegar antes de que guardemos su id:
          // esperamos un poco antes de decidir si lo escribió Mili a mano.
          await new Promise(r => setTimeout(r, 3000));
          if (await wasSentBySystem(key.id)) return; // lo mandó el bot o un aviso automático
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

    if (!botEnabled) continue;
    const phone = resolvePhone(key);
    if (!allowedNumber(phone)) continue;
    if (await isChatPaused(chat)) continue;

    const replyTo = phone || chat;

    if (!text) {
      if (isAudio(data.message)) {
        after(() => sendEvolutionText(replyTo, 'Perdón, no puedo escuchar audios 🙈 ¿Me lo escribís así te ayudo? 💅'));
      }
      continue;
    }

    const isNew = await saveIncoming(chat, text, key.id);
    if (!isNew) continue; // reintento de Evolution, ya procesado

    after(async () => {
      try {
        await new Promise(r => setTimeout(r, DEBOUNCE_MS));

        // Si la clienta mandó otro mensaje mientras esperábamos, responde ese otro
        const db = await getBotDb();
        const last = await db.execute({
          sql: "SELECT wa_id FROM bot_messages WHERE chat = ? AND role = 'user' ORDER BY id DESC LIMIT 1",
          args: [chat],
        });
        if (last.rows[0]?.wa_id !== key.id) return;
        if (await isChatPaused(chat)) return;

        const reply = await generateReply({ chat, phone, pushName: data.pushName, pauseHours });
        if (reply) await sendEvolutionText(replyTo, reply);
      } catch (err) {
        console.error('Error respondiendo con el bot de WhatsApp:', err);
      }
    });
  }

  return NextResponse.json({ ok: true });
}
