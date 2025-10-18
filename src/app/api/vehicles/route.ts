import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 GET /api/vehicles - Iniciando...')
    
    // Obtener contexto del tenant
    const tenantContext = await getTenantContext()
    if (!tenantContext) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = await createClient()
    
    // Obtener todos los vehículos de la organización
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
      .eq('workshop_id', tenantContext.workshopId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error obteniendo vehículos:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ Vehículos obtenidos:', vehicles?.length || 0)
    return NextResponse.json(vehicles || [])

  } catch (error: any) {
    console.error('💥 Error en GET /api/vehicles:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 POST /api/vehicles - Iniciando...')
    
    // Obtener contexto del tenant
    const tenantContext = await getTenantContext()
    if (!tenantContext) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    console.log('📝 Datos recibidos:', body)

    // Validar que el cliente existe y pertenece a la organización
    const supabase = await createClient()
    
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', body.customer_id)
      .eq('organization_id', tenantContext.organizationId)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Cliente no válido' }, { status: 400 })
    }
    
    // Crear nuevo vehículo
    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .insert({
        customer_id: body.customer_id,
        workshop_id: tenantContext.workshopId,
        brand: body.brand,
        model: body.model,
        year: body.year,
        license_plate: body.license_plate,
        vin: body.vin,
        color: body.color,
        mileage: body.mileage
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

    if (error) {
      console.error('❌ Error creando vehículo:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ Vehículo creado:', vehicle.id)
    return NextResponse.json(vehicle)

  } catch (error: any) {
    console.error('💥 Error en POST /api/vehicles:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}