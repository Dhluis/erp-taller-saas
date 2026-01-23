import nodemailer from 'nodemailer';

// Configuración del transporter de Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // false para 587 (TLS/STARTTLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verificar configuración del transporter
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Error en configuración SMTP:', error);
  } else {
    console.log('✅ Servidor SMTP listo para enviar emails');
  }
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Envía un email usando Hostinger SMTP
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Fallback a texto plano
    });

    console.log('✅ Email enviado:', {
      messageId: info.messageId,
      to: options.to,
      subject: options.subject,
    });

    return true;
  } catch (error) {
    console.error('❌ Error al enviar email:', error);
    return false;
  }
}

