import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

/**
 * POST /api/whatsapp/webhook
 * Recibe mensajes de WAHA y los procesa
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('[WAHA Webhook] 📨 Mensaje recibido:', {
      event: body.event,
      session: body.session,
      from: body.payload?.from,
      hasPayload: !!body.payload
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

    // Extraer información del mensaje
    const fromNumber = payload.from?.replace('@c.us', '') || payload.chatId?.replace('@c.us', '')
    const toNumber = payload.to?.replace('@c.us', '') || ''
    const messageBody = payload.body || payload.text || ''
    const messageType = payload.type || 'text'
    
    if (!fromNumber) {
      console.log('[WAHA Webhook] ❌ No se pudo extraer número de origen')
      return NextResponse.json({ 
        success: false, 
        error: 'Missing from number' 
      }, { status: 400 })
    }

    console.log('[WAHA Webhook] 📞 De:', fromNumber, 'Mensaje:', messageBody.substring(0, 50))

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

    // Guardar mensaje
    const { error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversation.id,
        organization_id: organizationId,
        from_number: fromNumber,
        to_number: toNumber || fromNumber,
        direction: 'inbound',
        body: messageBody,
        message_type: messageType,
        status: 'delivered',
        provider_message_id: payload.id || payload.messageId,
        sent_at: payload.timestamp ? new Date(payload.timestamp * 1000).toISOString() : new Date().toISOString(),
        metadata: {
          waha_payload: payload
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

