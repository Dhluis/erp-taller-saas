import { NextRequest, NextResponse } from 'next/server'
import { getPurchaseOrdersBySupplier } from '@/lib/database/queries/purchase-orders'

// GET /api/suppliers/[id]/purchase-orders - Obtener órdenes de compra del proveedor
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orders = await getPurchaseOrdersBySupplier(params.id)

    return NextResponse.json({
      data: orders,
      error: null
    })
  } catch (error: any) {
    console.error('Error in GET /api/suppliers/[id]/purchase-orders:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al obtener órdenes de compra del proveedor'
      },
      { status: 500 }
    )
  }
}

