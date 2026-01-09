import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

/**
 * Función para limpiar y formatear número de teléfono
 * Convierte formatos de WAHA a formato estándar de 10 dígitos
 */
function cleanPhoneNumber(rawNumber: string): string {
  if (!rawNumber) return ''
  
  // Remover @c.us, @s.whatsapp.net y otros sufijos
  let cleaned = rawNumber
    .replace('@c.us', '')
    .replace('@s.whatsapp.net', '')
    .replace('@g.us', '')
  
  // Si empieza con 521 (México con carrier), remover '52' y dejar '1' + número
  if (cleaned.startsWith('521')) {
    return cleaned.substring(2) // Remover '52' país, dejar '1' carrier + número
  }
  
  // Si empieza con 52 (México sin carrier)
  if (cleaned.startsWith('52')) {
    return cleaned.substring(2) // Remover código de país
  }
  
  // Si es número de 10 dígitos (México), ya está correcto
  if (cleaned.length === 10 && /^\d{10}$/.test(cleaned)) {
    return cleaned
  }
  
  // Si es número de 13+ dígitos, probablemente tiene código país
  if (cleaned.length >= 13) {
    // Intentar extraer últimos 10 dígitos
    return cleaned.slice(-10)
  }
  
  // Si tiene 11-12 dígitos, podría ser 1 + 10 dígitos (EEUU/México con carrier)
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return cleaned.substring(1) // Remover '1' carrier, dejar 10 dígitos
  }
  
  // Retornar limpio sin modificar
  return cleaned
}

/**
 * POST /api/whatsapp/webhook
 * Recibe mensajes de WAHA y los procesa
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Log detallado del payload completo para debugging
    console.log('[WAHA Webhook] 📨 Raw payload:', {
      event: body.event,
      session: body.session,
      from: body.payload?.from,
      chatId: body.payload?.chatId,
      author: body.payload?.author,
      to: body.payload?.to,
      hasPayload: !!body.payload,
      payloadKeys: body.payload ? Object.keys(body.payload) : []
    })

    // Validar que sea un mensaje
    if (!body.event || !body.payload) {
      console.log('[WAHA Webhook] ⚠️ Evento sin payload, ignorando')
      return NextResponse.json({ success: true, message: 'Event ignored' })
    }

    // Solo procesar mensajes entrantes
    if (body.event !== 'message' && body.event !== 'message.any') {
      console.log('[WAHA Webhook] ⚠️ Evento no es mensaje:', body.event)
      return NextResponse.json({ success: true, message: 'Event ignored' })
    }

    const payload = body.payload
    
    // Ignorar mensajes enviados por nosotros
    if (payload.fromMe) {
      console.log('[WAHA Webhook] ⚠️ Mensaje enviado por nosotros, ignorando')
      return NextResponse.json({ success: true, message: 'Own message ignored' })
    }

    // Extraer número de origen usando múltiples fuentes
    const rawFrom = payload.from || payload.chatId || payload.author || ''
    const fromNumber = cleanPhoneNumber(rawFrom)
    
    // Extraer número de destino (puede ser vacío para mensajes entrantes)
    const rawTo = payload.to || ''
    const toNumber = cleanPhoneNumber(rawTo)
    
    const messageBody = payload.body || payload.text || ''
    const messageType = payload.type || 'text'
    
    // Log para debugging del formato de números
    console.log('[WAHA Webhook] 📞 Raw number:', rawFrom, '→ Cleaned:', fromNumber)
    if (rawTo) {
      console.log('[WAHA Webhook] 📞 Raw to:', rawTo, '→ Cleaned:', toNumber)
    }
    
    if (!fromNumber || fromNumber.length < 10) {
      console.log('[WAHA Webhook] ❌ No se pudo extraer número de origen válido', {
        rawFrom,
        cleaned: fromNumber,
        length: fromNumber?.length
      })
      return NextResponse.json({ 
        success: false, 
        error: 'Missing or invalid from number',
        details: { rawFrom, cleaned: fromNumber }
      }, { status: 400 })
    }

    console.log('[WAHA Webhook] ✅ Número validado:', fromNumber, '| Mensaje:', messageBody.substring(0, 50))

    // Obtener organization_id desde la sesión de WAHA
    const sessionName = body.session
    const supabase = getSupabaseServiceClient()
    
    // Buscar organization_id por session name
    const { data: agentConfig, error: configError } = await supabase
      .from('ai_agent_config')
      .select('organization_id')
      .eq('whatsapp_session_name', sessionName)
      .single()

    if (configError || !agentConfig?.organization_id) {
      console.log('[WAHA Webhook] ❌ No se encontró organización para sesión:', sessionName, configError)
      return NextResponse.json({ 
        success: false, 
        error: 'Organization not found' 
      }, { status: 404 })
    }

    const organizationId = agentConfig.organization_id

    // Buscar o crear conversación
    let { data: conversation, error: convError } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('customer_phone', fromNumber)
      .single()

    if (convError || !conversation) {
      // Crear nueva conversación
      console.log('[WAHA Webhook] ✨ Creando nueva conversación para:', fromNumber)
      
      const { data: newConv, error: createError } = await supabase
        .from('whatsapp_conversations')
        .insert({
          organization_id: organizationId,
          customer_phone: fromNumber,
          customer_name: payload.pushName || payload._data?.notifyName || fromNumber,
          status: 'active',
          last_message_at: new Date().toISOString(),
          last_message: messageBody,
          messages_count: 1,
          is_bot_active: true,
          profile_picture_url: payload.avatar || null,
          metadata: {
            source: 'waha',
            session: sessionName
          }
        })
        .select()
        .single()

      if (createError) {
        console.error('[WAHA Webhook] ❌ Error creando conversación:', createError)
        return NextResponse.json({ 
          success: false, 
          error: createError.message 
        }, { status: 500 })
      }

      conversation = newConv
    } else {
      // Actualizar conversación existente
      console.log('[WAHA Webhook] 🔄 Actualizando conversación existente')
      
      await supabase
        .from('whatsapp_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message: messageBody,
          messages_count: (conversation.messages_count || 0) + 1,
          status: 'active'
        })
        .eq('id', conversation.id)
    }

    // Guardar mensaje (usar fromNumber limpio para to_number si está vacío)
    const cleanToNumber = toNumber || fromNumber
    const { error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversation.id,
        organization_id: organizationId,
        from_number: fromNumber, // Ya limpio
        to_number: cleanToNumber, // Ya limpio
        direction: 'inbound',
        body: messageBody,
        message_type: messageType,
        status: 'delivered',
        provider_message_id: payload.id || payload.messageId,
        sent_at: payload.timestamp ? new Date(payload.timestamp * 1000).toISOString() : new Date().toISOString(),
        metadata: {
          waha_payload: payload,
          raw_from: rawFrom, // Guardar número original para referencia
          raw_to: rawTo || null
        }
      })

    if (messageError) {
      console.error('[WAHA Webhook] ❌ Error guardando mensaje:', messageError)
    } else {
      console.log('[WAHA Webhook] ✅ Mensaje guardado correctamente')
    }

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      message: 'Message processed'
    })

  } catch (error: any) {
    console.error('[WAHA Webhook] ❌ Error procesando webhook:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

/**
 * GET /api/whatsapp/webhook
 * Verificación del webhook
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'WhatsApp webhook is active',
    timestamp: new Date().toISOString()
  })
}

