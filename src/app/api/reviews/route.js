import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';

// GET: Obtener opiniones aprobadas para mostrar en la home
export async function GET() {
  try {
    const db = await getDb();
    const result = await db.execute({
      sql: `SELECT * FROM reviews 
            WHERE status = 'approved' 
            ORDER BY created_at DESC`,
      args: [],
    });

    return NextResponse.json({ reviews: result.rows });
  } catch (error) {
    console.error('Error in reviews GET:', error);
    return NextResponse.json({ error: 'Error al obtener opiniones' }, { status: 500 });
  }
}

// POST: Crear una nueva opinión (entra como pendiente de aprobación)
export async function POST(request) {
  try {
    const body = await request.json();
    const { client_name, comment, rating } = body;

    if (!client_name || !comment || !rating) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const ratingVal = parseInt(rating, 10);
    if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
      return NextResponse.json({ error: 'La calificación debe ser entre 1 y 5 estrellas' }, { status: 400 });
    }

    const db = await getDb();
    const id = crypto.randomUUID();
    const created_at = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO reviews (id, client_name, comment, rating, status, created_at)
            VALUES (?, ?, ?, ?, 'pending', ?)`,
      args: [id, client_name, comment, ratingVal, created_at],
    });

    return NextResponse.json({ success: true, message: 'Tu opinión fue enviada y está en moderación.' });
  } catch (error) {
    console.error('Error in reviews POST:', error);
    return NextResponse.json({ error: 'Error al enviar opinión' }, { status: 500 });
  }
}
