import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const db = createClient({ url: env.DATABASE_URL, authToken: env.DATABASE_AUTH_TOKEN });

const clients = await db.execute('SELECT COUNT(*) as count FROM clients');
console.log('totalClients:', clients.rows[0]?.count);

const appts = await db.execute("SELECT COUNT(*) as count FROM appointments WHERE status = 'confirmed'");
console.log('totalAppointments (confirmed):', appts.rows[0]?.count);

const apptsAll = await db.execute("SELECT COUNT(*) as count FROM appointments");
console.log('totalAppointments (all):', apptsAll.rows[0]?.count);

const reviews = await db.execute("SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE status = 'approved'");
console.log('avgRating:', reviews.rows[0]?.avg_rating, 'reviewsCount:', reviews.rows[0]?.count);
