import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vehicleId } = await params
    console.log('🔄 GET /api/vehicles/[id] - Iniciando...', vehicleId)
    
    // Obtener contexto del tenant
    const tenantContext = await getTenantContext(request)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = getSupabaseServiceClient()
    
    // Obtener vehículo específico (usar organization_id como en route.ts)
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
      .eq('id', vehicleId)
      .eq('organization_id', tenantContext.organizationId)
      .maybeSingle()

    if (error) {
      console.error('[Get Vehicle] ❌ Error obteniendo vehículo:', error)
      return NextResponse.json({ 
        success: false,
        error: error.message 
      }, { status: 500 })
    }

    if (!vehicle) {
      console.log('[Get Vehicle] ⚠️ Vehículo no encontrado:', vehicleId)
      return NextResponse.json({ 
        success: false,
        error: 'Vehículo no encontrado' 
      }, { status: 404 })
    }

    console.log('[Get Vehicle] ✅ Vehículo obtenido:', vehicle.id)
    return NextResponse.json({ 
      success: true,
      data: vehicle 
    })

  } catch (error: any) {
    console.error('💥 Error en GET /api/vehicles/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vehicleId } = await params
    console.log('🔄 PUT /api/vehicles/[id] - Iniciando...', vehicleId)
    
    // Obtener contexto del tenant
    const tenantContext = await getTenantContext(request)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    console.log('📝 Datos recibidos:', body)

    const supabase = getSupabaseServiceClient()
    
    // Actualizar vehículo (usar organization_id como en route.ts)
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
      .eq('id', vehicleId)
      .eq('organization_id', tenantContext.organizationId)
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vehicleId } = await params
    console.log('[Delete Vehicle] 🗑️ Eliminando vehículo:', vehicleId)
    
    // Obtener contexto del tenant
    const tenantContext = await getTenantContext(request)
    if (!tenantContext || !tenantContext.organizationId) {
      console.error('[Delete Vehicle] ❌ No autorizado o sin organizationId')
      return NextResponse.json({ 
        success: false,
        error: 'No autorizado' 
      }, { status: 401 })
    }

    console.log('[Delete Vehicle] 🏢 Organization ID:', tenantContext.organizationId)

    const supabase = getSupabaseServiceClient()
    
    // Verificar que el vehículo existe y pertenece a la organización (usar organization_id como en route.ts)
    const { data: vehicle, error: fetchError } = await supabase
      .from('vehicles')
      .select('id, organization_id')
      .eq('id', vehicleId)
      .eq('organization_id', tenantContext.organizationId)
      .maybeSingle()

    if (fetchError || !vehicle) {
      console.error('[Delete Vehicle] ❌ Vehículo no encontrado o no autorizado:', fetchError)
      return NextResponse.json({ 
        success: false,
        error: 'Vehículo no encontrado o no autorizado' 
      }, { status: 404 })
    }

    // Verificar si el vehículo tiene órdenes de trabajo
    const { data: orders, error: ordersError } = await supabase
      .from('work_orders')
      .select('id')
      .eq('vehicle_id', vehicleId)
      .limit(1)

    if (ordersError) {
      console.error('[Delete Vehicle] ❌ Error verificando órdenes:', ordersError)
      return NextResponse.json({ 
        success: false,
        error: ordersError.message 
      }, { status: 500 })
    }

    if (orders && orders.length > 0) {
      console.log('[Delete Vehicle] ⚠️ Vehículo tiene órdenes asociadas, no se puede eliminar')
      return NextResponse.json({ 
        success: false,
        error: 'No se puede eliminar el vehículo porque tiene órdenes de trabajo asociadas' 
      }, { status: 400 })
    }

    // Eliminar vehículo (usar organization_id como en route.ts)
    const { error: deleteError } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', vehicleId)
      .eq('organization_id', tenantContext.organizationId)

    if (deleteError) {
      console.error('[Delete Vehicle] ❌ Error eliminando vehículo:', deleteError)
      return NextResponse.json({ 
        success: false,
        error: deleteError.message || 'Error al eliminar vehículo'
      }, { status: 500 })
    }

    console.log('[Delete Vehicle] ✅ Vehículo eliminado exitosamente:', vehicleId)
    return NextResponse.json({ 
      success: true,
      message: 'Vehículo eliminado correctamente'
    })

  } catch (error: any) {
    console.error('💥 Error en DELETE /api/vehicles/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
