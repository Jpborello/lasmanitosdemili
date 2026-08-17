import { createClient } from '@libsql/client';
import { DEFAULT_SERVICES } from './constants';

const url = process.env.DATABASE_URL || 'file:local.db';
const authToken = process.env.DATABASE_AUTH_TOKEN;

// Crear cliente de libSQL (SQLite / Turso)
export const db = createClient({
  url,
  authToken,
});

let initialized = false;

// Obtener cliente inicializado asegurando que las tablas existen
export async function getDb() {
  if (!initialized) {
    try {
      // Crear tabla de appointments
      await db.execute(`
        CREATE TABLE IF NOT EXISTS appointments (
          id TEXT PRIMARY KEY,
          client_name TEXT NOT NULL,
          client_phone TEXT NOT NULL,
          client_email TEXT,
          appointment_date TEXT NOT NULL,
          appointment_time TEXT NOT NULL,
          service TEXT NOT NULL,
          price INTEGER DEFAULT 0,
          created_at TEXT NOT NULL
        )
      `);

      // Intentar agregar la columna price en caso de que la tabla ya existiese sin ella
      try {
        await db.execute(`
          ALTER TABLE appointments ADD COLUMN price INTEGER DEFAULT 0
        `);

        // Rellenar datos huérfanos con precios estimados para las pruebas previas
        await db.execute(`
          UPDATE appointments
          SET price = CASE
            WHEN service = 'semi' THEN 8000
            WHEN service = 'kapping' THEN 10000
            WHEN service = 'esculpidas' THEN 12000
            ELSE 2000
          END
          WHERE price = 0 OR price IS NULL
        `);
      } catch (colError) {
        // La columna ya existía, ignoramos el error
      }

      // Intentar agregar la columna status en caso de que la tabla ya existiese sin ella
      try {
        await db.execute(`
          ALTER TABLE appointments ADD COLUMN status TEXT DEFAULT 'confirmed'
        `);
      } catch (statusError) {
        // La columna ya existía, ignoramos el error
      }

      // Crear tabla de settings
      await db.execute(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);

      // Insertar configuración por defecto para habilitar el turno de las 18:00
      await db.execute(`
        INSERT OR IGNORE INTO settings (key, value) VALUES ('enable_18_weekday', 'true')
      `);

      // Insertar configuraciones por defecto de Mercado Pago
      await db.execute(`
        INSERT OR IGNORE INTO settings (key, value) VALUES ('mp_enabled', 'false')
      `);
      await db.execute(`
        INSERT OR IGNORE INTO settings (key, value) VALUES ('mp_access_token', '')
      `);
      await db.execute(`
        INSERT OR IGNORE INTO settings (key, value) VALUES ('mp_public_key', '')
      `);
      await db.execute(`
        INSERT OR IGNORE INTO settings (key, value) VALUES ('mp_deposit_amount', '2000')
      `);

      // Horarios extra: turnos puntuales habilitados fuera del horario fijo (formato fecha_hora)
      await db.execute(`
        INSERT OR IGNORE INTO settings (key, value) VALUES ('extra_slots', '')
      `);

      // Crear tabla de reviews
      await db.execute(`
        CREATE TABLE IF NOT EXISTS reviews (
          id TEXT PRIMARY KEY,
          client_name TEXT NOT NULL,
          comment TEXT NOT NULL,
          rating INTEGER NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `);

      // Insertar opiniones aprobadas por defecto si la tabla está vacía
      const reviewsCount = await db.execute('SELECT COUNT(*) as count FROM reviews');
      if (reviewsCount.rows[0]?.count === 0) {
        const mockReviews = [
          {
            id: 'mock-rev-1',
            client_name: 'Florencia G.',
            comment: 'Mili es super detallista y profesional. Me hice kapping y las uñas me duraron intactas casi un mes. El estudio es hermoso y super limpio. ¡Recomendada al 100%!',
            rating: 5,
            status: 'approved',
            created_at: new Date().toISOString()
          },
          {
            id: 'mock-rev-2',
            client_name: 'Valentina M.',
            comment: 'Excelente atención y muy buena onda. El sistema de turnos es comodísimo para agendar a cualquier hora. Mis esculpidas quedaron soñadas.',
            rating: 5,
            status: 'approved',
            created_at: new Date().toISOString()
          },
          {
            id: 'mock-rev-3',
            client_name: 'Camila T.',
            comment: 'La mejor manicura que he tenido. Realmente se nota cuando a alguien le apasiona su trabajo. Los diseños a mano alzada que hace son obras de arte.',
            rating: 5,
            status: 'approved',
            created_at: new Date().toISOString()
          }
        ];

        for (const rev of mockReviews) {
          await db.execute({
            sql: `INSERT INTO reviews (id, client_name, comment, rating, status, created_at)
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [rev.id, rev.client_name, rev.comment, rev.rating, rev.status, rev.created_at]
          });
        }
      }

      // Crear tabla de services
      await db.execute(`
        CREATE TABLE IF NOT EXISTS services (
          id TEXT PRIMARY KEY,
          category TEXT NOT NULL,
          name TEXT NOT NULL,
          price INTEGER NOT NULL,
          duration TEXT NOT NULL
        )
      `);

      // Semillar servicios por defecto si la tabla está vacía
      const servicesCount = await db.execute('SELECT COUNT(*) as count FROM services');
      if (servicesCount.rows[0]?.count === 0) {
        for (const s of DEFAULT_SERVICES) {
          await db.execute({
            sql: `INSERT INTO services (id, category, name, price, duration)
                  VALUES (?, ?, ?, ?, ?)`,
            args: [s.id, s.category, s.name, s.price, s.duration]
          });
        }
      }

      // Crear tabla de clients
      await db.execute(`
        CREATE TABLE IF NOT EXISTS clients (
          phone TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT,
          created_at TEXT NOT NULL,
          trust_status TEXT NOT NULL DEFAULT 'trusted'
        )
      `);

      // Intentar agregar la columna trust_status en caso de que la tabla ya existiese sin ella
      // Valores posibles: 'trusted' (confiable, sin restricciones), 'restricted' (debe pagar
      // seña y esperar aprobación de Mili) y 'blocked' (no puede reservar online, reincidente).
      try {
        await db.execute(`
          ALTER TABLE clients ADD COLUMN trust_status TEXT NOT NULL DEFAULT 'trusted'
        `);
      } catch (trustStatusError) {
        // La columna ya existía, ignoramos el error
      }

      // Insertar configuración por defecto de seña para clientas restringidas
      await db.execute(`
        INSERT OR IGNORE INTO settings (key, value) VALUES ('restricted_deposit_amount', '5000')
      `);
      await db.execute(`
        INSERT OR IGNORE INTO settings (key, value) VALUES ('deposit_payment_instructions', 'Alias para transferencia: lasmanitosdemili')
      `);

      // Migrar clientas de turnos existentes
      try {
        await db.execute(`
          INSERT OR IGNORE INTO clients (phone, name, email, created_at)
          SELECT client_phone, client_name, MAX(client_email) as client_email, MIN(created_at) as created_at
          FROM appointments
          GROUP BY client_phone
        `);
      } catch (migrationError) {
        console.error('Error al migrar clientas existentes:', migrationError);
      }

      // Crear índice UNIQUE en appointments para evitar reservas duplicadas simultáneas
      try {
        await db.execute(`
          CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(appointment_date, appointment_time)
        `);
      } catch (indexError) {
        console.error('Error al crear índice UNIQUE de turnos:', indexError);
      }

      // Crear tabla de sesiones de administrador (tokens aleatorios, no derivados de la contraseña)
      await db.execute(`
        CREATE TABLE IF NOT EXISTS admin_sessions (
          token_hash TEXT PRIMARY KEY,
          created_at TEXT NOT NULL,
          expires_at TEXT NOT NULL
        )
      `);

      // Crear tabla de intentos de login fallidos (rate limiting por IP)
      await db.execute(`
        CREATE TABLE IF NOT EXISTS login_attempts (
          identifier TEXT PRIMARY KEY,
          attempts INTEGER NOT NULL DEFAULT 0,
          first_attempt_at TEXT NOT NULL,
          locked_until TEXT
        )
      `);

      initialized = true;
    } catch (error) {
      console.error('Error al inicializar la base de datos:', error);
    }
  }
  return db;
}
