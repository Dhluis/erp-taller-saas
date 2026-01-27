import sgMail from '@sendgrid/mail';
import { configureSendGrid, getMessagingConfig } from './twilio-client';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  fromName?: string;
}

/**
 * Enviar email usando SendGrid (Twilio)
 * Compatible con templates existentes
 */
export async function sendEmailViaSendGrid(
  organizationId: string,
  options: EmailOptions
): Promise<boolean> {
  try {
    // 1. Obtener configuración de la organización
    const config = await getMessagingConfig(organizationId);

    if (!config || !config.emailEnabled) {
      console.warn('[SendGrid] Email not enabled for org:', organizationId);
      return false;
    }

    // 2. Configurar SendGrid
    configureSendGrid();

    // 3. Preparar email
    const from = {
      email: process.env.SMTP_FROM_EMAIL || 'noreply@eaglessystem.io',
      name: options.fromName || config.emailFromName || 'Eagles ERP'
    };

    const replyTo = options.replyTo || config.emailReplyTo || undefined;

    const msg: any = {
      to: options.to,
      from,
      replyTo,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    };

    // 4. Enviar
    await sgMail.send(msg);

    console.log('✅ [SendGrid] Email sent:', {
      to: options.to,
      subject: options.subject,
      organizationId
    });

    return true;

  } catch (error: any) {
    console.error('❌ [SendGrid] Error sending email:', error);
    
    if (error.response) {
      console.error('[SendGrid] Response:', error.response.body);
    }

    return false;
  }
}

/**
 * Enviar múltiples emails (batch)
 */
export async function sendBulkEmails(
  organizationId: string,
  emails: EmailOptions[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const email of emails) {
    const success = await sendEmailViaSendGrid(organizationId, email);
    if (success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}

