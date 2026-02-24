/**
 * Normalizador de mensajes - Convierte mensajes de Twilio a formato unificado
 */

import { MessageSource, NormalizedMessage } from './types';

/**
 * Normaliza mensajes de Twilio a formato unificado
 */
export function normalizeMessage(
  source: MessageSource,
  rawPayload: any,
  organizationId: string
): NormalizedMessage {
  return normalizeTwilioMessage(rawPayload, organizationId);
}

/**
 * Normaliza mensaje de Twilio WhatsApp API
 */
function normalizeTwilioMessage(
  payload: any,
  organizationId: string
): NormalizedMessage {
  // Twilio envía form-data, convertir a objeto si es necesario
  const data = payload instanceof FormData
    ? Object.fromEntries(payload.entries())
    : payload;

  // Extraer número del remitente
  // Twilio envía: "whatsapp:+5214421234567"
  let from = '';
  if (data.From) {
    from = data.From.replace('whatsapp:', '').replace(/[^0-9]/g, '');
  }

  // Extraer texto del mensaje
  const text = data.Body || data.MessageBody || '';

  // Extraer ID del mensaje (Twilio MessageSid)
  const messageId = data.MessageSid || data.SmsSid || '';

  // Extraer timestamp
  const timestamp = data.Timestamp
    ? new Date(data.Timestamp).toISOString()
    : new Date().toISOString();

  // Twilio WhatsApp API también puede enviar media
  let mediaUrl: string | undefined;
  let mediaType: 'image' | 'video' | 'audio' | 'document' | undefined;

  if (data.NumMedia && parseInt(data.NumMedia) > 0) {
    const mediaIndex = 0;
    mediaUrl = data[`MediaUrl${mediaIndex}`];
    const contentType = data[`MediaContentType${mediaIndex}`] || '';

    if (contentType.startsWith('image/')) {
      mediaType = 'image';
    } else if (contentType.startsWith('video/')) {
      mediaType = 'video';
    } else if (contentType.startsWith('audio/')) {
      mediaType = 'audio';
    } else {
      mediaType = 'document';
    }
  }

  return {
    from,
    text: text || '[Sin texto]',
    messageId,
    timestamp,
    organizationId,
    source: 'twilio',
    mediaUrl,
    mediaType,
  };
}
