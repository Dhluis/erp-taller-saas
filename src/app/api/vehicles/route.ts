import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select(`
        *,
        customer:customers!customer_id (
          id,
          name,
          email,
          phone
        )
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return NextResponse.json({ success: true, data: vehicles })
  } catch (error: any) {
    console.error('❌ API Error fetching vehicles:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .insert({
        customer_id: body.customer_id,
        brand: body.brand,
        model: body.model,
        year: body.year,
        license_plate: body.license_plate,
        vin: body.vin,
        color: body.color,
        mileage: body.mileage,
        workshop_id: body.workshop_id
      })
      .select(`
        *,
        customer:customers!customer_id (
          id,
          name,
          email,
          phone
        )
      `)
      .single()

    if (error) throw error

    return NextResponse.json(vehicle)
  } catch (error: any) {
    console.error('❌ Error creando vehículo:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}