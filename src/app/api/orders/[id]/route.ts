import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { updateWorkOrder, updateWorkOrderStatus, deleteWorkOrder } from '@/lib/database/queries/work-orders'
import type { WorkOrder } from '@/types/orders'

const supabase = createClient()
const ORGANIZATION_ID = '042ab6bd-8979-4166-882a-c244b5e51e51'

// GET /api/orders/[id] - Obtener detalles de una orden
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('work_orders')
      .select(`
        *,
        customer:customers(*),
        vehicle:vehicles(*),
        order_items(*)
      `)
      .eq('id', params.id)
      .eq('organization_id', ORGANIZATION_ID)
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
    
    // Si solo se está actualizando el status, usar función específica
    if (body.status && Object.keys(body).length === 1) {
      const order = await updateWorkOrderStatus(params.id, body.status)
      return NextResponse.json({ success: true, data: order })
    }
    
    // Actualización completa
    const order = await updateWorkOrder(params.id, body)
    return NextResponse.json({ success: true, data: order })
  } catch (error) {
    console.error('Error in PATCH /api/orders/[id]:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
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

