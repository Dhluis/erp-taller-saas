/**
 * Sender unificado - Envía mensajes por el canal correcto
 * según la configuración de la organización (tier basic/premium)
 */

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { MessagingConfig, SendMessageResult } from './types';
import twilio from 'twilio';

/**
 * Envía mensaje por el canal correcto según configuración de la organización
 */
export async function sendMessage(
  organizationId: string,
  to: string,
  message: string
): Promise<SendMessageResult> {
  try {
    const config = await getMessagingConfig(organizationId);
    
    if (!config) {
      console.error('[Messaging Sender] Configuración no encontrada para org:', organizationId);
      return { success: false, error: 'Configuración de mensajería no encontrada' };
    }
    
    // Normalizar número destino (eliminar espacios, guiones, etc.)
    const normalizedTo = to.replace(/[^0-9+]/g, '');
    
    // Enviar por Twilio WhatsApp API
    if (!config.whatsapp_api_number) {
      return {
        success: false,
        error: 'Número de WhatsApp API no configurado'
      };
    }

    console.log('[Messaging Sender] Enviando por Twilio WhatsApp API');
    return await sendTwilioWhatsAppMessage(
      config.whatsapp_api_number,
      normalizedTo,
      message
    );
    
  } catch (error: any) {
    console.error('[Messaging Sender] Error enviando mensaje:', error);
    return { 
      success: false, 
      error: error.message || 'Error desconocido al enviar mensaje' 
    };
  }
}

/**
 * Obtiene configuración de mensajería de la organización
 */
async function getMessagingConfig(organizationId: string): Promise<MessagingConfig | null> {
  try {
    const supabase = getSupabaseServiceClient();
    
    const { data, error } = await supabase
      .from('organization_messaging_config')
      .select('*')
      .eq('organization_id', organizationId)
      .single();
    
    if (error) {
      console.error('[Messaging Sender] Error obteniendo config:', error);
      return null;
    }
    
    if (!data) {
      return null;
    }
    
    // Mapear a tipo MessagingConfig
    return {
      organization_id: data.organization_id,
      tier: (data.tier as 'basic' | 'premium') || 'basic',
      whatsapp_api_provider: data.whatsapp_api_provider as 'twilio' | null,
      whatsapp_api_number: data.whatsapp_api_number,
      whatsapp_api_twilio_sid: data.whatsapp_api_twilio_sid,
      whatsapp_api_status: (data.whatsapp_api_status as 'active' | 'inactive' | 'pending') || 'inactive',
      whatsapp_enabled: data.whatsapp_enabled || false,
      whatsapp_verified: data.whatsapp_verified || false,
    };
    
  } catch (error) {
    console.error('[Messaging Sender] Error en getMessagingConfig:', error);
    return null;
  }
}

/**
 * Envía mensaje por Twilio WhatsApp API
 */
async function sendTwilioWhatsAppMessage(
  from: string,
  to: string,
  body: string
): Promise<SendMessageResult> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      return {
        success: false,
        error: 'Twilio credentials no configuradas',
      };
    }
    
    const client = twilio(accountSid, authToken);
    
    // Formatear números para Twilio WhatsApp
    const fromNumber = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;
    const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    
    const message = await client.messages.create({
      from: fromNumber,
      to: toNumber,
      body: body,
    });
    
    console.log('[Messaging Sender] Mensaje Twilio enviado:', {
      sid: message.sid,
      status: message.status,
      to: toNumber,
    });
    
    return {
      success: true,
      messageId: message.sid,
    };
    
  } catch (error: any) {
    console.error('[Messaging Sender] Error en sendTwilioWhatsAppMessage:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido en Twilio',
    };
  }
}
