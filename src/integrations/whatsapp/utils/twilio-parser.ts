// src/integrations/whatsapp/utils/twilio-parser.ts

/**
 * 🔌 Parser para webhooks de Twilio
 * 
 * Convierte el payload de Twilio a nuestro formato estándar
 */

import type { TwilioWebhookPayload, WhatsAppMessage } from '../types';

export function parseTwilioWebhook(
  payload: TwilioWebhookPayload,
  organizationId: string
): Omit<WhatsAppMessage, 'id'> {
  // Extraer número de teléfono (remover prefijo "whatsapp:")
  const fromNumber = payload.From.replace('whatsapp:', '');
  const toNumber = payload.To.replace('whatsapp:', '');

  // Determinar si tiene media
  const numMedia = parseInt(payload.NumMedia || '0');
  const hasMedia = numMedia > 0;

  // Tipo de mensaje
  let messageType: 'text' | 'image' | 'document' | 'audio' | 'video' = 'text';
  if (hasMedia && payload.MediaContentType0) {
    const contentType = payload.MediaContentType0.toLowerCase();
    if (contentType.startsWith('image/')) messageType = 'image';
    else if (contentType.startsWith('audio/')) messageType = 'audio';
    else if (contentType.startsWith('video/')) messageType = 'video';
    else messageType = 'document';
  }

  return {
    organization_id: organizationId,
    from: fromNumber,
    to: toNumber,
    body: payload.Body || '',
    timestamp: new Date(),
    direction: 'inbound',
    status: 'delivered',
    message_type: messageType,
    media_url: hasMedia ? payload.MediaUrl0 : undefined,
    provider: 'twilio',
    provider_message_id: payload.MessageSid,
    metadata: {
      account_sid: payload.AccountSid,
      num_media: numMedia
    }
  };
}

/**
 * Valida la firma de Twilio para seguridad
 * https://www.twilio.com/docs/usage/security#validating-requests
 */
export function validateTwilioSignature(
  authToken: string,
  twilioSignature: string,
  url: string,
  params: Record<string, any>
): boolean {
  try {
    const crypto = require('crypto');

    // Ordenar parámetros alfabéticamente
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {} as Record<string, any>);

    // Construir data string
    let data = url;
    for (const key in sortedParams) {
      data += key + sortedParams[key];
    }

    // Generar firma HMAC-SHA1
    const hmac = crypto.createHmac('sha1', authToken);
    hmac.update(Buffer.from(data, 'utf-8'));
    const expectedSignature = hmac.digest('base64');

    // Comparar
    return expectedSignature === twilioSignature;
  } catch (error) {
    console.error('[TwilioParser] Error validando firma:', error);
    return false;
  }
}

