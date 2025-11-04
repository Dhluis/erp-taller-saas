/**
 * META SENDER
 * Envía mensajes usando Meta WhatsApp Business API (oficial)
 */

export interface MetaConfig {
  phone_number_id: string; // ID del número de teléfono en Meta
  access_token: string; // Access token de la app de Meta
}

export class MetaSender {
  private config: MetaConfig;
  private baseUrl = 'https://graph.facebook.com/v21.0';

  constructor(config: MetaConfig) {
    this.config = config;
  }

  /**
   * Enviar mensaje de texto
   */
  async sendMessage(to: string, message: string): Promise<void> {
    console.log('📤 [Meta] Enviando mensaje...');
    console.log('  To:', to);
    console.log('  Message:', message.substring(0, 50) + '...');

    try {
      // Remover "whatsapp:" si existe
      const cleanTo = to.replace('whatsapp:', '').replace('+', '');

      const url = `${this.baseUrl}/${this.config.phone_number_id}/messages`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanTo,
          type: 'text',
          text: {
            preview_url: false,
            body: message
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Meta error: ${errorData.error?.message || response.statusText}`
        );
      }

      const data = await response.json();
      console.log('✅ [Meta] Mensaje enviado:', data.messages?.[0]?.id);
    } catch (error) {
      console.error('❌ [Meta] Error enviando mensaje:', error);
      throw error;
    }
  }

  /**
   * Enviar mensaje con botones interactivos
   */
  async sendButtonMessage(
    to: string,
    message: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<void> {
    console.log('📤 [Meta] Enviando mensaje con botones...');

    try {
      const cleanTo = to.replace('whatsapp:', '').replace('+', '');

      const url = `${this.baseUrl}/${this.config.phone_number_id}/messages`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanTo,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: {
              text: message
            },
            action: {
              buttons: buttons.slice(0, 3).map(btn => ({
                type: 'reply',
                reply: {
                  id: btn.id,
                  title: btn.title.substring(0, 20) // Max 20 chars
                }
              }))
            }
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Meta error: ${errorData.error?.message || response.statusText}`
        );
      }

      const data = await response.json();
      console.log('✅ [Meta] Mensaje con botones enviado:', data.messages?.[0]?.id);
    } catch (error) {
      console.error('❌ [Meta] Error enviando mensaje con botones:', error);
      throw error;
    }
  }

  /**
   * Enviar mensaje con lista desplegable
   */
  async sendListMessage(
    to: string,
    message: string,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>
  ): Promise<void> {
    console.log('📤 [Meta] Enviando mensaje con lista...');

    try {
      const cleanTo = to.replace('whatsapp:', '').replace('+', '');

      const url = `${this.baseUrl}/${this.config.phone_number_id}/messages`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanTo,
          type: 'interactive',
          interactive: {
            type: 'list',
            body: {
              text: message
            },
            action: {
              button: buttonText.substring(0, 20),
              sections: sections.map(section => ({
                title: section.title.substring(0, 24),
                rows: section.rows.slice(0, 10).map(row => ({
                  id: row.id,
                  title: row.title.substring(0, 24),
                  description: row.description?.substring(0, 72)
                }))
              }))
            }
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Meta error: ${errorData.error?.message || response.statusText}`
        );
      }

      const data = await response.json();
      console.log('✅ [Meta] Mensaje con lista enviado:', data.messages?.[0]?.id);
    } catch (error) {
      console.error('❌ [Meta] Error enviando mensaje con lista:', error);
      throw error;
    }
  }

  /**
   * Enviar mensaje con imagen
   */
  async sendImageMessage(
    to: string,
    imageUrl: string,
    caption?: string
  ): Promise<void> {
    console.log('📤 [Meta] Enviando mensaje con imagen...');

    try {
      const cleanTo = to.replace('whatsapp:', '').replace('+', '');

      const url = `${this.baseUrl}/${this.config.phone_number_id}/messages`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanTo,
          type: 'image',
          image: {
            link: imageUrl,
            caption: caption
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Meta error: ${errorData.error?.message || response.statusText}`
        );
      }

      const data = await response.json();
      console.log('✅ [Meta] Imagen enviada:', data.messages?.[0]?.id);
    } catch (error) {
      console.error('❌ [Meta] Error enviando imagen:', error);
      throw error;
    }
  }

  /**
   * Enviar template (mensaje pre-aprobado)
   */
  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string,
    parameters: string[]
  ): Promise<void> {
    console.log('📤 [Meta] Enviando template...');

    try {
      const cleanTo = to.replace('whatsapp:', '').replace('+', '');

      const url = `${this.baseUrl}/${this.config.phone_number_id}/messages`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanTo,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: languageCode
            },
            components: [
              {
                type: 'body',
                parameters: parameters.map(p => ({
                  type: 'text',
                  text: p
                }))
              }
            ]
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Meta error: ${errorData.error?.message || response.statusText}`
        );
      }

      const data = await response.json();
      console.log('✅ [Meta] Template enviado:', data.messages?.[0]?.id);
    } catch (error) {
      console.error('❌ [Meta] Error enviando template:', error);
      throw error;
    }
  }
}

