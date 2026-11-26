/**
 * Asistente personal de Mili (la dueña). Mili le da órdenes escribiéndose a sí misma en
 * WhatsApp ("Mensaje a mí misma"), empezando con "Bot ...". Solo ella puede usarlo: esos
 * mensajes salen de su propio celular hacia su propio número.
 *
 * Puede: buscar clientas, ver la agenda de un día, borrar turnos, cambiar el estado de una
 * clienta (confiable / restringida / bloqueada), prender o apagar el bot en un chat,
 * habilitar o bloquear cualquier horario puntual, bloquear días enteros o rangos, prender
 * o apagar el turno de las 18 en general y consultar qué días quedan libres o completos.
 * Para borrar o cambiar estados, primero confirma los datos con Mili.
 */
import { getDb } from './db';
import { runConversation } from './bot';
import { todayAR } from './turno20';
import { getHistory, saveAssistant, pauseChat, resumeChat } from './botStore';
import { getAvailableTimes, getBookingSettings } from './availability';

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
      name: 'turno_18_general',
      description: 'Prende o apaga el turno de las 18:00 de lunes a viernes en general (el mismo interruptor del panel admin). Los sábados no se ven afectados.',
      parameters: { type: 'object', properties: { activo: { type: 'boolean' } }, required: ['activo'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'horario_puntual',
      description: 'Habilita o bloquea UN horario en UNA fecha (cualquier hora, ej. 12:00, 13:00, 18:00, 20:00; también domingos). habilitado=true lo agrega aunque no sea del horario habitual; habilitado=false lo bloquea.',
      parameters: {
        type: 'object',
        properties: {
          fecha: { type: 'string', description: 'YYYY-MM-DD' },
          hora: { type: 'string', description: 'HH:MM en 24 hs (ej. "12:00", "13:00")' },
          habilitado: { type: 'boolean' },
        },
        required: ['fecha', 'hora', 'habilitado'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'dias_completos',
      description: 'Bloquea o desbloquea días enteros (sin ningún turno). Para un solo día usá desde = hasta; para una semana o varios días, el rango. Devuelve los turnos ya reservados en esos días.',
      parameters: {
        type: 'object',
        properties: {
          desde: { type: 'string', description: 'YYYY-MM-DD' },
          hasta: { type: 'string', description: 'YYYY-MM-DD (igual a desde si es un solo día)' },
          bloqueado: { type: 'boolean' },
        },
        required: ['desde', 'hasta', 'bloqueado'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_agenda',
      description: 'Resumen de un rango de días: para cada día, turnos reservados, horarios libres y si está bloqueado o cerrado. Sirve para "¿qué días tengo sin turnos?", "¿qué me queda libre la semana que viene?", "¿qué días están completos?".',
      parameters: {
        type: 'object',
        properties: { desde: { type: 'string', description: 'YYYY-MM-DD' }, hasta: { type: 'string', description: 'YYYY-MM-DD (máximo 31 días)' } },
        required: ['desde', 'hasta'],
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

// --- Settings del turno de las 18 (mismas claves que usa el panel admin) ---
const splitList = v => String(v || '').split(',').map(s => s.trim()).filter(Boolean);

async function getSetting(db, key, fallback = '') {
  const r = await db.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: [key] });
  return r.rows[0]?.value ?? fallback;
}

async function setSetting(db, key, value) {
  await db.execute({ sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', args: [key, value] });
}

async function bookingsAt18(db, fromDate, toDate) {
  const r = await db.execute({
    sql: `SELECT appointment_date AS fecha, client_name AS clienta FROM appointments
          WHERE appointment_time = '18:00' AND appointment_date >= ? AND appointment_date <= ?
          ORDER BY appointment_date`,
    args: [fromDate, toDate],
  });
  return r.rows;
}

const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

/** "12" / "12hs" / "12:00" / "9:30" -> "12:00" / "09:30"; inválido -> null */
function normalizeTime(value) {
  const m = String(value || '').trim().match(/^(\d{1,2})(?::|\.|h)?(\d{2})?\s*(?:hs?)?$/i);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] || 0);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function dateRange(from, to) {
  const out = [];
  const d = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  while (d <= end && out.length < 400) {
    out.push(d.toLocaleDateString('en-CA'));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

async function bookingsBetween(db, from, to) {
  const r = await db.execute({
    sql: `SELECT appointment_date AS fecha, appointment_time AS hora, client_name AS clienta, client_phone AS telefono
          FROM appointments WHERE appointment_date >= ? AND appointment_date <= ?
          ORDER BY appointment_date, appointment_time`,
    args: [from, to],
  });
  return r.rows;
}

async function bookingsOn(db, fecha, hora) {
  const r = await db.execute({
    sql: 'SELECT client_name AS clienta, client_phone AS telefono FROM appointments WHERE appointment_date = ? AND appointment_time = ?',
    args: [fecha, hora],
  });
  return r.rows;
}

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

  if (name === 'turno_18_general') {
    await setSetting(db, 'enable_18_weekday', args.activo ? 'true' : 'false');
    const result = { ok: true, turno_18_lunes_a_viernes: args.activo ? 'activo' : 'apagado' };
    if (!args.activo) {
      // Los turnos ya reservados a las 18 no se borran: se le avisa a Mili cuáles quedan
      const inDays = new Date(Date.now() + 60 * 24 * 3600 * 1000).toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
      const weekdays = (await bookingsAt18(db, todayAR(), inDays)).filter(b => {
        const d = new Date(`${b.fecha}T12:00:00`).getDay();
        return d >= 1 && d <= 5;
      });
      result.turnos_ya_reservados_a_las_18 = weekdays;
      result.nota = 'Los turnos ya reservados a las 18 siguen en pie. Los días que Mili haya habilitado puntualmente siguen habilitados.';
    }
    return result;
  }

  if (name === 'horario_puntual') {
    const fecha = String(args.fecha || '');
    const hora = normalizeTime(args.hora);
    if (!isDate(fecha)) return { error: 'Fecha inválida (usar YYYY-MM-DD)' };
    if (!hora) return { error: 'Hora inválida (usar HH:MM, ej. 12:00)' };
    if (fecha < todayAR()) return { error: 'Esa fecha ya pasó' };

    const slot = `${fecha}_${hora}`;
    const isSunday = new Date(`${fecha}T12:00:00`).getDay() === 0;
    const extra = splitList(await getSetting(db, 'extra_slots')).filter(s => s !== slot);
    const blocked = splitList(await getSetting(db, 'blocked_slots')).filter(s => s !== slot);
    const sunday = splitList(await getSetting(db, 'sunday_slots')).filter(s => s !== slot);

    if (args.habilitado) {
      // Los domingos están cerrados por defecto: se habilitan como "domingo especial"
      if (isSunday) sunday.push(slot);
      else extra.push(slot);
      // Si el día entero estaba bloqueado, habilitar un horario no alcanza: se avisa
    } else {
      blocked.push(slot);
    }
    await setSetting(db, 'extra_slots', extra.join(','));
    await setSetting(db, 'blocked_slots', blocked.join(','));
    await setSetting(db, 'sunday_slots', sunday.join(','));

    const dayBlocked = splitList(await getSetting(db, 'blocked_dates')).includes(fecha);
    const booked = await bookingsOn(db, fecha, hora);
    return {
      ok: true,
      fecha,
      dia: DAY_NAMES[new Date(`${fecha}T12:00:00`).getDay()],
      hora,
      estado: args.habilitado ? 'habilitado' : 'bloqueado',
      ...(args.habilitado && dayBlocked ? { ojo: 'Ese día entero está bloqueado: el horario no se va a ver hasta que se desbloquee el día.' } : {}),
      ...(!args.habilitado && booked.length ? { ojo: `Ya hay un turno reservado en ese horario (${booked[0].clienta}, ${booked[0].telefono}); no se borra solo.` } : {}),
    };
  }

  if (name === 'dias_completos') {
    const desde = String(args.desde || '');
    const hasta = String(args.hasta || desde);
    if (!isDate(desde) || !isDate(hasta) || hasta < desde) return { error: 'Rango de fechas inválido' };
    const dates = dateRange(desde, hasta);
    if (dates.length > 62) return { error: 'Máximo 62 días por vez' };

    let blockedDates = splitList(await getSetting(db, 'blocked_dates')).filter(d => !dates.includes(d));
    if (args.bloqueado) blockedDates = blockedDates.concat(dates);
    await setSetting(db, 'blocked_dates', [...new Set(blockedDates)].sort().join(','));

    const booked = await bookingsBetween(db, desde, hasta);
    return {
      ok: true,
      dias: dates.map(d => `${DAY_NAMES[new Date(`${d}T12:00:00`).getDay()]} ${d}`),
      estado: args.bloqueado ? 'bloqueados (sin turnos nuevos)' : 'desbloqueados',
      turnos_ya_reservados: booked,
      ...(args.bloqueado && booked.length ? { ojo: 'Estos turnos ya reservados siguen en pie: si querés, los borro o le escribís a cada clienta.' } : {}),
    };
  }

  if (name === 'consultar_agenda') {
    const desde = String(args.desde || todayAR());
    const hasta = String(args.hasta || desde);
    if (!isDate(desde) || !isDate(hasta) || hasta < desde) return { error: 'Rango de fechas inválido' };
    const dates = dateRange(desde < todayAR() ? todayAR() : desde, hasta).slice(0, 31);
    const settings = await getBookingSettings(db);
    const dias = [];
    for (const fecha of dates) {
      const booked = await bookingsBetween(db, fecha, fecha);
      const { available, reason } = await getAvailableTimes(db, fecha, settings);
      dias.push({
        dia: `${DAY_NAMES[new Date(`${fecha}T12:00:00`).getDay()]} ${fecha}`,
        turnos_reservados: booked.map(b => `${b.hora} ${b.clienta}`),
        horarios_libres: available,
        ...(available.length === 0 && reason ? { motivo: reason } : {}),
      });
    }
    return {
      dias,
      resumen: {
        sin_ningun_turno_reservado: dias.filter(d => d.turnos_reservados.length === 0 && d.horarios_libres.length > 0).map(d => d.dia),
        completos: dias.filter(d => d.turnos_reservados.length > 0 && d.horarios_libres.length === 0).map(d => d.dia),
        cerrados_o_bloqueados: dias.filter(d => d.turnos_reservados.length === 0 && d.horarios_libres.length === 0).map(d => d.dia),
      },
    };
  }

  if (name === 'bot_en_chat') {
    if (args.activo) await resumeChat(chatOf(args.telefono));
    else await pauseChat(chatOf(args.telefono), 24 * 365);
    return { ok: true, telefono: last10(args.telefono), bot: args.activo ? 'prendido' : 'apagado' };
  }

  return { error: `Herramienta desconocida: ${name}` };
}

function systemPrompt({ turno18Activo }) {
  return `Sos Strella, la asistente personal de Mili (Samanta, "Sami"), dueña del estudio de uñas *Las Manitos de Mili* en Rosario. Ella te escribe por WhatsApp para pedirte cosas del sistema de turnos.

Respondé SIEMPRE en español rioplatense, corto y claro, como un mensaje de WhatsApp. Nunca escribas en inglés ni muestres lo que pensás.

Podés:
- Buscar clientas por teléfono o nombre (buscar_clienta).
- Ver la agenda de un día (ver_agenda).
- Borrar turnos (borrar_turno).
- Bloquear, restringir o volver a confiable a una clienta (cambiar_estado_clienta).
- Prender o apagar el bot en el chat de una clienta (bot_en_chat).
- Manejar la agenda:
  * Habilitar o bloquear UN horario en una fecha, de cualquier hora (horario_puntual). Ej: "habilitá las 12 para mañana", "abrime las 13 el sábado", "bloqueá las 16 del jueves". Si dice "las 12 del mediodía" es 12:00; "las 6 de la tarde" es 18:00.
  * Bloquear o desbloquear días enteros o rangos (dias_completos). Ej: "bloqueá el día 7", "bloqueá toda la semana que viene", "del 22 al 31 no trabajo". Después de bloquear, contale SIEMPRE si había turnos ya reservados en esos días (con nombre y teléfono), porque no se borran solos, y ofrecele borrarlos.
  * Prender o apagar el turno de las 18 de lunes a viernes EN GENERAL (turno_18_general). Para un solo día usá horario_puntual con 18:00.
  * Consultar la agenda de varios días (consultar_agenda): "¿qué días tengo sin turnos?", "¿qué me queda libre la semana que viene?", "¿qué días están completos?". Si no dice desde cuándo, usá desde hoy hasta 14 días adelante. Respondé con un resumen corto y claro, no la lista entera si es muy larga.
  * Ver la agenda de un solo día con nombres y teléfonos (ver_agenda).
- Interpretá las fechas con el calendario de abajo. Si dice solo un número de día ("el 7", "mañana 6"), es el próximo día con ese número; si el nombre del día que dice no coincide con la fecha (ej. "jueves 6" pero el 6 es viernes), preguntale antes de hacer nada.

Estado actual del turno de las 18 de lunes a viernes: ${turno18Activo ? 'ACTIVO' : 'APAGADO'}.
Horario habitual: lunes a viernes 08:00, 10:00, 14:30, 16:00 (y 18:00 si está activo); sábados 08:00, 10:00, 12:00, 14:30, 16:00 y 18:00; domingos cerrado.

Reglas:
- Antes de BORRAR un turno o CAMBIAR el estado de una clienta: buscá los datos, mostrale a Mili exactamente qué vas a hacer (nombre, teléfono, fecha y hora) y esperá que diga "sí". Recién ahí ejecutá. Si hay varias coincidencias, preguntale cuál.
- Nunca digas que hiciste algo si la herramienta no devolvió ok.
- Al borrar un turno, a la clienta NO se le avisa: recordáselo a Mili por si quiere escribirle.
- Si te pide algo que no podés hacer, decíselo y sugerile hacerlo desde el panel admin de la web.

Calendario (hoy y próximos días):
${calendar(60)}`;
}

/** Responde una orden de Mili. El mensaje de ella ya tiene que estar guardado en el historial. */
export async function generateAdminReply() {
  const history = await getHistory(ADMIN_CHAT, 20);
  const db = await getDb();
  const turno18Activo = (await getSetting(db, 'enable_18_weekday', 'true')) === 'true';
  const text = await runConversation({
    messages: [{ role: 'system', content: systemPrompt({ turno18Activo }) }, ...history],
    tools: TOOLS,
    runToolFn: runAdminTool,
    toolErrorText: 'Falló la operación',
  });
  if (text) await saveAssistant(ADMIN_CHAT, text);
  return text;
}
