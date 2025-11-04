/**
 * 🔌 Parser para webhooks de Meta WhatsApp Business API
 * 
 * Convierte el payload de Meta a nuestro formato estándar
 */

import type { WhatsAppMessage } from '../types';

export interface MetaWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: {
            body: string;
          };
          image?: {
            id: string;
            caption?: string;
          };
          document?: {
            id: string;
            filename: string;
          };
        }>;
      };
      field: string;
    }>;
  }>;
}

/**
 * Parsea webhook de Meta WhatsApp Business API
 */
export function parseMetaMessage(
  payload: MetaWebhookPayload,
  organizationId: string
): Omit<WhatsAppMessage, 'id'> | null {
  try {
    // Meta envía eventos en body.entry[].changes[]
    if (!payload.entry || !Array.isArray(payload.entry) || payload.entry.length === 0) {
      return null;
    }

    // Buscar mensajes en los cambios
    for (const entry of payload.entry) {
      if (!entry.changes || !Array.isArray(entry.changes)) continue;

      for (const change of entry.changes) {
        if (change.value?.messages && Array.isArray(change.value.messages)) {
          // Procesar el primer mensaje entrante
          for (const msg of change.value.messages) {
            // Solo procesar mensajes entrantes (no status updates)
            if (msg.type === 'text' && msg.from) {
              const fromNumber = msg.from.replace('@s.whatsapp.net', '').replace('+', '');
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
                  phone_number_id: change.value.metadata?.phone_number_id,
                  display_phone_number: change.value.metadata?.display_phone_number
                }
              };
            } else if (msg.type === 'image' && msg.from) {
              const fromNumber = msg.from.replace('@s.whatsapp.net', '').replace('+', '');
              const timestamp = new Date(parseInt(msg.timestamp) * 1000);

              return {
                organization_id: organizationId,
                from: fromNumber,
                to: change.value.metadata?.phone_number_id || '',
                body: msg.image?.caption || '[Imagen]',
                timestamp,
                direction: 'inbound',
                status: 'delivered',
                message_type: 'image',
                provider: 'meta',
                provider_message_id: msg.id,
                media_url: msg.image?.id ? `https://graph.facebook.com/v21.0/${msg.image.id}` : undefined,
                metadata: {
                  entry_id: entry.id,
                  phone_number_id: change.value.metadata?.phone_number_id
                }
              };
            }
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error('[MetaParser] Error parseando webhook:', error);
    return null;
  }
}

/**
 * Valida que el webhook viene de Meta
 * Verifica la estructura básica del payload
 */
export function isValidMetaMessage(payload: any): boolean {
  try {
    return (
      payload &&
      payload.object === 'whatsapp_business_account' &&
      Array.isArray(payload.entry) &&
      payload.entry.length > 0
    );
  } catch {
    return false;
  }
}

/**
 * Extrae el nombre del contacto del payload de Meta
 */
export function extractContactName(payload: MetaWebhookPayload): string | null {
  try {
    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        if (change.value?.contacts && change.value.contacts.length > 0) {
          return change.value.contacts[0].profile?.name || null;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

