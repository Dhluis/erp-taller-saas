/**
 * WEBHOOK HANDLER
 * 
 * Procesa mensajes entrantes de WhatsApp:
 * 1. Parsea el mensaje
 * 2. Carga contexto de la conversación
 * 3. Procesa con AI Agent
 * 4. Envía respuesta
 */

import { getSupabaseServerClient } from '../utils/supabase-server-helpers';
import { parseTwilioWebhook } from '../utils/twilio-parser';
import { parseEvolutionWebhook } from '../utils/evolution-parser';
import { processMessage } from './ai-agent';
import { sendWhatsAppMessage } from './message-sender';
import { clientesAdapter } from '../adapters/clientes-adapter';
import type { WhatsAppMessage } from '../types';

interface ParsedMessage {
  from: string; // Número del cliente
  to: string; // Número del negocio
  body: string; // Texto del mensaje
  messageId: string;
  timestamp: Date;
  mediaUrl?: string;
}

/**
 * Parsear mensaje según provider
 */
function parseMessage(body: any, provider: string, organizationId: string): ParsedMessage | null {
  try {
    let parsed: Omit<WhatsAppMessage, 'id'> | null = null;

    switch (provider) {
      case 'twilio': {
        parsed = parseTwilioWebhook(body, organizationId);
        break;
      }
      
      case 'evolution': {
        parsed = parseEvolutionWebhook(body, organizationId);
        break;
      }
      
      case 'meta': {
        parsed = parseMetaMessage(body, organizationId);
        break;
      }
      
      default:
        throw new Error(`Parser no implementado para: ${provider}`);
    }

    if (!parsed) {
      return null;
    }

    return {
      from: parsed.from,
      to: parsed.to,
      body: parsed.body,
      messageId: parsed.provider_message_id || '',
      timestamp: parsed.timestamp,
      mediaUrl: parsed.media_url
    };
  } catch (error) {
    console.error('[WebhookHandler] Error parseando mensaje:', error);
    return null;
  }
}

/**
 * Parser para Meta WhatsApp Business API
 */
function parseMetaMessage(
  body: any,
  organizationId: string
): Omit<WhatsAppMessage, 'id'> | null {
  try {
    // Meta envía eventos en body.entry[].changes[]
    if (!body.entry || !Array.isArray(body.entry) || body.entry.length === 0) {
      return null;
    }

    // Buscar mensajes en los cambios
    for (const entry of body.entry) {
      if (!entry.changes || !Array.isArray(entry.changes)) continue;

      for (const change of entry.changes) {
        if (change.value?.messages && Array.isArray(change.value.messages)) {
          // Procesar el primer mensaje entrante
          for (const msg of change.value.messages) {
            // Solo procesar mensajes entrantes (no status updates)
            if (msg.type === 'text' && msg.from) {
              const fromNumber = msg.from.replace('@s.whatsapp.net', '');
              const timestamp = new Date(parseInt(msg.timestamp) * 1000);

              return {
                organization_id: organizationId,
                from: fromNumber,
                to: change.value.metadata?.phone_number_id || '',
                body: msg.text?.body || '',
                timestamp,
                direction: 'inbound',
                status: 'delivered',
                message_type: 'text',
                provider: 'meta',
                provider_message_id: msg.id,
                metadata: {
                  entry_id: entry.id,
                  change_value: change.value
                }
              };
            }
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error('[WebhookHandler] Error parseando Meta webhook:', error);
    return null;
  }
}

/**
 * Obtener o crear conversación
 */
async function getOrCreateConversation(
  organizationId: string,
  customerPhone: string
): Promise<string> {
  const supabase = await getSupabaseServerClient();

  // Buscar conversación existente
  const { data: existing } = await supabase
    .from('whatsapp_conversations')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('customer_phone', customerPhone)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  // Buscar o crear cliente
  const customerResult = await clientesAdapter.getOrCreate({
    organization_id: organizationId,
    name: 'Cliente WhatsApp', // Nombre temporal, AI lo preguntará
    phone: customerPhone
  });

  if (!customerResult.success || !customerResult.data) {
    throw new Error('No se pudo obtener/crear cliente');
  }

  // Crear nueva conversación
  const { data: newConv, error } = await supabase
    .from('whatsapp_conversations')
    .insert({
      organization_id: organizationId,
      customer_id: customerResult.data.id,
      customer_phone: customerPhone,
      customer_name: customerResult.data.name,
      status: 'active',
      is_bot_active: true,
      messages_count: 0,
      last_message_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (error || !newConv) {
    throw new Error('No se pudo crear conversación');
  }

  return newConv.id;
}

/**
 * Guardar mensaje entrante en BD
 */
async function saveIncomingMessage(
  conversationId: string,
  organizationId: string,
  message: ParsedMessage
): Promise<void> {
  const supabase = await getSupabaseServerClient();

  await supabase
    .from('whatsapp_messages')
    .insert({
      conversation_id: conversationId,
      organization_id: organizationId,
      direction: 'inbound',
      from_number: message.from,
      to_number: message.to,
      body: message.body,
      provider_message_id: message.messageId,
      media_url: message.mediaUrl,
      status: 'received',
      created_at: message.timestamp.toISOString()
    });
}

/**
 * Procesar con IA (wrapper para processMessage)
 */
async function processWithAI(
  customerMessage: string,
  conversationId: string,
  organizationId: string,
  customerPhone: string
): Promise<string> {
  const result = await processMessage({
    conversationId,
    organizationId,
    customerMessage,
    customerPhone
  });

  if (!result.success || !result.response) {
    throw new Error(result.error || 'Error procesando con IA');
  }

  return result.response;
}

/**
 * Handler principal de mensajes entrantes
 */
export async function handleIncomingMessage(
  body: any,
  provider: string,
  organizationId: string
): Promise<void> {
  console.log('\n' + '-'.repeat(60));
  console.log('🤖 PROCESANDO MENSAJE ENTRANTE');
  console.log('-'.repeat(60));

  try {
    // 1️⃣ PARSEAR MENSAJE
    console.log('1️⃣ Parseando mensaje...');
    const message = parseMessage(body, provider, organizationId);
    
    if (!message) {
      console.log('⏭️ No hay mensaje entrante para procesar');
      return;
    }

    console.log('   From:', message.from);
    console.log('   Body:', message.body.substring(0, 100));

    // 2️⃣ OBTENER/CREAR CONVERSACIÓN
    console.log('2️⃣ Obteniendo conversación...');
    const conversationId = await getOrCreateConversation(
      organizationId,
      message.from
    );
    console.log('   Conversation ID:', conversationId);

    // 3️⃣ GUARDAR MENSAJE ENTRANTE
    console.log('3️⃣ Guardando mensaje entrante...');
    await saveIncomingMessage(conversationId, organizationId, message);

    // 4️⃣ VERIFICAR SI DEBE RESPONDER AUTOMÁTICAMENTE
    // TODO: Aquí podrías agregar lógica para verificar horarios, pausas, etc.
    const shouldRespond = true;

    if (!shouldRespond) {
      console.log('⏸️ Auto-respuesta deshabilitada');
      return;
    }

    // 5️⃣ PROCESAR CON IA
    console.log('4️⃣ Procesando con IA...');
    const response = await processWithAI(
      message.body,
      conversationId,
      organizationId,
      message.from
    );
    console.log('   Respuesta IA:', response.substring(0, 100));

    // 6️⃣ ENVIAR RESPUESTA
    console.log('5️⃣ Enviando respuesta...');
    await sendWhatsAppMessage({
      organizationId,
      to: message.from,
      message: response,
      conversationId
    });

    console.log('✅ Mensaje procesado completamente');
    console.log('-'.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ ERROR EN WEBHOOK HANDLER:', error);
    console.log('-'.repeat(60) + '\n');
    throw error;
  }
}

/**
 * Verifica si el bot está activo para esta organización
 */
export async function isBotEnabled(organizationId: string): Promise<boolean> {
  try {
    const supabase = await getSupabaseServerClient();

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
