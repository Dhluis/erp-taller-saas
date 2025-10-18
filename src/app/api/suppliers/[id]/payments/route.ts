import { NextRequest, NextResponse } from 'next/server'
import { getPaymentHistory } from '@/lib/database/queries/suppliers'

// GET /api/suppliers/[id]/payments - Obtener historial de pagos del proveedor
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payments = await getPaymentHistory(params.id)

    return NextResponse.json({
      data: payments,
      error: null
    })
  } catch (error: any) {
    console.error('Error in GET /api/suppliers/[id]/payments:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al obtener historial de pagos'
      },
      { status: 500 }
    )
  }
}

