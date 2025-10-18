import { NextRequest, NextResponse } from 'next/server'
import { getQuotationById, createQuotation } from '@/lib/database/queries/quotations'
import { addQuotationItem } from '@/lib/database/queries/quotation-items'

// POST /api/quotations/[id]/duplicate - Duplicar cotización con nuevo número
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Obtener la cotización original con todos sus items
    const originalQuotation = await getQuotationById(params.id)

    if (!originalQuotation) {
      return NextResponse.json(
        {
          data: null,
          error: 'Cotización original no encontrada'
        },
        { status: 404 }
      )
    }

    // 2. Crear nueva cotización (el número se genera automáticamente)
    const newQuotation = await createQuotation({
      organization_id: originalQuotation.organization_id,
      customer_id: originalQuotation.customer_id,
      description: `Copia de ${originalQuotation.quotation_number}: ${originalQuotation.description || ''}`,
      notes: originalQuotation.notes,
      valid_until: originalQuotation.valid_until,
      status: 'draft' // Siempre empezar como draft
    })

    // 3. Copiar todos los items de la cotización original
    if (originalQuotation.quotation_items && originalQuotation.quotation_items.length > 0) {
      for (const item of originalQuotation.quotation_items) {
        await addQuotationItem(newQuotation.id, {
          service_id: item.service_id,
          product_id: item.product_id,
          item_type: item.item_type,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
          discount_amount: item.discount_amount,
          tax_percent: item.tax_percent,
          notes: item.notes
        })
      }
    }

    // 4. Obtener la cotización completa con los items
    const completeQuotation = await getQuotationById(newQuotation.id)

    return NextResponse.json(
      {
        data: completeQuotation,
        error: null
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error in POST /api/quotations/[id]/duplicate:', error)

    if (error.message === 'Cotización original no encontrada') {
      return NextResponse.json(
        {
          data: null,
          error: 'Cotización original no encontrada'
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al duplicar cotización'
      },
      { status: 500 }
    )
  }
}


