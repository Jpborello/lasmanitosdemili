import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET: Autocompletar datos por celular
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({ error: 'Falta número de teléfono' }, { status: 400 });
    }

    const db = await getDb();
    
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Buscar la última cita creada por este número de teléfono (normalizando para ignorar espacios, guiones, etc.)
    const result = await db.execute({
      sql: `SELECT client_name, client_email 
            FROM appointments 
            WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(client_phone, ' ', ''), '-', ''), '+', ''), '(', ''), ')', '') = ? 
            ORDER BY created_at DESC 
            LIMIT 1`,
      args: [cleanPhone],
    });

    if (result.rows.length > 0) {
      const client = result.rows[0];
      return NextResponse.json({ 
        found: true,
        client_name: client.client_name,
        client_email: client.client_email || ''
      });
    }

    return NextResponse.json({ found: false });
  } catch (error) {
    console.error('Error in autocomplete GET:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
