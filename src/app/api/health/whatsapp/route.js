import { NextResponse } from 'next/server';
import { getEvolutionState, sendWhatsAppMessage } from '@/lib/whatsapp';
import { getHealth, setHealth } from '@/lib/botStore';
import { MILI_WHATSAPP_NUMBER } from '@/lib/constants';

export const dynamic = 'force-dynamic';

// Si en horario de atención pasan más de estas horas sin recibir NINGÚN mensaje
// (de nadie, ni de grupos), seguramente Evolution quedó "sordo" (conectado pero sin recibir).
const MAX_SILENCE_HOURS = Number(process.env.BOT_HEALTH_SILENCE_HOURS) || 3;
// Como mucho una alerta cada tantas horas (también evita que alguien lo use para molestar)
const ALERT_EVERY_HOURS = 6;
// Horario en que se esperan mensajes (hora Argentina)
const CHECK_FROM_HOUR = 10;
const CHECK_TO_HOUR = 21;

function hourAR() {
  return Number(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires', hour: 'numeric', hour12: false })) % 24;
}

/**
 * Chequeo de salud del WhatsApp del bot. Lo llama cada hora un cron del VPS.
 * No necesita clave: solo lee el estado y, si hay un problema, avisa por WhatsApp
 * (a BOT_ALERT_PHONE, o a Mili si no está configurado) como mucho cada 6 horas.
 */
export async function GET() {
  const now = Date.now();
  const state = await getEvolutionState();
  const lastIncoming = await getHealth('last_incoming_at');
  const silenceHours = lastIncoming ? (now - new Date(lastIncoming).getTime()) / 3600000 : null;
  const hour = hourAR();
  const inBusinessHours = hour >= CHECK_FROM_HOUR && hour < CHECK_TO_HOUR;

  let problem = null;
  if (state !== 'open') {
    problem = `la conexión de WhatsApp figura "${state || 'sin respuesta'}"`;
  } else if (inBusinessHours && silenceHours !== null && silenceHours > MAX_SILENCE_HOURS) {
    problem = `no entra ningún mensaje hace ${Math.floor(silenceHours)} horas (puede estar conectado pero sin recibir)`;
  }

  let alerted = false;
  if (problem) {
    const lastAlert = await getHealth('last_alert_at');
    const canAlert = !lastAlert || now - new Date(lastAlert).getTime() > ALERT_EVERY_HOURS * 3600000;
    if (canAlert) {
      const to = process.env.BOT_ALERT_PHONE || process.env.MILI_PHONE_NUMBER || MILI_WHATSAPP_NUMBER;
      const res = await sendWhatsAppMessage({
        to,
        text: `⚠️ *Bot de Las Manitos de Mili*

Parece que el bot no está recibiendo mensajes: ${problem}.

Mientras tanto las clientas no reciben respuesta automática. Revisá Evolution (si está trabado: correr el parche y reiniciar el contenedor, o volver a escanear el QR).`,
      });
      alerted = Boolean(res?.success);
      if (alerted) await setHealth('last_alert_at', new Date().toISOString());
    }
  } else if (await getHealth('last_alert_at')) {
    // Se recuperó: se borra la marca para que la próxima falla avise enseguida
    await setHealth('last_alert_at', '1970-01-01T00:00:00.000Z');
  }

  return NextResponse.json({
    ok: !problem,
    state,
    lastIncoming,
    silenceHours: silenceHours === null ? null : Math.round(silenceHours * 10) / 10,
    inBusinessHours,
    problem,
    alerted,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
