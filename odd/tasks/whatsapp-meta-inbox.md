# Bandeja de WhatsApp con Meta Cloud API

## Objetivo
Reconstruir la integración de WhatsApp (borrada por accidente en fa3f49c5, 2026-03-26) usando la API oficial de Meta (Cloud API), con bandeja humana (sin bot de IA todavía). Plan completo y aprobado en `C:\Users\exclu\.claude\plans\yo-quisiera-que-tengamos-lucky-gem.md`.

## Por qué
- El webhook entrante de WhatsApp no existe desde marzo 2026 — mensajes de clientes se pierden sin que nadie los vea.
- Usuario decidió explícitamente: API oficial de Meta, no Twilio ni otros proveedores. Modelo centralizado (Eagles administra una sola cuenta de Meta Business, un número por taller).
- Control de cuota por organización es requisito de día uno (Meta cobra por texto libre dentro de la ventana de 24h a partir del 1 oct 2026).
- Diseño debe quedar preparado para migrar a un BSP más adelante (techo de ~20 talleres con el modelo centralizado).

## Alcance de esta etapa
Bandeja humana: envío/recepción vía Meta, listar/ver/responder conversaciones, asignar a un miembro del equipo, permisos, control de cuota, aviso de ventana de 24h. Fuera de alcance: bot de IA, plantillas, broadcast, tags.

## Checklist (orden del plan)

- [x] 1. Migración de BD: `supabase/migrations/20260919020000_meta_whatsapp_config.sql` — aplicada y verificada en producción (columnas confirmadas vía information_schema)
- [x] 2. `src/lib/messaging/types.ts` — ampliado `MessageSource`/`MessagingConfig`/`SendMessageResult` (errorCode). Type-check limpio.
- [x] 3. `src/lib/messaging/meta-whatsapp-client.ts` (nuevo) — sendMetaTextMessage, fetchMetaMediaUrl, verifyMetaWebhookSignature. Type-check limpio.
- [x] 4. `src/lib/messaging/sender.ts` — rama Meta + cuota real antes de enviar. **Corrección importante sobre la marcha**: `checkResourceLimit('whatsapp_conversation')` resultó ser solo un interruptor on/off por plan, no un tope numérico — `monthly_whatsapp_limit` no lo usaba nadie. Se creó `checkWhatsAppQuota()` nueva en `check-limits.ts` que sí cuenta mensajes salientes reales del mes contra ese límite. Type-check: mismo patrón preexistente de errores (supabase|null), ninguno nuevo introducido.
- [x] 5. `src/app/api/webhooks/meta-whatsapp/route.ts` (nuevo) — GET verify, POST inbound + statuses. Type-check limpio.
- [x] 6. API bandeja: `conversations/route.ts`, `[id]/route.ts`, `[id]/messages/route.ts`. Type-check limpio.
  - **Corrección de esquema encontrada y aplicada**: `whatsapp_conversations.assigned_to_user_id` tenía FK a `system_users` (tabla legacy, 4 filas, solo 3 coinciden con usuarios reales de 28) en vez de `users` (la tabla real que usa el resto de la app). Verificado 0/93 conversaciones existentes con esa columna poblada — sin riesgo de huérfanos. Corregido con migración `20260919030000_fix_whatsapp_conversations_assigned_to_fkey.sql`, aplicada y verificada.
- [x] 7. UI: `src/app/whatsapp/page.tsx` + `src/components/whatsapp/{types,ConversationList,ConversationThread,MessageComposer,AssignConversationSelect}.tsx`. Realtime vía Supabase channel. Type-check limpio (un error real encontrado y corregido: `StandardBreadcrumbs` no acepta `items`, usa `currentPage`).
- [x] 8. Nav en `src/components/layout/TopBar.tsx` — link a `/whatsapp` junto a `/leads`, mismo gating (`isAdmin || isAdvisor`). Type-check limpio.
- [x] 9. Housekeeping: `twilio-client.ts` ya no hardcodea `whatsappEnabled: false`, refleja estado real. `unified-webhook.ts` eliminado (import roto, código muerto).
- [x] 10. Variables de entorno documentadas en `.env.local` (placeholders vacíos: META_WHATSAPP_ACCESS_TOKEN, META_WHATSAPP_VERIFY_TOKEN, META_APP_SECRET, META_WHATSAPP_API_VERSION="v21.0"). Valores reales pendientes de que el usuario cree la cuenta de Meta Business.
- [x] 11. Verificación: type-check completo del proyecto sin errores nuevos (2431 errores totales, todos preexistentes — de hecho bajó de 2459 por eliminar unified-webhook.ts roto). docs/specs/whatsapp-communications.md reescrito para reflejar la realidad actual.

## Pendiente (fuera del alcance de código, requiere al usuario)
- Crear la cuenta de Meta Business, verificarla, dar de alta el primer número de WhatsApp y completar el registro vía API (ver plan para el proceso híbrido manual+API).
- Cargar META_WHATSAPP_ACCESS_TOKEN / META_WHATSAPP_VERIFY_TOKEN / META_APP_SECRET reales en .env.local (y en Vercel para producción).
- Configurar el Callback URL del webhook en el dashboard de Meta apuntando a `https://<dominio>/api/webhooks/meta-whatsapp` una vez desplegado.
- Cargar `organization_messaging_config.meta_phone_number_id` (y `whatsapp_api_provider = 'meta'`) para cada organización que use WhatsApp.
- Pruebas end-to-end reales (envío/recepción real, ventana de 24h) — no se pueden hacer sin credenciales de Meta.

## Notas de progreso
Toda la etapa de código quedó implementada y verificada con type-check (2026-09-19). No se corrieron pruebas end-to-end contra Meta real (requieren credenciales que el usuario aún no tiene). Migraciones aplicadas y verificadas en producción: 20260919020000 (config de Meta) y 20260919030000 (fix FK assigned_to_user_id).

## Bug sistémico encontrado y corregido probando el frontend (2026-09-19)
Al levantar `npm run dev` y probar `/whatsapp` y `/api/whatsapp/conversations` en el navegador (no solo type-check), se encontró que `getTenantContext()` en `src/lib/core/multi-tenant-server.ts` **nunca devolvía `null`** — lanzaba una excepción (`throw new Error('Usuario no autenticado')`) en vez de retornar el valor que TODAS las rutas del proyecto (~76 archivos) ya esperaban con `if (!tenantContext) return 401`. Esto hacía que cualquier fallo de sesión terminara como un **500 con un mensaje confuso** ("Usuario no autenticado") en vez de un 401 limpio — muy probablemente la causa real del bug "ERROR 404 USUARIO NO AUTENTICADO" reportado antes en la sesión, que quedó sin resolver por falta de repro exacta.

**Corregido**: `getTenantContext()` ahora devuelve `null` para los 3 casos esperados (sin sesión, sin perfil, sin organización) y solo lanza excepción para errores realmente inesperados (red, DB). Se auditaron los ~76 archivos que la usan: la mayoría ya tenía el chequeo correcto (ahora empieza a funcionar de verdad, gratis). Se encontraron y corrigieron ~13 archivos con patrones peligrosos que el chequeo de tipos no detecta solo (destructuring directo de un valor que ahora puede ser `null`, o llamar a la función y descartar el resultado confiando en que lanzara excepción):
- `src/app/api/conversions/{quotation-to-invoice,work-order-to-quotation,work-order-to-invoice}/route.ts`
- `src/app/api/push/subscribe/route.ts`
- `src/app/api/users/[id]/{activate,role}/route.ts`, `src/app/api/users/[id]/route.ts` (GET/PUT/DELETE), `src/app/api/users/stats/route.ts`
- `src/app/api/work-orders/[id]/notify/route.ts`
- `src/lib/rate-limit/middleware.ts`
- 3 funciones internas sin uso real (`getOrganizationId`, `getWorkshopId`, `getSimpleTenantContext` en el mismo archivo)

Verificado en vivo con `npm run dev`: `GET /api/whatsapp/conversations` sin sesión pasó de `500 {"error":"Usuario no autenticado"}` a `401 {"error":"No autorizado"}`. También se agregó `/whatsapp` a `MIDDLEWARE_ROUTES` en `src/middleware.ts` (faltaba, encontrado al probar — sin eso la página no redirige a login como el resto de las rutas protegidas). Type-check final: mismo total que el baseline (2431), cero errores nuevos.

## Modo TDD
No hay indicación de TDD obligatorio en este proyecto (Vitest existe pero no es política forzada). Se harán checks funcionales (type-check, pruebas manuales/simuladas) por tarea, no ciclo red-green-refactor estricto.

## Notas de progreso
(se actualiza a medida que se completa cada tarea)
