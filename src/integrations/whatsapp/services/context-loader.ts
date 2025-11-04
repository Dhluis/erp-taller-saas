import { getSupabaseServerClient } from '../utils/supabase-server-helpers'
import type { AIContext, AIAgentConfig } from '../types'

export async function loadAIContext(
  organizationId: string,
  conversationId: string
): Promise<AIContext | null> {
  try {
    const supabase = await getSupabaseServerClient()

    const { data: aiConfig, error: aiError } = await supabase
      .from('ai_agent_config')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    if (aiError || !aiConfig) {
      console.error('[ContextLoader] No se encontró configuración AI:', aiError)
      return null
    }

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('name, address, phone, email')
      .eq('id', organizationId)
      .single()

    if (orgError || !org) {
      console.error('[ContextLoader] No se encontró organización:', orgError)
      return null
    }

    // Construir contexto desde la configuración guardada
    const context: AIContext = {
      organization_id: organizationId,
      organization_name: org.name || aiConfig.business_info?.name || 'Taller',
      services: aiConfig.services || [],
      mechanics: aiConfig.mechanics || [],
      business_hours: aiConfig.business_hours || {},
      policies: aiConfig.policies || {
        payment_methods: ['Efectivo', 'Tarjeta'],
        cancellation_policy: 'Cancelación con 24h de anticipación',
        warranty_policy: '30 días de garantía en servicios'
      },
      faqs: aiConfig.faqs || [],
      contact_info: {
        phone: org.phone || aiConfig.business_info?.phone || '',
        email: org.email || aiConfig.business_info?.email || '',
        address: org.address || aiConfig.business_info?.address || '',
        website: undefined
      }
    }
    return context
  } catch (error) {
    console.error('[ContextLoader] Error cargando contexto:', error)
    return null
  }
}

export async function loadOrganizationContext(
  organizationId: string
): Promise<string> {
  try {
    const supabase = await getSupabaseServerClient()
    
    // Cargar configuración del agente
    const { data: config, error } = await supabase
      .from('ai_agent_config')
      .select('*')
      .eq('organization_id', organizationId)
      .single()
    
    if (error || !config) {
      throw new Error('Configuración no encontrada')
    }

    // Extraer business_info de policies (donde se guarda)
    const businessInfo = config.policies?.business_info || {}
    const businessHours = config.business_hours || {}
    
    // Extraer custom_instructions y escalation_rules de policies
    const customInstructions = config.policies?.custom_instructions || ''
    const escalationRules = config.policies?.escalation_rules || {}
    
    // Parsear personality string a objeto
    const personalityStr = config.personality || 'profesional'
    const personality = {
      tone: personalityStr.includes('formal') ? 'formal' : 
            personalityStr.includes('amigable') ? 'amigable' : 'profesional',
      use_emojis: personalityStr.includes('emojis'),
      local_phrases: personalityStr.includes('modismos'),
      greeting_style: config.policies?.personality?.greeting_style || '¡Hola! ¿En qué puedo ayudarte?'
    }
    
    // Construir system prompt dinámicamente
    const systemPrompt = `
Eres el asistente de WhatsApp de ${businessInfo.name || 'este taller'}.

## INFORMACIÓN DEL TALLER
- Dirección: ${businessInfo.address || 'No especificada'}
- Teléfono: ${businessInfo.phone || 'No especificado'}
- Horarios:
${Object.entries(businessHours).map(([day, hours]: [string, any]) => {
  if (!hours) return `  - ${day}: Cerrado`
  return `  - ${day}: ${hours.start || ''} - ${hours.end || ''}`
}).join('\n')}
${businessInfo.emergency_phone ? `- Emergencias: ${businessInfo.emergency_phone}` : ''}

## SERVICIOS QUE OFRECEMOS
${(config.services || []).map((s: any) => `
- ${s.name || 'Servicio'}
  ${s.price_range ? `Precio: ${s.price_range}` : ''}
  ${s.duration ? `Duración: ${s.duration}` : ''}
  ${s.description ? `Descripción: ${s.description}` : ''}
`).join('\n')}

## POLÍTICAS
- Formas de pago: ${(config.policies?.payment_methods || []).join(', ') || 'No especificadas'}
- Depósito requerido: ${config.policies?.deposit_required ? `Sí, ${config.policies.deposit_percentage || 0}%` : 'No'}
- Cancelaciones: ${config.policies?.cancellation_policy || 'No especificada'}
- Garantía: ${config.policies?.warranty || config.policies?.warranty_policy || 'No especificada'}
- Seguros: ${config.policies?.insurance_accepted ? 'Sí aceptamos' : 'No aceptamos'}

## PREGUNTAS FRECUENTES
${(config.faqs || []).map((f: any) => `
P: ${f.question || ''}
R: ${f.answer || ''}
`).join('\n')}

## PERSONALIDAD
- Tono: ${personality.tone || 'profesional'}
- ${personality.use_emojis ? 'Usa emojis cuando sea apropiado' : 'No uses emojis'}
- ${personality.local_phrases ? 'Puedes usar modismos locales' : 'Usa lenguaje estándar'}
- Saludo inicial: "${personality.greeting_style || '¡Hola! ¿En qué puedo ayudarte?'}"

${customInstructions ? `
## INSTRUCCIONES ADICIONALES
${customInstructions}
` : ''}

## REGLAS DE ESCALAMIENTO
${(escalationRules?.keywords_to_escalate || []).length > 0 ? `
Si el cliente menciona estas palabras, escala a humano inmediatamente:
${escalationRules.keywords_to_escalate.join(', ')}
` : ''}

Si después de ${escalationRules?.max_messages_before_escalate || 10} mensajes no puedes resolver el problema, sugiere contacto con un humano.

## TU OBJETIVO
Ayudar a los clientes a:
1. Obtener información sobre servicios y precios
2. Agendar citas
3. Conocer el estado de su vehículo
4. Resolver dudas generales

Siempre sé ${personality.tone || 'profesional'}, ${personality.use_emojis ? 'amigable' : 'profesional'} y útil.
`
    
    return systemPrompt
  } catch (error) {
    console.error('[ContextLoader] Error cargando contexto de organización:', error)
    throw error
  }
}

export async function getAIConfig(
  organizationId: string
): Promise<AIAgentConfig | null> {
  try {
    const supabase = await getSupabaseServerClient()

    const { data, error } = await supabase
      .from('ai_agent_config')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    if (error || !data) {
      console.error('[ContextLoader] Error obteniendo AI config:', error)
      return null
    }

    return {
      organization_id: data.organization_id,
      enabled: data.enabled,
      provider: data.provider,
      model: data.model,
      system_prompt: data.system_prompt,
      personality: data.personality,
      language: data.language,
      temperature: parseFloat(data.temperature),
      max_tokens: data.max_tokens,
      auto_schedule_appointments: data.auto_schedule_appointments,
      auto_create_orders: data.auto_create_orders,
      require_human_approval: data.require_human_approval,
      business_hours_only: data.business_hours_only,
      business_hours: data.business_hours
    }
  } catch (error) {
    console.error('[ContextLoader] Error en getAIConfig:', error)
    return null
  }
}

export async function getConversationHistory(
  conversationId: string,
  limit: number = 10
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  try {
    const supabase = await getSupabaseServerClient()

    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('direction, body, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error || !data) {
      console.error('[ContextLoader] Error obteniendo historial:', error)
      return []
    }

    return data.map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.body
    }))
  } catch (error) {
    console.error('[ContextLoader] Error en getConversationHistory:', error)
    return []
  }
}

export function isWithinBusinessHours(
  businessHours: Record<string, { start: string; end: string } | null>,
  date: Date = new Date()
): boolean {
  try {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayName = days[date.getDay()]
    
    const hours = businessHours[dayName]
    
    if (!hours) { return false }

    const currentTime = date.getHours() * 60 + date.getMinutes()
    const [startHour, startMin] = hours.start.split(':').map(Number)
    const [endHour, endMin] = hours.end.split(':').map(Number)
    
    const startTime = startHour * 60 + startMin
    const endTime = endHour * 60 + endMin

    return currentTime >= startTime && currentTime <= endTime
  } catch (error) {
    console.error('[ContextLoader] Error verificando horario:', error)
    return true
  }
}

export function buildSystemPrompt(
  config: AIAgentConfig,
  context: AIContext
): string {
  const basePrompt = config.system_prompt || `Eres el asistente virtual de ${context.organization_name}, un taller mecánico profesional.`

  const contextualInfo = `
# INFORMACIÓN DEL TALLER
**Nombre:** ${context.organization_name}
**Dirección:** ${context.contact_info.address}
**Teléfono:** ${context.contact_info.phone}
**Email:** ${context.contact_info.email}

# SERVICIOS DISPONIBLES
${context.services.length > 0 ? context.services.map((s: any) => 
  `- **${s.name}**: ${s.price_range || 'Consultar precio'} (${s.duration || 'Consultar duración'})\n  ${s.description || ''}`
).join('\n') : 'No hay servicios configurados'}

# HORARIOS DE ATENCIÓN
${Object.entries(context.business_hours).map(([day, hours]: [string, any]) => {
  if (!hours) return `- **${day}**: Cerrado`
  return `- **${day}**: ${hours.start} - ${hours.end}`
}).join('\n')}

# MECÁNICOS DISPONIBLES
${context.mechanics.length > 0 ? context.mechanics.map((m: any) => 
  `- ${m.name}${m.specialties?.length ? ` (${m.specialties.join(', ')})` : ''}`
).join('\n') : 'Información no disponible'}

# PREGUNTAS FRECUENTES
${context.faqs.length > 0 ? context.faqs.map((faq: any) => 
  `**P: ${faq.question}**\nR: ${faq.answer}`
).join('\n\n') : 'No hay FAQs configuradas'}

# POLÍTICAS
**Métodos de pago:** ${context.policies.payment_methods?.join(', ') || 'Consultar'}
**Cancelación:** ${context.policies.cancellation_policy || 'Consultar'}
**Garantía:** ${context.policies.warranty || context.policies.warranty_policy || 'Consultar'}

# INSTRUCCIONES IMPORTANTES
- Tu personalidad es: ${config.personality?.tone || 'profesional'}
- Idioma: ${config.language}
- Sé breve y conciso en WhatsApp (máximo 3-4 líneas por mensaje)
- Usa emojis moderadamente 🔧 ⚙️ 🚗
- Siempre confirma datos importantes antes de agendar
${config.auto_schedule_appointments ? '- Puedes agendar citas automáticamente' : '- NO puedes agendar sin aprobación humana'}
${config.auto_create_orders ? '- Puedes crear órdenes automáticamente' : '- NO puedes crear órdenes sin aprobación'}
${config.business_hours_only ? '- Solo agenda dentro del horario de atención' : ''}
${config.require_human_approval ? '- Siempre pide confirmación antes de acciones importantes' : ''}

# FUNCIONES DISPONIBLES
Tienes acceso a estas funciones:
- **schedule_appointment**: Agendar una cita
- **check_availability**: Verificar horarios disponibles
- **get_service_price**: Consultar precio de un servicio
- **create_quote**: Crear cotización

Úsalas cuando sea necesario para ayudar al cliente.
`
  return basePrompt + contextualInfo
}
