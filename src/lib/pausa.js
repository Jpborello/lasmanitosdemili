import { getDb } from './db';

// Estado de "web en pausa" que Mili prende/apaga desde el admin.
// Si la base no responde, la web sigue funcionando normal (nunca la dejamos caída por esto).
export async function getPausaState() {
  try {
    const db = await getDb();
    const result = await db.execute(
      "SELECT key, value FROM settings WHERE key IN ('maintenance_enabled', 'maintenance_return')"
    );
    const state = { enabled: false, returnText: '' };
    for (const row of result.rows) {
      if (row.key === 'maintenance_enabled') state.enabled = row.value === 'true';
      if (row.key === 'maintenance_return') state.returnText = row.value || '';
    }
    return state;
  } catch (error) {
    console.error('Error leyendo estado de pausa:', error);
    return { enabled: false, returnText: '' };
  }
}
