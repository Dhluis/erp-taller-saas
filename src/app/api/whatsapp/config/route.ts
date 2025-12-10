import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/integrations/whatsapp/utils/supabase-server-helpers'
import { getSupabaseServiceClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'

/**
 * ✅ Genera un nombre de sesión único para WAHA por organización
 * Formato: eagles_{organizationId_sin_guiones_primeros_20_chars}
 * Ejemplo: eagles_bbca12292c4f4838b5f9
 */
function generateWhatsAppSessionName(organizationId: string): string {
  // Remover guiones y tomar primeros 20 caracteres
  const cleanId = organizationId.replace(/-/g, '').substring(0, 20)
  return `eagles_${cleanId}`
}

export async function POST(request: NextRequest) {
  try {
    // Obtener contexto del tenant
    const tenantContext = await getTenantContext(request)
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
          auto_schedule_appointments: data.appointmentScheduling?.auto_schedule_appointments ?? false,
          auto_create_orders: false,
          require_human_approval: data.appointmentScheduling?.require_human_approval ?? true,
          business_hours_only: false,
          business_hours: data.appointmentScheduling?.business_hours || data.businessInfo?.businessHours || {},
          services: data.appointmentScheduling?.services || data.services || [],
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

        // Crear conversación real para usar un UUID válido en el historial
        const testPhone = data.customerPhone || '+521234567890'
        let conversationIdForTest: string | null = null
        try {
          const nowIso = new Date().toISOString()
          const { data: tempConversation, error: convError } = await serviceClient
            .from('whatsapp_conversations')
            .insert({
              organization_id: organizationId,
              customer_phone: testPhone,
              customer_name: data.customerName || 'Cliente de Prueba',
              status: 'active',
              is_bot_active: true,
              messages_count: 0,
              created_at: nowIso,
              last_message_at: nowIso
            })
            .select('id')
            .single()

          if (convError || !tempConversation) {
            console.warn('[Config Test] ⚠️ No se pudo crear conversación de prueba, se usará UUID virtual', convError?.message)
          } else {
            conversationIdForTest = tempConversation.id
            console.log('[Config Test] 📝 Conversación de prueba creada:', conversationIdForTest)
          }
        } catch (convException) {
          console.warn('[Config Test] ⚠️ Excepción creando conversación de prueba, se usará UUID virtual:', convException)
        }
        
        const result = await processMessage({
          conversationId: conversationIdForTest || randomUUID(),
          organizationId,
          customerMessage: data.message,
          customerPhone: testPhone,
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
    // ✅ Si llegamos aquí, el usuario está autenticado y tiene acceso a la organización
    // (ya fue verificado en getTenantContext)
    
    // Verificar autenticación con cliente regular (tiene sesión)
    const supabase = await getSupabaseServerClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Usuario no autenticado'
      }, { status: 401 })
    }

    // ✅ Si tiene tenantContext válido, significa que:
    // - Está autenticado
    // - Tiene un perfil en users
    // - Pertenece a un workshop
    // - El workshop pertenece a una organización
    // Por lo tanto, permitimos guardar la configuración
    console.log('[Config Save] ✅ Usuario autenticado y con acceso a la organización, permitiendo guardar configuración')

    // Usar service client para bypass RLS al guardar configuración
    let serviceClient
    try {
      serviceClient = getSupabaseServiceClient()
      console.log('[Config Save] ✅ Usando service client para operaciones de BD (bypass RLS)')
    } catch (serviceError) {
      console.warn('[Config Save] ⚠️ Service role no disponible, usando cliente regular:', serviceError)
      // Fallback al cliente regular si no hay service role
      serviceClient = supabase
    }

    // Verificar si ya existe configuración
    const { data: existingConfig, error: checkError } = await serviceClient
      .from('ai_agent_config')
      .select('id')
      .eq('organization_id', tenantContext.organizationId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[Config Save] ❌ Error verificando configuración existente:', checkError)
    }

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

    // Si solo se está actualizando WhatsApp (viene whatsapp_phone) o configuración de WAHA
    if ((data.whatsapp_phone !== undefined || data.waha_api_url || data.waha_api_key) && !data.businessInfo) {
      // Verificar si existe configuración
      const { data: existingConfig, error: checkError } = await serviceClient
        .from('ai_agent_config')
        .select('id, policies')
        .eq('organization_id', tenantContext.organizationId)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('[Config Save] ❌ Error verificando configuración:', checkError)
        return NextResponse.json({
          success: false,
          error: 'Error al verificar configuración existente'
        }, { status: 500 })
      }

      if (!existingConfig) {
        // Si solo se está guardando configuración de WAHA (sin whatsapp_phone), permitir crear/actualizar
        if (data.waha_api_url || data.waha_api_key || data.whatsapp_phone) {
          // ✅ Crear configuración básica (con o sin entrenamiento previo)
          // Generar session_name único para esta organización
          const whatsappSessionName = generateWhatsAppSessionName(tenantContext.organizationId)
          
          // ✅ Obtener credenciales de WAHA según el tipo (OPCIÓN A)
          const wahaConfigType = data.waha_config_type || 'shared'
          let wahaApiUrl: string | undefined
          let wahaApiKey: string | undefined
          
          if (wahaConfigType === 'custom') {
            if (!data.waha_api_url || !data.waha_api_key) {
              return NextResponse.json({
                success: false,
                error: 'Faltan credenciales de WAHA personalizadas. Por favor, completa todos los campos.'
              }, { status: 400 })
            }
            wahaApiUrl = data.waha_api_url
            wahaApiKey = data.waha_api_key
          } else {
            // ✅ SOLUCIÓN MULTI-TENANT: Obtener credenciales desde BD (configuración global)
            console.log('[Config Save] 🔍 [Nueva Config] Config tipo "shared" - obteniendo credenciales del servidor compartido desde BD...')
            
            // PASO 1: Buscar configuración global en BD (organization_id: '00000000-0000-0000-0000-000000000000')
            const globalOrgId = '00000000-0000-0000-0000-000000000000'
            const { data: globalConfig, error: globalError } = await serviceClient
              .from('ai_agent_config')
              .select('policies')
              .eq('organization_id', globalOrgId)
              .maybeSingle()
            
            if (globalError) {
              console.error('[Config Save] ❌ [Nueva Config] Error buscando configuración global:', globalError.message)
            }
            
            if (globalConfig && globalConfig.policies) {
              const globalPolicies = globalConfig.policies as any
              const globalWahaUrl = globalPolicies.waha_api_url || globalPolicies.WAHA_API_URL
              const globalWahaKey = globalPolicies.waha_api_key || globalPolicies.WAHA_API_KEY
              
              if (globalWahaUrl && globalWahaKey) {
                console.log('[Config Save] ✅ [Nueva Config] Credenciales encontradas en configuración global (BD)')
                wahaApiUrl = globalWahaUrl
                wahaApiKey = globalWahaKey
                console.log('[Config Save] 📍 [Nueva Config] URL desde BD:', wahaApiUrl?.substring(0, 50))
                console.log('[Config Save] 📍 [Nueva Config] Key preview desde BD:', wahaApiKey ? '***' + wahaApiKey.slice(-4) : 'undefined')
              } else {
                console.error('[Config Save] ❌ [Nueva Config] Configuración global existe pero no tiene credenciales WAHA')
              }
            } else {
              console.error('[Config Save] ❌ [Nueva Config] No se encontró configuración global en BD')
              console.error('[Config Save] ℹ️ [Nueva Config] Crea un registro en ai_agent_config con:')
              console.error('[Config Save] ℹ️ [Nueva Config]   - organization_id: 00000000-0000-0000-0000-000000000000')
              console.error('[Config Save] ℹ️ [Nueva Config]   - policies: { "waha_api_url": "https://...", "waha_api_key": "..." }')
            }
            
            // Validar que se obtuvieron las credenciales
            if (!wahaApiUrl || !wahaApiKey) {
              console.error('[Config Save] ❌ [Nueva Config] No se pudieron obtener credenciales del servidor compartido')
              return NextResponse.json({
                success: false,
                error: 'Servidor compartido no configurado. El administrador debe crear la configuración global en la base de datos.'
              }, { status: 500 })
            }
            
            console.log('[Config Save] ✅ [Nueva Config] Usando credenciales del servidor compartido (desde BD)')
          }
          
          const newConfigData: any = {
              organization_id: tenantContext.organizationId,
            enabled: data.whatsapp_phone ? true : false, // Habilitar si se vincula WhatsApp
            system_prompt: 'Asistente virtual de taller automotriz. Responde de manera amable y profesional.', // Prompt por defecto
              policies: {
                waha_config_type: wahaConfigType,
                waha_api_url: wahaApiUrl,
                waha_api_key: wahaApiKey,
                WAHA_API_URL: wahaApiUrl,
                WAHA_API_KEY: wahaApiKey
              },
              // ✅ MULTI-TENANT: Session name único por organización
              whatsapp_session_name: whatsappSessionName,
              // Nota: waha_config_type se guarda en policies (JSONB) para flexibilidad
              updated_at: new Date().toISOString()
          }
          
          console.log('[Config Save] 🔐 Creando nueva config multi-tenant:', {
            organization_id: tenantContext.organizationId,
            whatsapp_session_name: whatsappSessionName,
            waha_config_type: wahaConfigType,
            has_waha_api_url: !!wahaApiUrl,
            has_waha_api_key: !!wahaApiKey,
            using_custom_server: wahaConfigType === 'custom'
          })

          // Agregar whatsapp_phone si está presente
          if (data.whatsapp_phone) {
            newConfigData.whatsapp_phone = data.whatsapp_phone
          }

          const { data: newConfig, error: createError } = await serviceClient
            .from('ai_agent_config')
            .insert(newConfigData)
            .select()
            .single()

          if (createError) {
            return NextResponse.json({
              success: false,
              error: 'Error al crear configuración: ' + createError.message
            }, { status: 500 })
          }

          return NextResponse.json({
            success: true,
            message: data.whatsapp_phone 
              ? 'WhatsApp vinculado exitosamente. Puedes entrenar el asistente después.'
              : 'Configuración de WAHA guardada exitosamente',
            data: newConfig
          })
        }
        
        return NextResponse.json({
          success: false,
          error: 'Se requiere configuración de WAHA o número de WhatsApp'
        }, { status: 400 })
      }

      // Si solo se está actualizando WAHA (sin whatsapp_phone), actualizar policies directamente
      if ((data.waha_api_url || data.waha_api_key) && data.whatsapp_phone === undefined) {
        const currentPolicies = existingConfig.policies || {}
        const updatedPolicies: any = {
          ...currentPolicies
        }
        
        if (data.waha_api_url) {
          updatedPolicies.waha_api_url = data.waha_api_url
          updatedPolicies.WAHA_API_URL = data.waha_api_url
        }
        if (data.waha_api_key) {
          updatedPolicies.waha_api_key = data.waha_api_key
          updatedPolicies.WAHA_API_KEY = data.waha_api_key
        }
        
        const { error: updateError } = await serviceClient
          .from('ai_agent_config')
          .update({
            policies: updatedPolicies,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingConfig.id)
        
        if (updateError) {
          console.error('[Config Save] ❌ Error actualizando WAHA en policies:', updateError)
          return NextResponse.json({
            success: false,
            error: 'Error al actualizar configuración: ' + updateError.message
          }, { status: 500 })
        }
        
        console.log('[Config Save] ✅ Configuración de WAHA guardada en policies')
        console.log('[Config Save] 📋 Policies actualizado:', JSON.stringify(updatedPolicies, null, 2))
        console.log('[Config Save] 🔍 Organization ID:', tenantContext.organizationId)
        
        // Verificar que se guardó correctamente leyendo de vuelta
        const { data: verifyConfig, error: verifyError } = await serviceClient
          .from('ai_agent_config')
          .select('policies')
          .eq('id', existingConfig.id)
          .single()
        
        if (!verifyError && verifyConfig) {
          const verifyPolicies = verifyConfig.policies as any
          console.log('[Config Save] ✅ Verificación - Policies guardado:', {
            has_waha_api_url: !!verifyPolicies?.waha_api_url,
            has_waha_api_key: !!verifyPolicies?.waha_api_key,
            has_WAHA_API_URL: !!verifyPolicies?.WAHA_API_URL,
            has_WAHA_API_KEY: !!verifyPolicies?.WAHA_API_KEY
          })
        }
        
        return NextResponse.json({
          success: true,
          message: 'Configuración de WAHA guardada exitosamente',
          data: { 
            id: existingConfig.id, 
            updated: true,
            waha_api_url: data.waha_api_url,
            waha_api_key_configured: !!data.waha_api_key,
            organization_id: tenantContext.organizationId
          }
        })
      }

      // Intentar actualizar con campos directos primero
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      // Intentar agregar campos de WhatsApp (pueden no existir aún)
      try {
        updateData.whatsapp_phone = data.whatsapp_phone
        updateData.whatsapp_connected = data.whatsapp_connected !== undefined ? data.whatsapp_connected : true
      } catch (e) {
        // Ignorar si no se pueden agregar
      }

      // Actualizar
      let updateError = null
      const { error } = await serviceClient
        .from('ai_agent_config')
        .update(updateData)
        .eq('id', existingConfig.id)

      updateError = error

      // Si falla porque las columnas no existen, usar policies como fallback
      if (updateError && (updateError.message?.includes('whatsapp_phone') || updateError.message?.includes('whatsapp_connected'))) {
        console.warn('[Config Save] ⚠️ Campos de WhatsApp no existen, usando policies como fallback')
        
        // Usar policies JSONB para almacenar temporalmente
        const currentPolicies = existingConfig.policies || {}
        const updatedPolicies: any = {
          ...currentPolicies
        }
        
        // Actualizar WhatsApp si viene
        if (data.whatsapp_phone !== undefined) {
          updatedPolicies.whatsapp = {
            phone: data.whatsapp_phone,
            connected: data.whatsapp_connected !== undefined ? data.whatsapp_connected : true,
            updated_at: new Date().toISOString()
          }
        }
        
        // ✅ NUEVO: Actualizar configuración de WAHA si viene
        if (data.waha_api_url) {
          updatedPolicies.waha_api_url = data.waha_api_url
          updatedPolicies.WAHA_API_URL = data.waha_api_url // También con mayúsculas
        }
        if (data.waha_api_key) {
          updatedPolicies.waha_api_key = data.waha_api_key
          updatedPolicies.WAHA_API_KEY = data.waha_api_key // También con mayúsculas
        }

        const { error: fallbackError } = await serviceClient
          .from('ai_agent_config')
          .update({
            policies: updatedPolicies,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingConfig.id)

        if (fallbackError) {
          console.error('[Config Save] ❌ Error actualizando WhatsApp en policies:', fallbackError)
          return NextResponse.json({
            success: false,
            error: 'Error al actualizar configuración de WhatsApp. Por favor, ejecuta la migración SQL primero.',
            hint: 'Ejecuta la migración en supabase/migrations/012_add_whatsapp_fields.sql'
          }, { status: 500 })
        }

        console.log('[Config Save] ✅ Configuración guardada en policies (fallback)')
        
        // Si se guardó configuración de WAHA, retornar mensaje específico
        if (data.waha_api_url || data.waha_api_key) {
          return NextResponse.json({
            success: true,
            message: 'Configuración de WAHA guardada exitosamente',
            data: { 
              id: existingConfig.id, 
              updated: true, 
              using_fallback: true,
              waha_api_url: data.waha_api_url,
              waha_api_key_configured: !!data.waha_api_key
            }
          })
        }
        
        return NextResponse.json({
          success: true,
          data: { id: existingConfig.id, updated: true, using_fallback: true }
        })
      }

      if (updateError) {
        console.error('[Config Save] ❌ Error actualizando WhatsApp:', updateError)
        return NextResponse.json({
          success: false,
          error: updateError.message || 'Error al actualizar configuración de WhatsApp'
        }, { status: 500 })
      }

      console.log('[Config Save] ✅ WhatsApp actualizado exitosamente')
      return NextResponse.json({
        success: true,
        data: { id: existingConfig.id, updated: true }
      })
    }

    // ✅ Generar session_name único para esta organización (multi-tenant)
    const whatsappSessionName = generateWhatsAppSessionName(tenantContext.organizationId)
    
    // 🔍 Log de datos recibidos del frontend
    console.log('[Config Save] 📥 Datos recibidos del frontend:', {
      has_waha_config_type: !!data.waha_config_type,
      waha_config_type: data.waha_config_type,
      has_waha_api_url: !!data.waha_api_url,
      has_waha_api_key: !!data.waha_api_key,
      waha_url_preview: data.waha_api_url ? data.waha_api_url.substring(0, 30) + '...' : 'undefined',
      waha_key_preview: data.waha_api_key ? '***' + data.waha_api_key.slice(-4) : 'undefined'
    })
    
    // ✅ Obtener credenciales de WAHA según el tipo elegido (OPCIÓN A - Multi-tenant flexible)
    const wahaConfigType = data.waha_config_type || 'shared'
    let wahaApiUrl: string | undefined
    let wahaApiKey: string | undefined
    
    // Obtener service client para consultar BD
    const serviceClient = getSupabaseServiceClient()
    
    if (wahaConfigType === 'custom') {
      // Usar credenciales personalizadas del formulario
      if (!data.waha_api_url || !data.waha_api_key) {
        return NextResponse.json({
          success: false,
          error: 'Faltan credenciales de WAHA personalizadas. Por favor, completa todos los campos.'
        }, { status: 400 })
      }
      wahaApiUrl = data.waha_api_url
      wahaApiKey = data.waha_api_key
      console.log('[Config Save] ✅ Usando credenciales personalizadas del usuario')
    } else {
      // ✅ SOLUCIÓN MULTI-TENANT: Obtener credenciales desde BD (configuración global)
      console.log('[Config Save] 🔍 Config tipo "shared" - obteniendo credenciales del servidor compartido desde BD...')
      
      // PASO 1: Buscar configuración global en BD (organization_id: '00000000-0000-0000-0000-000000000000')
      const globalOrgId = '00000000-0000-0000-0000-000000000000'
      const { data: globalConfig, error: globalError } = await serviceClient
        .from('ai_agent_config')
        .select('policies')
        .eq('organization_id', globalOrgId)
        .maybeSingle()
      
      if (globalError) {
        console.error('[Config Save] ❌ Error buscando configuración global:', globalError.message)
      }
      
      if (globalConfig && globalConfig.policies) {
        const globalPolicies = globalConfig.policies as any
        const globalWahaUrl = globalPolicies.waha_api_url || globalPolicies.WAHA_API_URL
        const globalWahaKey = globalPolicies.waha_api_key || globalPolicies.WAHA_API_KEY
        
        if (globalWahaUrl && globalWahaKey) {
          console.log('[Config Save] ✅ Credenciales encontradas en configuración global (BD)')
          wahaApiUrl = globalWahaUrl
          wahaApiKey = globalWahaKey
          console.log('[Config Save] 📍 URL desde BD:', wahaApiUrl?.substring(0, 50))
          console.log('[Config Save] 📍 Key preview desde BD:', wahaApiKey ? '***' + wahaApiKey.slice(-4) : 'undefined')
        } else {
          console.error('[Config Save] ❌ Configuración global existe pero no tiene credenciales WAHA')
        }
      } else {
        console.error('[Config Save] ❌ No se encontró configuración global en BD')
        console.error('[Config Save] ℹ️ Crea un registro en ai_agent_config con:')
        console.error('[Config Save] ℹ️   - organization_id: 00000000-0000-0000-0000-000000000000')
        console.error('[Config Save] ℹ️   - policies: { "waha_api_url": "https://...", "waha_api_key": "..." }')
      }
      
      // Validar que se obtuvieron las credenciales
      if (!wahaApiUrl || !wahaApiKey) {
        console.error('[Config Save] ❌ No se pudieron obtener credenciales del servidor compartido')
        return NextResponse.json({
          success: false,
          error: 'Servidor compartido no configurado. El administrador debe crear la configuración global en la base de datos.'
        }, { status: 500 })
      }
      
      console.log('[Config Save] ✅ Usando credenciales del servidor compartido (desde BD)')
    }
    
    console.log('[Config Save] ✅ Credenciales validadas, procediendo a guardar...')
    
    // ✅ Incluir credenciales de WAHA en policies
    policiesWithExtras.waha_config_type = wahaConfigType
    policiesWithExtras.waha_api_url = wahaApiUrl
    policiesWithExtras.waha_api_key = wahaApiKey
    policiesWithExtras.WAHA_API_URL = wahaApiUrl // Compatibilidad mayúsculas
    policiesWithExtras.WAHA_API_KEY = wahaApiKey // Compatibilidad mayúsculas
    
    // 🔍 Log detallado de las credenciales que se guardarán
    console.log('[Config Save] 🔐 Credenciales WAHA que se guardarán en policies:', {
      waha_config_type: wahaConfigType,
      has_waha_api_url: !!wahaApiUrl,
      has_waha_api_key: !!wahaApiKey,
      waha_url_preview: wahaApiUrl ? wahaApiUrl.substring(0, 30) + '...' : 'undefined',
      waha_key_preview: wahaApiKey ? '***' + wahaApiKey.slice(-4) : 'undefined',
      source: wahaConfigType === 'custom' ? 'formulario' : 'process.env'
    })
    
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
      auto_schedule_appointments: data.appointmentScheduling?.auto_schedule_appointments ?? false,
      auto_create_orders: false,
      require_human_approval: data.appointmentScheduling?.require_human_approval ?? true,
      business_hours_only: false,
      business_hours: data.appointmentScheduling?.business_hours || data.businessInfo?.businessHours || {},
      services: data.appointmentScheduling?.services || data.services || [],
      mechanics: [],
      faqs: data.faq || [],
      policies: policiesWithExtras,
      whatsapp_phone: data.whatsapp_phone || null,
      whatsapp_connected: data.whatsapp_connected || false,
      // ✅ MULTI-TENANT: Session name único por organización
      whatsapp_session_name: whatsappSessionName,
      // Nota: waha_config_type se guarda en policies (JSONB) para flexibilidad
      updated_at: new Date().toISOString()
    }
    
    console.log('[Config Save] 🔐 Multi-tenant config:', {
      organization_id: tenantContext.organizationId,
      whatsapp_session_name: whatsappSessionName,
      waha_config_type: wahaConfigType,
      has_waha_api_url: !!wahaApiUrl,
      has_waha_api_key: !!wahaApiKey,
      using_custom_server: wahaConfigType === 'custom'
    })

    let result
    if (existingConfig) {
      // ✅ Preservar session_name existente o generar uno nuevo si no existe
      const { data: existingFullConfig } = await serviceClient
        .from('ai_agent_config')
        .select('whatsapp_session_name, policies')
        .eq('id', existingConfig.id)
        .single()
      
      // Si ya tiene session_name, preservarlo; si no, usar el generado
      if (existingFullConfig?.whatsapp_session_name) {
        configData.whatsapp_session_name = existingFullConfig.whatsapp_session_name
        console.log('[Config Save] ✅ Preservando session_name existente:', configData.whatsapp_session_name)
      } else {
        console.log('[Config Save] ✅ Generando nuevo session_name:', configData.whatsapp_session_name)
      }
      
      // ✅ Preservar waha_config_type y credenciales existentes si no se están cambiando
      const existingPolicies = existingFullConfig?.policies as any
      if (existingPolicies?.waha_config_type && !data.waha_config_type) {
        policiesWithExtras.waha_config_type = existingPolicies.waha_config_type
        // Si no se están enviando nuevas credenciales, preservar las existentes
        if (!data.waha_api_url && existingPolicies.waha_api_url) {
          policiesWithExtras.waha_api_url = existingPolicies.waha_api_url
          wahaApiUrl = existingPolicies.waha_api_url
        }
        if (!data.waha_api_key && existingPolicies.waha_api_key) {
          policiesWithExtras.waha_api_key = existingPolicies.waha_api_key
          wahaApiKey = existingPolicies.waha_api_key
        }
        console.log('[Config Save] ✅ Preservando configuración WAHA existente:', {
          waha_config_type: existingPolicies.waha_config_type,
          has_waha_api_url: !!policiesWithExtras.waha_api_url,
          has_waha_api_key: !!policiesWithExtras.waha_api_key
        })
      }
      
      const { error } = await serviceClient
        .from('ai_agent_config')
        .update(configData)
        .eq('id', existingConfig.id)

      if (error) {
        console.error('[Config Save] ❌ Error actualizando configuración:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        return NextResponse.json({
          success: false,
          error: error.message || 'Error al actualizar configuración',
          details: error.details,
          hint: error.hint
        }, { status: 500 })
      }

      console.log('[Config Save] ✅ Configuración actualizada exitosamente')
      
      // 🔍 Verificar que las credenciales se guardaron correctamente
      const { data: savedConfig } = await serviceClient
        .from('ai_agent_config')
        .select('policies')
        .eq('id', existingConfig.id)
        .single()
      
      if (savedConfig?.policies) {
        const savedPolicies = savedConfig.policies as any
        console.log('[Config Save] ✅ Verificación post-guardado:', {
          waha_config_type: savedPolicies.waha_config_type,
          has_waha_api_url: !!savedPolicies.waha_api_url,
          has_waha_api_key: !!savedPolicies.waha_api_key,
          waha_url_preview: savedPolicies.waha_api_url ? savedPolicies.waha_api_url.substring(0, 30) + '...' : 'undefined'
        })
      }
      
      result = { id: existingConfig.id, updated: true }
    } else {
      const { data: newConfig, error } = await serviceClient
        .from('ai_agent_config')
        .insert(configData)
        .select('id')
        .single()

      if (error) {
        console.error('[Config Save] ❌ Error creando configuración:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        return NextResponse.json({
          success: false,
          error: error.message || 'Error al crear configuración',
          details: error.details,
          hint: error.hint
        }, { status: 500 })
      }

      console.log('[Config Save] ✅ Configuración creada exitosamente')
      
      // 🔍 Verificar que las credenciales se guardaron correctamente
      if (newConfig?.id) {
        const { data: savedConfig } = await serviceClient
          .from('ai_agent_config')
          .select('policies')
          .eq('id', newConfig.id)
          .single()
        
        if (savedConfig?.policies) {
          const savedPolicies = savedConfig.policies as any
          console.log('[Config Save] ✅ Verificación post-creación:', {
            waha_config_type: savedPolicies.waha_config_type,
            has_waha_api_url: !!savedPolicies.waha_api_url,
            has_waha_api_key: !!savedPolicies.waha_api_key,
            waha_url_preview: savedPolicies.waha_api_url ? savedPolicies.waha_api_url.substring(0, 30) + '...' : 'undefined'
          })
        }
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
    const tenantContext = await getTenantContext(request)
    if (!tenantContext) {
      return NextResponse.json({
        success: false,
        error: 'No autorizado'
      }, { status: 401 })
    }

    // Intentar primero con service client (bypass RLS) para evitar problemas
    let supabase
    let useServiceClient = false
    try {
      supabase = getSupabaseServiceClient()
      useServiceClient = true
      console.log('[Config GET] ✅ Usando service client (bypass RLS)')
    } catch (serviceError) {
      console.warn('[Config GET] ⚠️ Service client no disponible, usando cliente regular:', serviceError)
      supabase = await getSupabaseServerClient()
    }

    const { data: config, error } = await supabase
      .from('ai_agent_config')
      .select('*')
      .eq('organization_id', tenantContext.organizationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No encontrado - esto es normal si no hay configuración
        console.log('[Config GET] ℹ️ No se encontró configuración para esta organización')
        return NextResponse.json({
          success: true,
          data: null
        })
      }
      
      // Si falla con service client, intentar con cliente regular como fallback
      if (useServiceClient) {
        console.warn('[Config GET] ⚠️ Error con service client, intentando con cliente regular...')
        const regularClient = await getSupabaseServerClient()
        const retry = await regularClient
          .from('ai_agent_config')
          .select('*')
          .eq('organization_id', tenantContext.organizationId)
          .single()
        
        if (retry.error && retry.error.code !== 'PGRST116') {
          console.error('[Config GET] ❌ Error obteniendo configuración:', retry.error)
          return NextResponse.json({
            success: false,
            error: retry.error.message
          }, { status: 500 })
        }
        
        return NextResponse.json({
          success: true,
          data: retry.data || null
        })
      }
      
      console.error('[Config GET] ❌ Error obteniendo configuración:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    console.log('[Config GET] ✅ Configuración encontrada:', {
      id: config?.id,
      enabled: config?.enabled,
      organization_id: config?.organization_id,
      whatsapp_session_name: config?.whatsapp_session_name || 'No configurado',
      has_waha_credentials: !!(config?.policies as any)?.waha_api_url
    })

    return NextResponse.json({
      success: true,
      data: config || null
    })
  } catch (error) {
    console.error('[Config GET] ❌ Error en GET /api/whatsapp/config:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
