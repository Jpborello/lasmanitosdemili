import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';

// GET: Obtener todas las opiniones (para moderación)
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;

    if (!token || token !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = await getDb();
    const result = await db.execute({
      sql: `SELECT * FROM reviews 
            ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END, created_at DESC`,
      args: [],
    });

    return NextResponse.json({ reviews: result.rows });
  } catch (error) {
    console.error('Error in admin reviews GET:', error);
    return NextResponse.json({ error: 'Error al obtener opiniones' }, { status: 500 });
  }
}

// POST: Aprobar una opinión
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;

    if (!token || token !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Falta el ID de la opinión' }, { status: 400 });
    }

    const db = await getDb();
    await db.execute({
      sql: `UPDATE reviews SET status = 'approved' WHERE id = ?`,
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in admin reviews POST:', error);
    return NextResponse.json({ error: 'Error al aprobar opinión' }, { status: 500 });
  }
}

// DELETE: Eliminar una opinión (por spam o rechazo)
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Falta el ID de la opinión' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;

    if (!token || token !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = await getDb();
    await db.execute({
      sql: `DELETE FROM reviews WHERE id = ?`,
      args: [id],
    });

    return NextResponse.json({ success: true, message: 'Opinión eliminada' });
  } catch (error) {
    console.error('Error in admin reviews DELETE:', error);
    return NextResponse.json({ error: 'Error al eliminar opinión' }, { status: 500 });
  }
}
