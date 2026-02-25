# WhatsApp en el ERP

WhatsApp está integrado únicamente con **Twilio WhatsApp Business API**.

- Envío y recepción de mensajes: Twilio.
- El número por organización se configura en `organization_messaging_config` (campo `whatsapp_api_number`).
- Variables de entorno: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`.

Ver el README principal en la raíz del repositorio para variables de entorno y configuración de Twilio, y la documentación de mensajería en `src/lib/messaging/` para más detalles.
