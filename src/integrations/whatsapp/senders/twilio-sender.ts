/**
 * TWILIO SENDER
 * Envía mensajes de WhatsApp usando Twilio API
 */

export interface TwilioConfig {
  account_sid: string;
  auth_token: string;
  phone_number: string; // Número de Twilio (ej: +14155238886)
}

export class TwilioSender {
  private config: TwilioConfig;

  constructor(config: TwilioConfig) {
    this.config = config;
  }

  /**
   * Enviar mensaje de texto
   */
  async sendMessage(to: string, message: string): Promise<void> {
    console.log('📤 [Twilio] Enviando mensaje...');
    console.log('  To:', to);
    console.log('  Message:', message.substring(0, 50) + '...');

    try {
      // Asegurarse que el número tenga formato whatsapp:+521234567890
      const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
      const formattedFrom = this.config.phone_number.startsWith('whatsapp:')
        ? this.config.phone_number
        : `whatsapp:${this.config.phone_number}`;

      // Usar Twilio API directamente (sin SDK para evitar dependencias)
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config.account_sid}/Messages.json`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(
            `${this.config.account_sid}:${this.config.auth_token}`
          ).toString('base64')
        },
        body: new URLSearchParams({
          From: formattedFrom,
          To: formattedTo,
          Body: message
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Twilio error: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ [Twilio] Mensaje enviado:', data.sid);
    } catch (error) {
      console.error('❌ [Twilio] Error enviando mensaje:', error);
      throw error;
    }
  }

  /**
   * Enviar mensaje con media (imagen, audio, etc)
   */
  async sendMediaMessage(
    to: string,
    message: string,
    mediaUrl: string
  ): Promise<void> {
    console.log('📤 [Twilio] Enviando mensaje con media...');

    try {
      const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
      const formattedFrom = this.config.phone_number.startsWith('whatsapp:')
        ? this.config.phone_number
        : `whatsapp:${this.config.phone_number}`;

      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config.account_sid}/Messages.json`;

      const body: any = {
        From: formattedFrom,
        To: formattedTo,
        Body: message,
        MediaUrl: mediaUrl
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(
            `${this.config.account_sid}:${this.config.auth_token}`
          ).toString('base64')
        },
        body: new URLSearchParams(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Twilio error: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ [Twilio] Mensaje con media enviado:', data.sid);
    } catch (error) {
      console.error('❌ [Twilio] Error enviando mensaje con media:', error);
      throw error;
    }
  }
}

