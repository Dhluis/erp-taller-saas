import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'
import { createInvoiceFromWorkOrder } from '@/lib/database/queries/invoices'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

/**
 * POST /api/conversions/work-order-to-invoice
 * Crea factura desde orden de trabajo. Body: { work_order_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    await getTenantContext(request)
    const body = await request.json().catch(() => ({}))
    const work_order_id = body.work_order_id
    if (!work_order_id || typeof work_order_id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'work_order_id (string) es requerido en el body' },
        { status: 400 }
      )
    }
    const supabaseAdmin = getSupabaseServiceClient()
    const invoice = await createInvoiceFromWorkOrder(work_order_id, supabaseAdmin)
    return NextResponse.json({
      success: true,
      data: { invoice_id: invoice.id, invoice_number: invoice.invoice_number },
      message: 'Factura creada desde orden de trabajo',
    }, { status: 201 })
  } catch (error: unknown) {
    console.error('[POST /api/conversions/work-order-to-invoice] Error:', error)
    const msg = (error as Error).message || ''
    if (msg.includes('no encontrada')) return NextResponse.json({ success: false, error: msg }, { status: 404 })
    if (msg.includes('completadas') || msg.includes('ya tiene')) return NextResponse.json({ success: false, error: msg }, { status: 409 })
    return NextResponse.json({ success: false, error: msg || 'Error al crear factura' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Use POST con body { work_order_id }' }, { status: 405 })
}
