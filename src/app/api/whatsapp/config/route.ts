import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

    const supabase = await createClient()
    const data = await request.json()

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
    // Nota: personality es VARCHAR(255), así que guardamos solo el tono
    const personalityTone = data.personality?.tone || 'profesional'
    
    // Guardar información adicional en policies como JSONB
    const policiesWithExtras = {
      ...data.policies,
      // Guardar información del negocio dentro de policies
      business_info: data.businessInfo || {},
      // Guardar personalidad completa en policies
      personality: {
        tone: data.personality?.tone || 'profesional',
        use_emojis: data.personality?.use_emojis || false,
        local_phrases: data.personality?.local_phrases || false,
        greeting_style: data.personality?.greeting_style || ''
      },
      // Guardar instrucciones personalizadas y reglas de escalamiento
      custom_instructions: data.customInstructions || '',
      escalation_rules: data.escalationRules || {}
    }
    
    const configData = {
      organization_id: tenantContext.organizationId,
      enabled: true,
      provider: 'openai', // Default, puede cambiarse después
      model: 'gpt-4o-mini', // Modelo más económico y eficiente
      system_prompt: '', // Se generará dinámicamente desde loadOrganizationContext
      personality: `${personalityTone}${data.personality?.use_emojis ? ', usa emojis' : ''}${data.personality?.local_phrases ? ', modismos locales' : ''}`,
      language: data.personality?.language || 'es-MX',
      temperature: 0.7,
      max_tokens: 1000,
      auto_schedule_appointments: false, // Por seguridad, requiere aprobación
      auto_create_orders: false, // Por seguridad, requiere aprobación
      require_human_approval: true,
      business_hours_only: false,
      business_hours: data.businessInfo?.businessHours || {},
      services: data.services || [],
      mechanics: [], // Se puede agregar después
      faqs: data.faq || [],
      policies: policiesWithExtras,
      updated_at: new Date().toISOString()
    }

    let result
    if (existingConfig) {
      // Actualizar configuración existente
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
      // Crear nueva configuración
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

    const supabase = await createClient()

    const { data: config, error } = await supabase
      .from('ai_agent_config')
      .select('*')
      .eq('organization_id', tenantContext.organizationId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
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

