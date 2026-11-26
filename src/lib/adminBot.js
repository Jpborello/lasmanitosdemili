/**
 * Asistente personal de Mili (la dueña). Mili le da órdenes escribiéndose a sí misma en
 * WhatsApp ("Mensaje a mí misma"), empezando con "Bot ...". Solo ella puede usarlo: esos
 * mensajes salen de su propio celular hacia su propio número.
 *
 * Puede: buscar clientas, ver la agenda de un día, borrar turnos, cambiar el estado de una
 * clienta (confiable / restringida / bloqueada) y prender o apagar el bot en un chat.
 * Para borrar o cambiar estados, primero confirma los datos con Mili.
 */
import { getDb } from './db';
import { runConversation } from './bot';
import { todayAR } from './turno20';
import { getHistory, saveAssistant, pauseChat, resumeChat } from './botStore';

const ADMIN_CHAT = 'admin:mili';
const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const ESTADOS = { confiable: 'trusted', restringida: 'restricted', bloqueada: 'blocked' };
const ESTADOS_TXT = { trusted: 'confiable', restricted: 'restringida', blocked: 'bloqueada' };

export { ADMIN_CHAT };

const last10 = phone => String(phone || '').replace(/\D/g, '').slice(-10);
const chatOf = phone => `549${last10(phone)}@s.whatsapp.net`;

function calendar(days = 21) {
  const base = new Date(`${todayAR()}T12:00:00`);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return `${DAY_NAMES[d.getDay()]} ${d.toLocaleDateString('en-CA')}${i === 0 ? ' (hoy)' : i === 1 ? ' (mañana)' : ''}`;
  }).join('\n');
}

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'buscar_clienta',
      description: 'Busca clientas por teléfono (cualquier formato) o por nombre. Devuelve datos, estado y próximos turnos.',
      parameters: { type: 'object', properties: { texto: { type: 'string', description: 'Teléfono o nombre' } }, required: ['texto'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ver_agenda',
      description: 'Lista los turnos de un día con nombre y teléfono de cada clienta.',
      parameters: { type: 'object', properties: { fecha: { type: 'string', description: 'YYYY-MM-DD' } }, required: ['fecha'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'borrar_turno',
      description: 'Borra un turno. Usar SOLO después de que Mili confirmó cuál borrar.',
      parameters: {
        type: 'object',
        properties: {
          telefono: { type: 'string' },
          fecha: { type: 'string', description: 'YYYY-MM-DD' },
          hora: { type: 'string', description: 'HH:MM' },
        },
        required: ['telefono', 'fecha', 'hora'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cambiar_estado_clienta',
      description: 'Cambia el estado de una clienta. bloqueada = no puede reservar; restringida = debe pagar seña y esperar aprobación; confiable = normal. Usar SOLO después de que Mili confirmó.',
      parameters: {
        type: 'object',
        properties: {
          telefono: { type: 'string' },
          estado: { type: 'string', enum: ['confiable', 'restringida', 'bloqueada'] },
        },
        required: ['telefono', 'estado'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'bot_en_chat',
      description: 'Prende o apaga el bot automático en el chat de una clienta (apagado = el bot no le contesta más).',
      parameters: {
        type: 'object',
        properties: { telefono: { type: 'string' }, activo: { type: 'boolean' } },
        required: ['telefono', 'activo'],
      },
    },
  },
];

async function upcomingFor(db, phone) {
  const r = await db.execute({
    sql: `SELECT a.appointment_date AS fecha, a.appointment_time AS hora, COALESCE(s.name, a.service) AS servicio, a.status AS estado
          FROM appointments a LEFT JOIN services s ON s.id = a.service
          WHERE substr(a.client_phone, -10) = ? AND a.appointment_date >= ?
          ORDER BY a.appointment_date, a.appointment_time`,
    args: [last10(phone), todayAR()],
  });
  return r.rows;
}

async function runAdminTool(name, args) {
  const db = await getDb();

  if (name === 'buscar_clienta') {
    const texto = String(args.texto || '').trim();
    const digits = texto.replace(/\D/g, '');
    const r = digits.length >= 6
      ? await db.execute({ sql: 'SELECT name, phone, trust_status FROM clients WHERE substr(phone, -10) LIKE ? LIMIT 5', args: [`%${digits.slice(-10)}%`] })
      : await db.execute({ sql: 'SELECT name, phone, trust_status FROM clients WHERE name LIKE ? LIMIT 5', args: [`%${texto}%`] });
    const clientas = [];
    for (const c of r.rows) {
      clientas.push({ nombre: c.name, telefono: c.phone, estado: ESTADOS_TXT[c.trust_status] || c.trust_status, proximos_turnos: await upcomingFor(db, c.phone) });
    }
    return clientas.length ? { clientas } : { clientas: [], nota: 'No encontré ninguna clienta con eso.' };
  }

  if (name === 'ver_agenda') {
    const r = await db.execute({
      sql: `SELECT a.appointment_time AS hora, a.client_name AS clienta, a.client_phone AS telefono, COALESCE(s.name, a.service) AS servicio, a.status AS estado
            FROM appointments a LEFT JOIN services s ON s.id = a.service
            WHERE a.appointment_date = ? ORDER BY a.appointment_time`,
      args: [String(args.fecha || '')],
    });
    return { fecha: args.fecha, turnos: r.rows };
  }

  if (name === 'borrar_turno') {
    const r = await db.execute({
      sql: 'SELECT id, client_name, appointment_date, appointment_time FROM appointments WHERE substr(client_phone, -10) = ? AND appointment_date = ? AND appointment_time = ?',
      args: [last10(args.telefono), String(args.fecha || ''), String(args.hora || '')],
    });
    const appt = r.rows[0];
    if (!appt) return { error: 'No encontré un turno de ese teléfono en esa fecha y hora.' };
    await db.execute({ sql: 'DELETE FROM appointments WHERE id = ?', args: [appt.id] });
    return { ok: true, borrado: { clienta: appt.client_name, fecha: appt.appointment_date, hora: appt.appointment_time }, nota: 'A la clienta no se le avisó nada.' };
  }

  if (name === 'cambiar_estado_clienta') {
    const estado = ESTADOS[args.estado];
    if (!estado) return { error: 'Estado inválido' };
    const r = await db.execute({ sql: 'SELECT name FROM clients WHERE substr(phone, -10) = ?', args: [last10(args.telefono)] });
    if (!r.rows.length) return { error: 'Ese teléfono no está registrado como clienta.' };
    await db.execute({ sql: 'UPDATE clients SET trust_status = ? WHERE substr(phone, -10) = ?', args: [estado, last10(args.telefono)] });
    return { ok: true, clienta: r.rows[0].name, nuevo_estado: args.estado };
  }

  if (name === 'bot_en_chat') {
    if (args.activo) await resumeChat(chatOf(args.telefono));
    else await pauseChat(chatOf(args.telefono), 24 * 365);
    return { ok: true, telefono: last10(args.telefono), bot: args.activo ? 'prendido' : 'apagado' };
  }

  return { error: `Herramienta desconocida: ${name}` };
}

function systemPrompt() {
  return `Sos el asistente personal de Mili (Samanta, "Sami"), dueña del estudio de uñas *Las Manitos de Mili* en Rosario. Ella te escribe por WhatsApp para pedirte cosas del sistema de turnos.

Respondé SIEMPRE en español rioplatense, corto y claro, como un mensaje de WhatsApp. Nunca escribas en inglés ni muestres lo que pensás.

Podés:
- Buscar clientas por teléfono o nombre (buscar_clienta).
- Ver la agenda de un día (ver_agenda).
- Borrar turnos (borrar_turno).
- Bloquear, restringir o volver a confiable a una clienta (cambiar_estado_clienta).
- Prender o apagar el bot en el chat de una clienta (bot_en_chat).

Reglas:
- Antes de BORRAR un turno o CAMBIAR el estado de una clienta: buscá los datos, mostrale a Mili exactamente qué vas a hacer (nombre, teléfono, fecha y hora) y esperá que diga "sí". Recién ahí ejecutá. Si hay varias coincidencias, preguntale cuál.
- Nunca digas que hiciste algo si la herramienta no devolvió ok.
- Al borrar un turno, a la clienta NO se le avisa: recordáselo a Mili por si quiere escribirle.
- Si te pide algo que no podés hacer, decíselo y sugerile hacerlo desde el panel admin de la web.

Calendario (hoy y próximos días):
${calendar()}`;
}

/** Responde una orden de Mili. El mensaje de ella ya tiene que estar guardado en el historial. */
export async function generateAdminReply() {
  const history = await getHistory(ADMIN_CHAT, 20);
  const text = await runConversation({
    messages: [{ role: 'system', content: systemPrompt() }, ...history],
    tools: TOOLS,
    runToolFn: runAdminTool,
    toolErrorText: 'Falló la operación',
  });
  if (text) await saveAssistant(ADMIN_CHAT, text);
  return text;
}
