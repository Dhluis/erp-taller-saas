import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/integrations/whatsapp/utils/supabase-server-helpers'
import { getSupabaseServiceClient } from '@/lib/supabase/server'
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
        const organizationId = data.organizationId || tenantContext.organizationId

        console.log('[Config Test] 🧪 Procesando mensaje de prueba...')
        console.log('[Config Test] Organization:', organizationId)
        console.log('[Config Test] Message:', data.message)

        // ✅ PRIMERO: Crear/actualizar configuración temporal para la prueba
        // Usar service role client para evitar problemas de RLS
        console.log('[Config Test] 📝 Guardando configuración temporal para la prueba...')
        console.log('[Config Test] Datos recibidos:', {
          hasBusinessInfo: !!data.businessInfo,
          hasServices: !!data.services,
          hasPersonality: !!data.personality,
          hasPolicies: !!data.policies,
          hasFAQ: !!data.faq
        })
        
        const personalityTone = data.personality?.tone || 'profesional'
        const policiesWithExtras = {
          ...(data.policies || {}),
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
          organization_id: organizationId,
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

        // Usar service role client para operaciones administrativas (bypass RLS)
        let serviceClient
        try {
          serviceClient = getSupabaseServiceClient()
        } catch (serviceError) {
          console.warn('[Config Test] ⚠️ Service role no disponible, usando cliente regular:', serviceError)
          // Fallback al cliente regular si no hay service role
          serviceClient = await getSupabaseServerClient()
        }

        // Verificar si ya existe configuración
        const { data: existingConfig, error: checkError } = await serviceClient
          .from('ai_agent_config')
          .select('id')
          .eq('organization_id', organizationId)
          .single()

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('[Config Test] ❌ Error verificando configuración existente:', {
            message: checkError.message,
            code: checkError.code,
            details: checkError.details
          })
        }

        let configSaved = false
        let saveError: any = null

        if (existingConfig) {
          // Actualizar configuración existente
          const { error: updateError } = await serviceClient
            .from('ai_agent_config')
            .update(configData)
            .eq('id', existingConfig.id)

          if (updateError) {
            saveError = updateError
            console.error('[Config Test] ❌ Error actualizando configuración:', {
              message: updateError.message,
              code: updateError.code,
              details: updateError.details,
              hint: updateError.hint
            })
          } else {
            console.log('[Config Test] ✅ Configuración actualizada temporalmente')
            configSaved = true
          }
        } else {
          // Crear nueva configuración temporal
          const { error: insertError } = await serviceClient
            .from('ai_agent_config')
            .insert(configData)

          if (insertError) {
            saveError = insertError
            console.error('[Config Test] ❌ Error creando configuración:', {
              message: insertError.message,
              code: insertError.code,
              details: insertError.details,
              hint: insertError.hint
            })
          } else {
            console.log('[Config Test] ✅ Configuración creada temporalmente')
            configSaved = true
          }
        }

        // Verificar que la configuración se guardó correctamente
        if (!configSaved) {
          console.error('[Config Test] ❌ No se pudo guardar la configuración:', saveError)
          return NextResponse.json({
            success: false,
            error: `No se pudo guardar la configuración temporal: ${saveError?.message || 'Error desconocido'}. ${saveError?.hint ? `Sugerencia: ${saveError.hint}` : ''}`,
            details: saveError?.details,
            code: saveError?.code
          }, { status: 500 })
        }

        // Pequeño delay para asegurar que la configuración está disponible
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // Verificar que la configuración existe antes de procesar
        const { data: verifyConfig, error: verifyError } = await serviceClient
          .from('ai_agent_config')
          .select('id, enabled')
          .eq('organization_id', organizationId)
          .single()

        if (verifyError || !verifyConfig) {
          console.error('[Config Test] ❌ No se pudo verificar la configuración guardada:', verifyError)
          return NextResponse.json({
            success: false,
            error: 'La configuración no se guardó correctamente. Por favor, intenta de nuevo.',
            details: verifyError?.details
          }, { status: 500 })
        }

        console.log('[Config Test] ✅ Configuración verificada y lista para la prueba')

        // ✅ AHORA: Procesar el mensaje de prueba
        // Usar un pequeño delay adicional para asegurar que la configuración esté disponible
        await new Promise(resolve => setTimeout(resolve, 300))
        
        const result = await processMessage({
          conversationId: `test-${Date.now()}`,
          organizationId,
          customerMessage: data.message,
          customerPhone: '+521234567890',
          skipBusinessHoursCheck: true,
          useServiceClient: true // ✅ Indicar que use service client para leer la config
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
    // Buscar en la tabla 'users' que es la que se usa en este proyecto
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role, organization_id')
      .eq('auth_user_id', tenantContext.userId)
      .single()

    if (profileError || !userProfile) {
      console.error('[Config Save] ❌ Error obteniendo perfil:', profileError)
      // Si no se encuentra en users, intentar verificar si el usuario está autenticado
      // y permitir guardar si tiene acceso a la organización
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({
          success: false,
          error: 'Usuario no autenticado'
        }, { status: 401 })
      }
      // Si el usuario está autenticado y tiene acceso a la organización, permitir guardar
      console.warn('[Config Save] ⚠️ Perfil no encontrado, pero usuario autenticado. Permitiendo guardar.')
    } else {
      // Verificar que el usuario pertenezca a la organización correcta
      if (userProfile.organization_id !== tenantContext.organizationId) {
        return NextResponse.json({
          success: false,
          error: 'No tienes acceso a esta organización'
        }, { status: 403 })
      }

      // Verificar permisos (admin, manager o owner pueden configurar)
      const allowedRoles = ['admin', 'manager', 'owner']
      if (userProfile.role && !allowedRoles.includes(userProfile.role)) {
        return NextResponse.json({
          success: false,
          error: 'No tienes permisos para configurar el agente. Se requiere rol de admin, manager u owner.'
        }, { status: 403 })
      }
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
