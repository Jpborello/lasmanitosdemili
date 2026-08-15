import crypto from 'crypto';
import { getDb } from './db';

// Duración de la sesión de administrador
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 días

// Rate limiting de intentos de login fallidos
const LOGIN_ATTEMPT_WINDOW_MS = 1000 * 60 * 15; // Ventana de 15 minutos
const LOGIN_MAX_ATTEMPTS = 5; // Intentos permitidos dentro de la ventana
const LOGIN_LOCKOUT_MS = 1000 * 60 * 15; // Bloqueo de 15 minutos al superar el límite

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Obtiene un identificador razonable del cliente (IP) para el rate limiting.
 * En Vercel/proxies, la IP real viene en x-forwarded-for.
 */
export function getClientIdentifier(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Verifica si el identificador dado puede intentar loguearse ahora mismo,
 * o si está temporalmente bloqueado por demasiados intentos fallidos.
 */
export async function checkLoginAllowed(identifier) {
  const db = await getDb();
  const now = Date.now();

  const result = await db.execute({
    sql: 'SELECT locked_until FROM login_attempts WHERE identifier = ?',
    args: [identifier],
  });

  if (result.rows.length === 0) return { allowed: true };

  const lockedUntil = result.rows[0].locked_until ? Number(result.rows[0].locked_until) : null;
  if (lockedUntil && lockedUntil > now) {
    return { allowed: false, retryAfterSeconds: Math.ceil((lockedUntil - now) / 1000) };
  }

  return { allowed: true };
}

/**
 * Registra un intento de login fallido para el identificador dado.
 * Si supera LOGIN_MAX_ATTEMPTS dentro de la ventana, bloquea por LOGIN_LOCKOUT_MS.
 */
export async function recordFailedLogin(identifier) {
  const db = await getDb();
  const now = Date.now();

  // Asegurar que exista una fila para este identificador antes de leerla
  // (INSERT OR IGNORE evita el error de clave duplicada si dos intentos
  // fallidos llegan casi al mismo tiempo para el mismo identificador).
  await db.execute({
    sql: 'INSERT OR IGNORE INTO login_attempts (identifier, attempts, first_attempt_at, locked_until) VALUES (?, 0, ?, NULL)',
    args: [identifier, String(now)],
  });

  const result = await db.execute({
    sql: 'SELECT attempts, first_attempt_at FROM login_attempts WHERE identifier = ?',
    args: [identifier],
  });

  const row = result.rows[0];
  const firstAttemptAt = Number(row.first_attempt_at);
  const windowExpired = (now - firstAttemptAt) > LOGIN_ATTEMPT_WINDOW_MS;

  if (windowExpired) {
    // La ventana anterior ya venció: reiniciamos el conteo
    await db.execute({
      sql: 'UPDATE login_attempts SET attempts = 1, first_attempt_at = ?, locked_until = NULL WHERE identifier = ?',
      args: [String(now), identifier],
    });
    return;
  }

  const newAttempts = Number(row.attempts) + 1;
  const lockedUntil = newAttempts >= LOGIN_MAX_ATTEMPTS ? String(now + LOGIN_LOCKOUT_MS) : null;

  await db.execute({
    sql: 'UPDATE login_attempts SET attempts = ?, locked_until = ? WHERE identifier = ?',
    args: [newAttempts, lockedUntil, identifier],
  });
}

/**
 * Limpia los intentos fallidos registrados para el identificador dado
 * (se llama tras un login exitoso).
 */
export async function clearLoginAttempts(identifier) {
  const db = await getDb();
  await db.execute({
    sql: 'DELETE FROM login_attempts WHERE identifier = ?',
    args: [identifier],
  });
}

/**
 * Crea una nueva sesión de administrador: genera un token aleatorio (no derivado
 * de la contraseña), guarda su hash en la base de datos con expiración, y devuelve
 * el token en texto plano para setear en la cookie.
 */
export async function createAdminSession() {
  const db = await getDb();
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const now = Date.now();
  const expiresAt = now + SESSION_DURATION_MS;

  await db.execute({
    sql: 'INSERT INTO admin_sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)',
    args: [tokenHash, String(now), String(expiresAt)],
  });

  // Limpieza oportunista de sesiones vencidas (no bloqueante)
  db.execute({
    sql: 'DELETE FROM admin_sessions WHERE expires_at <= ?',
    args: [String(now)],
  }).catch((err) => console.error('Error limpiando sesiones vencidas:', err));

  return { token, maxAgeSeconds: Math.floor(SESSION_DURATION_MS / 1000) };
}

/**
 * Verifica si un token de sesión (el valor crudo de la cookie) es válido y no expiró.
 */
export async function verifyAdminSession(token) {
  if (!token) return false;

  const db = await getDb();
  const tokenHash = hashToken(token);

  const result = await db.execute({
    sql: 'SELECT expires_at FROM admin_sessions WHERE token_hash = ?',
    args: [tokenHash],
  });

  if (result.rows.length === 0) return false;

  const expiresAt = Number(result.rows[0].expires_at);
  if (expiresAt <= Date.now()) {
    db.execute({
      sql: 'DELETE FROM admin_sessions WHERE token_hash = ?',
      args: [tokenHash],
    }).catch((err) => console.error('Error eliminando sesión vencida:', err));
    return false;
  }

  return true;
}

/**
 * Revoca (invalida) una sesión de administrador, por ejemplo al cerrar sesión.
 */
export async function revokeAdminSession(token) {
  if (!token) return;
  const db = await getDb();
  const tokenHash = hashToken(token);
  await db.execute({
    sql: 'DELETE FROM admin_sessions WHERE token_hash = ?',
    args: [tokenHash],
  });
}

/**
 * Helper de conveniencia para las rutas API: recibe el cookieStore de Next.js
 * (resultado de `await cookies()`) y devuelve si la request está autenticada como admin.
 */
export async function isAdminAuthenticated(cookieStore) {
  const token = cookieStore.get('admin_token')?.value;
  return await verifyAdminSession(token);
}
