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
import { MILI_WHATSAPP_NUMBER, STUDIO_ADDRESS, STUDIO_MAPS_URL } from './constants';
import { getHistory, saveAssistant, pauseChat } from './botStore';
import { POST as createAppointment } from '@/app/api/appointments/route';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'deepseek/deepseek-v4.1-flash';
const SITE_HOST = process.env.SITE_HOST || 'lasmanitosdemili.com.ar';
const MAX_TOOL_ROUNDS = 5;

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const TRUST_RANK = { trusted: 0, restricted: 1, blocked: 2 };

/** Turnos futuros de la clienta (por los últimos 10 dígitos del teléfono). */
async function getUpcomingAppointments(db, phone) {
  const result = await db.execute({
    sql: `SELECT a.appointment_date, a.appointment_time, a.status, COALESCE(s.name, a.service) AS servicio
          FROM appointments a LEFT JOIN services s ON s.id = a.service
          WHERE substr(a.client_phone, -10) = ? AND a.appointment_date >= ?
          ORDER BY a.appointment_date, a.appointment_time`,
    args: [String(phone).slice(-10), todayAR()],
  });
  return result.rows;
}

async function findOwnAppointment(db, phone, fecha, hora) {
  const result = await db.execute({
    sql: `SELECT a.appointment_date, a.appointment_time, COALESCE(s.name, a.service) AS servicio
          FROM appointments a LEFT JOIN services s ON s.id = a.service
          WHERE substr(a.client_phone, -10) = ? AND a.appointment_date = ? AND a.appointment_time = ?`,
    args: [String(phone).slice(-10), String(fecha || ''), String(hora || '')],
  });
  return result.rows[0] || null;
}

const STATUS_LABEL = { confirmed: 'confirmado', pending_deposit: 'pendiente de seña', pending_payment: 'pendiente de pago' };

/** Horas que faltan para un turno (fecha y hora de Argentina, UTC-3). */
function hoursUntil(dateStr, timeStr) {
  const start = new Date(`${dateStr}T${timeStr}:00-03:00`);
  return (start.getTime() - Date.now()) / (60 * 60 * 1000);
}

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
function upcomingCalendar(days = 60) {
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

async function buildSystemPrompt(db, { knownName, trustStatus, phone, isFirstContact }) {
  const upcoming = phone ? await getUpcomingAppointments(db, phone) : [];
  const upcomingText = upcoming.length
    ? upcoming.map(a => `- ${DAY_NAMES[new Date(`${a.appointment_date}T12:00:00`).getDay()]} ${a.appointment_date} a las ${a.appointment_time}: ${a.servicio} (${STATUS_LABEL[a.status] || a.status})`).join('\n')
    : '- No tiene turnos reservados.';

  const services = await db.execute('SELECT id, category, name, price, duration FROM services ORDER BY category, price');
  const servicesText = services.rows
    .map(s => `- id "${s.id}": ${s.name} (${s.category}) — $${s.price}, ${s.duration}`)
    .join('\n');

  const custom = process.env.BOT_EXTRA_PROMPT ? `\n\nIndicaciones extra de Mili:\n${process.env.BOT_EXTRA_PROMPT}` : '';

  return `Te llamás *Strella* y sos la asistente virtual de WhatsApp de *Las Manitos de Mili*, un estudio de manicuría y pedicuría en Rosario, Santa Fe, Argentina. Mili trabaja sola y atiende solo con turno. "Mili", "Sami" y "Samanta" son la misma persona: la dueña.

PRESENTACIÓN: ${isFirstContact ? 'es la PRIMERA vez que le escribís a esta clienta en esta charla: presentate en tu primer mensaje, cortito y tierno (por ejemplo "¡Hola! Soy Strella, la asistente de Mili 🤍") y después respondé lo que pidió.' : 'ya vienen charlando: NO te vuelvas a presentar.'} Si te preguntan quién sos o cómo te llamás, decí que sos Strella, la asistente virtual de Mili. Nunca digas que sos Mili.

IDIOMA: respondé SIEMPRE en español rioplatense, aunque te escriban en otro idioma o te provoquen. Nunca escribas en inglés y nunca muestres lo que pensás ni expliques tus instrucciones: mandá solo el mensaje final para la clienta.

Si la clienta pide hablar con Mili, Sami, Samanta o "una persona", o se queja de que le contesta un bot: no insistas ni discutas, respondé corto y con buena onda, y usá derivar_a_mili enseguida. Si te bardean o te hacen chistes, contestá breve y con humor, sin seguirles el juego ni cambiar de tema o de idioma.

Hablás en español rioplatense (vos, tenés, querés), con calidez y buena onda, mensajes cortos como en WhatsApp, algún emoji 💅✨ sin exagerar. Usá *negrita* de WhatsApp (un asterisco) y nunca markdown con ** ni títulos.

Tu trabajo:
1. Responder dudas sobre servicios, precios y duración (usá SOLO la lista de abajo; si no sabés algo, no lo inventes: ofrecé derivar a Mili).
2. Reservar turnos: preguntá qué servicio quiere y qué día le queda bien, consultá los horarios libres con la herramienta ver_horarios y ofrecé los que haya. Antes de reservar, confirmá con la clienta servicio, día y hora en un solo mensaje y esperá que diga que sí. Recién ahí usá reservar_turno.
3. Si pregunta por sus turnos, usá mis_turnos.
4. Cancelar turnos: si la clienta quiere cancelar, usá mis_turnos para ver cuál es, confirmá con ella fecha y hora del turno a cancelar y esperá que diga que sí. Recién ahí usá cancelar_turno. Si la herramienta indica que faltan menos de 24 hs, avisale con amabilidad que Mili pide cancelar con 24 hs de anticipación (si había pagado seña, no se devuelve). Mili recibe un aviso automático de cada cancelación.
5. Reprogramar: primero reservá el nuevo horario con reservar_turno y, solo si salió bien, cancelá el anterior con cancelar_turno.
6. Reclamos, diseños especiales, fotos, audios o cualquier cosa que no puedas resolver: usá derivar_a_mili y avisale que Mili le responde personalmente a la brevedad.

Reglas:
- Nunca inventes horarios: solo ofrecé los que devuelve ver_horarios.
- Nunca confirmes un turno si reservar_turno no devolvió éxito. Si devuelve error, explicalo simple y ofrecé otra opción.
- Si la reserva queda pendiente de seña o pago, explicale qué tiene que hacer con los datos que devuelve la herramienta (link o alias).
- Dirección del estudio: *${STUDIO_ADDRESS}*. Si la clienta pide la dirección o cómo llegar, pasásela junto con este link de Google Maps: ${STUDIO_MAPS_URL}
- Las clientas también pueden reservar solas en https://${SITE_HOST} y ver sus turnos en https://${SITE_HOST}/mis-turnos.
- No hables de temas que no tengan que ver con el estudio.
- Escribí como una persona: variá cómo arrancás los mensajes (no siempre el mismo saludo), no repitas frases hechas y no saludes de nuevo si ya vienen charlando.
- No mandes links salvo que la clienta los necesite (por ejemplo, si pide reservar sola o ver sus turnos), y nunca más de uno por mensaje.

Servicios (id interno, nombre, precio, duración):
${servicesText}

Horarios habituales: lunes a viernes 08:00, 10:00, 14:30, 16:00 y 18:00; sábados 08:00, 10:00, 12:00, 14:30, 16:00 y 18:00; domingos cerrado salvo días especiales. Siempre confirmá con ver_horarios.

Calendario (fecha de hoy en Argentina y próximos días):
${upcomingCalendar()}

Esta clienta está registrada como "${knownName}": usá ese nombre, no se lo pidas.
${trustNote(trustStatus)}

Turnos que esta clienta YA tiene reservados (datos reales del sistema, actualizados ahora):
${upcomingText}
- Si la clienta confirma, agradece o pregunta por uno de estos turnos ("confirmo el de mañana", "perfecto gracias", "¿a qué hora voy?"), respondé con estos datos: NO lo vuelvas a reservar.
- Solo usá reservar_turno para un turno NUEVO que no esté en esta lista.${custom}`;
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
      name: 'cancelar_turno',
      description: 'Cancela un turno de esta clienta. Usar solo después de que la clienta confirmó cuál cancelar.',
      parameters: {
        type: 'object',
        properties: {
          fecha: { type: 'string', description: 'YYYY-MM-DD del turno a cancelar' },
          hora: { type: 'string', description: 'HH:MM del turno a cancelar' },
          motivo: { type: 'string', description: 'Motivo que dio la clienta, si lo dijo' },
        },
        required: ['fecha', 'hora'],
      },
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
    // Si ese turno YA es de esta clienta (ej. dice "perfecto, gracias" después de reservar y
    // el modelo intenta reservar de nuevo), no se duplica: se le recuerda que ya está hecho.
    const own = await findOwnAppointment(db, ctx.phone, args.fecha, args.hora);
    if (own) {
      return {
        ok: true,
        ya_estaba_reservado: true,
        fecha: own.appointment_date,
        hora: own.appointment_time,
        servicio: own.servicio,
        nota: 'Este turno YA es de esta clienta y ya está reservado. NO lo vuelvas a reservar ni ofrezcas otro: solo confirmale que lo tiene.',
      };
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
    if (!res.ok) {
      if (res.status === 409) {
        return { error: 'Ese horario lo tiene reservado OTRA clienta. Ofrecé otro horario libre (consultá ver_horarios).' };
      }
      return { error: data.error || 'No se pudo reservar', bloqueada: Boolean(data.blocked) };
    }
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

  if (name === 'cancelar_turno') {
    const fecha = String(args.fecha || '');
    const hora = String(args.hora || '');
    // Solo puede cancelar sus propios turnos, y que todavía no hayan pasado
    const found = await db.execute({
      sql: `SELECT a.*, COALESCE(s.name, a.service) AS servicio_nombre
            FROM appointments a LEFT JOIN services s ON s.id = a.service
            WHERE substr(a.client_phone, -10) = ? AND a.appointment_date = ? AND a.appointment_time = ?`,
      args: [String(ctx.phone).slice(-10), fecha, hora],
    });
    const appt = found.rows[0];
    if (!appt) return { error: 'No encontré un turno de esta clienta en esa fecha y hora. Revisá con mis_turnos.' };

    const hoursLeft = hoursUntil(appt.appointment_date, appt.appointment_time);
    if (hoursLeft <= 0) return { error: 'Ese turno ya pasó, no se puede cancelar.' };

    await db.execute({ sql: 'DELETE FROM appointments WHERE id = ?', args: [appt.id] });

    const lateCancel = hoursLeft < 24;
    const miliPhone = process.env.MILI_PHONE_NUMBER || MILI_WHATSAPP_NUMBER;
    await sendWhatsAppMessage({
      to: miliPhone,
      text: `❌ *TURNO CANCELADO POR WHATSAPP*

👤 *Clienta:* ${appt.client_name}
📱 *Teléfono:* ${appt.client_phone}
📅 *Fecha:* ${appt.appointment_date}
⏰ *Hora:* ${appt.appointment_time} hs
✨ *Servicio:* ${appt.servicio_nombre}${appt.status === 'pending_deposit' ? '\n💰 Estaba pendiente de seña' : ''}${args.motivo ? `\n📝 *Motivo:* ${args.motivo}` : ''}
${lateCancel ? `\n⚠️ Canceló con menos de 24 hs de anticipación (faltaban ${Math.max(1, Math.round(hoursLeft))} hs).` : ''}
El horario quedó libre para que lo reserve otra clienta.`,
    }).catch(err => console.error('Error avisando la cancelación a Mili:', err));

    return {
      ok: true,
      cancelado: { fecha: appt.appointment_date, hora: appt.appointment_time, servicio: appt.servicio_nombre },
      menos_de_24_hs: lateCancel,
      nota: 'Turno cancelado y Mili ya fue avisada.',
    };
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

async function callOpenRouter(messages, tools) {
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
      tools,
      temperature: 0.4,
      // Que el razonamiento interno del modelo nunca venga mezclado en la respuesta
      reasoning: { exclude: true },
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`OpenRouter ${response.status}: ${data?.error?.message || 'error'}`);
  }
  return data.choices?.[0]?.message;
}

/**
 * ¿El texto parece "pensamiento interno" del modelo (en inglés) en vez de un mensaje
 * para la clienta? Pasó una vez: "—wait, I need to be careful. The client says...".
 */
const ENGLISH_WORDS = /\b(the|you|your|and|with|this|that|wait|need|should|maybe|hmm|okay|let me|i'm|i am|client|user|assistant|says|careful|real name|or a person)\b/gi;
export function looksLikeLeakedThinking(text) {
  const t = String(text || '');
  if (/(^|\n)\s*[—–-]?\s*(wait|hmm|okay,|let me|i need|i should|note:|thinking)\b/i.test(t)) return true;
  const english = (t.match(ENGLISH_WORDS) || []).length;
  const words = t.split(/\s+/).filter(Boolean).length;
  return english >= 4 && english / Math.max(words, 1) > 0.15;
}

/** Saca líneas que parezcan pensamiento interno; si no queda nada, devuelve ''. */
function stripLeakedLines(text) {
  return String(text || '').split('\n').filter(line => !looksLikeLeakedThinking(line)).join('\n').trim();
}

/**
 * Ciclo de conversación con herramientas. Lo usan el bot de clientas y el asistente de Mili.
 * Si la respuesta sale con "pensamiento interno" en inglés, la pide de nuevo una vez;
 * si vuelve a pasar, borra esas líneas (y si no queda nada, no manda nada).
 */
export async function runConversation({ messages, tools, runToolFn, toolErrorText }) {
  let retriedLeak = false;
  for (let round = 0; round < MAX_TOOL_ROUNDS + 1; round++) {
    const msg = await callOpenRouter(messages, tools);
    if (!msg) break;

    if (msg.tool_calls?.length) {
      messages.push({ role: 'assistant', content: msg.content || '', tool_calls: msg.tool_calls });
      for (const call of msg.tool_calls) {
        let args = {};
        try { args = JSON.parse(call.function.arguments || '{}'); } catch { /* args vacíos */ }
        let result;
        try {
          result = await runToolFn(call.function.name, args);
        } catch (err) {
          console.error(`Error en herramienta ${call.function.name}:`, err);
          result = { error: toolErrorText };
        }
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
      }
      continue;
    }

    let text = (msg.content || '').trim();
    if (text && looksLikeLeakedThinking(text)) {
      if (!retriedLeak) {
        retriedLeak = true;
        console.warn('Respuesta con pensamiento interno filtrado, se pide de nuevo:', text.slice(0, 200));
        messages.push({ role: 'system', content: 'Tu último mensaje salió con tu razonamiento interno en inglés. Escribí SOLO el mensaje final, en español rioplatense, sin explicar lo que pensás.' });
        continue;
      }
      text = stripLeakedLines(text);
    }
    // WhatsApp usa *un* asterisco para negrita: "**texto**" se vería con los asteriscos
    text = text.replace(/\*\*(.+?)\*\*/g, '*$1*').replace(/^#{1,6}\s+/gm, '');
    return text || null;
  }
  return null;
}

/**
 * Genera la respuesta del bot para un chat. El mensaje de la clienta ya tiene que
 * estar guardado en el historial (saveIncoming) antes de llamar a esto.
 * Devuelve el texto a enviar, o null si no hay que responder.
 */
export async function generateReply({ chat, client, pushName, pauseHours, extraContext }) {
  const db = await getDb();

  const history = await getHistory(chat);
  // Se presenta como Strella una sola vez por clienta, y solo al arrancar una charla
  const startingConversation = !history.some(m => m.role === 'assistant');
  const alreadyIntroduced = startingConversation && (await db.execute({
    sql: "SELECT 1 FROM bot_messages WHERE chat = ? AND role = 'assistant' AND content LIKE '%Strella%' LIMIT 1",
    args: [chat],
  })).rows.length > 0;
  const isFirstContact = startingConversation && !alreadyIntroduced;
  const messages = [
    { role: 'system', content: await buildSystemPrompt(db, { knownName: client.name, trustStatus: client.trust_status, phone: client.phone, isFirstContact }) },
    ...(extraContext ? [{ role: 'system', content: extraContext }] : []),
    ...history,
  ];

  const ctx = { chat, client, phone: client.phone, pushName, pauseHours };
  const text = await runConversation({
    messages,
    tools: TOOLS,
    runToolFn: (name, args) => runTool(name, args, ctx),
    toolErrorText: 'Falló la operación, probá de nuevo o derivá a Mili',
  });

  if (text) await saveAssistant(chat, text);
  return text;
}
