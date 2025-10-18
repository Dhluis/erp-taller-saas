import { NextRequest, NextResponse } from 'next/server'
import { getWorkOrderById, updateWorkOrder, updateWorkOrderStatus, deleteWorkOrder } from '@/lib/database/queries/work-orders'

// GET /api/orders/[id] - Obtener detalles de una orden
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = await getWorkOrderById(params.id)
    return NextResponse.json(order)
  } catch (error) {
    console.error('Error in GET /api/orders/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
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
      return NextResponse.json(order)
    }
    
    // Actualización completa
    const order = await updateWorkOrder(params.id, body)
    return NextResponse.json(order)
  } catch (error) {
    console.error('Error in PATCH /api/orders/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
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
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

