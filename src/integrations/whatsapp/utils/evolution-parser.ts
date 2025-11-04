// src/integrations/whatsapp/utils/evolution-parser.ts

/**
 * 🔌 Parser para webhooks de Evolution API
 * 
 * Convierte el payload de Evolution a nuestro formato estándar
 */

import type { EvolutionWebhookPayload, WhatsAppMessage } from '../types';

export function parseEvolutionWebhook(
  payload: EvolutionWebhookPayload,
  organizationId: string
): Omit<WhatsAppMessage, 'id'> | null {
  // Solo procesar mensajes entrantes
  if (payload.data.key.fromMe) {
    return null; // Ignorar mensajes que enviamos nosotros
  }

  // Extraer número (remover @s.whatsapp.net)
  const fromNumber = payload.data.key.remoteJid.split('@')[0];

  // Extraer mensaje
  let body = '';
  let messageType: 'text' | 'image' | 'document' | 'audio' | 'video' = 'text';
  let mediaUrl: string | undefined;

  if (payload.data.message.conversation) {
    body = payload.data.message.conversation;
    messageType = 'text';
  } else if (payload.data.message.imageMessage) {
    body = payload.data.message.imageMessage.caption || '[Imagen]';
    messageType = 'image';
    // Evolution API requiere descargar la media por separado
    // mediaUrl se construiría después si es necesario
  } else if (payload.data.message.documentMessage) {
    body = payload.data.message.documentMessage.fileName || '[Documento]';
    messageType = 'document';
  }

  // Timestamp
  const timestamp = new Date(parseInt(payload.data.messageTimestamp) * 1000);

  return {
    organization_id: organizationId,
    from: fromNumber,
    to: payload.instance, // Instance name
    body,
    timestamp,
    direction: 'inbound',
    status: 'delivered',
    message_type: messageType,
    media_url: mediaUrl,
    provider: 'evolution',
    provider_message_id: payload.data.key.id,
    metadata: {
      instance: payload.instance,
      event: payload.event,
      push_name: payload.data.pushName
    }
  };
}

/**
 * Valida que el webhook viene de Evolution API
 * Evolution usa API Key en headers
 */
export function validateEvolutionWebhook(
  apiKey: string,
  receivedApiKey: string
): boolean {
  return apiKey === receivedApiKey;
}

/**
 * Alias para compatibilidad: parseEvolutionMessage
 */
export function parseEvolutionMessage(
  payload: EvolutionWebhookPayload,
  organizationId: string
): Omit<WhatsAppMessage, 'id'> | null {
  return parseEvolutionWebhook(payload, organizationId);
}

/**
 * Alias para compatibilidad: isValidEvolutionWebhook
 */
export function isValidEvolutionWebhook(
  payload: any,
  apiKey?: string,
  receivedApiKey?: string
): boolean {
  // Validación básica de estructura
  if (!payload || !payload.data || !payload.data.key) {
    return false;
  }

  // Si se proporcionan API keys, validar
  if (apiKey && receivedApiKey) {
    return validateEvolutionWebhook(apiKey, receivedApiKey);
  }

  return true; // En desarrollo, permitir sin validación
}

/**
 * Limpia número de teléfono de Evolution (remueve @s.whatsapp.net)
 */
export function cleanEvolutionNumber(jid: string): string {
  if (!jid) return '';
  return jid.split('@')[0].replace('+', '');
}


