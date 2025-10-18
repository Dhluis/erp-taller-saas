import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔄 GET /api/vehicles/[id] - Iniciando...')
    
    // Obtener contexto del tenant
    const tenantContext = await getTenantContext()
    if (!tenantContext) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = await createClient()
    
    // Obtener vehículo específico
    const { data: vehicle, error } = await supabase
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
      .eq('id', params.id)
      .eq('workshop_id', tenantContext.workshopId)
      .single()

    if (error) {
      console.error('❌ Error obteniendo vehículo:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ Vehículo obtenido:', vehicle.id)
    return NextResponse.json(vehicle)

  } catch (error: any) {
    console.error('💥 Error en GET /api/vehicles/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔄 PUT /api/vehicles/[id] - Iniciando...')
    
    // Obtener contexto del tenant
    const tenantContext = await getTenantContext()
    if (!tenantContext) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    console.log('📝 Datos recibidos:', body)

    const supabase = await createClient()
    
    // Actualizar vehículo
    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .update({
        brand: body.brand,
        model: body.model,
        year: body.year,
        license_plate: body.license_plate,
        vin: body.vin,
        color: body.color,
        mileage: body.mileage,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('workshop_id', tenantContext.workshopId)
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
      console.error('❌ Error actualizando vehículo:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ Vehículo actualizado:', vehicle.id)
    return NextResponse.json(vehicle)

  } catch (error: any) {
    console.error('💥 Error en PUT /api/vehicles/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔄 DELETE /api/vehicles/[id] - Iniciando...')
    
    // Obtener contexto del tenant
    const tenantContext = await getTenantContext()
    if (!tenantContext) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = await createClient()
    
    // Verificar si el vehículo tiene órdenes de trabajo
    const { data: orders, error: ordersError } = await supabase
      .from('work_orders')
      .select('id')
      .eq('vehicle_id', params.id)
      .limit(1)

    if (ordersError) {
      console.error('❌ Error verificando órdenes:', ordersError)
      return NextResponse.json({ error: ordersError.message }, { status: 500 })
    }

    if (orders && orders.length > 0) {
      return NextResponse.json({ 
        error: 'No se puede eliminar el vehículo porque tiene órdenes de trabajo asociadas' 
      }, { status: 400 })
    }

    // Eliminar vehículo
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', params.id)
      .eq('workshop_id', tenantContext.workshopId)

    if (error) {
      console.error('❌ Error eliminando vehículo:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ Vehículo eliminado:', params.id)
    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('💥 Error en DELETE /api/vehicles/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}