import { NextRequest, NextResponse } from 'next/server'
import { updatePurchaseOrderStatus } from '@/lib/database/queries/purchase-orders'

// POST /api/purchase-orders/[id]/approve - Aprobar orden de compra
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const approvedOrder = await updatePurchaseOrderStatus(params.id, 'confirmed')

    return NextResponse.json(
      {
        data: approvedOrder,
        error: null
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error in POST /api/purchase-orders/[id]/approve:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al aprobar orden de compra'
      },
      { status: 500 }
    )
  }
}

