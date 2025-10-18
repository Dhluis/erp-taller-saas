import { NextRequest, NextResponse } from 'next/server'
import { getQuotationById, trackQuotationChange, saveQuotationVersion } from '@/lib/database/queries/quotations'
import { createClient } from '@/lib/supabase/server'

// POST /api/quotations/[id]/reject - Rechazar cotización
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quotationId = params.id
    const body = await request.json()
    const { reason } = body // Razón opcional del rechazo
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

    // 2. VALIDAR QUE NO ESTÉ YA RECHAZADA
    if (quotation.status === 'rejected') {
      return NextResponse.json(
        { 
          data: null,
          error: 'La cotización ya está rechazada' 
        },
        { status: 400 }
      )
    }

    // 3. VALIDAR QUE NO ESTÉ CONVERTIDA
    if (quotation.status === 'converted') {
      return NextResponse.json(
        { 
          data: null,
          error: 'No se puede rechazar una cotización que ya fue convertida a orden' 
        },
        { status: 400 }
      )
    }

    // 4. VALIDAR QUE NO ESTÉ CANCELADA
    if (quotation.status === 'cancelled') {
      return NextResponse.json(
        { 
          data: null,
          error: 'No se puede rechazar una cotización que ya está cancelada' 
        },
        { status: 400 }
      )
    }

    // 5. GUARDAR VERSIÓN ANTES DE RECHAZAR
    await saveQuotationVersion(quotationId, quotation)

    // 6. CAMBIAR STATUS A 'REJECTED'
    const { data: rejectedQuotation, error: updateError } = await supabase
      .from('quotations')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejection_reason: reason || null,
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
          phone
        ),
        vehicles (
          id,
          brand,
          model,
          year,
          license_plate
        )
      `)
      .single()

    if (updateError) {
      console.error('Error rejecting quotation:', updateError)
      return NextResponse.json(
        { 
          data: null,
          error: `Error al rechazar cotización: ${updateError.message}` 
        },
        { status: 500 }
      )
    }

    // 7. REGISTRAR EN TRACKING
    await trackQuotationChange(quotationId, 'rejected', {
      previous_status: quotation.status,
      rejected_at: rejectedQuotation.rejected_at,
      rejection_reason: reason || 'Sin razón especificada',
      total_amount: quotation.total_amount,
      customer_name: quotation.customers?.name
    })

    // 8. NOTIFICAR (si hay sistema de notificaciones)
    // TODO: Implementar notificaciones
    // await notifyQuotationRejected(quotationId, quotation, reason)

    // 9. RETORNAR RESULTADO
    return NextResponse.json({
      data: {
        quotation: {
          id: rejectedQuotation.id,
          quotation_number: rejectedQuotation.quotation_number,
          status: rejectedQuotation.status,
          rejected_at: rejectedQuotation.rejected_at,
          rejection_reason: rejectedQuotation.rejection_reason,
          customer: rejectedQuotation.customers,
          vehicle: rejectedQuotation.vehicles,
          total_amount: rejectedQuotation.total_amount,
          version: rejectedQuotation.version
        },
        message: `Cotización ${rejectedQuotation.quotation_number} rechazada`,
        next_steps: [
          'Puedes modificar la cotización y volver a enviarla',
          'O crear una nueva cotización basada en esta'
        ]
      },
      error: null
    })
  } catch (error: any) {
    console.error('Error in POST /api/quotations/[id]/reject:', error)
    return NextResponse.json(
      { 
        data: null,
        error: error.message || 'Error interno del servidor al rechazar cotización' 
      },
      { status: 500 }
    )
  }
}


