import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔄 GET /api/customers/[id] - Iniciando...')
    
    // Obtener contexto del tenant
    const tenantContext = await getTenantContext()
    if (!tenantContext) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = await createClient()
    
    // Obtener cliente específico con sus vehículos
    const { data: customer, error } = await supabase
      .from('customers')
      .select(`
        *,
        vehicles (
          id,
          brand,
          model,
          year,
          license_plate,
          color,
          vin,
          mileage
        )
      `)
      .eq('id', params.id)
      .eq('organization_id', tenantContext.organizationId)
      .single()

    if (error) {
      console.error('❌ Error obteniendo cliente:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ Cliente obtenido:', customer.id)
    return NextResponse.json(customer)

  } catch (error: any) {
    console.error('💥 Error en GET /api/customers/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔄 PUT /api/customers/[id] - Iniciando...')
    
    // Obtener contexto del tenant
    const tenantContext = await getTenantContext()
    if (!tenantContext) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    console.log('📝 Datos recibidos:', body)

    const supabase = await createClient()
    
    // Actualizar cliente
    const { data: customer, error } = await supabase
      .from('customers')
      .update({
        name: body.name,
        email: body.email,
        phone: body.phone,
        address: body.address,
        notes: body.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('organization_id', tenantContext.organizationId)
      .select()
      .single()

    if (error) {
      console.error('❌ Error actualizando cliente:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ Cliente actualizado:', customer.id)
    return NextResponse.json(customer)

  } catch (error: any) {
    console.error('💥 Error en PUT /api/customers/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔄 DELETE /api/customers/[id] - Iniciando...')
    
    // Obtener contexto del tenant
    const tenantContext = await getTenantContext()
    if (!tenantContext) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = await createClient()
    
    // Verificar si el cliente tiene órdenes de trabajo
    const { data: orders, error: ordersError } = await supabase
      .from('work_orders')
      .select('id')
      .eq('customer_id', params.id)
      .limit(1)

    if (ordersError) {
      console.error('❌ Error verificando órdenes:', ordersError)
      return NextResponse.json({ error: ordersError.message }, { status: 500 })
    }

    if (orders && orders.length > 0) {
      return NextResponse.json({ 
        error: 'No se puede eliminar el cliente porque tiene órdenes de trabajo asociadas' 
      }, { status: 400 })
    }

    // Eliminar cliente
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', params.id)
      .eq('organization_id', tenantContext.organizationId)

    if (error) {
      console.error('❌ Error eliminando cliente:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ Cliente eliminado:', params.id)
    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('💥 Error en DELETE /api/customers/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}