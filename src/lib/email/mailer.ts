import nodemailer from 'nodemailer';
import { sendEmailSendGridGlobal } from '@/lib/messaging/email-service';

function isSendGridConfigured(): boolean {
  return !!process.env.SENDGRID_API_KEY?.trim();
}

function isSmtpConfigured(): boolean {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_FROM_EMAIL
  );
}

// Configuración del transporter de Nodemailer (solo si hay variables y no usamos solo SendGrid)
const transporter = isSmtpConfigured()
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

if (transporter) {
  transporter.verify((error) => {
    if (error) {
      console.warn('⚠️ SMTP verify:', error.message);
    } else {
      console.log('✅ Servidor SMTP listo para enviar emails');
    }
  });
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Envía un email usando un solo proveedor con prioridad:
 * 1) SendGrid (si SENDGRID_API_KEY está configurada) — recomendado.
 * 2) SMTP / Nodemailer (si SMTP_* está configurado).
 * Si ninguno está configurado, retorna false sin lanzar error.
 * Usado por: cotizaciones (enviar por email), invitaciones de usuario.
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (isSendGridConfigured()) {
    return sendEmailSendGridGlobal({
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  }

  if (transporter && process.env.SMTP_FROM_NAME && process.env.SMTP_FROM_EMAIL) {
    try {
      const info = await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
      });
      console.log('✅ Email enviado (SMTP):', {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject,
      });
      return true;
    } catch (error) {
      console.error('❌ Error al enviar email (SMTP):', error);
      return false;
    }
  }

  console.warn(
    '⚠️ [mailer] Ningún proveedor de email configurado. Configura SENDGRID_API_KEY + SMTP_FROM_EMAIL (recomendado) o SMTP_HOST/SMTP_USER/SMTP_PASS/SMTP_FROM_*.'
  );
  return false;
}

