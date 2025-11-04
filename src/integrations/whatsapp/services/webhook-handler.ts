// src/integrations/whatsapp/services/webhook-handler.ts

/**
 * 🎯 Webhook Handler Service
 * 
 * Procesa mensajes entrantes de WhatsApp:
 * 1. Normaliza payload del provider
 * 2. Busca/crea conversación
 * 3. Guarda mensaje en DB
 * 4. (Próximo paso) Llama al AI Agent
 */

import { createClient } from '@/lib/supabase/server';
import type { WhatsAppMessage, WhatsAppConversation } from '../types';
import { clientesAdapter } from '../adapters/clientes-adapter';

interface ProcessMessageParams {
  organizationId: string;
  message: Omit<WhatsAppMessage, 'id'>;
}

interface ProcessMessageResult {
  success: boolean;
  conversationId?: string;
  messageId?: string;
  error?: string;
}

/**
 * Procesa un mensaje entrante
 */
export async function processIncomingMessage(
  params: ProcessMessageParams
): Promise<ProcessMessageResult> {
  try {
    const { organizationId, message } = params;

    console.log('[WebhookHandler] Procesando mensaje:', {
      from: message.from,
      org: organizationId,
      body: message.body.substring(0, 50)
    });

    // 1. Buscar o crear conversación
    const conversation = await getOrCreateConversation({
      organizationId,
      customerPhone: message.from
    });

    if (!conversation) {
      return {
        success: false,
        error: 'No se pudo crear/obtener conversación'
      };
    }

    // 2. Guardar mensaje en DB
    const messageId = await saveMessage({
      conversationId: conversation.id,
      message
    });

    if (!messageId) {
      return {
        success: false,
        error: 'No se pudo guardar el mensaje'
      };
    }

    console.log('[WebhookHandler] Mensaje guardado:', messageId);

    // 3. Llamar al AI Agent (si está habilitado)
    const botEnabled = await isBotEnabled(organizationId);
    if (botEnabled) {
      try {
        const { processMessage } = await import('./ai-agent');
        await processMessage({
          conversationId: conversation.id,
          organizationId,
          customerMessage: message.body,
          customerPhone: message.from
        });
        console.log('[WebhookHandler] AI Agent procesó el mensaje');
      } catch (aiError) {
        console.error('[WebhookHandler] Error en AI Agent:', aiError);
        // No fallar el webhook si el AI falla
      }
    }

    return {
      success: true,
      conversationId: conversation.id,
      messageId
    };

  } catch (error) {
    console.error('[WebhookHandler] Error procesando mensaje:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Obtiene o crea una conversación
 */
async function getOrCreateConversation(params: {
  organizationId: string;
  customerPhone: string;
}): Promise<WhatsAppConversation | null> {
  try {
    const supabase = await createClient();

    // 1. Buscar conversación activa existente
    const { data: existingConversation } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('organization_id', params.organizationId)
      .eq('customer_phone', params.customerPhone)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingConversation) {
      console.log('[WebhookHandler] Conversación existente encontrada:', existingConversation.id);
      return existingConversation as WhatsAppConversation;
    }

    // 2. No existe, buscar/crear cliente
    const customerResult = await clientesAdapter.getOrCreate({
      organization_id: params.organizationId,
      name: 'Cliente WhatsApp', // Nombre temporal, AI lo preguntará
      phone: params.customerPhone
    });

    if (!customerResult.success || !customerResult.data) {
      console.error('[WebhookHandler] Error creando cliente');
      return null;
    }

    // 3. Crear nueva conversación
    const { data: newConversation, error } = await supabase
      .from('whatsapp_conversations')
      .insert({
        organization_id: params.organizationId,
        customer_id: customerResult.data.id,
        customer_phone: params.customerPhone,
        customer_name: customerResult.data.name,
        status: 'active',
        is_bot_active: true,
        messages_count: 0
      })
      .select()
      .single();

    if (error) {
      console.error('[WebhookHandler] Error creando conversación:', error);
      return null;
    }

    console.log('[WebhookHandler] Nueva conversación creada:', newConversation.id);
    return newConversation as WhatsAppConversation;

  } catch (error) {
    console.error('[WebhookHandler] Error en getOrCreateConversation:', error);
    return null;
  }
}

/**
 * Guarda un mensaje en la base de datos
 */
async function saveMessage(params: {
  conversationId: string;
  message: Omit<WhatsAppMessage, 'id'>;
}): Promise<string | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: params.conversationId,
        organization_id: params.message.organization_id,
        from_number: params.message.from,
        to_number: params.message.to,
        direction: params.message.direction,
        body: params.message.body,
        message_type: params.message.message_type,
        media_url: params.message.media_url,
        status: params.message.status,
        provider_message_id: params.message.provider_message_id,
        metadata: params.message.metadata,
        created_at: params.message.timestamp.toISOString()
      })
      .select('id')
      .single();

    if (error) {
      console.error('[WebhookHandler] Error guardando mensaje:', error);
      return null;
    }

    return data.id;

  } catch (error) {
    console.error('[WebhookHandler] Error en saveMessage:', error);
    return null;
  }
}

/**
 * Verifica si el bot está activo para esta organización
 */
export async function isBotEnabled(organizationId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data } = await supabase
      .from('ai_agent_config')
      .select('enabled')
      .eq('organization_id', organizationId)
      .single();

    return data?.enabled || false;

  } catch (error) {
    console.error('[WebhookHandler] Error verificando bot:', error);
    return false;
  }
}

