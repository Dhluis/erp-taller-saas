/**
 * MESSAGE SENDER
 * 
 * Servicio unificado para enviar mensajes de WhatsApp
 * Selecciona el sender correcto según el provider configurado
 */

import { getSupabaseServerClient } from '../utils/supabase-server-helpers';
import { TwilioSender, TwilioConfig } from '../senders/twilio-sender';
import { MetaSender, MetaConfig } from '../senders/meta-sender';

interface SendMessageParams {
  organizationId: string;
  to: string; // Número del cliente
  message: string; // Texto a enviar
  conversationId?: string; // ID de la conversación
  mediaUrl?: string; // URL de media si aplica
}

/**
 * Envía un mensaje de WhatsApp usando el provider configurado
 */
export async function sendWhatsAppMessage(
  params: SendMessageParams
): Promise<void> {
  const { organizationId, to, message, conversationId, mediaUrl } = params;

  console.log('📤 [MessageSender] Enviando mensaje...');
  console.log('  To:', to);
  console.log('  Org:', organizationId);

  try {
    // 1. Obtener configuración de WhatsApp
    const supabase = await getSupabaseServerClient();
    
    const { data: config, error } = await supabase
      .from('whatsapp_config')
      .select('provider, settings')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (error || !config) {
      throw new Error('WhatsApp no configurado para esta organización');
    }

    console.log('  Provider:', config.provider);

    // 2. Seleccionar sender según provider
    let sender: TwilioSender | MetaSender;

    switch (config.provider) {
      case 'twilio': {
        const twilioConfig: TwilioConfig = {
          account_sid: config.settings?.account_sid || '',
          auth_token: config.settings?.auth_token || '',
          phone_number: config.settings?.phone_number || ''
        };
        sender = new TwilioSender(twilioConfig);
        
        if (mediaUrl) {
          await sender.sendMediaMessage(to, message, mediaUrl);
        } else {
          await sender.sendMessage(to, message);
        }
        break;
      }

      case 'meta': {
        const metaConfig: MetaConfig = {
          phone_number_id: config.settings?.phone_number_id || '',
          access_token: config.settings?.access_token || ''
        };
        sender = new MetaSender(metaConfig);
        
        if (mediaUrl) {
          await sender.sendImageMessage(to, mediaUrl, message);
        } else {
          await sender.sendMessage(to, message);
        }
        break;
      }

      case 'evolution': {
        // TODO: Implementar Evolution sender cuando esté disponible
        throw new Error('Evolution sender no implementado aún');
      }

      default:
        throw new Error(`Provider no soportado: ${config.provider}`);
    }

    // 3. Guardar mensaje saliente en BD
    await saveOutgoingMessage({
      conversationId,
      organizationId,
      to,
      message,
      mediaUrl
    });

    console.log('✅ [MessageSender] Mensaje enviado exitosamente');

  } catch (error) {
    console.error('❌ [MessageSender] Error enviando mensaje:', error);
    throw error;
  }
}

/**
 * Guarda mensaje saliente en la base de datos
 */
async function saveOutgoingMessage(params: {
  conversationId?: string;
  organizationId: string;
  to: string;
  message: string;
  mediaUrl?: string;
}): Promise<void> {
  try {
    const supabase = await getSupabaseServerClient();

    // Si hay conversationId, actualizar la conversación
    if (params.conversationId) {
      await supabase
        .from('whatsapp_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', params.conversationId);
    }

    // Guardar mensaje
    await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: params.conversationId || null,
        organization_id: params.organizationId,
        direction: 'outbound',
        from_number: '', // Se completará con el número del negocio
        to_number: params.to,
        body: params.message,
        media_url: params.mediaUrl,
        status: 'sent',
        created_at: new Date().toISOString()
      });

  } catch (error) {
    console.error('[MessageSender] Error guardando mensaje saliente:', error);
    // No fallar si no se puede guardar
  }
}

