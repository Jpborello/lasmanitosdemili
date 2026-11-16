/**
 * Bot de WhatsApp de Las Manitos de Mili.
 * Recibe el texto de una clienta, arma la charla con OpenRouter y usa herramientas
 * para ver horarios libres, reservar turnos (con las mismas reglas que la web),
 * consultar sus turnos o derivar la charla a Mili.
 */
import { getDb } from './db';
import { getAvailableTimes, getBookingSettings } from './availability';
import { todayAR } from './turno20';
import { fromWhatsAppNumber } from './phone';
import { sendWhatsAppMessage } from './whatsapp';
import { MILI_WHATSAPP_NUMBER } from './constants';
import { getHistory, saveAssistant, pauseChat } from './botStore';
import { POST as createAppointment } from '@/app/api/appointments/route';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'deepseek/deepseek-v4.1-flash';
const SITE_HOST = process.env.SITE_HOST || 'lasmanitosdemili.com.ar';
const MAX_TOOL_ROUNDS = 5;

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const TRUST_RANK = { trusted: 0, restricted: 1, blocked: 2 };

/**
 * Busca a la clienta registrada que corresponde a un número de WhatsApp.
 * Compara por los últimos 10 dígitos, porque en la base hay teléfonos guardados como
 * "3417981212" y otros como "5493417981212". Si la misma persona quedó dos veces,
 * se queda con el estado más restrictivo. Devuelve null si no está registrada.
 */
export async function findRegisteredClient(waNumber) {
  const digits = fromWhatsAppNumber(waNumber);
  if (!digits || digits.length < 8) return null;
  const last10 = digits.slice(-10);
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT phone, name, trust_status FROM clients
          WHERE phone = ? OR substr(phone, -10) = ?`,
    args: [digits, last10],
  });
  if (result.rows.length === 0) return null;
  const rows = [...result.rows].sort(
    (a, b) => (TRUST_RANK[b.trust_status] ?? 0) - (TRUST_RANK[a.trust_status] ?? 0)
  );
  const exact = result.rows.find(r => r.phone === digits);
  return {
    phone: (exact || rows[0]).phone,
    name: (exact || rows[0]).name,
    trust_status: rows[0].trust_status || 'trusted',
  };
}

/** Próximos N días con su nombre, para que el modelo no se equivoque con las fechas. */
function upcomingCalendar(days = 21) {
  const today = todayAR();
  const base = new Date(`${today}T12:00:00`);
  const lines = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const iso = d.toLocaleDateString('en-CA');
    const label = i === 0 ? ' (hoy)' : i === 1 ? ' (mañana)' : '';
    lines.push(`${DAY_NAMES[d.getDay()]} ${iso}${label}`);
  }
  return lines.join('\n');
}

function trustNote(trustStatus) {
  if (trustStatus === 'blocked') {
    return 'IMPORTANTE: esta clienta está BLOQUEADA por inasistencias. No le reserves turnos ni le ofrezcas horarios: decile con amabilidad que para coordinar un turno tiene que hablar directamente con Mili, y usá derivar_a_mili.';
  }
  if (trustStatus === 'restricted') {
    return 'IMPORTANTE: esta clienta está RESTRINGIDA por inasistencias previas. Puede reservar, pero antes de confirmar avisale que el turno queda pendiente hasta que pague una seña y Mili la apruebe. Nunca le digas que el turno está confirmado: queda a la espera de la aprobación de Mili.';
  }
  return 'Esta clienta es de confianza: sus reservas se confirman al instante.';
}

async function buildSystemPrompt(db, { knownName, trustStatus }) {
  const services = await db.execute('SELECT id, category, name, price, duration FROM services ORDER BY category, price');
  const servicesText = services.rows
    .map(s => `- id "${s.id}": ${s.name} (${s.category}) — $${s.price}, ${s.duration}`)
    .join('\n');

  const custom = process.env.BOT_EXTRA_PROMPT ? `\n\nIndicaciones extra de Mili:\n${process.env.BOT_EXTRA_PROMPT}` : '';

  return `Sos la asistente virtual de WhatsApp de *Las Manitos de Mili*, un estudio de manicuría y pedicuría en Rosario, Santa Fe, Argentina. Mili trabaja sola y atiende solo con turno.

Hablás en español rioplatense (vos, tenés, querés), con calidez y buena onda, mensajes cortos como en WhatsApp, algún emoji 💅✨ sin exagerar. Usá *negrita* de WhatsApp (un asterisco) y nunca markdown con ** ni títulos.

Tu trabajo:
1. Responder dudas sobre servicios, precios y duración (usá SOLO la lista de abajo; si no sabés algo, no lo inventes: ofrecé derivar a Mili).
2. Reservar turnos: preguntá qué servicio quiere y qué día le queda bien, consultá los horarios libres con la herramienta ver_horarios y ofrecé los que haya. Antes de reservar, confirmá con la clienta servicio, día y hora en un solo mensaje y esperá que diga que sí. Recién ahí usá reservar_turno.
3. Si pregunta por sus turnos, usá mis_turnos.
4. Cancelaciones, reprogramaciones, reclamos, diseños especiales, fotos, audios o cualquier cosa que no puedas resolver: usá derivar_a_mili y avisale que Mili le responde personalmente a la brevedad.

Reglas:
- Nunca inventes horarios: solo ofrecé los que devuelve ver_horarios.
- Nunca confirmes un turno si reservar_turno no devolvió éxito. Si devuelve error, explicalo simple y ofrecé otra opción.
- Si la reserva queda pendiente de seña o pago, explicale qué tiene que hacer con los datos que devuelve la herramienta (link o alias).
- Las clientas también pueden reservar solas en https://${SITE_HOST} y ver sus turnos en https://${SITE_HOST}/mis-turnos.
- No hables de temas que no tengan que ver con el estudio.

Servicios (id interno, nombre, precio, duración):
${servicesText}

Horarios habituales: lunes a viernes 08:00, 10:00, 14:30, 16:00 y 18:00; sábados 08:00, 10:00, 12:00, 14:30, 16:00 y 18:00; domingos cerrado salvo días especiales. Siempre confirmá con ver_horarios.

Calendario (fecha de hoy en Argentina y próximos días):
${upcomingCalendar()}

Esta clienta está registrada como "${knownName}": usá ese nombre, no se lo pidas.
${trustNote(trustStatus)}${custom}`;
}

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'ver_horarios',
      description: 'Devuelve los horarios libres para una fecha.',
      parameters: {
        type: 'object',
        properties: { fecha: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' } },
        required: ['fecha'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reservar_turno',
      description: 'Reserva un turno. Usar solo después de que la clienta confirmó los datos.',
      parameters: {
        type: 'object',
        properties: {
          fecha: { type: 'string', description: 'YYYY-MM-DD' },
          hora: { type: 'string', description: 'HH:MM, uno de los horarios libres' },
          servicio_id: { type: 'string', description: 'id interno del servicio' },
        },
        required: ['fecha', 'hora', 'servicio_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mis_turnos',
      description: 'Lista los próximos turnos reservados por esta clienta.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'derivar_a_mili',
      description: 'Avisa a Mili para que siga ella la conversación y pausa el bot en este chat.',
      parameters: {
        type: 'object',
        properties: { motivo: { type: 'string', description: 'Resumen corto de lo que necesita la clienta' } },
        required: ['motivo'],
      },
    },
  },
];

async function runTool(name, args, ctx) {
  const db = await getDb();

  if (name === 'ver_horarios') {
    const settings = await getBookingSettings(db);
    const result = await getAvailableTimes(db, String(args.fecha || ''), settings);
    return { fecha: args.fecha, horarios_libres: result.available, motivo: result.reason };
  }

  if (name === 'reservar_turno') {
    if (ctx.client.trust_status === 'blocked') {
      return { error: 'La clienta está bloqueada: no puede reservar por acá. Derivar a Mili.', bloqueada: true };
    }
    // Se reserva con el teléfono y el nombre tal cual están registrados, así la web
    // aplica las mismas reglas de confianza (restringida → seña + aprobación de Mili).
    const req = new Request(`https://${SITE_HOST}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', host: SITE_HOST, 'x-forwarded-proto': 'https' },
      body: JSON.stringify({
        client_name: ctx.client.name,
        client_phone: ctx.client.phone,
        appointment_date: args.fecha,
        appointment_time: args.hora,
        service: args.servicio_id,
      }),
    });
    const res = await createAppointment(req);
    const data = await res.json();
    if (!res.ok) return { error: data.error || 'No se pudo reservar', bloqueada: Boolean(data.blocked) };
    return {
      ok: true,
      estado: data.appointment.status,
      fecha: data.appointment.appointment_date,
      hora: data.appointment.appointment_time,
      precio: data.appointment.price,
      link_pago_sena: data.paymentUrl || undefined,
      sena_requerida: data.depositRequired ? data.depositAmount : undefined,
      instrucciones_sena: data.depositRequired ? data.depositInstructions : undefined,
      nota: data.appointment.status === 'confirmed'
        ? 'Turno confirmado. A la clienta ya le llega un mensaje automático con los detalles, respondé corto.'
        : 'Turno pendiente: la clienta ya recibe un mensaje automático con instrucciones.',
    };
  }

  if (name === 'mis_turnos') {
    const result = await db.execute({
      sql: `SELECT a.appointment_date, a.appointment_time, a.status, COALESCE(s.name, a.service) AS servicio
            FROM appointments a LEFT JOIN services s ON s.id = a.service
            WHERE substr(a.client_phone, -10) = ? AND a.appointment_date >= ?
            ORDER BY a.appointment_date, a.appointment_time`,
      args: [String(ctx.phone).slice(-10), todayAR()],
    });
    return { turnos: result.rows.map(r => ({ fecha: r.appointment_date, hora: r.appointment_time, servicio: r.servicio, estado: r.status })) };
  }

  if (name === 'derivar_a_mili') {
    const miliPhone = process.env.MILI_PHONE_NUMBER || MILI_WHATSAPP_NUMBER;
    const who = `${ctx.client.name} (${ctx.phone})`;
    await sendWhatsAppMessage({
      to: miliPhone,
      text: `🙋‍♀️ *Una clienta necesita que le respondas vos*\n\n👤 ${who}\n📝 ${args.motivo || 'Sin detalle'}\n\nEl bot quedó pausado en ese chat por ${ctx.pauseHours} hs.`,
    });
    await pauseChat(ctx.chat, ctx.pauseHours);
    return { ok: true, nota: 'Mili ya fue avisada. Decile a la clienta que Mili le responde personalmente.' };
  }

  return { error: `Herramienta desconocida: ${name}` };
}

async function callOpenRouter(messages) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': `https://${SITE_HOST}`,
      'X-Title': 'Las Manitos de Mili - Bot WhatsApp',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
      messages,
      tools: TOOLS,
      temperature: 0.4,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`OpenRouter ${response.status}: ${data?.error?.message || 'error'}`);
  }
  return data.choices?.[0]?.message;
}

/**
 * Genera la respuesta del bot para un chat. El mensaje de la clienta ya tiene que
 * estar guardado en el historial (saveIncoming) antes de llamar a esto.
 * Devuelve el texto a enviar, o null si no hay que responder.
 */
export async function generateReply({ chat, client, pushName, pauseHours }) {
  const db = await getDb();

  const history = await getHistory(chat);
  const messages = [
    { role: 'system', content: await buildSystemPrompt(db, { knownName: client.name, trustStatus: client.trust_status }) },
    ...history,
  ];

  const ctx = { chat, client, phone: client.phone, pushName, pauseHours };

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const msg = await callOpenRouter(messages);
    if (!msg) break;

    if (msg.tool_calls?.length) {
      messages.push({ role: 'assistant', content: msg.content || '', tool_calls: msg.tool_calls });
      for (const call of msg.tool_calls) {
        let args = {};
        try { args = JSON.parse(call.function.arguments || '{}'); } catch { /* args vacíos */ }
        let result;
        try {
          result = await runTool(call.function.name, args, ctx);
        } catch (err) {
          console.error(`Error en herramienta ${call.function.name}:`, err);
          result = { error: 'Falló la operación, probá de nuevo o derivá a Mili' };
        }
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
      }
      continue;
    }

    const text = (msg.content || '').trim();
    if (text) {
      await saveAssistant(chat, text);
      return text;
    }
    break;
  }

  return null;
}
