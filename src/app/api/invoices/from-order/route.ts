import { NextRequest, NextResponse } from 'next/server'
import { createInvoiceFromWorkOrder } from '@/lib/database/queries/invoices'

// POST /api/invoices/from-order - Crear factura desde orden de trabajo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar work_order_id requerido
    if (!body.work_order_id) {
      return NextResponse.json(
        {
          data: null,
          error: 'work_order_id es requerido'
        },
        { status: 400 }
      )
    }
    
    const invoice = await createInvoiceFromWorkOrder(body.work_order_id)
    
    return NextResponse.json(
      {
        data: {
          invoice,
          message: `Factura ${invoice.invoice_number} creada desde orden de trabajo`,
          work_order_id: body.work_order_id
        },
        error: null
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error in POST /api/invoices/from-order:', error)
    
    // Manejar errores específicos
    if (error.message.includes('no encontrada')) {
      return NextResponse.json(
        {
          data: null,
          error: error.message
        },
        { status: 404 }
      )
    }
    
    if (error.message.includes('completadas') || error.message.includes('ya tiene')) {
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
        error: error.message || 'Error al crear factura desde orden'
      },
      { status: 500 }
    )
  }
}


