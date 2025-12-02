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
  try {
    const body = await request.json();
    console.log('[WAHA Webhook] Evento recibido:', body.event || body.type || 'unknown');

    // Manejar diferentes tipos de eventos
    const eventType = body.event || body.type || body.eventType;
    
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
    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    console.error('[WAHA Webhook] ❌ Error procesando evento:', error);
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
    console.log('[WAHA Webhook] 📨 Procesando mensaje...');

    // 1. Extraer datos del mensaje
    const message = body.payload || body.message || body;
    const sessionName = body.session || message.session;
    
    // Validar que sea mensaje entrante válido
    if (!message || !sessionName) {
      console.log('[WAHA Webhook] ⚠️ Mensaje inválido o sin sesión');
      return;
    }

    // 2. Ignorar si fromMe es true (mensaje propio)
    if (message.fromMe === true || message.fromMe === 'true') {
      console.log('[WAHA Webhook] ⏭️ Ignorando mensaje propio');
      return;
    }

    // 3. Ignorar si chatId contiene @g.us (grupo)
    const chatId = message.chatId || message.from || message.to;
    if (chatId && chatId.includes('@g.us')) {
      console.log('[WAHA Webhook] ⏭️ Ignorando mensaje de grupo');
      return;
    }

    // 4. Obtener organizationId desde la sesión (multi-tenant)
    const organizationId = await getOrganizationFromSession(sessionName);
    if (!organizationId) {
      console.error('[WAHA Webhook] ❌ No se pudo obtener organizationId de sesión:', sessionName);
      return;
    }

    console.log('[WAHA Webhook] 📍 Organization ID:', organizationId);
    console.log('[WAHA Webhook] 📱 Chat ID:', chatId);

    // 5. Obtener cliente Supabase con service role (bypass RLS)
    const supabase = getSupabaseServiceClient();

    // 6. Extraer número de teléfono del cliente
    const customerPhone = extractPhoneNumber(chatId);
    if (!customerPhone) {
      console.error('[WAHA Webhook] ❌ No se pudo extraer número de teléfono de:', chatId);
      return;
    }

    // 7. Buscar o crear conversación
    const conversationId = await getOrCreateConversation(
      supabase,
      organizationId,
      customerPhone
    );

    // 8. Extraer texto del mensaje
    const messageText = message.text || message.body || message.content || '';
    const messageId = message.id || message.messageId || `waha_${Date.now()}`;
    const timestamp = message.timestamp 
      ? new Date(message.timestamp * 1000 || message.timestamp)
      : new Date();

    // 9. Guardar mensaje entrante
    await saveIncomingMessage(
      supabase,
      conversationId,
      organizationId,
      {
        messageId,
        from: customerPhone,
        body: messageText,
        timestamp,
        mediaUrl: message.mediaUrl || message.image || message.document || null
      }
    );

    // 10. Verificar si el bot está activo en la conversación
    const { data: conversation } = await supabase
      .from('whatsapp_conversations')
      .select('is_bot_active')
      .eq('id', conversationId)
      .single();

    if (!conversation?.is_bot_active) {
      console.log('[WAHA Webhook] ⏸️ Bot inactivo para esta conversación');
      return;
    }

    // 11. Procesar mensaje con AI Agent
    console.log('[WAHA Webhook] 🤖 Procesando con AI Agent...');
    const aiResult = await processMessage({
      organizationId,
      conversationId,
      customerMessage: messageText,
      customerPhone: customerPhone,
      useServiceClient: true // Usar service client para bypass RLS
    });

    // 12. Si AI responde, enviar respuesta
    if (aiResult.success && aiResult.response) {
      console.log('[WAHA Webhook] ✅ AI generó respuesta, enviando...');
      
      try {
        const sendResult = await sendWhatsAppMessage(
          sessionName,
          customerPhone,
          aiResult.response,
          organizationId
        );

        if (sendResult) {
          // 13. Guardar mensaje saliente
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
        }
      } catch (sendError: any) {
        console.error('[WAHA Webhook] ❌ Error enviando respuesta:', sendError.message);
      }
    } else {
      console.log('[WAHA Webhook] ⚠️ AI no generó respuesta:', aiResult.error);
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

