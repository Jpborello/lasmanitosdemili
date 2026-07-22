import { createClient } from '@libsql/client';

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
        const defaultServices = [
          { id: 'semi_mani', category: 'manicura', name: 'Semipermanente', price: 14000, duration: '60 min' },
          { id: 'kapping', category: 'manicura', name: 'Kapping Poligel', price: 18000, duration: '90 min' },
          { id: 'soft_gel', category: 'manicura', name: 'Soft Gel', price: 19000, duration: '90 min' },
          { id: 'esculpidas', category: 'manicura', name: 'Esculpidas', price: 20000, duration: '120 min' },
          { id: 'retirado_mani', category: 'manicura', name: 'Retirado final', price: 5000, duration: '30 min' },
          { id: 'semi_pedi', category: 'pedicura', name: 'Semipermanente', price: 12000, duration: '60 min' },
          { id: 'pedi_completa', category: 'pedicura', name: 'Retirado de callos, grietas y piel muerta + hidratación', price: 15000, duration: '75 min' },
          { id: 'pedi_completa_semi', category: 'pedicura', name: 'Retirado de callos, grietas y piel muerta + hidratación + semi', price: 20000, duration: '100 min' }
        ];

        for (const s of defaultServices) {
          await db.execute({
            sql: `INSERT INTO services (id, category, name, price, duration)
                  VALUES (?, ?, ?, ?, ?)`,
            args: [s.id, s.category, s.name, s.price, s.duration]
          });
        }
      }

      initialized = true;
    } catch (error) {
      console.error('Error al inicializar la base de datos:', error);
    }
  }
  return db;
}
