import { NextRequest, NextResponse } from 'next/server'
import { markInvoiceAsPaid } from '@/lib/database/queries/invoices'

// POST /api/invoices/[id]/pay - Marcar factura como pagada
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    // Validar payment_method requerido
    if (!body.payment_method) {
      return NextResponse.json(
        {
          data: null,
          error: 'payment_method es requerido'
        },
        { status: 400 }
      )
    }
    
    // Validar que payment_method sea válido
    const validMethods = ['cash', 'transfer', 'card', 'check']
    if (!validMethods.includes(body.payment_method)) {
      return NextResponse.json(
        {
          data: null,
          error: `payment_method debe ser uno de: ${validMethods.join(', ')}`
        },
        { status: 400 }
      )
    }
    
    const invoice = await markInvoiceAsPaid(params.id, {
      payment_method: body.payment_method,
      paid_date: body.paid_date,
      payment_reference: body.payment_reference || body.reference,  // Acepta ambos
      payment_notes: body.payment_notes || body.notes              // Acepta ambos
    })
    
    return NextResponse.json({
      data: {
        invoice,
        message: `Factura ${invoice.invoice_number} marcada como pagada exitosamente`,
        payment_details: {
          method: invoice.payment_method,
          date: invoice.paid_date,
          reference: invoice.payment_reference,
          notes: invoice.payment_notes
        }
      },
      error: null
    })
  } catch (error: any) {
    console.error('Error in POST /api/invoices/[id]/pay:', error)
    
    // Manejar errores específicos
    if (error.message.includes('Factura no encontrada')) {
      return NextResponse.json(
        {
          data: null,
          error: error.message
        },
        { status: 404 }
      )
    }
    
    if (error.message.includes('ya está pagada') || error.message.includes('cancelada')) {
      return NextResponse.json(
        {
          data: null,
          error: error.message
        },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al marcar factura como pagada'
      },
      { status: 500 }
    )
  }
}
