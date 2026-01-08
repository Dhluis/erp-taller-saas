// src/app/api/leads/from-conversation/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/leads/from-conversation
 * Convertir una conversación de WhatsApp en un lead
 * 
 * Body:
 * - conversation_id: UUID (required)
 * - estimated_value?: number
 * - assigned_to?: UUID
 * - notes?: string
 * - lead_source?: string (default: 'whatsapp')
 */
export async function POST(request: NextRequest) {
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

    // Obtener body
    const body = await request.json()
    const {
      conversation_id,
      estimated_value = 0,
      assigned_to,
      notes,
      lead_source = 'whatsapp'
    } = body

    // Validaciones
    if (!conversation_id) {
      console.error('[Leads API] ❌ conversation_id es requerido')
      return NextResponse.json(
        { error: 'conversation_id es requerido' },
        { status: 400 }
      )
    }

    console.log('[Leads API] 🔍 Buscando conversación:', {
      conversation_id,
      organizationId
    })

    // Obtener información de la conversación
    const { data: conversation, error: convError } = await supabase
      .from('whatsapp_conversations')
      .select(`
        *,
        lead:leads!leads_whatsapp_conversation_id_fkey(
          id,
          status,
          lead_score,
          estimated_value,
          customer_id,
          notes
        )
      `)
      .eq('id', conversation_id)
      .eq('organization_id', organizationId)
      .single()

    if (convError || !conversation) {
      console.error('[Leads API] ❌ Error obteniendo conversación:', {
        error: convError,
        conversation_id,
        organizationId
      })
      return NextResponse.json(
        { error: 'Conversación no encontrada o no autorizada', details: convError?.message },
        { status: 404 }
      )
    }

    console.log('[Leads API] ✅ Conversación encontrada:', {
      id: conversation.id,
      customer_name: conversation.customer_name,
      customer_phone: conversation.customer_phone,
      has_existing_lead: !!conversation.lead
    })

    // ✅ Verificar que la conversación no sea ya un lead
    // La relación se hace a través de whatsapp_conversation_id en la tabla leads
    // Verificar si ya existe un lead asociado a esta conversación
    const existingLead = Array.isArray(conversation.lead) && conversation.lead.length > 0 
      ? conversation.lead[0] 
      : conversation.lead || null
    
    // Si hay un lead existente, retornarlo en lugar de crear uno nuevo
    if (existingLead && existingLead.id) {
      console.log('[Leads API] ✅ Conversación ya tiene lead asociado:', {
        lead_id: existingLead.id,
        lead_status: existingLead.status
      })
      
      // Obtener el lead completo desde la BD para retornarlo
      const { data: fullLead, error: fetchLeadError } = await supabase
        .from('leads')
        .select(`
          *,
          assigned_user:users!leads_assigned_to_fkey(id, full_name, email)
        `)
        .eq('id', existingLead.id)
        .single()
      
      if (!fetchLeadError && fullLead) {
        return NextResponse.json(
          { 
            success: true,
            data: fullLead,
            message: 'Esta conversación ya tiene un lead asociado',
            already_exists: true
          },
          { status: 200 }
        )
      }
      
      // Si no pudimos obtener el lead completo, retornar el que tenemos del join
      return NextResponse.json(
        { 
          success: true,
          data: existingLead,
          message: 'Esta conversación ya tiene un lead asociado',
          already_exists: true
        },
        { status: 200 }
      )
    }
    
    // ✅ Verificar también buscando directamente por whatsapp_conversation_id
    // (por si el join no funcionó por alguna razón)
    const { data: directLeadCheck, error: directCheckError } = await supabase
      .from('leads')
      .select(`
        *,
        assigned_user:users!leads_assigned_to_fkey(id, full_name, email)
      `)
      .eq('whatsapp_conversation_id', conversation_id)
      .eq('organization_id', organizationId)
      .maybeSingle()
    
    if (directLeadCheck && !directCheckError) {
      console.log('[Leads API] ✅ Lead encontrado por búsqueda directa:', directLeadCheck.id)
      return NextResponse.json(
        { 
          success: true,
          data: directLeadCheck,
          message: 'Esta conversación ya tiene un lead asociado',
          already_exists: true
        },
        { status: 200 }
      )
    }

    // ✅ Extraer información del contacto (usar customer_name, no contact_name)
    const name = conversation.customer_name || conversation.customer_phone
    const phone = conversation.customer_phone
    const email = conversation.email || null

    console.log('[Leads API] 📝 Creando lead con datos:', {
      name,
      phone,
      email,
      estimated_value,
      lead_source,
      notes: notes ? 'Sí' : 'No',
      whatsapp_conversation_id: conversation_id
    })

    // Crear lead
    const { data: lead, error: createError } = await supabase
      .from('leads')
      .insert({
        organization_id: organizationId,
        name,
        phone,
        email,
        estimated_value: estimated_value || 0,
        lead_source,
        assigned_to: assigned_to || null,
        notes: notes || null,
        status: 'new',
        whatsapp_conversation_id: conversation_id
      })
      .select(`
        *,
        assigned_user:users!leads_assigned_to_fkey(id, full_name, email)
      `)
      .single()

    if (createError) {
      console.error('[Leads API] ❌ Error creando lead:', {
        error: createError,
        code: createError.code,
        message: createError.message,
        details: createError.details,
        hint: createError.hint
      })
      
      // Check for unique constraint violation (phone + organization_id)
      if (createError.code === '23505') {
        console.log('[Leads API] ⚠️ Violación de constraint único - ya existe lead con este teléfono')
        
        // Intentar obtener el lead existente
        const { data: existingLead } = await supabase
          .from('leads')
          .select(`
            *,
            assigned_user:users!leads_assigned_to_fkey(id, full_name, email)
          `)
          .eq('phone', phone)
          .eq('organization_id', organizationId)
          .maybeSingle()
        
        if (existingLead) {
          return NextResponse.json(
            { 
              error: 'Ya existe un lead con este teléfono en tu organización',
              existing_lead: existingLead
            },
            { status: 409 }
          )
        }
        
        return NextResponse.json(
          { error: 'Ya existe un lead con este teléfono en tu organización' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { 
          error: 'Error creando lead', 
          details: createError.message,
          code: createError.code,
          hint: createError.hint
        },
        { status: 500 }
      )
    }

    console.log('[Leads API] ✅ Lead creado exitosamente:', {
      lead_id: lead.id,
      name: lead.name,
      phone: lead.phone
    })

    // ✅ Nota: La tabla whatsapp_conversations NO tiene campos is_lead, lead_id, lead_status
    // La relación se mantiene SOLO a través de whatsapp_conversation_id en la tabla leads
    // No necesitamos actualizar la conversación, solo crear el lead con la relación
    console.log('[Leads API] ✅ Lead creado. La relación se mantiene en la tabla leads (whatsapp_conversation_id)')

    console.log('[Leads API] Lead creado desde conversación:', {
      lead_id: lead.id,
      conversation_id
    })

    return NextResponse.json({
      success: true,
      data: lead,
      message: 'Lead creado exitosamente desde conversación de WhatsApp'
    }, { status: 201 })

  } catch (error: any) {
    console.error('[Leads API] Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    )
  }
}

