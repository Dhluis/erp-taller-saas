import { getTwilioClient, getMessagingConfig } from './twilio-client';

export interface SMSOptions {
  to: string; // Formato: +52XXXXXXXXXX
  message: string;
  mediaUrl?: string; // Opcional: URL de imagen/video
}

/**
 * Normalizar número de teléfono a formato internacional
 */
function normalizePhoneNumber(phone: string): string {
  // Eliminar espacios, guiones, paréntesis
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Si empieza con +, ya está en formato internacional
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // Si es número mexicano de 10 dígitos
  if (cleaned.length === 10) {
    return `+521${cleaned}`; // +52 1 XXXXXXXXXX
  }

  // Si ya tiene 52 al inicio
  if (cleaned.startsWith('52') && cleaned.length === 12) {
    return `+${cleaned}`;
  }

  // Retornar como vino si no se puede normalizar
  console.warn('[SMS] Could not normalize phone:', phone);
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

/**
 * Resultado de envío de SMS
 */
export interface SMSResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

/**
 * Enviar SMS usando Twilio
 */
export async function sendSMS(
  organizationId: string,
  options: SMSOptions
): Promise<SMSResult> {
  try {
    // 1. Obtener configuración
    const config = await getMessagingConfig(organizationId);

    if (!config || !config.smsEnabled) {
      console.warn('[SMS] SMS not enabled for org:', organizationId);
      return { success: false, error: 'SMS no habilitado' };
    }

    if (!config.smsFromNumber) {
      console.error('[SMS] No SMS number configured for org:', organizationId);
      return { success: false, error: 'Número SMS no configurado' };
    }

    // 2. Normalizar número destino
    const toNumber = normalizePhoneNumber(options.to);

    // 3. Preparar cliente Twilio
    const client = getTwilioClient();

    // 4. Preparar mensaje
    const messageData: any = {
      from: config.smsFromNumber,
      to: toNumber,
      body: options.message,
    };

    // Agregar media si existe
    if (options.mediaUrl) {
      messageData.mediaUrl = [options.mediaUrl];
    }

    // 5. Enviar
    const message = await client.messages.create(messageData);

    console.log('✅ [SMS] Message sent:', {
      sid: message.sid,
      to: toNumber,
      status: message.status,
      organizationId
    });

    return { success: true, messageSid: message.sid };

  } catch (error: any) {
    console.error('❌ [SMS] Error sending:', error);
    
    if (error.code) {
      console.error('[SMS] Twilio error code:', error.code);
    }

    return { 
      success: false, 
      error: error.message || 'Error desconocido al enviar SMS' 
    };
  }
}

/**
 * Verificar estado de un SMS
 */
export async function getSMSStatus(
  messageSid: string
): Promise<{ status: string; error?: string } | null> {
  try {
    const client = getTwilioClient();
    const message = await client.messages(messageSid).fetch();

    return {
      status: message.status,
      error: message.errorCode ? message.errorMessage || undefined : undefined
    };
  } catch (error) {
    console.error('[SMS] Error fetching status:', error);
    return null;
  }
}

/**
 * Enviar SMS a múltiples destinatarios
 */
export async function sendBulkSMS(
  organizationId: string,
  recipients: Array<{ to: string; message: string }>
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const result = await sendSMS(organizationId, recipient);
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
    
    // Pequeño delay para no saturar API
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { sent, failed };
}

