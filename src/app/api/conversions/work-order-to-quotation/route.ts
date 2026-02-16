import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'
import { createQuotationFromWorkOrder } from '@/lib/supabase/quotations-invoices'

/**
 * POST /api/conversions/work-order-to-quotation
 * Crea cotización desde orden de trabajo. Body: { work_order_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await getTenantContext(request)
    if (!organizationId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }
    const body = await request.json().catch(() => ({}))
    const work_order_id = body.work_order_id
    if (!work_order_id || typeof work_order_id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'work_order_id (string) es requerido en el body' },
        { status: 400 }
      )
    }
    const quotation = await createQuotationFromWorkOrder(organizationId, work_order_id)
    return NextResponse.json({
      success: true,
      data: { quotation_id: quotation.id, quotation_number: quotation.quotation_number },
      message: 'Cotización creada desde orden de trabajo',
    }, { status: 201 })
  } catch (error: unknown) {
    console.error('[POST /api/conversions/work-order-to-quotation] Error:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Error al crear cotización' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Use POST con body { work_order_id }' }, { status: 405 })
}
