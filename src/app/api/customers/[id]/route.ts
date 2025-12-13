import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'
import { hasPermission, UserRole } from '@/lib/auth/permissions'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔄 GET /api/customers/[id] - Iniciando...')
    
    // Obtener contexto del tenant
    const tenantContext = await getTenantContext(request)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = await createClient()
    
    // Obtener cliente específico con sus vehículos
    const { data: customer, error } = await (supabase as any)
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

    if (!customer) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
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
    const tenantContext = await getTenantContext(request)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    console.log('📝 Datos recibidos:', body)

    // ✅ VALIDACIÓN CRÍTICA: Prevenir cambio de organization_id
    if (body.organization_id && body.organization_id !== tenantContext.organizationId) {
      console.error('❌ [PUT /api/customers/[id]] Intento de cambiar organization_id:', {
        user_org: tenantContext.organizationId,
        body_org: body.organization_id
      });
      return NextResponse.json({ 
        error: 'No se puede cambiar la organización del cliente. El organization_id no puede modificarse.' 
      }, { status: 403 });
    }

    // ✅ REMOVER organization_id del body (no debe modificarse)
    delete body.organization_id;

    const supabase = await createClient()
    
    // Actualizar cliente
    const { data: customer, error } = await (supabase as any)
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

    if (!customer) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
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
    const tenantContext = await getTenantContext(request)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = await createClient()
    
    // ✅ VALIDACIÓN: Obtener rol del usuario actual
    const { data: currentUser, error: userError } = await (supabase as any)
      .from('users')
      .select('role')
      .eq('auth_user_id', tenantContext.userId)
      .single()
    
    if (userError || !currentUser || !currentUser.role) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }
    
    // ✅ VALIDACIÓN: Verificar permisos para eliminar
    const currentUserRole = currentUser.role as UserRole;
    if (!hasPermission(currentUserRole, 'customers', 'delete')) {
      return NextResponse.json({ 
        error: 'No tienes permisos para eliminar clientes' 
      }, { status: 403 })
    }
    
    // ✅ VALIDACIÓN: Si es asesor, verificar que no tenga órdenes activas
    if (currentUserRole === 'ASESOR') {
      const { data: activeOrders, error: ordersError } = await supabase
        .from('work_orders')
        .select('id, status')
        .eq('customer_id', params.id)
        .eq('organization_id', tenantContext.organizationId)
        .not('status', 'in', '("completed","cancelled")')

      if (ordersError) {
        console.error('❌ Error verificando órdenes activas:', ordersError)
        return NextResponse.json({ error: ordersError.message }, { status: 500 })
      }

      if (activeOrders && activeOrders.length > 0) {
        return NextResponse.json({ 
          error: 'No se puede eliminar el cliente porque tiene órdenes de trabajo activas. Solo se pueden eliminar clientes con órdenes completadas o canceladas.' 
        }, { status: 400 })
      }
    }
    
    // Verificar si el cliente tiene órdenes de trabajo (admin puede eliminarlo siempre)
    const { data: orders, error: ordersError } = await supabase
      .from('work_orders')
      .select('id')
      .eq('customer_id', params.id)
      .eq('organization_id', tenantContext.organizationId) // ✅ CRÍTICO: Filtro multitenant
      .limit(1)

    if (ordersError) {
      console.error('❌ Error verificando órdenes:', ordersError)
      return NextResponse.json({ error: ordersError.message }, { status: 500 })
    }

    // Admin puede eliminar incluso con órdenes (ya que se validó arriba si es advisor)
    // Esta verificación adicional es para advertir al admin
    if (orders && orders.length > 0 && currentUserRole === 'ADMIN') {
      console.warn('⚠️ Admin eliminando cliente con órdenes asociadas')
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