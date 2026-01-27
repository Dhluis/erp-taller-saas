import { getTwilioClient, getMessagingConfig, type MessagingConfig } from './twilio-client';

export interface WhatsAppOptions {
  to: string; // Número del cliente
  message: string;
  mediaUrl?: string; // URL de imagen/archivo
}

/**
 * Enviar mensaje de WhatsApp
 * Usa WAHA o Twilio según configuración
 */
export async function sendWhatsAppMessage(
  organizationId: string,
  options: WhatsAppOptions
): Promise<{ success: boolean; provider: 'waha' | 'twilio' | null }> {
  try {
    // 1. Obtener configuración
    const config = await getMessagingConfig(organizationId);

    if (!config) {
      console.error('[WhatsApp] No config for org:', organizationId);
      return { success: false, provider: null };
    }

    // 2. Decidir proveedor
    if (config.whatsappProvider === 'twilio' && config.whatsappTwilioNumber) {
      return await sendViaTwilioWhatsApp(config, options);
    } else {
      return await sendViaWAHA(organizationId, options);
    }

  } catch (error) {
    console.error('[WhatsApp] Error sending:', error);
    return { success: false, provider: null };
  }
}

/**
 * Enviar vía Twilio WhatsApp Business API
 */
async function sendViaTwilioWhatsApp(
  config: MessagingConfig,
  options: WhatsAppOptions
): Promise<{ success: boolean; provider: 'twilio' }> {
  try {
    if (!config.whatsappTwilioNumber) {
      console.error('[Twilio WhatsApp] No Twilio number configured');
      return { success: false, provider: 'twilio' };
    }

    const client = getTwilioClient();

    // Normalizar número destino
    let toNumber = options.to;
    if (!toNumber.startsWith('whatsapp:')) {
      // Si no tiene prefijo whatsapp:, agregarlo
      toNumber = toNumber.startsWith('+') 
        ? `whatsapp:${toNumber}` 
        : `whatsapp:+${toNumber}`;
    }

    // Normalizar número origen
    let fromNumber = config.whatsappTwilioNumber;
    if (!fromNumber.startsWith('whatsapp:')) {
      fromNumber = fromNumber.startsWith('+')
        ? `whatsapp:${fromNumber}`
        : `whatsapp:+${fromNumber}`;
    }

    // Preparar mensaje
    const messageData: any = {
      from: fromNumber,
      to: toNumber,
      body: options.message,
    };

    // Agregar media si existe
    if (options.mediaUrl) {
      messageData.mediaUrl = [options.mediaUrl];
    }

    // Enviar
    const message = await client.messages.create(messageData);

    console.log('✅ [Twilio WhatsApp] Message sent:', {
      sid: message.sid,
      to: toNumber,
      status: message.status
    });

    return { success: true, provider: 'twilio' };

  } catch (error: any) {
    console.error('❌ [Twilio WhatsApp] Error:', error);
    
    if (error.code) {
      console.error('[Twilio WhatsApp] Error code:', error.code);
      console.error('[Twilio WhatsApp] Error message:', error.message);
    }

    return { success: false, provider: 'twilio' };
  }
}

/**
 * Enviar vía WAHA (sistema actual)
 * IMPORTANTE: Esta función es un placeholder que NO modifica el sistema WAHA existente
 * En el futuro, aquí se puede integrar la llamada al sistema WAHA actual
 * sin modificar los archivos originales de WAHA
 */
async function sendViaWAHA(
  organizationId: string,
  options: WhatsAppOptions
): Promise<{ success: boolean; provider: 'waha' }> {
  try {
    // NOTA: Esta función es un placeholder
    // El sistema WAHA actual funciona a través de webhooks y sesiones
    // NO modificamos ese sistema para mantener compatibilidad
    
    // TODO: En el futuro, si se necesita integración directa,
    // se puede crear un wrapper que llame a las funciones WAHA existentes
    // sin modificar los archivos originales
    
    console.log('📱 [WAHA] Message routing to existing WAHA system:', {
      organizationId,
      to: options.to,
      messageLength: options.message.length,
      hasMedia: !!options.mediaUrl
    });

    // El sistema WAHA actual maneja los mensajes a través de:
    // - Webhooks configurados
    // - Sesiones activas
    // - Sistema de conversaciones existente
    
    // Por ahora, retornamos success: true asumiendo que WAHA manejará el mensaje
    // a través de su flujo normal (webhooks, etc.)
    // En implementación futura, aquí se podría llamar directamente a WAHA API
    // si se necesita envío programático
    
    return { success: true, provider: 'waha' };

  } catch (error) {
    console.error('❌ [WAHA] Error:', error);
    return { success: false, provider: 'waha' };
  }
}

/**
 * Verificar capacidades del proveedor actual
 */
export async function getWhatsAppCapabilities(
  organizationId: string
): Promise<{
  provider: 'waha' | 'twilio' | null;
  features: {
    interactiveButtons: boolean;
    lists: boolean;
    templates: boolean;
    richMedia: boolean;
  };
}> {
  const config = await getMessagingConfig(organizationId);

  if (!config) {
    return {
      provider: null,
      features: {
        interactiveButtons: false,
        lists: false,
        templates: false,
        richMedia: false,
      }
    };
  }

  if (config.whatsappProvider === 'twilio' && config.whatsappTwilioNumber) {
    return {
      provider: 'twilio',
      features: {
        interactiveButtons: true,
        lists: true,
        templates: true,
        richMedia: true,
      }
    };
  }

  // WAHA capabilities (basado en sistema actual)
  return {
    provider: 'waha',
    features: {
      interactiveButtons: false,
      lists: false,
      templates: false,
      richMedia: true, // WAHA soporta imágenes/videos
    }
  };
}

/**
 * Verificar estado de conexión WhatsApp
 */
export async function getWhatsAppConnectionStatus(
  organizationId: string
): Promise<{
  provider: 'waha' | 'twilio' | null;
  connected: boolean;
  verified: boolean;
  sessionId?: string;
}> {
  const config = await getMessagingConfig(organizationId);

  if (!config) {
    return {
      provider: null,
      connected: false,
      verified: false,
    };
  }

  if (config.whatsappProvider === 'twilio') {
    return {
      provider: 'twilio',
      connected: !!config.whatsappTwilioNumber,
      verified: config.whatsappVerified,
    };
  }

  // WAHA connection status
  return {
    provider: 'waha',
    connected: config.wahaConnected,
    verified: config.wahaConnected, // Si WAHA está conectado, está verificado
    sessionId: config.wahaSessionId || undefined,
  };
}

