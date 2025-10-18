import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching customers:', error)
      return NextResponse.json(
        { error: 'Error al obtener clientes' },
        { status: 500 }
      )
    }

    return NextResponse.json(customers || [])
  } catch (error) {
    console.error('Error in GET /api/customers:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

