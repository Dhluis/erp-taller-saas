import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: inventory, error } = await supabase
      .from('inventory')
      .select('*')
      .gt('quantity', 0) // Solo items con stock disponible
      .order('name')

    if (error) {
      console.error('Error fetching inventory:', error)
      return NextResponse.json(
        { error: 'Error al obtener inventario' },
        { status: 500 }
      )
    }

    return NextResponse.json(inventory || [])
  } catch (error) {
    console.error('Error in GET /api/inventory:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

