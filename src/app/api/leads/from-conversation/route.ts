// src/app/api/leads/from-conversation/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'

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
    // ✅ FIX: Usar createClientFromRequest para leer cookies correctamente
    const supabase = createClientFromRequest(request)

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[Leads API] Error de autenticación:', authError)
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
      console.error('[Leads API] Error obteniendo usuario:', userError)
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
      return NextResponse.json(
        { error: 'conversation_id es requerido' },
        { status: 400 }
      )
    }

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
      console.error('[Leads API] Error obteniendo conversación:', convError)
      return NextResponse.json(
        { error: 'Conversación no encontrada' },
        { status: 404 }
      )
    }

    // ✅ Si la conversación ya es un lead, devolver el lead existente
    if (conversation.is_lead && conversation.lead_id) {
      console.log('[Leads API] Lead existente encontrado:', conversation.lead_id)
      
      const { data: existingLead, error: leadError } = await supabase
        .from('leads')
        .select(`
          *,
          assigned_user:users!leads_assigned_to_fkey(id, full_name, email)
        `)
        .eq('id', conversation.lead_id)
        .single()
      
      if (existingLead && !leadError) {
        return NextResponse.json({
          success: true,
          data: existingLead,
          message: 'Lead existente encontrado',
          existing: true
        }, { status: 200 })
      }
    }

    // Extraer información del contacto
    const name = conversation.customer_name || conversation.customer_phone || 'Cliente WhatsApp'
    const phone = conversation.customer_phone
    const email = conversation.email || null

    // Crear lead
    const { data: lead, error: createError } = await supabase
      .from('leads')
      .insert({
        organization_id: organizationId,
        name,
        phone,
        email,
        estimated_value,
        lead_source,
        assigned_to,
        notes,
        status: 'new',
        whatsapp_conversation_id: conversation_id
      })
      .select(`
        *,
        assigned_user:users!leads_assigned_to_fkey(id, full_name, email)
      `)
      .single()

    if (createError) {
      console.error('[Leads API] Error creando lead:', createError)
      
      // ✅ Si hay error de unique constraint, buscar el lead existente
      if (createError.code === '23505') {
        console.log('[Leads API] Unique constraint violation, buscando lead existente por teléfono')
        
        // Buscar lead existente por teléfono normalizado
        const normalizedPhone = phone?.replace(/\D/g, '') || ''
        
        const { data: existingLeads, error: searchError } = await supabase
          .from('leads')
          .select(`
            *,
            assigned_user:users!leads_assigned_to_fkey(id, full_name, email)
          `)
          .eq('organization_id', organizationId)
        
        if (!searchError && existingLeads && existingLeads.length > 0) {
          // Encontrar el lead que más coincida (por número completo)
          const matchingLead = existingLeads.find(lead => {
            const leadPhone = lead.phone?.replace(/\D/g, '') || ''
            return leadPhone === normalizedPhone || 
                   leadPhone.endsWith(normalizedPhone.slice(-10)) ||
                   normalizedPhone.endsWith(leadPhone.slice(-10))
          }) || existingLeads[0]
          
          // Vincular conversación con el lead existente
          await supabase
            .from('whatsapp_conversations')
            .update({
              is_lead: true,
              lead_id: matchingLead.id,
              lead_status: matchingLead.status,
              lead_updated_at: new Date().toISOString()
            })
            .eq('id', conversation_id)
          
          return NextResponse.json({
            success: true,
            data: matchingLead,
            message: 'Lead existente encontrado y vinculado',
            existing: true
          }, { status: 200 })
        }
        
        // Si no se encuentra, devolver error genérico
        return NextResponse.json(
          { error: 'Ya existe un lead con este teléfono en tu organización' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: 'Error creando lead', details: createError.message },
        { status: 500 }
      )
    }

    // Actualizar conversación de WhatsApp
    const { error: updateConvError } = await supabase
      .from('whatsapp_conversations')
      .update({
        is_lead: true,
        lead_id: lead.id,
        lead_status: 'new',
        lead_updated_at: new Date().toISOString()
      })
      .eq('id', conversation_id)

    if (updateConvError) {
      console.error('[Leads API] Error actualizando conversación:', updateConvError)
      // No fallar la request, el lead ya se creó
    }

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

