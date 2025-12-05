import { getSupabaseServerClient } from '../utils/supabase-server-helpers'
import type { AIContext, AIAgentConfig } from '../types'

export async function loadAIContext(
  organizationId: string,
  conversationId: string,
  useServiceClient: boolean = false
): Promise<AIContext | null> {
  try {
    // Usar service client si se solicita (para bypass RLS en pruebas)
    let supabase
    if (useServiceClient) {
      try {
        const { getSupabaseServiceClient } = await import('@/lib/supabase/server')
        supabase = getSupabaseServiceClient()
        console.log('[ContextLoader] 🔑 Usando service client para cargar contexto (bypass RLS)')
      } catch (serviceError) {
        console.warn('[ContextLoader] ⚠️ Service client no disponible, usando cliente regular:', serviceError)
        supabase = await getSupabaseServerClient()
      }
    } else {
      supabase = await getSupabaseServerClient()
    }

    let { data: aiConfig, error: aiError } = await supabase
      .from('ai_agent_config')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    // Si falla y no estamos usando service client, intentar con service client como fallback
    if ((aiError || !aiConfig) && !useServiceClient) {
      console.warn('[ContextLoader] ⚠️ No se pudo cargar con cliente regular, intentando con service client...')
      try {
        const { getSupabaseServiceClient } = await import('@/lib/supabase/server')
        const serviceSupabase = getSupabaseServiceClient()
        const retryResult: any = await serviceSupabase
          .from('ai_agent_config')
          .select('*')
          .eq('organization_id', organizationId)
          .single()
        
        if (!retryResult.error && retryResult.data) {
          console.log('[ContextLoader] ✅ Configuración encontrada con service client (fallback)')
          aiConfig = retryResult.data
          aiError = null
        }
      } catch (fallbackError) {
        console.error('[ContextLoader] ❌ Fallback con service client también falló:', fallbackError)
      }
    }

    if (aiError || !aiConfig) {
      console.error('[ContextLoader] ❌ No se encontró configuración AI:', {
        error: aiError?.message,
        code: aiError?.code,
        organizationId
      })
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
    
    // 🔍 LOG DEL CONTEXTO CONSTRUIDO
    console.log('[ContextLoader] ====== CONTEXTO AI CONSTRUIDO ======')
    console.log('[ContextLoader] 🏢 Organization Name:', context.organization_name)
    console.log('[ContextLoader] 🔧 Services:', context.services.length, 'items')
    console.log('[ContextLoader] 👥 Mechanics:', context.mechanics.length, 'items')
    console.log('[ContextLoader] ⏰ Business Hours:', Object.keys(context.business_hours).length, 'días')
    console.log('[ContextLoader] 📋 Policies:', Object.keys(context.policies).length, 'items')
    console.log('[ContextLoader] ❓ FAQs:', context.faqs.length, 'items')
    console.log('[ContextLoader] 📞 Contact Info:', JSON.stringify(context.contact_info))
    console.log('[ContextLoader] ==========================================')
    
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

## AGENDAMIENTO DE CITAS
Cuando un cliente quiera agendar una cita:
1. **Sé conversacional, NO un cuestionario robótico**: Pregunta de forma natural, como en una conversación real
2. **Menciona precios**: Cuando el cliente pregunte por un servicio, menciona el precio si está en la configuración (usa los servicios configurados con sus precios)
3. **Verifica horarios**: Antes de crear una solicitud, verifica que la fecha/hora esté dentro de business_hours usando la función check_availability
4. **Confirma datos**: Antes de crear la solicitud, confirma los detalles de forma amigable: "Perfecto, entonces quieres agendar [servicio] para tu [vehículo] el [fecha] a las [hora]. ¿Es correcto?"
5. **Solo crea solicitud cuando tengas**: servicio, vehículo, fecha y hora. Si falta algo, pregunta naturalmente
6. **Usa la función create_appointment_request** cuando tengas toda la información necesaria
7. **Respeta business_hours**: Si el cliente pide un horario fuera del horario del taller, sugiere horarios disponibles dentro del rango

Ejemplo de conversación natural:
- Cliente: "Quiero agendar un cambio de aceite"
- Tú: "¡Por supuesto! El cambio de aceite tiene un precio de $XXX. ¿Para qué vehículo sería?"
- Cliente: "Para mi Honda Civic 2020"
- Tú: "Perfecto. ¿Qué día te conviene?"
- Cliente: "El viernes"
- Tú: "Déjame verificar disponibilidad para el viernes..." [llama check_availability]
- Tú: "Tenemos horarios disponibles el viernes a las 10:00, 14:00 y 16:00. ¿Cuál prefieres?"
- Cliente: "Las 2 de la tarde"
- Tú: "Excelente. Entonces cambio de aceite para tu Honda Civic 2020 el viernes a las 14:00. ¿Algo más que deba saber?" [llama create_appointment_request]
- Tú: "¡Listo! Tu solicitud de cita ha sido creada. Te confirmaremos pronto. 😊"

## TU OBJETIVO
Ayudar a los clientes a:
1. Obtener información sobre servicios y precios
2. Agendar citas de forma natural y conversacional
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
  organizationId: string,
  useServiceClient: boolean = false
): Promise<AIAgentConfig | null> {
  try {
    console.log('[ContextLoader] 🔍 Buscando AI config para organizationId:', organizationId)
    
    // Usar service client si se solicita (para bypass RLS en pruebas)
    let supabase
    if (useServiceClient) {
      try {
        const { getSupabaseServiceClient } = await import('@/lib/supabase/server')
        supabase = getSupabaseServiceClient()
        console.log('[ContextLoader] 🔑 Usando service client (bypass RLS)')
      } catch (serviceError) {
        console.warn('[ContextLoader] ⚠️ Service client no disponible, usando cliente regular:', serviceError)
        supabase = await getSupabaseServerClient()
      }
    } else {
      supabase = await getSupabaseServerClient()
    }

    const { data, error } = await supabase
      .from('ai_agent_config')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      console.error('[ContextLoader] ❌ Error obteniendo AI config:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        organizationId
      })
      
      // Si el error es "no rows found" (PGRST116), es esperado si no hay configuración
      if (error.code === 'PGRST116') {
        console.log('[ContextLoader] ℹ️ No existe configuración para esta organización (esperado en pruebas)')
      }
      
      return null
    }

    if (!data) {
      console.warn('[ContextLoader] ⚠️ No se encontró configuración (data es null)')
      return null
    }

    // 🔍 LOG DETALLADO DE CONFIGURACIÓN CARGADA
    console.log('[ContextLoader] ====== CONFIGURACIÓN AI ENCONTRADA ======')
    console.log('[ContextLoader] ✅ ID:', data.id)
    console.log('[ContextLoader] 📍 Organization ID:', data.organization_id)
    console.log('[ContextLoader] ✅ Enabled:', data.enabled)
    console.log('[ContextLoader] 🤖 Provider:', data.provider)
    console.log('[ContextLoader] 🧠 Model:', data.model)
    console.log('[ContextLoader] 🎭 Personality:', data.personality)
    console.log('[ContextLoader] 🌍 Language:', data.language)
    console.log('[ContextLoader] 🌡️ Temperature:', data.temperature)
    console.log('[ContextLoader] 📏 Max Tokens:', data.max_tokens)
    console.log('[ContextLoader] 📅 Auto Schedule:', data.auto_schedule_appointments)
    console.log('[ContextLoader] 📝 Auto Create Orders:', data.auto_create_orders)
    console.log('[ContextLoader] 👤 Require Human Approval:', data.require_human_approval)
    console.log('[ContextLoader] ⏰ Business Hours Only:', data.business_hours_only)
    console.log('[ContextLoader] 📜 System Prompt:', data.system_prompt ? `${data.system_prompt.length} caracteres` : 'NO CONFIGURADO')
    console.log('[ContextLoader] 📜 System Prompt Preview:', data.system_prompt?.substring(0, 200) || 'N/A')
    console.log('[ContextLoader] 🔧 Services:', JSON.stringify(data.services || []).substring(0, 100))
    console.log('[ContextLoader] 👥 Mechanics:', JSON.stringify(data.mechanics || []).substring(0, 100))
    console.log('[ContextLoader] 📋 Policies:', JSON.stringify(data.policies || {}).substring(0, 100))
    console.log('[ContextLoader] ❓ FAQs:', Array.isArray(data.faqs) ? `${data.faqs.length} items` : 'N/A')
    console.log('[ContextLoader] ⏰ Business Hours:', JSON.stringify(data.business_hours || {}).substring(0, 100))
    console.log('[ContextLoader] =============================================')

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
    console.error('[ContextLoader] ❌ Excepción en getAIConfig:', error)
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
  // ✅ NUEVO: Prompt estructurado y completo
  const systemPrompt = `Eres el asistente virtual de WhatsApp de ${context.organization_name}, un taller mecánico profesional.

# 🏢 INFORMACIÓN DEL TALLER
- Nombre: ${context.organization_name}
- Dirección: ${context.contact_info.address || 'No especificada'}
- Teléfono: ${context.contact_info.phone || 'No especificado'}
- Email: ${context.contact_info.email || 'No especificado'}

# ⏰ HORARIOS DE ATENCIÓN
${Object.entries(context.business_hours || {}).map(([day, hours]: [string, any]) => {
  const dayNames: Record<string, string> = {
    monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
    thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo'
  };
  const dayName = dayNames[day] || day;
  if (!hours) return `${dayName}: Cerrado`;
  return `${dayName}: ${hours.start} - ${hours.end}`;
}).join('\\n')}

# 🔧 SERVICIOS QUE OFRECEMOS
${context.services && context.services.length > 0 ? context.services.map((s: any) => 
  `- **${s.name}**${s.price_range ? `\\n  Precio: ${s.price_range}` : ''}${s.duration ? `\\n  Duración: ${s.duration}` : ''}${s.description ? `\\n  ${s.description}` : ''}`
).join('\\n\\n') : 'Consulta nuestros servicios disponibles llamando al ' + (context.contact_info.phone || 'taller')}

# 💳 POLÍTICAS DEL TALLER
- **Formas de pago:** ${context.policies?.payment_methods?.join(', ') || 'Efectivo y tarjeta'}
- **Cancelaciones:** ${context.policies?.cancellation_policy || '24 horas de anticipación'}
- **Garantía:** ${context.policies?.warranty_policy || '30 días en servicios'}

# ❓ PREGUNTAS FRECUENTES
${context.faqs && context.faqs.length > 0 ? context.faqs.map((faq: any) => 
  `**P: ${faq.question}**\\nR: ${faq.answer}`
).join('\\n\\n') : 'No hay preguntas frecuentes configuradas'}

# 📋 REGLAS DE CONVERSACIÓN
1. **Personalidad:** ${config.personality || 'Profesional y amigable'}
2. **Idioma:** ${config.language || 'Español'}
3. **Brevedad:** Responde en máximo 2-3 líneas. WhatsApp es rápido.
4. **Emojis:** Usa emojis moderadamente 🔧 ⚙️ 🚗
5. **Confirmación:** Siempre confirma datos importantes (nombre, fecha, hora, servicio)

# 🚫 RESTRICCIONES IMPORTANTES
${!config.auto_schedule_appointments ? '❌ NO puedes agendar citas sin confirmación humana. Di: "Permíteme verificar disponibilidad con el taller y te confirmo en breve"' : '✅ Puedes agendar citas automáticamente'}
${!config.auto_create_orders ? '❌ NO puedes crear órdenes sin aprobación' : '✅ Puedes crear órdenes automáticamente'}
${config.business_hours_only ? '⏰ Solo agenda dentro del horario de atención' : ''}
${config.require_human_approval ? '👤 Siempre pide aprobación humana antes de acciones importantes' : ''}

# 🛠️ INSTRUCCIONES ESPECIALES
${config.system_prompt || 'Ayuda a los clientes de manera profesional y eficiente'}

# ⚙️ FUNCIONES DISPONIBLES
${config.auto_schedule_appointments ? `
## FUNCIONES DE AGENDAMIENTO (HABILITADAS)
Tienes acceso a estas funciones para agendar citas:

1. **get_services_info**: Obtiene información de servicios (precios, duraciones, descripciones)
   - Usa cuando el cliente pregunte por servicios o precios
   - Parámetro opcional: service_name (si no se proporciona, retorna todos)

2. **check_availability**: Verifica disponibilidad para una fecha
   - Usa ANTES de crear una solicitud para verificar horarios disponibles
   - Requiere: date (YYYY-MM-DD)
   - Retorna: horarios del negocio, citas ocupadas, slots disponibles

3. **create_appointment_request**: Crea una solicitud de cita
   - Usa SOLO cuando tengas: service_type, vehicle_description, preferred_date, preferred_time
   - Requiere: service_type, vehicle_description, preferred_date, preferred_time
   - Opcionales: customer_name, estimated_price, notes
   - IMPORTANTE: Verifica disponibilidad primero con check_availability

## REGLAS DE AGENDAMIENTO
1. **Menciona precio ANTES de agendar**: Cuando el cliente pregunte por un servicio, menciona el precio usando get_services_info
2. **Confirma datos antes de crear**: Antes de llamar create_appointment_request, confirma de forma natural: "Perfecto, entonces quieres agendar [servicio] para tu [vehículo] el [fecha] a las [hora]. ¿Es correcto?"
3. **Sé conversacional, NO cuestionario**: No hagas preguntas una tras otra. Mantén una conversación natural
4. **Verifica disponibilidad**: Siempre llama check_availability antes de crear una solicitud
5. **Valida horarios**: Si el cliente pide un horario fuera de business_hours, sugiere horarios dentro del rango
6. **Solo crea solicitud con información completa**: Si falta servicio, vehículo, fecha o hora, pregunta naturalmente en lugar de crear la solicitud

## EJEMPLO DE CONVERSACIÓN NATURAL
Cliente: "Quiero agendar un cambio de aceite"
Tú: "¡Por supuesto! Déjame consultar la información del cambio de aceite..." [llama get_services_info]
Tú: "El cambio de aceite tiene un precio de $300-$600 y dura aproximadamente 30 minutos. ¿Para qué vehículo sería?"
Cliente: "Para mi Honda Civic 2020"
Tú: "Perfecto. ¿Qué día te conviene?"
Cliente: "El viernes"
Tú: "Déjame verificar disponibilidad para el viernes..." [llama check_availability]
Tú: "Tenemos horarios disponibles el viernes a las 10:00, 14:00 y 16:00. ¿Cuál prefieres?"
Cliente: "Las 2 de la tarde"
Tú: "Excelente. Entonces cambio de aceite para tu Honda Civic 2020 el viernes a las 14:00. ¿Algo más que deba saber?"
Cliente: "No, eso es todo"
Tú: "Perfecto, agendando tu cita..." [llama create_appointment_request]
Tú: ${config.require_human_approval ? '"¡Listo! Tu solicitud de cita ha sido creada. Te confirmaremos en breve. 😊"' : '"¡Cita confirmada! Te esperamos el viernes a las 14:00. 😊"'}

` : `
## FUNCIONES DISPONIBLES
- **get_service_price**: Consultar precios
- **create_quote**: Crear cotizaciones
- **NOTA**: El agendamiento de citas requiere aprobación humana. Di: "Permíteme verificar disponibilidad con el taller y te confirmo en breve"
`}

---

## TU OBJETIVO PRINCIPAL
Responder preguntas, proporcionar información del taller y ${config.auto_schedule_appointments ? 'ayudar a agendar citas de manera eficiente y profesional' : 'ayudar a los clientes con información y cotizaciones'}.

**RECUERDA:** Eres la primera línea de atención. Sé útil, breve y preciso.`;

  return systemPrompt;
}
