/**
 * Webhook unificado - Maneja mensajes entrantes de cualquier canal
 * (WAHA o Twilio) y los procesa con IA de forma unificada
 */

import { MessageSource, NormalizedMessage } from './types';
import { normalizeMessage } from './normalizer';
import { sendMessage } from './sender';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { processMessage } from '@/integrations/whatsapp/services/ai-agent';
import { getOrganizationFromSession } from '@/lib/waha-sessions';
import { normalizePhoneNumber } from '@/lib/utils/phone-formatter';

/**
 * Maneja mensajes entrantes de cualquier canal (WAHA o Twilio)
 */
export async function handleIncomingMessage(
  source: MessageSource,
  rawPayload: any,
  organizationId: string
): Promise<void> {
  try {
    console.log(`[Unified Webhook] 📨 Mensaje recibido de ${source.toUpperCase()}`);
    
    // 1. Normalizar mensaje
    const message = normalizeMessage(source, rawPayload, organizationId);
    
    if (!message.from || !message.text) {
      console.log('[Unified Webhook] ⚠️ Mensaje sin remitente o texto, ignorando');
      return;
    }
    
    console.log(`[Unified Webhook] De: ${message.from}, Texto: ${message.text.substring(0, 50)}...`);
    
    // 2. Obtener o crear conversación
    const conversation = await getOrCreateConversation(
      organizationId,
      message.from,
      message.messageId
    );
    
    if (!conversation) {
      console.log('[Unified Webhook] ⚠️ No se pudo obtener/crear conversación');
      return;
    }
    
    // 3. Guardar mensaje entrante en BD
    await saveIncomingMessage(conversation.id, message);
    
    // 4. Verificar si bot está activo
    const isBotActive = conversation.is_bot_active;
    
    if (!isBotActive) {
      console.log('[Unified Webhook] 🤖 Bot inactivo, mensaje guardado pero no procesado');
      return;
    }
    
    // 5. Procesar con IA (REUTILIZAR código existente)
    console.log('[Unified Webhook] 🤖 Procesando con IA...');
    const aiResult = await processMessage({
      organizationId,
      conversationId: conversation.id,
      customerPhone: message.from,
      customerMessage: message.text,
      useServiceClient: true, // Usar service client para evitar problemas de permisos
    });
    
    if (!aiResult.success || !aiResult.response) {
      console.error('[Unified Webhook] ❌ Error procesando con IA:', aiResult.error);
      return;
    }
    
    // 6. Enviar respuesta por el canal correcto
    console.log('[Unified Webhook] 📤 Enviando respuesta...');
    const sendResult = await sendMessage(
      organizationId,
      message.from,
      aiResult.response
    );
    
    if (!sendResult.success) {
      console.error('[Unified Webhook] ❌ Error enviando respuesta:', sendResult.error);
      return;
    }
    
    // 7. Guardar mensaje saliente en BD
    await saveOutgoingMessage(conversation.id, aiResult.response, sendResult.messageId);
    
    console.log('[Unified Webhook] ✅ Mensaje procesado y respondido exitosamente');
    
  } catch (error: any) {
    console.error('[Unified Webhook] ❌ Error procesando mensaje:', error);
    throw error;
  }
}

/**
 * Obtiene o crea una conversación de WhatsApp
 * REUTILIZA lógica existente del webhook WAHA
 */
async function getOrCreateConversation(
  organizationId: string,
  customerPhone: string,
  messageId: string
): Promise<{ id: string; is_bot_active: boolean } | null> {
  try {
    const supabase = getSupabaseServiceClient();
    
    // Normalizar número de teléfono
    const normalizedPhone = normalizePhoneNumber(customerPhone);
    
    // 1. Buscar conversación existente
    const { data: existingConversation } = await supabase
      .from('whatsapp_conversations')
      .select('id, is_bot_active, customer_id')
      .eq('organization_id', organizationId)
      .eq('customer_phone', normalizedPhone)
      .single();
    
    if (existingConversation) {
      return {
        id: existingConversation.id,
        is_bot_active: existingConversation.is_bot_active || false,
      };
    }
    
    // 2. Buscar cliente existente por teléfono
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name')
      .eq('organization_id', organizationId)
      .eq('phone', normalizedPhone)
      .single();
    
    let customerId = customer?.id;
    
    // 3. Si no existe cliente, crear uno básico
    if (!customerId) {
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          organization_id: organizationId,
          name: `Cliente ${normalizedPhone.substring(normalizedPhone.length - 4)}`,
          phone: normalizedPhone,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      
      if (customerError || !newCustomer) {
        console.error('[Unified Webhook] Error creando cliente:', customerError);
        return null;
      }
      
      customerId = newCustomer.id;
    }
    
    // 4. Crear nueva conversación
    const { data: newConversation, error: convError } = await supabase
      .from('whatsapp_conversations')
      .insert({
        organization_id: organizationId,
        customer_id: customerId,
        customer_phone: normalizedPhone,
        is_bot_active: true, // Activar bot por defecto
        messages_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id, is_bot_active')
      .single();
    
    if (convError || !newConversation) {
      console.error('[Unified Webhook] Error creando conversación:', convError);
      return null;
    }
    
    return {
      id: newConversation.id,
      is_bot_active: newConversation.is_bot_active || false,
    };
    
  } catch (error: any) {
    console.error('[Unified Webhook] Error en getOrCreateConversation:', error);
    return null;
  }
}

/**
 * Guarda mensaje entrante en BD
 */
async function saveIncomingMessage(
  conversationId: string,
  message: NormalizedMessage
): Promise<void> {
  try {
    const supabase = getSupabaseServiceClient();
    
    // Verificar si el mensaje ya existe (evitar duplicados)
    const { data: existing } = await supabase
      .from('whatsapp_messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('message_id', message.messageId)
      .single();
    
    if (existing) {
      console.log('[Unified Webhook] Mensaje duplicado, ignorando');
      return;
    }
    
    // Insertar mensaje
    const { error } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversationId,
        message_id: message.messageId,
        direction: 'incoming',
        content: message.text,
        media_url: message.mediaUrl,
        media_type: message.mediaType,
        source: message.source,
        created_at: message.timestamp,
      });
    
    if (error) {
      console.error('[Unified Webhook] Error guardando mensaje entrante:', error);
    } else {
      // Actualizar contador de mensajes en conversación
      await supabase.rpc('increment_conversation_messages', {
        conv_id: conversationId,
      });
    }
    
  } catch (error: any) {
    console.error('[Unified Webhook] Error en saveIncomingMessage:', error);
  }
}

/**
 * Guarda mensaje saliente en BD
 */
async function saveOutgoingMessage(
  conversationId: string,
  content: string,
  messageId?: string
): Promise<void> {
  try {
    const supabase = getSupabaseServiceClient();
    
    const { error } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversationId,
        message_id: messageId || `outgoing_${Date.now()}`,
        direction: 'outgoing',
        content: content,
        created_at: new Date().toISOString(),
      });
    
    if (error) {
      console.error('[Unified Webhook] Error guardando mensaje saliente:', error);
    } else {
      // Actualizar contador y último mensaje en conversación
      await supabase.rpc('increment_conversation_messages', {
        conv_id: conversationId,
      });
      
      await supabase
        .from('whatsapp_conversations')
        .update({ last_message: content, updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    }
    
  } catch (error: any) {
    console.error('[Unified Webhook] Error en saveOutgoingMessage:', error);
  }
}
