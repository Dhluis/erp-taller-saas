/**
 * WEBHOOK ENDPOINT - WAHA (WhatsApp HTTP API)
 * 
 * Recibe eventos de WAHA:
 * - message: Mensajes entrantes
 * - session.status: Cambios de estado de conexión
 * - message.reaction: Reacciones (solo log por ahora)
 * 
 * Flujo para mensajes:
 * 1. Filtrar mensajes propios y grupos
 * 2. Extraer organizationId del nombre de sesión
 * 3. Buscar/crear conversación
 * 4. Guardar mensaje
 * 5. Si bot activo, procesar con AI
 * 6. Enviar respuesta si hay
 * 7. Guardar mensaje saliente
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { processMessage } from '@/integrations/whatsapp/services/ai-agent';
import { getOrganizationFromSession, sendWhatsAppMessage } from '@/lib/waha-sessions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============================================
// 🛡️ DEDUPLICACIÓN DE MENSAJES
// ============================================
// Cache en memoria para evitar procesar el mismo mensaje múltiples veces
// WAHA puede enviar duplicados por reintentos o problemas de red
const processedMessages = new Map<string, number>();
const MESSAGE_CACHE_TTL = 60000; // 60 segundos
const CLEANUP_INTERVAL = 30000; // Limpiar cada 30 segundos

/**
 * Limpia mensajes viejos del cache periódicamente
 */
function cleanupOldMessages() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, timestamp] of processedMessages.entries()) {
    if (now - timestamp > MESSAGE_CACHE_TTL) {
      processedMessages.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`[Webhook] 🧹 Cache limpiado: ${cleaned} mensajes antiguos eliminados (${processedMessages.size} restantes)`);
  }
}

// Limpiar periódicamente (solo si hay mensajes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    if (processedMessages.size > 0) {
      cleanupOldMessages();
    }
  }, CLEANUP_INTERVAL);
}

/**
 * GET /api/webhooks/whatsapp
 * Verificación del webhook (para algunos providers)
 */
export async function GET(request: NextRequest) {
  console.log('[WAHA Webhook] GET request - Verificación');
  return NextResponse.json({ status: 'ok' });
}

/**
 * POST /api/webhooks/whatsapp
 * Recibe eventos de WAHA
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    
    // LOG DETALLADO PARA DEBUG
    const messageId = body.payload?.id || 
                      body.id || 
                      body.payload?._data?.id?.id ||
                      body.payload?.messageId ||
                      body.messageId ||
                      body.payload?.key?.id ||
                      body.payload?._data?.key?.id;
    const eventType = body.event || body.type || body.eventType;
    
    console.log('='.repeat(60));
    console.log('[Webhook] 🔔 NUEVO EVENTO RECIBIDO');
    console.log('[Webhook] 📋 Event Type:', eventType);
    console.log('[Webhook] 🆔 Message ID:', messageId);
    console.log('[Webhook] 📦 Session:', body.session);
    console.log('[Webhook] ⏰ Timestamp:', new Date().toISOString());
    console.log('[Webhook] 📊 Cache size:', processedMessages.size);
    console.log('[Webhook] 📝 Cache keys:', Array.from(processedMessages.keys()).slice(-5)); // Últimos 5
    console.log('='.repeat(60));
    
    console.log('[WAHA Webhook] Evento recibido:', body.event || body.type || 'unknown');

    // === DEDUPLICACIÓN ===
    
    // Solo deduplicar eventos de mensaje (no session.status)
    if (messageId && (eventType === 'message' || eventType === 'message.any')) {
      const cacheKey = `${messageId}`;
      
      // Verificar si ya procesamos este mensaje
      if (processedMessages.has(cacheKey)) {
        const processedTime = processedMessages.get(cacheKey);
        const secondsAgo = Math.floor((Date.now() - processedTime!) / 1000);
        const millisecondsAgo = Date.now() - processedTime!;
        console.log('='.repeat(60));
        console.log(`[Webhook] ⏭️ DUPLICADO DETECTADO Y BLOQUEADO`);
        console.log(`[Webhook] 🆔 Message ID: ${messageId}`);
        console.log(`[Webhook] ⏰ Procesado hace: ${secondsAgo}s (${millisecondsAgo}ms)`);
        console.log(`[Webhook] 📊 Cache size: ${processedMessages.size}`);
        console.log('='.repeat(60));
        return NextResponse.json({ 
          success: true, 
          skipped: true, 
          reason: 'duplicate_message',
          messageId: messageId
        });
      }
      
      // Marcar como procesado ANTES de procesar (evitar race conditions)
      processedMessages.set(cacheKey, Date.now());
      console.log(`[Webhook] 📝 Mensaje registrado en cache: ${messageId} (cache size: ${processedMessages.size})`);
    }
    // === FIN DEDUPLICACIÓN ===

    // Manejar diferentes tipos de eventos
    
    switch (eventType) {
      case 'message':
      case 'message.any':
        await handleMessageEvent(body);
        break;
      
      case 'session.status':
      case 'status':
        await handleSessionStatusEvent(body);
        break;
      
      case 'message.reaction':
        await handleReactionEvent(body);
        break;
      
      default:
        console.log('[WAHA Webhook] Evento no manejado:', eventType, body);
    }

    // Siempre retornar 200 para evitar reintentos de WAHA
    const processingTime = Date.now() - startTime;
    console.log('[Webhook] ⏱️ Tiempo total de procesamiento:', processingTime, 'ms');
    console.log('[Webhook] ✅ Evento procesado exitosamente');
    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('[WAHA Webhook] ❌ Error procesando evento:', error);
    console.log('[Webhook] ⏱️ Tiempo antes del error:', processingTime, 'ms');
    // Siempre retornar 200 incluso en caso de error
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 200 });
  }
}

/**
 * Maneja eventos de mensaje
 */
async function handleMessageEvent(body: any) {
  try {
    const eventMessageId = body.payload?.id || body.id || body.payload?._data?.id?.id || body.payload?.messageId || body.messageId;
    console.log('='.repeat(60));
    console.log('[Webhook] 📨 INICIANDO handleMessageEvent');
    console.log('[Webhook] 🆔 Message ID en handleMessageEvent:', eventMessageId);
    console.log('[Webhook] ⏰ Timestamp:', new Date().toISOString());
    console.log('='.repeat(60));
    console.log('[WAHA Webhook] 📨 Procesando mensaje...');
    console.log('[WAHA Webhook] 📦 Body completo:', JSON.stringify(body).substring(0, 500));

    // 1. Extraer datos del mensaje
    const message = body.payload || body.message || body.data || body;
    const sessionName = body.session || message.session;
    
    // 2. Extraer messageId (ya se hizo deduplicación arriba, pero lo necesitamos para logs)
    const messageId = message?.id || message?.messageId || body.id || body.payload?.id;
    
    console.log('[WAHA Webhook] 📋 Mensaje extraído:', {
      hasMessage: !!message,
      messageId: messageId,
      sessionName,
      fromMe: message?.fromMe,
      from: message?.from,
      body: message?.body?.substring(0, 50)
    });
    
    // Validar que sea mensaje entrante válido
    if (!message || !sessionName) {
      console.log('[WAHA Webhook] ⚠️ Mensaje inválido o sin sesión');
      return;
    }

    // 3. Ignorar si fromMe es true (mensaje propio)
    // Verificar en múltiples ubicaciones posibles
    const isFromMe = 
      message.fromMe === true || 
      message.fromMe === 'true' ||
      message.fromMe === 1 ||
      message.key?.fromMe === true ||
      message.key?.fromMe === 'true' ||
      message._data?.key?.fromMe === true;
    
    if (isFromMe) {
      console.log('[WAHA Webhook] ⏭️ Ignorando mensaje propio (fromMe=true)');
      return;
    }
    
    console.log('[WAHA Webhook] ✅ Mensaje es entrante, procesando...');

    // 4. Ignorar si chatId contiene @g.us (grupo)
    const chatId = message.chatId || message.from || message.to;
    if (chatId && chatId.includes('@g.us')) {
      console.log('[WAHA Webhook] ⏭️ Ignorando mensaje de grupo');
      return;
    }

    // 5. IMPORTANTE: Extraer número del remitente y verificar que no sea la misma sesión
    const fromNumber = extractPhoneNumber(chatId);
    console.log('[WAHA Webhook] 📱 Número del remitente:', fromNumber);
    
    // Obtener organizationId para verificar el número de la sesión
    const organizationId = await getOrganizationFromSession(sessionName);
    if (!organizationId) {
      console.error('[WAHA Webhook] ❌ No se pudo obtener organizationId de sesión:', sessionName);
      return;
    }

    // Obtener el estado de la sesión para verificar el número propio
    try {
      const { getSessionStatus } = await import('@/lib/waha-sessions');
      const sessionStatus = await getSessionStatus(sessionName, organizationId);
      const ownPhone = sessionStatus?.me?.id?.split('@')[0] || 
                       sessionStatus?.me?.phone ||
                       sessionStatus?.phone;
      
      console.log('[WAHA Webhook] 📱 Número de la sesión:', ownPhone);
      
      // Si el remitente es el mismo número que la sesión, ignorar (es un loop)
      if (ownPhone && fromNumber && (
        fromNumber === ownPhone ||
        fromNumber.includes(ownPhone) ||
        ownPhone.includes(fromNumber)
      )) {
        console.log('[WAHA Webhook] ⏭️ Ignorando mensaje loop (mismo número que la sesión)');
        return;
      }
    } catch (statusError) {
      console.warn('[WAHA Webhook] ⚠️ No se pudo verificar número de sesión:', statusError);
      // Continuar de todas formas
    }

    console.log('[WAHA Webhook] 📍 Organization ID:', organizationId);
    console.log('[WAHA Webhook] 📱 Chat ID:', chatId);

    // 6. Obtener cliente Supabase con service role (bypass RLS)
    const supabase = getSupabaseServiceClient();

    // 7. Extraer número de teléfono del cliente
    const customerPhone = fromNumber;
    if (!customerPhone) {
      console.error('[WAHA Webhook] ❌ No se pudo extraer número de teléfono de:', chatId);
      return;
    }

    // 8. Buscar o crear conversación
    const conversationId = await getOrCreateConversation(
      supabase,
      organizationId,
      customerPhone
    );

    // 9. Detectar tipo de mensaje y multimedia
    const messageType = message.type || message.messageType || 'text';
    const hasMedia = message.hasMedia || 
                     message.mediaUrl || 
                     message.image || 
                     message.audio || 
                     message.document ||
                     message.video ||
                     messageType !== 'text';

    // Extraer URL del media si existe
    let mediaUrl = null;
    let mediaType = null;

    if (hasMedia) {
      // WAHA Plus puede enviar el media en diferentes formatos
      mediaUrl = message.mediaUrl || 
                 message.media?.url ||
                 message.image?.url ||
                 message.audio?.url ||
                 message.document?.url ||
                 message.video?.url ||
                 message._data?.mediaUrl;
      
      // Detectar tipo de media
      if (message.type === 'image' || message.image || message.mimetype?.startsWith('image/')) {
        mediaType = 'image';
      } else if (message.type === 'audio' || message.type === 'ptt' || message.audio || message.mimetype?.startsWith('audio/')) {
        mediaType = 'audio';
      } else if (message.type === 'video' || message.video || message.mimetype?.startsWith('video/')) {
        mediaType = 'video';
      } else if (message.type === 'document' || message.document) {
        mediaType = 'document';
      }
      
      console.log('[WAHA Webhook] 📎 Media detectado:', {
        mediaType,
        mediaUrl: mediaUrl ? mediaUrl.substring(0, 50) + '...' : null,
        mimetype: message.mimetype,
        originalType: message.type
      });
    }

    // Construir texto del mensaje incluyendo info de media
    let messageText = message.text || message.body || message.content || message.caption || '';

    // Si es audio sin texto, agregar indicador
    if (mediaType === 'audio' && !messageText) {
      messageText = '[Audio recibido - Transcripción no disponible]';
      // TODO: Integrar con Whisper API para transcribir audios
    }

    // Si es imagen sin texto, agregar indicador
    if (mediaType === 'image' && !messageText) {
      messageText = '[Imagen recibida]';
      // El caption de la imagen ya estaría en message.caption
    }

    // Reutilizar messageId ya extraído arriba para deduplicación
    const timestamp = message.timestamp 
      ? new Date(message.timestamp * 1000 || message.timestamp)
      : new Date();

    // 10. Guardar mensaje entrante
    await saveIncomingMessage(
      supabase,
      conversationId,
      organizationId,
      {
        messageId: messageId || `waha_${Date.now()}`,
        from: customerPhone,
        body: messageText,
        timestamp,
        mediaUrl: mediaUrl,
        mediaType: mediaType
      }
    );

    // 11. Verificar si el bot está activo en la conversación
    const { data: conversation } = await supabase
      .from('whatsapp_conversations')
      .select('is_bot_active')
      .eq('id', conversationId)
      .single();

    if (!conversation?.is_bot_active) {
      console.log('[WAHA Webhook] ⏸️ Bot inactivo para esta conversación');
      return;
    }

    // 12. Cargar configuración AI para logging (debugging)
    console.log('[WAHA Webhook] 🔍 Verificando configuración AI...');
    const { data: aiConfig, error: aiConfigError } = await supabase
      .from('ai_agent_config')
      .select('id, enabled, provider, model, system_prompt, personality, language')
      .eq('organization_id', organizationId)
      .single();

    if (aiConfigError || !aiConfig) {
      console.error('[WAHA Webhook] ❌ No se encontró configuración AI:', {
        error: aiConfigError?.message,
        code: aiConfigError?.code,
        organizationId
      });
      return;
    }

    console.log('[WAHA Webhook] 📋 Configuración AI cargada:', {
      id: aiConfig.id,
      enabled: aiConfig.enabled,
      provider: aiConfig.provider,
      model: aiConfig.model,
      personality: aiConfig.personality,
      language: aiConfig.language,
      systemPromptLength: aiConfig.system_prompt?.length || 0,
      systemPromptPreview: aiConfig.system_prompt?.substring(0, 100) + '...'
    });

    if (!aiConfig.enabled) {
      console.log('[WAHA Webhook] ⏸️ AI Agent deshabilitado en configuración');
      return;
    }

    // 13. Procesar mensaje con AI Agent
    console.log('[WAHA Webhook] 🤖 Procesando con AI Agent...');
    console.log('[Webhook] 🤖 ANTES de llamar a AI - messageId:', messageId);
    const aiResult = await processMessage({
      organizationId,
      conversationId,
      customerMessage: messageText,
      customerPhone: customerPhone,
      useServiceClient: true // Usar service client para bypass RLS
    });
    console.log('[Webhook] 🤖 DESPUÉS de AI - messageId:', messageId, '- Respuesta:', aiResult.success ? 'SÍ' : 'NO');

    // 14. Si AI responde, enviar respuesta
    if (aiResult.success && aiResult.response) {
      console.log('[WAHA Webhook] ✅ AI generó respuesta, enviando...');
      
      try {
        console.log('[Webhook] 📤 ENVIANDO respuesta - messageId:', messageId);
        const sendResult = await sendWhatsAppMessage(
          sessionName,
        customerPhone,
          aiResult.response,
          organizationId
        );

        if (sendResult) {
        // 15. Guardar mensaje saliente
        await saveOutgoingMessage(
          supabase,
          conversationId,
          organizationId,
          {
              messageId: sendResult.id || sendResult.messageId || `out_${Date.now()}`,
            to: customerPhone,
            body: aiResult.response,
            timestamp: new Date()
          }
        );
        console.log('[WAHA Webhook] ✅ Respuesta enviada y guardada');
        console.log(`[Webhook] ✅ Mensaje ${messageId} procesado y respondido correctamente`);
        }
      } catch (sendError: any) {
        console.error('[WAHA Webhook] ❌ Error enviando respuesta:', sendError.message);
      }
    } else {
      console.log('[WAHA Webhook] ⚠️ AI no generó respuesta:', aiResult.error);
      console.log(`[Webhook] ✅ Mensaje ${messageId} procesado (sin respuesta AI)`);
    }

  } catch (error) {
    console.error('[WAHA Webhook] ❌ Error en handleMessageEvent:', error);
    throw error;
  }
}

/**
 * Maneja eventos de cambio de estado de sesión
 */
async function handleSessionStatusEvent(body: any) {
  try {
    console.log('[WAHA Webhook] 🔄 Procesando cambio de estado de sesión...');

    const sessionName = body.session || body.payload?.session;
    const status = body.status || body.payload?.status || body.data?.status;

    if (!sessionName || !status) {
      console.log('[WAHA Webhook] ⚠️ Evento de estado incompleto');
      return;
    }

    // Obtener organizationId desde la sesión (multi-tenant)
    const organizationId = await getOrganizationFromSession(sessionName);
    if (!organizationId) {
      console.error('[WAHA Webhook] ❌ No se pudo obtener organizationId de sesión:', sessionName);
      return;
    }

    console.log('[WAHA Webhook] 📍 Organization ID:', organizationId);
    console.log('[WAHA Webhook] 📊 Nuevo estado:', status);

    // Actualizar campo whatsapp_connected en ai_agent_config
    const supabase = getSupabaseServiceClient();
    const isConnected = status === 'WORKING' || status === 'connected';

    const { error } = await supabase
      .from('ai_agent_config')
      .update({ 
        whatsapp_connected: isConnected,
        updated_at: new Date().toISOString()
      })
      .eq('organization_id', organizationId);

    if (error) {
      console.error('[WAHA Webhook] ❌ Error actualizando whatsapp_connected:', error);
    } else {
      console.log('[WAHA Webhook] ✅ whatsapp_connected actualizado:', isConnected);
    }

  } catch (error) {
    console.error('[WAHA Webhook] ❌ Error en handleSessionStatusEvent:', error);
    throw error;
  }
}

/**
 * Maneja eventos de reacción (solo log por ahora)
 */
async function handleReactionEvent(body: any) {
  try {
    console.log('[WAHA Webhook] 😊 Reacción recibida:', {
      session: body.session,
      messageId: body.messageId || body.id,
      reaction: body.reaction || body.emoji
    });
    // Por ahora solo logueamos, no procesamos reacciones
  } catch (error) {
    console.error('[WAHA Webhook] ❌ Error en handleReactionEvent:', error);
    // No lanzar error, solo loguear
  }
}

// Función extractOrganizationId eliminada - ahora se usa getOrganizationFromSession de waha-sessions.ts

/**
 * Extrae número de teléfono del chatId
 * Formato: 5214491234567@c.us -> +52 1 449 123 4567
 */
function extractPhoneNumber(chatId: string): string | null {
  if (!chatId) return null;
  
  // Remover @c.us o @s.whatsapp.net
  const phoneDigits = chatId.replace(/@[^@]+$/, '');
  
  if (!phoneDigits || phoneDigits.length < 10) {
    return null;
  }
  
  // Retornar como está (formato internacional sin +)
  // El formato será: 5214491234567
  return phoneDigits;
}

/**
 * Busca o crea una conversación
 */
async function getOrCreateConversation(
  supabase: any,
  organizationId: string,
  customerPhone: string
): Promise<string> {
  // Buscar conversación existente
  const { data: existing } = await supabase
    .from('whatsapp_conversations')
    .select('id, is_bot_active')
    .eq('organization_id', organizationId)
    .eq('customer_phone', customerPhone)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    console.log('[WAHA Webhook] ✅ Conversación existente encontrada:', existing.id);
    return existing.id;
  }

  // Buscar cliente existente por teléfono
  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('phone', customerPhone)
    .maybeSingle();

  let customerId: string;
  let customerName: string;

  if (existingCustomer) {
    customerId = existingCustomer.id;
    customerName = existingCustomer.name || 'Cliente WhatsApp';
  } else {
    // Crear nuevo cliente
    const { data: newCustomer, error: customerError } = await supabase
      .from('customers')
      .insert({
        organization_id: organizationId,
        name: 'Cliente WhatsApp',
        phone: customerPhone
      })
      .select('id')
      .single();

    if (customerError || !newCustomer) {
      console.error('[WAHA Webhook] ❌ Error creando cliente:', customerError);
      throw new Error('No se pudo crear cliente');
    }

    customerId = newCustomer.id;
    customerName = 'Cliente WhatsApp';
  }

  // Crear nueva conversación
  const { data: newConv, error } = await supabase
    .from('whatsapp_conversations')
    .insert({
      organization_id: organizationId,
      customer_id: customerId,
      customer_phone: customerPhone,
      customer_name: customerName,
      status: 'active',
      is_bot_active: true, // Activar bot por defecto
      messages_count: 0,
      last_message_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (error || !newConv) {
    console.error('[WAHA Webhook] ❌ Error creando conversación:', error);
    throw new Error('No se pudo crear conversación');
  }

  console.log('[WAHA Webhook] ✅ Nueva conversación creada:', newConv.id);
  return newConv.id;
}

/**
 * Guarda mensaje entrante en la base de datos
 */
async function saveIncomingMessage(
  supabase: any,
  conversationId: string,
  organizationId: string,
  message: {
    messageId: string;
    from: string;
    body: string;
    timestamp: Date;
    mediaUrl?: string | null;
    mediaType?: string | null;
  }
): Promise<void> {
  await supabase
    .from('whatsapp_messages')
    .insert({
      conversation_id: conversationId,
      organization_id: organizationId,
      direction: 'inbound',
      from_number: message.from,
      to_number: '', // Se completará con el número del negocio
      body: message.body,
      media_url: message.mediaUrl,
      media_type: message.mediaType, // 'image', 'audio', 'video', 'document' o null
      status: 'delivered',
      provider: 'waha',
      provider_message_id: message.messageId,
      created_at: message.timestamp.toISOString()
    });

  // Actualizar conversación - obtener count actual y sumar 1
  const { data: conv } = await supabase
    .from('whatsapp_conversations')
    .select('messages_count')
    .eq('id', conversationId)
    .single();

  await supabase
    .from('whatsapp_conversations')
    .update({
      last_message_at: message.timestamp.toISOString(),
      messages_count: (conv?.messages_count || 0) + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', conversationId);

  console.log('[WAHA Webhook] ✅ Mensaje entrante guardado');
}

/**
 * Guarda mensaje saliente en la base de datos
 */
async function saveOutgoingMessage(
  supabase: any,
  conversationId: string,
  organizationId: string,
  message: {
    messageId: string;
    to: string;
    body: string;
    timestamp: Date;
  }
): Promise<void> {
  await supabase
    .from('whatsapp_messages')
    .insert({
      conversation_id: conversationId,
      organization_id: organizationId,
      direction: 'outbound',
      from_number: '', // Se completará con el número del negocio
      to_number: message.to,
      body: message.body,
      status: 'sent',
      provider: 'waha',
      provider_message_id: message.messageId,
      created_at: message.timestamp.toISOString()
    });

  // Actualizar conversación - obtener count actual y sumar 1
  const { data: conv } = await supabase
    .from('whatsapp_conversations')
    .select('messages_count')
    .eq('id', conversationId)
    .single();

  await supabase
    .from('whatsapp_conversations')
    .update({
      last_message_at: message.timestamp.toISOString(),
      messages_count: (conv?.messages_count || 0) + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', conversationId);

  console.log('[WAHA Webhook] ✅ Mensaje saliente guardado');
}

