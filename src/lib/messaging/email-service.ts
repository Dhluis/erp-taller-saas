import * as sgMail from '@sendgrid/mail';
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
 * Envía un email por SendGrid usando solo variables de entorno (sin config por organización).
 * Útil para cotizaciones, invitaciones y cualquier envío que no dependa de organization_messaging_config.
 * Requiere: SENDGRID_API_KEY, SMTP_FROM_EMAIL (opcional SMTP_FROM_NAME).
 */
export async function sendEmailSendGridGlobal(options: EmailOptions): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  if (!apiKey) {
    console.warn('[SendGrid] SENDGRID_API_KEY no configurada.');
    return false;
  }

  const fromEmail = process.env.SMTP_FROM_EMAIL?.trim() || 'noreply@eaglessystem.io';
  const fromName = options.fromName || process.env.SMTP_FROM_NAME?.trim() || 'Eagles System';

  try {
    configureSendGrid();

    const msg = {
      to: options.to,
      from: { email: fromEmail, name: fromName },
      replyTo: options.replyTo || undefined,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    };

    await (sgMail as any).send(msg);

    console.log('✅ [SendGrid] Email sent (global):', { to: options.to, subject: options.subject });
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
      name: options.fromName || config.emailFromName || 'Eagles System'
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

    await (sgMail as any).send(msg);

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

