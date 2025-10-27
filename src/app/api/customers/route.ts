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
    
    console.log('🔄 Intentando crear cliente:', body)
    
    // Obtener el usuario actual
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('❌ No hay usuario autenticado')
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    
    console.log('✅ Usuario autenticado:', user.id)
    
    // Obtener el perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('organization_id, workshop_id')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile) {
      console.error('❌ Error obteniendo perfil:', profileError)
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }
    
    console.log('✅ Perfil encontrado:', profile)
    
    // Crear el cliente
    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        name: body.name,
        email: body.email,
        phone: body.phone,
        address: body.address,
        notes: body.notes,
        organization_id: profile.organization_id,
        workshop_id: profile.workshop_id
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error en insert:', error)
      throw error
    }

    console.log('✅ Cliente creado exitosamente:', customer.id)
    return NextResponse.json(customer)
  } catch (error: any) {
    console.error('💥 Error creando cliente:', error.message, error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
