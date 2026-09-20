/**
 * Cliente de WhatsApp Cloud API (Meta) — envío de mensajes, medios y
 * verificación de firma del webhook.
 *
 * Documentación: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

import crypto from 'crypto';
import { SendMessageResult } from './types';

const META_GRAPH_BASE = 'https://graph.facebook.com';

function apiVersion(): string {
  return process.env.META_WHATSAPP_API_VERSION || 'v21.0';
}

/** Meta espera el número en dígitos, sin el '+' inicial (a diferencia del formato E.164 usado internamente). */
function toMetaPhoneFormat(to: string): string {
  return to.replace(/[^0-9]/g, '');
}

/**
 * Envía un mensaje de texto libre vía WhatsApp Cloud API.
 * Solo funciona dentro de la ventana de 24h desde el último mensaje del
 * cliente (o con una plantilla aprobada, que no está en el alcance actual).
 */
export async function sendMetaTextMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  body: string
): Promise<SendMessageResult> {
  try {
    const url = `${META_GRAPH_BASE}/${apiVersion()}/${phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toMetaPhoneFormat(to),
        type: 'text',
        text: { body },
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.error) {
      const errorCode = data?.error?.code;
      console.error('[MetaWhatsApp] Error enviando mensaje:', data?.error);
      return {
        success: false,
        error: data?.error?.message || `Error HTTP ${response.status}`,
        // 131047 = "Re-engagement message" — el cliente no escribió en las últimas 24h
        errorCode: errorCode === 131047 ? 'OUTSIDE_24H_WINDOW' : undefined,
      };
    }

    const messageId = data?.messages?.[0]?.id;
    return { success: true, messageId };
  } catch (error: any) {
    console.error('[MetaWhatsApp] Error de red enviando mensaje:', error);
    return { success: false, error: error.message || 'Error desconocido al enviar mensaje por Meta' };
  }
}

/**
 * Obtiene la URL temporal (~5 min de vida) de un medio recibido por webhook.
 * Hay que descargarla inmediatamente — no sirve para almacenar de forma persistente.
 */
export async function fetchMetaMediaUrl(
  mediaId: string,
  accessToken: string
): Promise<{ url: string; mimeType: string } | null> {
  try {
    const response = await fetch(`${META_GRAPH_BASE}/${apiVersion()}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      console.error('[MetaWhatsApp] Error obteniendo URL de medio:', response.status);
      return null;
    }

    const data = await response.json();
    if (!data?.url) return null;

    return { url: data.url, mimeType: data.mime_type || 'application/octet-stream' };
  } catch (error) {
    console.error('[MetaWhatsApp] Error de red obteniendo medio:', error);
    return null;
  }
}

/**
 * Verifica la firma HMAC-SHA256 del webhook (header X-Hub-Signature-256).
 * Obligatorio antes de procesar cualquier request — sin esto, cualquiera con
 * la URL del webhook podría inyectar conversaciones/mensajes falsos.
 */
export function verifyMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }

  const expectedSignature = signatureHeader.slice('sha256='.length);
  const computedSignature = crypto.createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  const computedBuffer = Buffer.from(computedSignature, 'hex');

  if (expectedBuffer.length !== computedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, computedBuffer);
}
