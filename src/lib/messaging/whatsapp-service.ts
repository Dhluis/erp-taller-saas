import { getTwilioClient, getMessagingConfig, type MessagingConfig } from './twilio-client';

export interface WhatsAppOptions {
  to: string; // Número del cliente
  message: string;
  mediaUrl?: string; // URL de imagen/archivo
}

/**
 * Enviar mensaje de WhatsApp vía Twilio
 */
export async function sendWhatsAppMessage(
  organizationId: string,
  options: WhatsAppOptions
): Promise<{ success: boolean; provider: 'twilio' | null }> {
  try {
    const config = await getMessagingConfig(organizationId);

    if (!config) {
      console.error('[WhatsApp] No config for org:', organizationId);
      return { success: false, provider: null };
    }

    if (!config.whatsappTwilioNumber) {
      console.error('[WhatsApp] No Twilio number configured for org:', organizationId);
      return { success: false, provider: null };
    }

    return await sendViaTwilioWhatsApp(config, options);

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
    const client = getTwilioClient();

    let toNumber = options.to;
    if (!toNumber.startsWith('whatsapp:')) {
      toNumber = toNumber.startsWith('+')
        ? `whatsapp:${toNumber}`
        : `whatsapp:+${toNumber}`;
    }

    let fromNumber = config.whatsappTwilioNumber!;
    if (!fromNumber.startsWith('whatsapp:')) {
      fromNumber = fromNumber.startsWith('+')
        ? `whatsapp:${fromNumber}`
        : `whatsapp:+${fromNumber}`;
    }

    const messageData: any = {
      from: fromNumber,
      to: toNumber,
      body: options.message,
    };

    if (options.mediaUrl) {
      messageData.mediaUrl = [options.mediaUrl];
    }

    const message = await client.messages.create(messageData);

    console.log('✅ [Twilio WhatsApp] Message sent:', {
      sid: message.sid,
      to: toNumber,
      status: message.status
    });

    return { success: true, provider: 'twilio' };

  } catch (error: any) {
    console.error('❌ [Twilio WhatsApp] Error:', error);
    return { success: false, provider: 'twilio' };
  }
}

/**
 * Verificar capacidades del proveedor Twilio
 */
export async function getWhatsAppCapabilities(
  organizationId: string
): Promise<{
  provider: 'twilio' | null;
  features: {
    interactiveButtons: boolean;
    lists: boolean;
    templates: boolean;
    richMedia: boolean;
  };
}> {
  const config = await getMessagingConfig(organizationId);

  if (!config || !config.whatsappTwilioNumber) {
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

/**
 * Verificar estado de conexión WhatsApp
 */
export async function getWhatsAppConnectionStatus(
  organizationId: string
): Promise<{
  provider: 'twilio' | null;
  connected: boolean;
  verified: boolean;
}> {
  const config = await getMessagingConfig(organizationId);

  if (!config) {
    return { provider: null, connected: false, verified: false };
  }

  return {
    provider: 'twilio',
    connected: !!config.whatsappTwilioNumber,
    verified: config.whatsappVerified,
  };
}
