/**
 * Normalizador de mensajes - Convierte mensajes de diferentes fuentes
 * (WAHA y Twilio) a un formato unificado para procesamiento
 */

import { MessageSource, NormalizedMessage } from './types';

/**
 * Normaliza mensajes de diferentes fuentes a formato unificado
 */
export function normalizeMessage(
  source: MessageSource,
  rawPayload: any,
  organizationId: string
): NormalizedMessage {
  if (source === 'waha') {
    return normalizeWAHAMessage(rawPayload, organizationId);
  } else {
    return normalizeTwilioMessage(rawPayload, organizationId);
  }
}

/**
 * Normaliza mensaje de WAHA
 */
function normalizeWAHAMessage(
  payload: any,
  organizationId: string
): NormalizedMessage {
  // WAHA puede enviar el mensaje en diferentes estructuras
  const message = payload.payload || payload.message || payload.data || payload;
  
  // Extraer número del remitente
  let from = '';
  if (message.from) {
    // WAHA puede enviar: "5214421234567@c.us" o solo el número
    from = message.from.replace('@c.us', '').replace(/[^0-9]/g, '');
  } else if (message.key?.remoteJid) {
    from = message.key.remoteJid.replace('@c.us', '').replace(/[^0-9]/g, '');
  }
  
  // Extraer texto del mensaje
  let text = '';
  if (message.body) {
    text = message.body;
  } else if (message.text) {
    text = message.text;
  } else if (message.message?.conversation) {
    text = message.message.conversation;
  } else if (message.message?.extendedTextMessage?.text) {
    text = message.message.extendedTextMessage.text;
  }
  
  // Extraer ID del mensaje
  let messageId = '';
  if (message.id) {
    messageId = message.id;
  } else if (message.key?.id) {
    messageId = message.key.id;
  } else if (message.messageId) {
    messageId = message.messageId;
  } else {
    // Generar ID temporal si no existe
    messageId = `waha_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Extraer timestamp
  let timestamp = new Date().toISOString();
  if (message.timestamp) {
    // WAHA puede enviar timestamp en segundos o milisegundos
    const ts = typeof message.timestamp === 'number' 
      ? message.timestamp 
      : parseInt(message.timestamp);
    timestamp = new Date(ts > 1000000000000 ? ts : ts * 1000).toISOString();
  }
  
  // Extraer media si existe
  let mediaUrl: string | undefined;
  let mediaType: 'image' | 'video' | 'audio' | 'document' | undefined;
  
  if (message.message?.imageMessage) {
    mediaUrl = message.message.imageMessage.url || message.message.imageMessage.directPath;
    mediaType = 'image';
    if (!text && message.message.imageMessage.caption) {
      text = message.message.imageMessage.caption;
    }
  } else if (message.message?.videoMessage) {
    mediaUrl = message.message.videoMessage.url || message.message.videoMessage.directPath;
    mediaType = 'video';
    if (!text && message.message.videoMessage.caption) {
      text = message.message.videoMessage.caption;
    }
  } else if (message.message?.audioMessage) {
    mediaUrl = message.message.audioMessage.url || message.message.audioMessage.directPath;
    mediaType = 'audio';
  } else if (message.message?.documentMessage) {
    mediaUrl = message.message.documentMessage.url || message.message.documentMessage.directPath;
    mediaType = 'document';
    if (!text && message.message.documentMessage.caption) {
      text = message.message.documentMessage.caption;
    }
  }
  
  return {
    from,
    text: text || '[Sin texto]',
    messageId,
    timestamp,
    organizationId,
    source: 'waha',
    mediaUrl,
    mediaType,
  };
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
    // Twilio envía media en MediaUrl0, MediaContentType0, etc.
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
