import { NextRequest, NextResponse } from 'next/server'
import { calculateOrderTotals } from '@/lib/database/queries/order-items'

// POST /api/orders/[id]/totals - Recalcular totales de una orden
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await calculateOrderTotals(params.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in POST /api/orders/[id]/totals:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// GET /api/orders/[id]/totals - Obtener totales calculados de una orden
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await calculateOrderTotals(params.id)
    return NextResponse.json({
      subtotal: result.subtotal,
      tax_amount: result.tax_amount,
      discount_amount: result.discount_amount,
      total_amount: result.total_amount,
      items_count: result.items_count
    })
  } catch (error) {
    console.error('Error in GET /api/orders/[id]/totals:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}


