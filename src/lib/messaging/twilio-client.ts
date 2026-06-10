/**
 * Messaging utilities — Email only (WhatsApp/Twilio removed)
 * Kept for backward compat with email-service.ts and api/messaging/config
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
      whatsappProvider: d.whatsapp_provider || 'twilio',
      whatsappEnabled: false, // WhatsApp disabled
      whatsappTwilioNumber: null,
      whatsappVerified: false,
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

