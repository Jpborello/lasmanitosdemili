/**
 * Memoria del bot de WhatsApp (Evolution + OpenRouter).
 *
 * - bot_messages: historial corto de cada chat, para que el bot recuerde la charla.
 * - bot_sent_ids: ids de los mensajes que mandó el sistema (bot o avisos automáticos).
 *   Sirve para distinguir cuándo un mensaje "enviado desde el celular de Mili" lo
 *   escribió ella a mano, y en ese caso pausar el bot en ese chat.
 * - bot_chat_state: pausa del bot por chat (cuando Mili toma la conversación).
 */
import { getDb } from './db';

let ready = false;

export async function getBotDb() {
  const db = await getDb();
  if (!ready) {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS bot_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        wa_id TEXT,
        created_at TEXT NOT NULL
      )
    `);
    await db.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_bot_messages_wa_id ON bot_messages(wa_id)
    `);
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_bot_messages_chat ON bot_messages(chat, created_at)
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS bot_sent_ids (
        wa_id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS bot_chat_state (
        chat TEXT PRIMARY KEY,
        paused_until TEXT
      )
    `);
    // Identificadores internos de WhatsApp (@lid) ya asociados a un número
    await db.execute(`
      CREATE TABLE IF NOT EXISTS bot_lid_map (
        lid TEXT PRIMARY KEY,
        phone TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    // Cuándo Mili reactivó el bot en ese chat con "#bot" (los mensajes suyos anteriores
    // ya no cuentan para frenar al bot)
    try {
      await db.execute('ALTER TABLE bot_chat_state ADD COLUMN resumed_at TEXT');
    } catch {
      // la columna ya existía
    }
    ready = true;
  }
  return db;
}

/** Guarda un mensaje entrante. Devuelve false si ya lo habíamos procesado (reintento de Evolution). */
export async function saveIncoming(chat, content, waId) {
  const db = await getBotDb();
  try {
    await db.execute({
      sql: 'INSERT INTO bot_messages (chat, role, content, wa_id, created_at) VALUES (?, ?, ?, ?, ?)',
      args: [chat, 'user', content, waId || null, new Date().toISOString()],
    });
    return true;
  } catch (err) {
    if (String(err?.message || '').includes('UNIQUE')) return false;
    throw err;
  }
}

export async function saveAssistant(chat, content) {
  const db = await getBotDb();
  await db.execute({
    sql: 'INSERT INTO bot_messages (chat, role, content, created_at) VALUES (?, ?, ?, ?)',
    args: [chat, 'assistant', content, new Date().toISOString()],
  });
}

/** Últimos mensajes del chat (de las últimas 24 hs), en orden cronológico. */
export async function getHistory(chat, limit = 20) {
  const db = await getBotDb();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const result = await db.execute({
    sql: `SELECT role, content FROM bot_messages
          WHERE chat = ? AND created_at >= ?
          ORDER BY id DESC LIMIT ?`,
    args: [chat, since, limit],
  });
  return result.rows.reverse().map(r => ({ role: r.role, content: r.content }));
}

/** ¿Este es el último mensaje que mandó la clienta? (si mandó otro después, responde ese) */
export async function isLatestUserMessage(chat, waId) {
  const db = await getBotDb();
  const result = await db.execute({
    sql: "SELECT wa_id FROM bot_messages WHERE chat = ? AND role = 'user' ORDER BY id DESC LIMIT 1",
    args: [chat],
  });
  return result.rows[0]?.wa_id === waId;
}

/** ¿Ya le pedimos que escriba en vez de mandar audios en los últimos 30 minutos? */
export async function sentAudioNoticeRecently(chat) {
  const db = await getBotDb();
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const result = await db.execute({
    sql: `SELECT 1 FROM bot_messages
          WHERE chat = ? AND role = 'assistant' AND created_at >= ? AND content LIKE '%audio%'
          LIMIT 1`,
    args: [chat, since],
  });
  return result.rows.length > 0;
}

/**
 * Chats cuyo último mensaje es de la clienta (nadie le respondió todavía) y llegó
 * después de `sinceIso`. Devuelve, por chat, los mensajes sin responder.
 */
export async function getUnansweredChats(sinceIso) {
  const db = await getBotDb();
  const lastRows = await db.execute({
    sql: `SELECT m.chat, m.wa_id FROM bot_messages m
          WHERE m.id IN (SELECT MAX(id) FROM bot_messages GROUP BY chat)
            AND m.role = 'user' AND m.created_at >= ?
          ORDER BY m.id`,
    args: [sinceIso],
  });

  const chats = [];
  for (const row of lastRows.rows) {
    const lastAssistant = await db.execute({
      sql: "SELECT MAX(id) AS id FROM bot_messages WHERE chat = ? AND role = 'assistant'",
      args: [row.chat],
    });
    const msgs = await db.execute({
      sql: `SELECT content FROM bot_messages
            WHERE chat = ? AND role = 'user' AND id > ? AND created_at >= ?
            ORDER BY id`,
      args: [row.chat, lastAssistant.rows[0]?.id || 0, sinceIso],
    });
    chats.push({ chat: row.chat, lastWaId: row.wa_id, texts: msgs.rows.map(r => r.content) });
  }
  return chats;
}

export async function recordSentId(waId) {
  if (!waId) return;
  const db = await getBotDb();
  await db.execute({
    sql: 'INSERT OR IGNORE INTO bot_sent_ids (wa_id, created_at) VALUES (?, ?)',
    args: [waId, new Date().toISOString()],
  });
}

export async function wasSentBySystem(waId) {
  if (!waId) return false;
  const db = await getBotDb();
  const result = await db.execute({
    sql: 'SELECT 1 FROM bot_sent_ids WHERE wa_id = ?',
    args: [waId],
  });
  return result.rows.length > 0;
}

export async function pauseChat(chat, hours) {
  const db = await getBotDb();
  const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  await db.execute({
    sql: `INSERT INTO bot_chat_state (chat, paused_until) VALUES (?, ?)
          ON CONFLICT(chat) DO UPDATE SET paused_until = excluded.paused_until`,
    args: [chat, until],
  });
}

export async function resumeChat(chat) {
  const db = await getBotDb();
  await db.execute({
    sql: `INSERT INTO bot_chat_state (chat, paused_until, resumed_at) VALUES (?, NULL, ?)
          ON CONFLICT(chat) DO UPDATE SET paused_until = NULL, resumed_at = excluded.resumed_at`,
    args: [chat, new Date().toISOString()],
  });
}

export async function getResumedAt(chat) {
  const db = await getBotDb();
  const result = await db.execute({
    sql: 'SELECT resumed_at FROM bot_chat_state WHERE chat = ?',
    args: [chat],
  });
  return result.rows[0]?.resumed_at || null;
}

export async function getLidPhone(lid) {
  const db = await getBotDb();
  const result = await db.execute({ sql: 'SELECT phone FROM bot_lid_map WHERE lid = ?', args: [lid] });
  return result.rows[0]?.phone || null;
}

export async function saveLidPhone(lid, phone) {
  const db = await getBotDb();
  await db.execute({
    sql: `INSERT INTO bot_lid_map (lid, phone, created_at) VALUES (?, ?, ?)
          ON CONFLICT(lid) DO UPDATE SET phone = excluded.phone`,
    args: [lid, phone, new Date().toISOString()],
  });
}

/** Apagado a mano con "#bot off" (pausa de más de 30 días): ahí el bot no habla nunca. */
export async function isChatTurnedOff(chat) {
  const db = await getBotDb();
  const result = await db.execute({
    sql: 'SELECT paused_until FROM bot_chat_state WHERE chat = ?',
    args: [chat],
  });
  const until = result.rows[0]?.paused_until;
  return Boolean(until && until > new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString());
}

export async function isChatPaused(chat) {
  const db = await getBotDb();
  const result = await db.execute({
    sql: 'SELECT paused_until FROM bot_chat_state WHERE chat = ?',
    args: [chat],
  });
  const until = result.rows[0]?.paused_until;
  return Boolean(until && until > new Date().toISOString());
}
