import { NextRequest, NextResponse } from 'next/server'
import { getQuotationById, trackQuotationChange, saveQuotationVersion } from '@/lib/database/queries/quotations'
import { createClient } from '@/lib/supabase/server'

// POST /api/quotations/[id]/send - Enviar cotización al cliente
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quotationId = params.id
    const body = await request.json().catch(() => ({}))
    const { send_via_email = false, email_message = '', recipient_email = null } = body
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

    // 2. VALIDAR QUE NO ESTÉ YA ENVIADA
    if (quotation.status === 'sent') {
      return NextResponse.json(
        { 
          data: {
            quotation: quotation,
            message: 'La cotización ya está en estado "enviada"',
            warning: 'Si deseas reenviarla, puedes usar la misma acción'
          },
          error: null
        },
        { status: 200 }
      )
    }

    // 3. VALIDAR QUE NO ESTÉ APROBADA, CONVERTIDA O CANCELADA
    if (quotation.status === 'approved') {
      return NextResponse.json(
        { 
          data: null,
          error: 'No se puede enviar una cotización que ya está aprobada' 
        },
        { status: 400 }
      )
    }

    if (quotation.status === 'converted') {
      return NextResponse.json(
        { 
          data: null,
          error: 'No se puede enviar una cotización que ya fue convertida a orden' 
        },
        { status: 400 }
      )
    }

    if (quotation.status === 'cancelled') {
      return NextResponse.json(
        { 
          data: null,
          error: 'No se puede enviar una cotización cancelada' 
        },
        { status: 400 }
      )
    }

    if (quotation.status === 'rejected') {
      return NextResponse.json(
        { 
          data: null,
          error: 'No se puede enviar una cotización rechazada. Modifícala primero o crea una nueva' 
        },
        { status: 400 }
      )
    }

    // 4. VALIDAR QUE TENGA ITEMS
    if (!quotation.quotation_items || quotation.quotation_items.length === 0) {
      return NextResponse.json(
        { 
          data: null,
          error: 'No se puede enviar una cotización sin items' 
        },
        { status: 400 }
      )
    }

    // 5. VALIDAR QUE TENGA CUSTOMER
    if (!quotation.customer_id) {
      return NextResponse.json(
        { 
          data: null,
          error: 'No se puede enviar una cotización sin cliente asignado' 
        },
        { status: 400 }
      )
    }

    // 6. VALIDAR EMAIL DEL CLIENTE (si se va a enviar por email)
    if (send_via_email) {
      const customerEmail = recipient_email || quotation.customers?.email
      
      if (!customerEmail) {
        return NextResponse.json(
          { 
            data: null,
            error: 'El cliente no tiene email registrado. Proporciona un email en recipient_email o actualiza el cliente' 
          },
          { status: 400 }
        )
      }
    }

    // 7. GUARDAR VERSIÓN ANTES DE ENVIAR (si es primera vez)
    if (quotation.status === 'draft') {
      await saveQuotationVersion(quotationId, quotation)
    }

    // 8. CAMBIAR STATUS A 'SENT'
    const { data: sentQuotation, error: updateError } = await supabase
      .from('quotations')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
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
      console.error('Error sending quotation:', updateError)
      return NextResponse.json(
        { 
          data: null,
          error: `Error al enviar cotización: ${updateError.message}` 
        },
        { status: 500 }
      )
    }

    // 9. REGISTRAR EN TRACKING
    await trackQuotationChange(quotationId, 'sent', {
      previous_status: quotation.status,
      sent_at: sentQuotation.sent_at,
      send_via_email: send_via_email,
      recipient_email: recipient_email || quotation.customers?.email,
      total_amount: quotation.total_amount,
      items_count: quotation.quotation_items.length,
      customer_name: quotation.customers?.name,
      vehicle_info: quotation.vehicles 
        ? `${quotation.vehicles.brand} ${quotation.vehicles.model} ${quotation.vehicles.year}`
        : null
    })

    // 10. ENVIAR EMAIL (si está habilitado)
    let emailSent = false
    let emailError = null

    if (send_via_email) {
      try {
        // TODO: Implementar envío de email
        // await sendQuotationEmail(quotationId, sentQuotation, email_message, recipient_email)
        emailSent = false // Cambiar a true cuando se implemente
        console.log('📧 Email pendiente de implementación')
      } catch (error: any) {
        console.error('Error sending email:', error)
        emailError = error.message
      }
    }

    // 11. RETORNAR RESULTADO
    return NextResponse.json({
      data: {
        quotation: {
          id: sentQuotation.id,
          quotation_number: sentQuotation.quotation_number,
          status: sentQuotation.status,
          sent_at: sentQuotation.sent_at,
          customer: sentQuotation.customers,
          vehicle: sentQuotation.vehicles,
          subtotal: sentQuotation.subtotal,
          tax_amount: sentQuotation.tax_amount,
          discount_amount: sentQuotation.discount_amount,
          total_amount: sentQuotation.total_amount,
          items_count: quotation.quotation_items.length,
          version: sentQuotation.version
        },
        email_sent: emailSent,
        email_error: emailError,
        message: emailSent 
          ? `Cotización ${sentQuotation.quotation_number} enviada exitosamente por email`
          : `Cotización ${sentQuotation.quotation_number} marcada como enviada`,
        next_steps: [
          'El cliente puede revisar la cotización',
          'Espera su aprobación usando POST /api/quotations/{id}/approve',
          'O puede ser rechazada con POST /api/quotations/{id}/reject'
        ]
      },
      error: null
    })
  } catch (error: any) {
    console.error('Error in POST /api/quotations/[id]/send:', error)
    return NextResponse.json(
      { 
        data: null,
        error: error.message || 'Error interno del servidor al enviar cotización' 
      },
      { status: 500 }
    )
  }
}


