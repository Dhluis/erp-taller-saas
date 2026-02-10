import { NextRequest, NextResponse } from 'next/server'
import { getAllWorkOrders, createWorkOrder } from '@/lib/database/queries/work-orders'
import { getTenantContext } from '@/lib/core/multi-tenant-server'
import { checkResourceLimit } from '@/lib/billing/check-limits'
import { createClientFromRequest } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // ✅ Obtener organizationId SOLO del usuario autenticado
    const tenantContext = await getTenantContext(request)
    if (!tenantContext || !tenantContext.organizationId) {
      return NextResponse.json(
        { error: 'No autorizado: organización no encontrada' },
        { status: 403 }
      )
    }
    const organizationId = tenantContext.organizationId

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const customerId = searchParams.get('customer_id')
    const vehicleId = searchParams.get('vehicle_id')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    const filters: any = {}
    if (status) filters.status = status
    if (customerId) filters.customer_id = customerId
    if (vehicleId) filters.vehicle_id = vehicleId
    if (dateFrom) filters.date_from = dateFrom
    if (dateTo) filters.date_to = dateTo

    const orders = await getAllWorkOrders(organizationId, filters)
    return NextResponse.json(orders)
  } catch (error) {
    console.error('Error in GET /api/orders:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // ✅ Obtener usuario autenticado para verificar límites
    const supabase = createClientFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // ✅ VERIFICAR LÍMITES ANTES DE CREAR
    const limitCheck = await checkResourceLimit(user.id, 'work_order')
    
    if (!limitCheck.canCreate) {
      return NextResponse.json(
        { 
          error: limitCheck.error?.message || 'Límite de órdenes alcanzado',
          limit_reached: true,
          current: limitCheck.current,
          limit: limitCheck.limit,
          upgrade_url: limitCheck.error?.upgrade_url || '/settings/billing'
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const order = await createWorkOrder(body)
    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/orders:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}


