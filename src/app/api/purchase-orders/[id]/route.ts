import { NextRequest, NextResponse } from 'next/server'
import { 
  getPurchaseOrderById, 
  updatePurchaseOrder, 
  cancelPurchaseOrder 
} from '@/lib/database/queries/purchase-orders'

// GET /api/purchase-orders/[id] - Obtener orden de compra por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = await getPurchaseOrderById(params.id)

    return NextResponse.json({
      data: order,
      error: null
    })
  } catch (error: any) {
    console.error('Error in GET /api/purchase-orders/[id]:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al obtener orden de compra'
      },
      { status: 500 }
    )
  }
}

// PUT /api/purchase-orders/[id] - Actualizar orden de compra
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    const updatedOrder = await updatePurchaseOrder(params.id, body)

    return NextResponse.json(
      {
        data: updatedOrder,
        error: null
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error in PUT /api/purchase-orders/[id]:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al actualizar orden de compra'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/purchase-orders/[id] - Cancelar orden de compra
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const reason = searchParams.get('reason')
    
    const cancelledOrder = await cancelPurchaseOrder(params.id, reason || undefined)

    return NextResponse.json(
      {
        data: cancelledOrder,
        error: null
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error in DELETE /api/purchase-orders/[id]:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al cancelar orden de compra'
      },
      { status: 500 }
    )
  }
}

