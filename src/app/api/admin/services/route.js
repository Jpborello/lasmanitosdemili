import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';

// GET: Obtener todos los servicios y sus precios
export async function GET() {
  try {
    const db = await getDb();
    const result = await db.execute('SELECT * FROM services');
    return NextResponse.json({ services: result.rows });
  } catch (error) {
    console.error('Error in services GET:', error);
    return NextResponse.json({ error: 'Error al obtener servicios' }, { status: 500 });
  }
}

// POST: Actualizar precios de servicios (requiere ser admin)
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;

    if (!token || token !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { prices } = body; // Array de objetos { id, price }

    if (!prices || !Array.isArray(prices)) {
      return NextResponse.json({ error: 'Formato de precios inválido' }, { status: 400 });
    }

    const db = await getDb();

    // Actualizar cada precio en una transacción o bucle secuencial
    for (const item of prices) {
      const { id, price } = item;
      const parsedPrice = parseInt(price, 10);
      
      if (!id || isNaN(parsedPrice) || parsedPrice < 0) {
        continue; // Ignorar registros inválidos
      }

      await db.execute({
        sql: 'UPDATE services SET price = ? WHERE id = ?',
        args: [parsedPrice, id],
      });
    }

    return NextResponse.json({ success: true, message: 'Precios actualizados exitosamente' });
  } catch (error) {
    console.error('Error in services POST:', error);
    return NextResponse.json({ error: 'Error al actualizar precios' }, { status: 500 });
  }
}
