import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching services:', error)
      return NextResponse.json(
        { error: 'Error al obtener servicios' },
        { status: 500 }
      )
    }

    return NextResponse.json(services || [])
  } catch (error) {
    console.error('Error in GET /api/services:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

