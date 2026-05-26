# Spec: WhatsApp y Comunicaciones

**Última actualización:** Mayo 2026
**Proveedor activo:** Twilio únicamente (WAHA eliminado en Feb 2026)

---

## Arquitectura Twilio

```
Cliente WhatsApp → Twilio → Webhook /api/messaging/twilio/webhook/[organizationId]
                                    ↓
                          unified-webhook.ts
                                    ↓
                    AI Agent (ai-agent.ts) → respuesta automática
                                    ↓
                          whatsapp_conversations + whatsapp_messages (Supabase)
```

### Archivos críticos — NUNCA modificar sin permiso explícito
- `src/lib/messaging/twilio-client.ts` — cliente Twilio
- `src/lib/messaging/sender.ts` — lógica de envío
- `src/lib/messaging/whatsapp-service.ts` — servicio unificado
- `src/lib/messaging/unified-webhook.ts` — procesamiento de webhooks
- `src/app/api/messaging/twilio/webhook/[organizationId]/route.ts` — webhook entrante
- `src/integrations/whatsapp/utils/index.ts` — parsers Twilio/Meta/Evolution (mantener aunque no se use Meta)
- `src/integrations/whatsapp/services/ai-agent.ts` — agente de IA (PROTEGIDO)

---

## Configuración por Organización

- Cada organización tiene su propia URL de webhook: `/api/messaging/twilio/webhook/[organizationId]`
- Campo `whatsapp_api_provider = 'twilio'` (única opción válida, no hay WAHA ni Meta directo)
- Credenciales Twilio configuradas por organización en `organization_settings`

---

## Tablas BD

```
whatsapp_conversations — sesiones de conversación por cliente
whatsapp_messages      — mensajes individuales (entrantes y salientes)
```

**`MessageSource = 'twilio'`** siempre. No existe otro valor.

---

## Notificaciones de Órdenes

Las notificaciones a clientes al cambiar estado de orden usan WhatsApp + Email + Push:
- Función: `notifyOrderStatus(orgId, orderId, trigger, statusOverride?)`
- Archivo: `src/lib/orders/notifications.ts`
- Se disparan automáticamente en `PUT /api/work-orders/[id]` para estados: `waiting_approval`, `waiting_parts`, `ready`, `completed`
- Botón manual "Enviar al cliente" en `WorkOrderDetailsTabs.tsx`

---

## Email (SendGrid / SMTP)

- Función: `sendEmail()` en `src/lib/email/mailer.ts`
- SendGrid vía `sendEmailViaSendGrid()`
- Usado en: invitaciones de usuarios, notificaciones de órdenes, aprobación/rechazo de cotizaciones

---

## Push Notifications

- Service worker propio: `public/sw.js`
- VAPID keys en variables de entorno (Vercel)
- Tabla: `push_subscriptions`
- API: `POST/DELETE /api/push/subscribe`, `POST /api/push/send`
- UI: `src/components/PushNotificationButton.tsx`
- Registro SW: `src/components/ServiceWorkerRegister.tsx` (en layout.tsx)

---

## Componente UI

`src/components/WhatsAppTwilioStatus.tsx` — reemplaza al antiguo QR connector de WAHA.
