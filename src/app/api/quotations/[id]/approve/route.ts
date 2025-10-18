import { NextRequest, NextResponse } from 'next/server'
import { getQuotationById, trackQuotationChange, saveQuotationVersion } from '@/lib/database/queries/quotations'
import { createClient } from '@/lib/supabase/server'

// POST /api/quotations/[id]/approve - Aprobar cotización
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quotationId = params.id
    const supabase = await createClient()

    // 1. OBTENER COTIZACIÓN ACTUAL
    const quotation = await getQuotationById(quotationId)

    if (!quotation) {
      return NextResponse.json(
        { 
          data: null,
          error: 'Cotización no encontrada' 
        },
        { status: 404 }
      )
    }

    // 2. VALIDAR QUE NO ESTÉ YA APROBADA
    if (quotation.status === 'approved') {
      return NextResponse.json(
        { 
          data: null,
          error: 'La cotización ya está aprobada' 
        },
        { status: 400 }
      )
    }

    // 3. VALIDAR QUE NO ESTÉ CONVERTIDA O CANCELADA
    if (quotation.status === 'converted') {
      return NextResponse.json(
        { 
          data: null,
          error: 'No se puede aprobar una cotización que ya fue convertida a orden' 
        },
        { status: 400 }
      )
    }

    if (quotation.status === 'cancelled') {
      return NextResponse.json(
        { 
          data: null,
          error: 'No se puede aprobar una cotización cancelada' 
        },
        { status: 400 }
      )
    }

    // 4. VALIDAR QUE TENGA ITEMS
    if (!quotation.quotation_items || quotation.quotation_items.length === 0) {
      return NextResponse.json(
        { 
          data: null,
          error: 'No se puede aprobar una cotización sin items' 
        },
        { status: 400 }
      )
    }

    // 5. VALIDAR QUE TENGA CUSTOMER
    if (!quotation.customer_id) {
      return NextResponse.json(
        { 
          data: null,
          error: 'No se puede aprobar una cotización sin cliente asignado' 
        },
        { status: 400 }
      )
    }

    // 6. GUARDAR VERSIÓN ANTES DE APROBAR
    await saveQuotationVersion(quotationId, quotation)

    // 7. CAMBIAR STATUS A 'APPROVED'
    const { data: approvedQuotation, error: updateError } = await supabase
      .from('quotations')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        version: supabase.raw('version + 1'),
        updated_at: new Date().toISOString()
      })
      .eq('id', quotationId)
      .select(`
        *,
        customers (
          id,
          name,
          email,
          phone,
          address
        ),
        vehicles (
          id,
          brand,
          model,
          year,
          license_plate,
          vin
        )
      `)
      .single()

    if (updateError) {
      console.error('Error approving quotation:', updateError)
      return NextResponse.json(
        { 
          data: null,
          error: `Error al aprobar cotización: ${updateError.message}` 
        },
        { status: 500 }
      )
    }

    // 8. REGISTRAR EN TRACKING
    await trackQuotationChange(quotationId, 'approved', {
      previous_status: quotation.status,
      approved_at: approvedQuotation.approved_at,
      total_amount: quotation.total_amount,
      items_count: quotation.quotation_items.length,
      customer_name: quotation.customers?.name,
      vehicle_info: quotation.vehicles 
        ? `${quotation.vehicles.brand} ${quotation.vehicles.model} ${quotation.vehicles.year}`
        : null
    })

    // 9. NOTIFICAR (si hay sistema de notificaciones)
    // TODO: Implementar notificaciones
    // await notifyQuotationApproved(quotationId, quotation)

    // 10. RETORNAR RESULTADO
    return NextResponse.json({
      data: {
        quotation: {
          id: approvedQuotation.id,
          quotation_number: approvedQuotation.quotation_number,
          status: approvedQuotation.status,
          approved_at: approvedQuotation.approved_at,
          customer: approvedQuotation.customers,
          vehicle: approvedQuotation.vehicles,
          subtotal: approvedQuotation.subtotal,
          tax_amount: approvedQuotation.tax_amount,
          discount_amount: approvedQuotation.discount_amount,
          total_amount: approvedQuotation.total_amount,
          items_count: quotation.quotation_items.length,
          version: approvedQuotation.version
        },
        message: `Cotización ${approvedQuotation.quotation_number} aprobada exitosamente`,
        next_steps: [
          'Puedes convertir esta cotización a orden de trabajo',
          'Usa POST /api/quotations/{id}/convert para crear la orden'
        ]
      },
      error: null
    })
  } catch (error: any) {
    console.error('Error in POST /api/quotations/[id]/approve:', error)
    return NextResponse.json(
      { 
        data: null,
        error: error.message || 'Error interno del servidor al aprobar cotización' 
      },
      { status: 500 }
    )
  }
}


