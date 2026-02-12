import { getSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * Interfaz para configuración de mensajería desde BD
 */
export interface MessagingConfig {
  id: string;
  organizationId: string;
  emailEnabled: boolean;
  emailFromName: string;
  emailReplyTo: string | null;
  smsEnabled: boolean;
  smsFromNumber: string | null;
  whatsappProvider: string;
  whatsappEnabled: boolean;
  whatsappTwilioNumber: string | null;
  whatsappVerified: boolean;
  wahaSessionId: string | null;
  wahaConnected: boolean;
  chatbotEnabled: boolean;
  chatbotSystemPrompt: string | null;
  monthlyEmailLimit: number;
  monthlySmsLimit: number;
  monthlyWhatsappLimit: number;
}

/**
 * Obtener configuración de mensajería de una organización
 */
export async function getMessagingConfig(
  organizationId: string
): Promise<MessagingConfig | null> {
  try {
    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase
      .from('organization_messaging_config')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No se encontró configuración, retornar null
        console.warn(`[Messaging] No config found for org: ${organizationId}`);
        return null;
      }
      throw error;
    }

    if (!data) {
      return null;
    }

    // Mapear datos de BD a interfaz (usar 'as any' porque la tabla no está en tipos de Supabase aún)
    const configData = data as any;
    return {
      id: configData.id,
      organizationId: configData.organization_id,
      emailEnabled: configData.email_enabled ?? true,
      emailFromName: configData.email_from_name || 'Eagles System',
      emailReplyTo: configData.email_reply_to,
      smsEnabled: configData.sms_enabled ?? false,
      smsFromNumber: configData.sms_from_number,
      whatsappProvider: configData.whatsapp_provider || 'waha',
      whatsappEnabled: configData.whatsapp_enabled ?? false,
      whatsappTwilioNumber: configData.whatsapp_twilio_number,
      whatsappVerified: configData.whatsapp_verified ?? false,
      wahaSessionId: configData.waha_session_id,
      wahaConnected: configData.waha_connected ?? false,
      chatbotEnabled: configData.chatbot_enabled ?? false,
      chatbotSystemPrompt: configData.chatbot_system_prompt,
      monthlyEmailLimit: configData.monthly_email_limit ?? 1000,
      monthlySmsLimit: configData.monthly_sms_limit ?? 100,
      monthlyWhatsappLimit: configData.monthly_whatsapp_limit ?? 500,
    };
  } catch (error) {
    console.error('[Messaging] Error getting config:', error);
    return null;
  }
}

import * as sgMail from '@sendgrid/mail';
import twilio from 'twilio';

/**
 * Configurar cliente de SendGrid con API Key
 */
export function configureSendGrid(): void {
  const apiKey = process.env.SENDGRID_API_KEY;

  if (!apiKey) {
    throw new Error(
      'SENDGRID_API_KEY no está configurada en variables de entorno'
    );
  }

  // SendGrid se configura globalmente
  // @sendgrid/mail puede exportar como default o named export
  if (sgMail.default && typeof sgMail.default.setApiKey === 'function') {
    sgMail.default.setApiKey(apiKey);
  } else if (typeof sgMail.setApiKey === 'function') {
    sgMail.setApiKey(apiKey);
  } else {
    // Fallback: intentar acceder directamente
    (sgMail as any).setApiKey(apiKey);
  }

  console.log('✅ [SendGrid] Cliente configurado correctamente');
}

/**
 * Limpia variables de entorno removiendo \r\n, espacios y caracteres invisibles
 * CRÍTICO: Vercel a veces agrega \r\n al final de las variables
 */
function cleanEnvVar(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value
    .replace(/\r\n/g, '')  // Remover \r\n
    .replace(/\r/g, '')    // Remover \r
    .replace(/\n/g, '')    // Remover \n
    .trim();               // Remover espacios al inicio/final
}

/**
 * Configurar cliente de Twilio
 */
export function configureTwilio(): twilio.Twilio {
  const accountSid = cleanEnvVar(process.env.TWILIO_ACCOUNT_SID);
  const authToken = cleanEnvVar(process.env.TWILIO_AUTH_TOKEN);

  if (!accountSid || !authToken) {
    console.error('❌ [Twilio] Variables de entorno faltantes:', {
      hasAccountSid: !!accountSid,
      hasAuthToken: !!authToken,
      accountSidLength: accountSid?.length || 0,
      authTokenLength: authToken?.length || 0,
    });
    throw new Error(
      'TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN no están configuradas o están vacías. Verifica las variables de entorno en Vercel.'
    );
  }

  // Validar formato básico de Account SID (debe empezar con "AC")
  if (!accountSid.startsWith('AC')) {
    console.error('❌ [Twilio] Account SID con formato incorrecto:', {
      accountSid: accountSid.substring(0, 5) + '...',
      expectedFormat: 'AC...'
    });
    throw new Error(
      'TWILIO_ACCOUNT_SID tiene formato incorrecto. Debe empezar con "AC".'
    );
  }

  const client = twilio(accountSid, authToken);

  console.log('✅ [Twilio] Cliente configurado correctamente');
  return client;
}

/**
 * Obtener cliente Twilio configurado (alias para compatibilidad)
 */
export function getTwilioClient(): twilio.Twilio {
  return configureTwilio();
}

