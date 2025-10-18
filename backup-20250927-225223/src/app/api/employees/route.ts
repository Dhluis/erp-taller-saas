import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: employees, error } = await supabase
      .from('employees')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching employees:', error)
      return NextResponse.json(
        { error: 'Error al obtener empleados' },
        { status: 500 }
      )
    }

    return NextResponse.json(employees || [])
  } catch (error) {
    console.error('Error in GET /api/employees:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

