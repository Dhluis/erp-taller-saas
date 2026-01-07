// src/app/api/leads/[id]/convert/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/leads/:id/convert
 * Convertir un lead a cliente
 * 
 * Body (opcional):
 * - additional_notes?: string (notas adicionales al convertir)
 * - override_name?: string (nombre diferente al del lead)
 * - override_email?: string (email diferente al del lead)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Obtener organization_id del usuario
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    const organizationId = userData.organization_id
    const leadId = params.id

    console.log('[Leads API] Iniciando conversión de lead a cliente:', {
      lead_id: leadId,
      organization_id: organizationId,
      user_id: userData.id
    })

    // Obtener lead completo
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('organization_id', organizationId)
      .single()

    if (leadError || !lead) {
      console.error('[Leads API] Lead no encontrado:', leadError)
      return NextResponse.json(
        { error: 'Lead no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que el lead no esté ya convertido
    if (lead.status === 'converted') {
      return NextResponse.json(
        { 
          error: 'Este lead ya fue convertido a cliente',
          customer_id: lead.customer_id
        },
        { status: 409 }
      )
    }

    // Obtener body (opcional)
    const body = await request.json().catch(() => ({}))
    const {
      additional_notes,
      override_name,
      override_email
    } = body

    // Preparar datos del cliente
    const customerName = override_name || lead.name
    const customerEmail = override_email || lead.email
    const customerNotes = additional_notes 
      ? `${lead.notes || ''}\n\n[Convertido desde lead]\n${additional_notes}`
      : lead.notes

    // Verificar si ya existe un cliente con este teléfono
    const { data: existingCustomer, error: checkError } = await supabase
      .from('customers')
      .select('id, name')
      .eq('organization_id', organizationId)
      .eq('phone', lead.phone)
      .single()

    let customerId: string

    if (existingCustomer) {
      // Cliente ya existe, solo vincular
      console.log('[Leads API] Cliente ya existe, vinculando:', existingCustomer.id)
      customerId = existingCustomer.id

      // Actualizar campos del cliente existente
      await supabase
        .from('customers')
        .update({
          lead_id: leadId,
          from_lead: true,
          converted_from_whatsapp: lead.lead_source === 'whatsapp',
          notes: customerNotes
        })
        .eq('id', customerId)

    } else {
      // Crear nuevo cliente
      console.log('[Leads API] Creando nuevo cliente desde lead')

      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({
          organization_id: organizationId,
          name: customerName,
          phone: lead.phone,
          email: customerEmail,
          company: lead.company,
          lead_id: leadId,
          from_lead: true,
          converted_from_whatsapp: lead.lead_source === 'whatsapp',
          notes: customerNotes
        })
        .select('id')
        .single()

      if (createError) {
        console.error('[Leads API] Error creando cliente:', createError)
        return NextResponse.json(
          { error: 'Error creando cliente', details: createError.message },
          { status: 500 }
        )
      }

      customerId = newCustomer.id
      console.log('[Leads API] Cliente creado exitosamente:', customerId)
    }

    // Actualizar lead a convertido
    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update({
        status: 'converted',
        customer_id: customerId,
        converted_at: new Date().toISOString()
      })
      .eq('id', leadId)
      .select(`
        *,
        customer:customers!leads_customer_id_fkey(id, name, phone, email)
      `)
      .single()

    if (updateError) {
      console.error('[Leads API] Error actualizando lead:', updateError)
      return NextResponse.json(
        { error: 'Error actualizando lead', details: updateError.message },
        { status: 500 }
      )
    }

    // Actualizar conversación de WhatsApp si existe
    if (lead.whatsapp_conversation_id) {
      await supabase
        .from('whatsapp_conversations')
        .update({
          lead_status: 'converted',
          lead_updated_at: new Date().toISOString()
        })
        .eq('id', lead.whatsapp_conversation_id)

      console.log('[Leads API] Conversación actualizada:', lead.whatsapp_conversation_id)
    }

    console.log('[Leads API] ✅ Lead convertido exitosamente:', {
      lead_id: leadId,
      customer_id: customerId
    })

    return NextResponse.json({
      success: true,
      data: {
        lead: updatedLead,
        customer_id: customerId
      },
      message: 'Lead convertido a cliente exitosamente'
    }, { status: 200 })

  } catch (error: any) {
    console.error('[Leads API] Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    )
  }
}

