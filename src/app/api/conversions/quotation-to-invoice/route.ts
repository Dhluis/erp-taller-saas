import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'
import {
  getQuotationById,
  createInvoiceFromQuotation,
} from '@/lib/supabase/quotations-invoices'

/**
 * POST /api/conversions/quotation-to-invoice
 * Convierte cotización aprobada a nota de venta. Body: { quotation_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await getTenantContext(request)
    if (!organizationId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }
    const body = await request.json().catch(() => ({}))
    const quotation_id = body.quotation_id
    if (!quotation_id || typeof quotation_id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'quotation_id (string) es requerido en el body' },
        { status: 400 }
      )
    }
    const quotation = await getQuotationById(quotation_id)
    if (!quotation) return NextResponse.json({ success: false, error: 'Cotización no encontrada' }, { status: 404 })
    if (quotation.status !== 'approved') {
      return NextResponse.json(
        { success: false, error: `Solo se pueden convertir cotizaciones aprobadas. Estado actual: ${quotation.status}` },
        { status: 400 }
      )
    }
    if (quotation.valid_until && new Date(quotation.valid_until) < new Date()) {
      return NextResponse.json({ success: false, error: 'No se puede convertir una cotización vencida' }, { status: 400 })
    }
    if (!quotation.items || quotation.items.length === 0) {
      return NextResponse.json({ success: false, error: 'La cotización no tiene items' }, { status: 400 })
    }
    const invoice = await createInvoiceFromQuotation(organizationId, quotation_id)
    return NextResponse.json({
      success: true,
      data: { invoice_id: invoice.id, invoice_number: invoice.invoice_number, quotation_status: 'converted' },
      message: 'Cotización convertida a nota de venta',
    }, { status: 201 })
  } catch (error: unknown) {
    console.error('[POST /api/conversions/quotation-to-invoice] Error:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Error al convertir cotización' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Use POST con body { quotation_id }' }, { status: 405 })
}
