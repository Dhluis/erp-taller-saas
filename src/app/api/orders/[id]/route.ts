import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'
import { updateWorkOrder, updateWorkOrderStatus, deleteWorkOrder } from '@/lib/database/queries/work-orders'
// ✅ Usar versión SERVIDOR (API route)
import { getOrganizationId } from '@/lib/auth/organization-server'
import type { WorkOrder } from '@/types/orders'

const supabase = getSupabaseServiceClient()

// GET /api/orders/[id] - Obtener detalles de una orden
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const organizationId = await getOrganizationId(request);
    
    const { data, error } = await supabase
      .from('work_orders')
      .select(`
        *,
        customer:customers(*),
        vehicle:vehicles(*),
        order_items(*)
      `)
      .eq('id', params.id)
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Orden no encontrada' },
          { status: 404 }
        )
      }
      throw error
    }

    const order = data as WorkOrder | null

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: order })
  } catch (error) {
    console.error('Error in GET /api/orders/[id]:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PATCH /api/orders/[id] - Actualizar una orden
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    console.log('🔄 [PATCH /api/orders/[id]] Actualizando orden:', params.id)
    console.log('🔄 [PATCH /api/orders/[id]] Datos recibidos:', body)
    
    // Si solo se está actualizando el status, usar función específica
    if (body.status && Object.keys(body).length === 1) {
      const order = await updateWorkOrderStatus(params.id, body.status)
      return NextResponse.json({ success: true, data: order })
    }
    
    // Actualización completa
    const order = await updateWorkOrder(params.id, body)
    console.log('✅ [PATCH /api/orders/[id]] Orden actualizada exitosamente')
    return NextResponse.json({ success: true, data: order })
  } catch (error: any) {
    console.error('❌ [PATCH /api/orders/[id]] Error:', error)
    console.error('❌ [PATCH /api/orders/[id]] Error message:', error?.message)
    console.error('❌ [PATCH /api/orders/[id]] Error stack:', error?.stack)
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}

// DELETE /api/orders/[id] - Eliminar una orden
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteWorkOrder(params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/orders/[id]:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

