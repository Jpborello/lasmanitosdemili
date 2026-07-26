import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, phone, email } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (nombre y teléfono)' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) {
      return NextResponse.json({ error: 'Número de teléfono inválido' }, { status: 400 });
    }

    const db = await getDb();
    const createdAt = new Date().toISOString();

    // Registrar o actualizar datos de la clienta (UPSERT)
    await db.execute({
      sql: `INSERT INTO clients (phone, name, email, created_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(phone) DO UPDATE SET
              name = excluded.name,
              email = COALESCE(excluded.email, clients.email)
            `,
      args: [cleanPhone, name.trim(), email ? email.trim() : null, createdAt],
    });

    return NextResponse.json({ success: true, message: 'Clienta registrada exitosamente' });
  } catch (error) {
    console.error('Error in clients POST:', error);
    return NextResponse.json({ error: 'Error al registrar la clienta' }, { status: 500 });
  }
}
