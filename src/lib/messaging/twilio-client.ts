/**
 * Messaging utilities — configuración de mensajería para la pantalla de Settings.
 * WhatsApp se reconstruyó en 2026-09 sobre Meta Cloud API (ver
 * src/lib/messaging/sender.ts y meta-whatsapp-client.ts) — este archivo ya
 * refleja el estado real en vez del `whatsappEnabled: false` hardcodeado que
 * quedó del borrado accidental de fa3f49c5.
 */
import * as sgMail from '@sendgrid/mail';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export interface MessagingConfig {
  emailEnabled: boolean;
  emailFromName: string;
  emailReplyTo: string | null;
  whatsappProvider: string;
  whatsappEnabled: boolean;
  whatsappTwilioNumber: string | null;
  whatsappVerified: boolean;
  chatbotEnabled: boolean;
  chatbotSystemPrompt: string | null;
  monthlyEmailLimit: number;
  monthlyWhatsappLimit: number;
}

/**
 * Configure SendGrid with the API key from environment variables.
 */
export function configureSendGrid(): void {
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  if (apiKey) {
    (sgMail as any).setApiKey(apiKey);
  }
}

/**
 * Fetch messaging configuration from the database for an organization.
 */
export async function getMessagingConfig(organizationId: string): Promise<MessagingConfig | null> {
  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from('organization_messaging_config')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) return null;

    const d = data as any;
    return {
      emailEnabled: d.email_enabled ?? true,
      emailFromName: d.email_from_name || 'Eagles System',
      emailReplyTo: d.email_reply_to || null,
      whatsappProvider: d.whatsapp_api_provider || d.whatsapp_provider || null,
      whatsappEnabled: Boolean(d.whatsapp_enabled && d.whatsapp_api_provider),
      whatsappTwilioNumber: d.whatsapp_api_provider === 'twilio' ? d.whatsapp_api_number || null : null,
      whatsappVerified: d.whatsapp_verified ?? false,
      chatbotEnabled: d.chatbot_enabled ?? false,
      chatbotSystemPrompt: d.chatbot_system_prompt || null,
      monthlyEmailLimit: d.monthly_email_limit ?? 1000,
      monthlyWhatsappLimit: d.monthly_whatsapp_limit ?? 500,
    };
  } catch (e) {
    console.error('[getMessagingConfig] Error:', e);
    return null;
  }
}

