/**
 * Sender unificado - Envía mensajes por el canal correcto
 * según la configuración de la organización (tier basic/premium)
 */

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { sendTextMessage } from '@/integrations/whatsapp/services/waha-service';
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
    
    // Determinar canal según tier y provider
    if (config.tier === 'basic' || config.whatsapp_api_provider === 'waha') {
      // Enviar por WAHA (tier básico)
      console.log('[Messaging Sender] Enviando por WAHA (tier basic)');
      return await sendWAHAMessage(organizationId, normalizedTo, message);
      
    } else if (config.tier === 'premium' && config.whatsapp_api_provider === 'twilio') {
      // Enviar por Twilio WhatsApp API (tier premium)
      if (!config.whatsapp_api_number) {
        return { 
          success: false, 
          error: 'Número de WhatsApp API no configurado para tier premium' 
        };
      }
      
      console.log('[Messaging Sender] Enviando por Twilio WhatsApp API (tier premium)');
      return await sendTwilioWhatsAppMessage(
        config.whatsapp_api_number,
        normalizedTo,
        message
      );
    }
    
    return { 
      success: false, 
      error: 'Configuración de canal no válida' 
    };
    
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
      whatsapp_api_provider: data.whatsapp_api_provider as 'waha' | 'twilio' | null,
      whatsapp_api_number: data.whatsapp_api_number,
      whatsapp_api_twilio_sid: data.whatsapp_api_twilio_sid,
      whatsapp_api_status: (data.whatsapp_api_status as 'active' | 'inactive' | 'pending') || 'inactive',
      whatsapp_enabled: data.whatsapp_enabled || false,
      whatsapp_verified: data.whatsapp_verified || false,
      waha_connected: data.waha_connected || false,
    };
    
  } catch (error) {
    console.error('[Messaging Sender] Error en getMessagingConfig:', error);
    return null;
  }
}

/**
 * Envía mensaje por WAHA
 */
async function sendWAHAMessage(
  organizationId: string,
  to: string,
  text: string
): Promise<SendMessageResult> {
  try {
    const result = await sendTextMessage(organizationId, to, text);
    
    if (result.sent) {
      return {
        success: true,
        messageId: result.messageId,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Error enviando mensaje por WAHA',
      };
    }
  } catch (error: any) {
    console.error('[Messaging Sender] Error en sendWAHAMessage:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido en WAHA',
    };
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
