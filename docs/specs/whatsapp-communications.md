# Spec: WhatsApp y Comunicaciones

**Última actualización:** Septiembre 2026
**Proveedor activo:** API oficial de WhatsApp Business (Meta Cloud API)

---

## Historia importante

El 26/03/2026 (commit `fa3f49c5`, sin relación con WhatsApp en su mensaje) se borró por accidente toda la integración de WhatsApp basada en Twilio: webhook entrante, bandeja de conversaciones, agente de IA automático (`src/integrations/whatsapp/**`), hooks y componentes. Pasó desapercibido 6 meses — durante ese tiempo, los mensajes entrantes de WhatsApp se perdían sin que nadie los viera.

En septiembre 2026 se reconstruyó desde cero usando **la API oficial de Meta**, no Twilio. Detalle completo del diseño y las decisiones (límites de números, control de cuota, comparación con Leadsales/Callbell, plan de migración a BSP) en `odd/tasks/whatsapp-meta-inbox.md` y el plan aprobado guardado en esa sesión.

**Lo que NO se perdió**: las tablas `whatsapp_conversations`/`whatsapp_messages` nunca se borraron — seguían en producción con datos históricos y columnas bien pensadas (`assigned_to_user_id`, `is_bot_active`, `is_lead`/`lead_id`). La reconstrucción es de código de aplicación, no de esquema.

**Alcance actual: bandeja humana.** Un miembro del equipo responde manualmente. No hay bot de IA automático todavía (el que existía se perdió con el borrado; reconstruirlo es una etapa futura, fuera de este alcance).

---

## Arquitectura (Meta Cloud API)

```
Cliente WhatsApp → Meta → Webhook único global /api/webhooks/meta-whatsapp
                                    ↓
                    Resuelve organización por metadata.phone_number_id
                                    ↓
                    whatsapp_conversations + whatsapp_messages (Supabase)
                                    ↓
                    Bandeja humana en /whatsapp — el equipo responde manual
```

Modelo de negocio: **centralizado**. Eagles administra una sola cuenta de Meta Business (business portfolio) y da de alta un número por taller dentro de ella. Techo real verificado en documentación oficial de Meta: **2 números al empezar, 20 una vez verificado el negocio — el límite es por portfolio completo, no por WABA**. En la práctica, ~20 talleres con WhatsApp activo es el techo de este modelo. Ver `odd/tasks/whatsapp-meta-inbox.md` para las tres salidas evaluadas al llegar ahí (más business portfolios, Embedded Signup + Tech Provider, o un BSP como 360dialog/Gupshup).

### Archivos clave

- `src/lib/messaging/meta-whatsapp-client.ts` — cliente de la Cloud API: `sendMetaTextMessage()`, `fetchMetaMediaUrl()`, `verifyMetaWebhookSignature()`.
- `src/lib/messaging/sender.ts` — punto único de envío (`sendMessage(organizationId, to, message)`), rama por proveedor (`twilio` legacy / `meta`). Antes de enviar, siempre pasa por `checkWhatsAppQuota()`. **No cambiar la firma pública** — lo usa `notifyOrderStatus()`.
- `src/lib/billing/check-limits.ts` — `checkWhatsAppQuota(organizationId)`: cuenta mensajes salientes reales del mes contra `organization_messaging_config.monthly_whatsapp_limit` (0 = ilimitado). Existe porque desde oct-2026 Meta cobra por prácticamente todo mensaje — sin este control, un taller podía generar gasto sin límite en la cuenta centralizada. (Ojo: `checkResourceLimit('whatsapp_conversation', ...)` es un interruptor on/off por plan, NO un tope numérico — no confundir los dos.)
- `src/app/api/webhooks/meta-whatsapp/route.ts` — webhook único global (no por organización, así funciona Meta). `GET` verifica el handshake, `POST` procesa mensajes entrantes y delivery receipts, con verificación obligatoria de firma (`X-Hub-Signature-256`).
- `src/app/api/whatsapp/conversations/**` — API de la bandeja (listar, detalle+mensajes, responder, asignar). Todas usan `getTenantContext()` + `hasPermission(role, 'whatsapp', ...)`.
- `src/app/whatsapp/page.tsx` + `src/components/whatsapp/**` — UI de la bandeja, con Realtime de Supabase (ya habilitado en estas tablas desde antes).

### Ya NO existen (código muerto eliminado o nunca reconstruido)
- `src/integrations/whatsapp/**` — agente de IA, adapters, parsers (borrados en fa3f49c5).
- `src/lib/messaging/unified-webhook.ts` — tenía un import roto a `ai-agent.ts` (que ya no existe); eliminado en sept-2026.
- `src/lib/messaging/whatsapp-service.ts`, `src/components/WhatsAppTwilioStatus.tsx` — no se recrearon, no hacen falta con el diseño actual.
- Webhook de Twilio por organización (`/api/messaging/twilio/webhook/[organizationId]`) — reemplazado por el webhook único de Meta.

---

## Corrección de esquema relevante

`whatsapp_conversations.assigned_to_user_id` tenía una FK apuntando a `system_users` (tabla legacy, casi vacía) en vez de `users` (la tabla real). Corregido en `supabase/migrations/20260919030000_fix_whatsapp_conversations_assigned_to_fkey.sql` — verificado sin datos huérfanos antes de aplicar (0 de 93 conversaciones existentes tenían esa columna poblada).

---

## Configuración por Organización

- `organization_messaging_config.meta_phone_number_id` — único mecanismo de ruteo multi-tenant del webhook (índice único parcial, dos organizaciones nunca pueden compartir el mismo número).
- `organization_messaging_config.meta_access_token` — override opcional por organización; si es NULL, se usa `META_WHATSAPP_ACCESS_TOKEN` global.
- `organization_messaging_config.whatsapp_api_provider` — `'twilio'` (legacy) o `'meta'`.
- Variables de entorno nuevas: `META_WHATSAPP_ACCESS_TOKEN`, `META_WHATSAPP_VERIFY_TOKEN`, `META_APP_SECRET`, `META_WHATSAPP_API_VERSION` (placeholders ya agregados a `.env.local`, valores reales pendientes de que exista la cuenta de Meta Business).

---

## Tablas BD

```
whatsapp_conversations — por cliente/taller. assigned_to_user_id → users(id), is_bot_active, is_lead/lead_id (vínculo con CRM)
whatsapp_messages      — mensajes individuales. direction (inbound/outbound), provider ('meta' | 'twilio' legacy)
```

---

## Notificaciones de Órdenes

Sin cambios en la interfaz pública — sigue funcionando igual, ahora puede salir por Meta o Twilio según la config de la organización:
- Función: `notifyOrderStatus(orgId, orderId, trigger, statusOverride?)`
- Archivo: `src/lib/orders/notifications.ts` → usa `sendMessage()` de `sender.ts`
- Se disparan automáticamente en `PUT /api/work-orders/[id]` para estados: `waiting_approval`, `waiting_parts`, `ready`, `completed`
- Botón manual "Enviar al cliente" en `WorkOrderDetailsTabs.tsx`
- **Limitación conocida, no resuelta todavía**: fuera de la ventana de 24h desde el último mensaje del cliente, Meta solo permite plantillas pre-aprobadas — un mensaje de texto libre (como esta notificación) fallará. El sistema de plantillas queda para una etapa futura.

---

## Email (SendGrid / SMTP)

Sin cambios — `sendEmail()` en `src/lib/email/mailer.ts`, SendGrid vía `sendEmailViaSendGrid()`.

---

## Push Notifications

Sin cambios — service worker propio (`public/sw.js`), VAPID keys, tabla `push_subscriptions`, `src/components/PushNotificationButton.tsx`.

---

## Fuera de alcance (etapas futuras)

- Bot de IA automático que responda solo (existía, se perdió con el borrado).
- Sistema de plantillas de Meta pre-aprobadas (necesario para notificaciones fuera de la ventana de 24h).
- Envío masivo/broadcast a leads.
- Tags/etiquetas en conversaciones o leads.
- UI de asignación en el kanban de leads (hoy `leads.assigned_to` es de solo lectura).
