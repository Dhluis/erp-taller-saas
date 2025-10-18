import { NextRequest, NextResponse } from 'next/server'
import { receivePurchaseOrder } from '@/lib/database/queries/purchase-orders'

// POST /api/purchase-orders/[id]/receive - Marcar orden como recibida
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const receivedOrder = await receivePurchaseOrder(params.id)

    return NextResponse.json(
      {
        data: receivedOrder,
        error: null
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error in POST /api/purchase-orders/[id]/receive:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al recibir orden de compra'
      },
      { status: 500 }
    )
  }
}

