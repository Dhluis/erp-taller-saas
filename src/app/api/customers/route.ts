import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return NextResponse.json({ success: true, data: customers })
  } catch (error: any) {
    console.error('❌ API Error fetching customers:', error)
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
    
    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        name: body.name,
        email: body.email,
        phone: body.phone,
        address: body.address,
        notes: body.notes,
        organization_id: body.organization_id,
        workshop_id: body.workshop_id
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(customer)
  } catch (error: any) {
    console.error('❌ Error creando cliente:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
