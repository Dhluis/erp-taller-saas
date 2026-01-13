import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

/**
 * Función para limpiar y formatear número de teléfono
 * Convierte formatos de WAHA a formato estándar internacional: 52XXXXXXXXXX (12 dígitos para México)
 */
function cleanPhoneNumber(rawNumber: string): string {
  if (!rawNumber) return ''
  
  console.log('[cleanPhoneNumber] 🔍 Input:', rawNumber)
  
  // Remover @c.us, @s.whatsapp.net y otros sufijos
  let cleaned = rawNumber
    .replace('@c.us', '')
    .replace('@s.whatsapp.net', '')
    .replace('@g.us', '')
    .trim()
  
  // Remover espacios, guiones, paréntesis
  cleaned = cleaned.replace(/[\s\-\(\)]/g, '')
  
  // Remover + si existe al inicio
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1)
  }
  
  console.log('[cleanPhoneNumber] 🧹 Cleaned:', cleaned)
  
  // Si tiene letras u otros caracteres no numéricos, removerlos
  cleaned = cleaned.replace(/[^0-9]/g, '')
  
  // CASO 1: Número ya tiene 12 dígitos y empieza con 52 (México) - FORMATO CORRECTO
  if (cleaned.length === 12 && cleaned.startsWith('52')) {
    console.log('[cleanPhoneNumber] ✅ Formato 52XXXXXXXXXX (12 dígitos):', cleaned)
    return cleaned
  }
  
  // CASO 2: Número tiene 13 dígitos y empieza con 521 (México con 1 adicional)
  if (cleaned.length === 13 && cleaned.startsWith('521')) {
    const result = '52' + cleaned.substring(3) // Remover el '1' del medio
    console.log('[cleanPhoneNumber] ✅ Formato 521XXXXXXXXXX → 52XXXXXXXXXX:', result)
    return result
  }
  
  // CASO 3: Número tiene 10 dígitos (sin código de país) - AGREGAR 52
  if (cleaned.length === 10) {
    const result = '52' + cleaned
    console.log('[cleanPhoneNumber] ✅ Formato XXXXXXXXXX → 52XXXXXXXXXX:', result)
    return result
  }
  
  // CASO 4: Número tiene 11 dígitos y empieza con 1 (carrier USA/México)
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const result = '52' + cleaned.substring(1) // Remover '1', agregar '52'
    console.log('[cleanPhoneNumber] ✅ Formato 1XXXXXXXXXX → 52XXXXXXXXXX:', result)
    return result
  }
  
  // CASO 5: Números muy largos (14+ dígitos) - probablemente mal formateados
  // Buscar secuencia que empiece con 52 seguido de 10 dígitos
  if (cleaned.length >= 12) {
    const match = cleaned.match(/52(\d{10})/)
    if (match) {
      const result = '52' + match[1]
      console.log('[cleanPhoneNumber] ✅ Extraído 52XXXXXXXXXX de número largo:', result)
      return result
    }
    
    // Si no encuentra patrón, tomar últimos 10 dígitos y agregar 52
    const last10 = cleaned.slice(-10)
    const result = '52' + last10
    console.log('[cleanPhoneNumber] ⚠️ Fallback: últimos 10 dígitos + 52:', result)
    return result
  }
  
  // CASO 6: Números muy cortos (< 10 dígitos) - probablemente inválidos
  if (cleaned.length < 10) {
    console.warn('[cleanPhoneNumber] ⚠️ Número demasiado corto (<10 dígitos):', cleaned)
    // Intentar agregar 52 y ver si tiene sentido
    if (cleaned.length >= 8) {
      const result = '52' + cleaned.padStart(10, '0')
      console.log('[cleanPhoneNumber] ⚠️ Fallback: padding + 52:', result)
      return result
    }
    return cleaned // Devolver como está si es muy corto
  }
  
  // DEFAULT: Si no coincide con ningún patrón, devolver con 52
  console.warn('[cleanPhoneNumber] ⚠️ Formato desconocido, agregando 52:', cleaned)
  return '52' + cleaned.slice(-10)
}

/**
 * Extraer nombre del contacto desde payload de WAHA
 */
function extractContactName(payload: any, fallbackPhone: string): string {
  // Intentar obtener nombre de múltiples fuentes
  const possibleNames = [
    payload.pushName,
    payload._data?.notifyName,
    payload._data?.pushName,
    payload.contact?.name,
    payload.contact?.pushname,
    payload.from?.name,
    payload.author?.name
  ].filter(Boolean)
  
  // Usar el primer nombre válido encontrado
  for (const name of possibleNames) {
    const trimmedName = name.trim()
    // Validar que no sea un número de teléfono
    if (trimmedName && trimmedName.length >= 2 && !/^\d+$/.test(trimmedName)) {
      console.log('[extractContactName] ✅ Nombre encontrado:', trimmedName)
      return trimmedName
    }
  }
  
  // Si no se encontró nombre, usar teléfono formateado
  console.log('[extractContactName] ⚠️ No se encontró nombre, usando teléfono')
  return fallbackPhone
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
      pushName: body.payload?.pushName,
      notifyName: body.payload?._data?.notifyName,
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

    // ✅ Extraer nombre del contacto
    const contactName = extractContactName(payload, fromNumber)

    // Buscar o crear conversación
    let { data: conversation, error: convError } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('customer_phone', fromNumber)
      .single()

    if (convError || !conversation) {
      // Crear nueva conversación
      console.log('[WAHA Webhook] ✨ Creando nueva conversación para:', fromNumber, '| Nombre:', contactName)
      
      const { data: newConv, error: createError } = await supabase
        .from('whatsapp_conversations')
        .insert({
          organization_id: organizationId,
          customer_phone: fromNumber,
          customer_name: contactName,
          status: 'active',
          last_message_at: new Date().toISOString(),
          last_message: messageBody,
          messages_count: 1,
          is_bot_active: true,
          profile_picture_url: payload.avatar || null,
          metadata: {
            source: 'waha',
            session: sessionName,
            raw_from: rawFrom, // Guardar número original para debugging
            contact_data: {
              pushName: payload.pushName,
              notifyName: payload._data?.notifyName
            }
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
      
      // Actualizar nombre si cambió y no es "Cliente WhatsApp"
      const updates: any = {
        last_message_at: new Date().toISOString(),
        last_message: messageBody,
        messages_count: (conversation.messages_count || 0) + 1,
        status: 'active'
      }
      
      // Solo actualizar nombre si el nuevo es válido y diferente
      if (contactName && contactName !== 'Cliente WhatsApp' && contactName !== conversation.customer_name) {
        updates.customer_name = contactName
        console.log('[WAHA Webhook] 📝 Actualizando nombre:', conversation.customer_name, '→', contactName)
      }
      
      await supabase
        .from('whatsapp_conversations')
        .update(updates)
        .eq('id', conversation.id)
    }

    // Guardar mensaje (usar fromNumber limpio para to_number si está vacío)
    const cleanToNumber = toNumber || fromNumber
    const { error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversation.id,
        organization_id: organizationId,
        from_number: fromNumber, // Ya limpio y normalizado
        to_number: cleanToNumber, // Ya limpio y normalizado
        direction: 'inbound',
        body: messageBody,
        message_type: messageType,
        status: 'delivered',
        provider_message_id: payload.id || payload.messageId,
        sent_at: payload.timestamp ? new Date(payload.timestamp * 1000).toISOString() : new Date().toISOString(),
        metadata: {
          waha_payload: payload,
          raw_from: rawFrom, // Guardar número original para referencia
          raw_to: rawTo || null,
          contact_name: contactName
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
      cleanedPhone: fromNumber,
      contactName: contactName,
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
