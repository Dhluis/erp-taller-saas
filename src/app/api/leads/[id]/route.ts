// src/app/api/leads/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/leads/:id
 * Obtener un lead específico
 */
export async function GET(
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
      .select('organization_id')
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

    // Obtener lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select(`
        *,
        assigned_user:users!leads_assigned_to_fkey(id, full_name, email),
        customer:customers(id, name, phone, email),
        whatsapp_conversation:whatsapp_conversations(
          id, 
          contact_name, 
          customer_phone,
          last_message_at
        )
      `)
      .eq('id', leadId)
      .eq('organization_id', organizationId)
      .single()

    if (leadError || !lead) {
      console.error('[Leads API] Error obteniendo lead:', leadError)
      return NextResponse.json(
        { error: 'Lead no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: lead
    })

  } catch (error: any) {
    console.error('[Leads API] Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/leads/:id
 * Actualizar un lead
 * 
 * Body:
 * - name?: string
 * - phone?: string
 * - email?: string
 * - company?: string
 * - status?: string
 * - lead_score?: number
 * - estimated_value?: number
 * - assigned_to?: UUID
 * - notes?: string
 * - next_follow_up?: string (ISO date)
 * - lost_reason?: string (solo si status = 'lost')
 */
export async function PATCH(
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
      .select('organization_id')
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

    // Verificar que el lead existe y pertenece a la organización
    const { data: existingLead, error: checkError } = await supabase
      .from('leads')
      .select('id, status, whatsapp_conversation_id')
      .eq('id', leadId)
      .eq('organization_id', organizationId)
      .single()

    if (checkError || !existingLead) {
      return NextResponse.json(
        { error: 'Lead no encontrado' },
        { status: 404 }
      )
    }

    // Obtener body
    const body = await request.json()
    const {
      name,
      phone,
      email,
      company,
      status,
      lead_score,
      estimated_value,
      assigned_to,
      notes,
      next_follow_up,
      lost_reason
    } = body

    // Preparar datos para actualizar
    const updateData: any = {}

    if (name !== undefined) updateData.name = name
    if (phone !== undefined) updateData.phone = phone
    if (email !== undefined) updateData.email = email
    if (company !== undefined) updateData.company = company
    if (status !== undefined) updateData.status = status
    if (lead_score !== undefined) updateData.lead_score = lead_score
    if (estimated_value !== undefined) updateData.estimated_value = estimated_value
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to
    if (notes !== undefined) updateData.notes = notes
    if (next_follow_up !== undefined) updateData.next_follow_up = next_follow_up
    if (lost_reason !== undefined) updateData.lost_reason = lost_reason

    // Validar que no esté vacío
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No hay campos para actualizar' },
        { status: 400 }
      )
    }

    // Validar estados
    const validStatuses = ['new', 'contacted', 'qualified', 'appointment', 'converted', 'lost']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Estado inválido. Valores permitidos: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // No permitir cambiar a 'converted' desde aquí
    // Debe usar el endpoint /convert
    if (status === 'converted') {
      return NextResponse.json(
        { error: 'Para convertir un lead a cliente, usa el endpoint /api/leads/:id/convert' },
        { status: 400 }
      )
    }

    // Actualizar lead
    const { data: lead, error: updateError } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', leadId)
      .eq('organization_id', organizationId)
      .select(`
        *,
        assigned_user:users!leads_assigned_to_fkey(id, full_name, email),
        customer:customers(id, name),
        whatsapp_conversation:whatsapp_conversations(id, contact_name, customer_phone)
      `)
      .single()

    if (updateError) {
      console.error('[Leads API] Error actualizando lead:', updateError)
      return NextResponse.json(
        { error: 'Error actualizando lead', details: updateError.message },
        { status: 500 }
      )
    }

    // Si cambió el status, actualizar conversación de WhatsApp
    if (status && existingLead.whatsapp_conversation_id) {
      await supabase
        .from('whatsapp_conversations')
        .update({
          lead_status: status,
          lead_updated_at: new Date().toISOString()
        })
        .eq('id', existingLead.whatsapp_conversation_id)
    }

    console.log('[Leads API] Lead actualizado:', leadId)

    return NextResponse.json({
      success: true,
      data: lead,
      message: 'Lead actualizado exitosamente'
    })

  } catch (error: any) {
    console.error('[Leads API] Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/leads/:id
 * Eliminar un lead
 */
export async function DELETE(
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
      .select('organization_id')
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

    // Verificar que el lead existe
    const { data: existingLead, error: checkError } = await supabase
      .from('leads')
      .select('id, status, whatsapp_conversation_id')
      .eq('id', leadId)
      .eq('organization_id', organizationId)
      .single()

    if (checkError || !existingLead) {
      return NextResponse.json(
        { error: 'Lead no encontrado' },
        { status: 404 }
      )
    }

    // No permitir eliminar leads convertidos
    if (existingLead.status === 'converted') {
      return NextResponse.json(
        { error: 'No se puede eliminar un lead que ya fue convertido a cliente' },
        { status: 400 }
      )
    }

    // Actualizar conversación si existe
    if (existingLead.whatsapp_conversation_id) {
      await supabase
        .from('whatsapp_conversations')
        .update({
          is_lead: false,
          lead_id: null,
          lead_status: null,
          lead_updated_at: null
        })
        .eq('id', existingLead.whatsapp_conversation_id)
    }

    // Eliminar lead
    const { error: deleteError } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId)
      .eq('organization_id', organizationId)

    if (deleteError) {
      console.error('[Leads API] Error eliminando lead:', deleteError)
      return NextResponse.json(
        { error: 'Error eliminando lead', details: deleteError.message },
        { status: 500 }
      )
    }

    console.log('[Leads API] Lead eliminado:', leadId)

    return NextResponse.json({
      success: true,
      message: 'Lead eliminado exitosamente'
    })

  } catch (error: any) {
    console.error('[Leads API] Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    )
  }
}

