import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getOrganizationId } from '@/lib/auth/organization-server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 GET /api/customers - Iniciando...')
    
    // ✅ USAR HELPER CENTRALIZADO - igual que órdenes y citas
    const organizationId = await getOrganizationId()
    console.log('✅ [GET /api/customers] Organization ID:', organizationId)

    const supabase = await getSupabaseServerClient()
    
    // Obtener todos los clientes de la organización
    const { data: customers, error } = await supabase
      .from('customers')
      .select(`
        *,
        vehicles (
          id,
          brand,
          model,
          year,
          license_plate,
          color
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error obteniendo clientes:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    console.log('✅ Clientes obtenidos:', customers?.length || 0)
    
    // ✅ DEVOLVER EN EL FORMATO CORRECTO
    return NextResponse.json({ 
      success: true, 
      data: customers || [] 
    })

  } catch (error: any) {
    console.error('💥 Error en GET /api/customers:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 POST /api/customers - Iniciando...')
    
    // ✅ USAR HELPER CENTRALIZADO - igual que órdenes y citas
    const organizationId = await getOrganizationId()
    console.log('✅ [POST /api/customers] Organization ID:', organizationId)

    const body = await request.json()
    console.log('📝 Datos recibidos:', body)

    const supabase = await getSupabaseServerClient()
    
    // ✅ Obtener workshop_id del usuario autenticado
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'No autorizado' 
      }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('workshop_id')
      .eq('auth_user_id', user.id)
      .single()

    const workshopId = userData?.workshop_id || null
    
    // Crear nuevo cliente
    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        organization_id: organizationId,
        workshop_id: workshopId,
        name: body.name,
        email: body.email,
        phone: body.phone,
        address: body.address,
        notes: body.notes
      } as any)
      .select()
      .single()

    if (error) {
      console.error('❌ Error creando cliente:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    if (!customer) {
      return NextResponse.json({ 
        success: false, 
        error: 'No se pudo crear el cliente' 
      }, { status: 500 })
    }

    const customerData = customer as any
    console.log('✅ Cliente creado:', customerData.id)
    
    // ✅ DEVOLVER EN EL FORMATO CORRECTO
    return NextResponse.json({ 
      success: true, 
      data: customer 
    })
    
  } catch (error: any) {
    console.error('💥 Error en POST /api/customers:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
