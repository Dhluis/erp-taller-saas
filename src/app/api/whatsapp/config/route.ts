import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/integrations/whatsapp/utils/supabase-server-helpers'
import { getTenantContext } from '@/lib/core/multi-tenant-server'

export async function POST(request: NextRequest) {
  try {
    // Obtener contexto del tenant
    const tenantContext = await getTenantContext()
    if (!tenantContext) {
      return NextResponse.json({
        success: false,
        error: 'No autorizado'
      }, { status: 401 })
    }

    const data = await request.json()

    // ✅ NUEVO: Si es una petición de TEST, procesarla aquí
    if (data.test === true && data.message) {
      try {
        const { processMessage } = await import('@/integrations/whatsapp/services/ai-agent')

        console.log('[Config Test] 🧪 Procesando mensaje de prueba...')
        console.log('[Config Test] Organization:', data.organizationId || tenantContext.organizationId)
        console.log('[Config Test] Message:', data.message)

        const result = await processMessage({
          conversationId: `test-${Date.now()}`,
          organizationId: data.organizationId || tenantContext.organizationId,
          customerMessage: data.message,
          customerPhone: '+521234567890',
          skipBusinessHoursCheck: true
        })

        console.log('[Config Test] ✅ Result:', result.success)

        if (!result.success) {
          console.error('[Config Test] ❌ Error:', result.error)
        }

        return NextResponse.json({
          success: result.success,
          data: result.success ? {
            response: result.response,
            functionsCalled: result.functionsCalled || []
          } : undefined,
          error: result.error
        })
      } catch (error) {
        console.error('[Config Test] ❌ Exception:', error)
        return NextResponse.json({
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido en test'
        }, { status: 500 })
      }
    }

    // RESTO DEL CÓDIGO ORIGINAL (guardar configuración)
    const supabase = await getSupabaseServerClient()

    // Validar que el usuario tenga permisos de admin/owner
    const { data: membership, error: membershipError } = await supabase
      .from('system_users')
      .select('role')
      .eq('organization_id', tenantContext.organizationId)
      .eq('auth_user_id', tenantContext.userId)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({
        success: false,
        error: 'Usuario no encontrado en la organización'
      }, { status: 403 })
    }

    // Verificar permisos (owner o admin pueden configurar)
    const allowedRoles = ['owner', 'admin']
    if (!allowedRoles.includes(membership.role)) {
      return NextResponse.json({
        success: false,
        error: 'No tienes permisos para configurar el agente'
      }, { status: 403 })
    }

    // Verificar si ya existe configuración
    const { data: existingConfig } = await supabase
      .from('ai_agent_config')
      .select('id')
      .eq('organization_id', tenantContext.organizationId)
      .single()

    // Mapear datos del formulario a la estructura de la BD
    const personalityTone = data.personality?.tone || 'profesional'

    const policiesWithExtras = {
      ...data.policies,
      business_info: data.businessInfo || {},
      personality: {
        tone: data.personality?.tone || 'profesional',
        use_emojis: data.personality?.use_emojis || false,
        local_phrases: data.personality?.local_phrases || false,
        greeting_style: data.personality?.greeting_style || ''
      },
      custom_instructions: data.customInstructions || '',
      escalation_rules: data.escalationRules || {}
    }

    const configData = {
      organization_id: tenantContext.organizationId,
      enabled: true,
      provider: 'openai',
      model: 'gpt-4o-mini',
      system_prompt: '',
      personality: `${personalityTone}${data.personality?.use_emojis ? ', usa emojis' : ''}${data.personality?.local_phrases ? ', modismos locales' : ''}`,
      language: data.personality?.language || 'es-MX',
      temperature: 0.7,
      max_tokens: 1000,
      auto_schedule_appointments: false,
      auto_create_orders: false,
      require_human_approval: true,
      business_hours_only: false,
      business_hours: data.businessInfo?.businessHours || {},
      services: data.services || [],
      mechanics: [],
      faqs: data.faq || [],
      policies: policiesWithExtras,
      updated_at: new Date().toISOString()
    }

    let result
    if (existingConfig) {
      const { error } = await supabase
        .from('ai_agent_config')
        .update(configData)
        .eq('id', existingConfig.id)

      if (error) {
        console.error('Error actualizando configuración:', error)
        return NextResponse.json({
          success: false,
          error: error.message
        }, { status: 500 })
      }

      result = { id: existingConfig.id, updated: true }
    } else {
      const { data: newConfig, error } = await supabase
        .from('ai_agent_config')
        .insert(configData)
        .select('id')
        .single()

      if (error) {
        console.error('Error creando configuración:', error)
        return NextResponse.json({
          success: false,
          error: error.message
        }, { status: 500 })
      }

      result = { id: newConfig.id, created: true }
    }

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error en POST /api/whatsapp/config:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext()
    if (!tenantContext) {
      return NextResponse.json({
        success: false,
        error: 'No autorizado'
      }, { status: 401 })
    }

    const supabase = await getSupabaseServerClient()

    const { data: config, error } = await supabase
      .from('ai_agent_config')
      .select('*')
      .eq('organization_id', tenantContext.organizationId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error obteniendo configuración:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: config || null
    })
  } catch (error) {
    console.error('Error en GET /api/whatsapp/config:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
