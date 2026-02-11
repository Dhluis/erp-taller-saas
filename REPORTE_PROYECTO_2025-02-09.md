# Reporte del Proyecto ERP Taller SaaS

**Fecha:** 9 de febrero de 2025  
**Repositorio:** erp-taller-saas

---

## 1. Resumen ejecutivo

| Área | Estado | % estimado |
|------|--------|------------|
| **Stripe + Planes** | Operativo (checkout, webhook, portal, límites) | **~95%** |
| **Core (órdenes, clientes, vehículos)** | Operativo, edición orden/vehículo/cliente corregida | **~90%** |
| **Leads + Comercial** | Operativo (CRUD, stats, conversión, WhatsApp) | **~90%** |
| **WhatsApp / Mensajería** | Operativo (WAHA, webhooks, trial, config) | **~85%** |
| **Inventario / Compras** | Operativo | **~85%** |
| **Cotizaciones / Facturación** | Parcial (cotizaciones nueva usa mock; resto real) | **~75%** |
| **Reportes / Dashboard** | Operativo | **~85%** |
| **Configuración / Empresa** | Operativo (moneda, company_settings) | **~85%** |
| **Onboarding / Tour** | Deshabilitado (react-joyride incompatible React 18) | **~40%** |

**Placeholders y datos mock relevantes:** 1 página (cotizaciones/nueva). Resto son placeholders de inputs o TODOs menores.

---

## 2. Stripe, planes y billing

### 2.1 Implementado

- **Checkout** (`/api/billing/checkout`): Crea Stripe Checkout Session (mensual $170 USD o anual $1,400 USD). Crea/recupera `stripe_customer_id` en `organizations`. IDs de precio en `PRICING` (`lib/billing/constants.ts`).
- **Webhook** (`/api/billing/webhook`): Firma verificada. Eventos:
  - `checkout.session.completed` → org a `plan_tier: 'premium'`, `subscription_status: 'active'`, `subscription_id`, `current_period_start/end`.
  - `customer.subscription.updated` → actualiza estado y período.
  - `customer.subscription.deleted` → downgrade a free y limpia `subscription_id`.
  - `invoice.payment_failed` → `subscription_status: 'past_due'`.
- **Portal** (`/api/billing/portal`): Redirección a Stripe Customer Portal (gestionar pago, cancelar).
- **Página de planes** (`/settings/billing`): Muestra plan actual, uso, precios en moneda org, FAQs, botón upgrade y portal.
- **Límites de plan** (`lib/billing/check-limits.ts`): Servidor verifica `max_customers`, `max_orders_per_month`, `max_inventory_items`, `max_users` desde `plan_limits`; trial 7 días da acceso premium.
- **Hook `useBilling`**: Plan, uso, `canCreate*`, `daysLeftInTrial`, `isTrialActive`, `refresh`.
- **Registro**: Trial 7 días (`trial_ends_at` en org o `organization_messaging_config` según migraciones).
- **BD**: `organizations`: `stripe_customer_id`, `plan_tier`, `subscription_status`, `subscription_id`, `current_period_start`, `current_period_end`, `trial_ends_at` (migraciones 033, 034, 035, 031). Tabla `plan_limits` con límites por `plan_tier`.

### 2.2 Pendiente / mejoras

- **Metadata en Subscription**: El webhook no guarda `organization_id` en `subscription.metadata` al crear la suscripción (Stripe lo puede añadir vía Checkout); si algún evento llega sin metadata, no se puede asociar a la org.
- **Página test** (`/test-billing`) existe; conviene no exponerla en producción.

**Porcentaje Stripe/Planes:** ~95% (flujo completo; detalles opcionales pendientes).

---

## 3. Placeholders y datos mock

### 3.1 Crítico: datos mock en pantalla real

| Ubicación | Qué hace | Impacto |
|-----------|----------|---------|
| **`src/app/cotizaciones/nueva/page.tsx`** | `loadCustomers()` y `loadVehiclesByCustomer()` usan **arrays mock** (C001–C005, V001–V007) en lugar de API/Supabase. | La pantalla "Nueva cotización" no muestra clientes ni vehículos reales. Debe sustituirse por llamadas a `/api/customers` y vehículos por cliente. |

### 3.2 Placeholders de UI (texto de ayuda)

- Inputs con `placeholder="..."` en formularios (órdenes, trabajo, leads, compras, etc.): son solo guía al usuario, no datos falsos.
- Ejemplos: "Escribe o selecciona un cliente", "Toyota, Honda...", "ABC-123-D", "50000", "Descripción del trabajo...". **No requieren cambio** para producción.

### 3.3 Eliminado

- `TEMP_ORG_ID` / IDs hardcodeados: eliminados según comentario en `lib/constants/index.ts`.

---

## 4. TODOs y pendientes técnicos

### 4.1 Alta prioridad

- **Cotizaciones nueva**: Reemplazar mock de clientes/vehículos por datos reales (API/Supabase).
- **Términos y condiciones en órdenes de trabajo**: Recolectados en creación pero filtrados en `createWorkOrder()` y sin columnas en `work_orders`; no se persisten. Ver reporte anterior: hace falta migración + dejar de filtrar en API.

### 4.2 Media prioridad

- **Tour de onboarding**: Deshabilitado por incompatibilidad react-joyride con React 18. TODO en `(dashboard)/layout.tsx`: migrar a driver.js u otra lib.
- **Invitations**: `api/invitations/route.ts` y `api/invitations/resend/route.ts`: "TODO: Implementar envío de email real".
- **Mensajería**: "TODO: Guardar en historial" en `api/messaging/send/email` y `api/messaging/send/whatsapp`.
- **WhatsApp**: Transcripción de audios ("TODO: Integrar con Whisper API") en webhook; QR en `page-new` ("TODO: Mostrar QR para conectar WAHA").

### 4.3 Baja prioridad / cuando se necesiten

- **organization-config**: `timezone` y `language` en company_settings (TODO agregar si se necesitan).
- **user-profile / use-user-profile / supabase/user-profile**: TODOs para actualización real de perfil, subida/eliminación de avatar en Storage, configuración de seguridad.
- **work-orders queries**: "TODO: Implementar cuando se necesite" (función concreta en queries).
- **vehicles queries**: "TODO: Implementar estas funciones cuando se necesiten".
- **quotations**: "TODO: Implementar sistema de versionado cuando se necesite".
- **Conversiones**: work-order-to-quotation, work-order-to-invoice, quotation-to-invoice: "TODO: Implementar cuando se necesite la funcionalidad".
- **Notificaciones**: approve/reject de cotizaciones: "TODO: Implementar notificaciones".
- **API auth/me, users/[id]/activate, users/[id]/role, users/stats, reports/dashboard**: Algunos con "TODO: Temporalmente comentado para deploy" (withPermission/getAuthenticatedUser).

---

## 5. Módulos principales (checklist)

| Módulo | Rutas / pantallas | API | Límites por plan | Notas |
|--------|-------------------|-----|------------------|--------|
| **Auth** | login, register, forgot/reset password, callback, setup, suspended | Sí | - | Operativo |
| **Dashboard** | dashboard, KPIs, órdenes, ingresos, alertas | Sí | - | Operativo |
| **Órdenes de trabajo** | ordenes, ordenes-trabajo, ordenes/[id], kanban | Sí | Órdenes/mes | Wizard 4 pasos; edición orden/vehículo/cliente guarda bien |
| **Clientes** | clientes | Sí | max_customers | Operativo |
| **Vehículos** | Por cliente / en orden | Sí | - | VIN opcional; placa en vehicles |
| **Leads / Comercial** | comercial | Sí | - | CRUD, stats, conversión, origen WhatsApp |
| **Cotizaciones** | cotizaciones, cotizaciones/nueva, [id] | Sí | - | **Nueva cotización usa mock** clientes/vehículos |
| **Facturación / Ingresos** | facturacion, ingresos, cobros | Sí | - | Operativo |
| **Inventario** | inventarios, productos, categorías, movimientos, alerts | Sí | max_inventory_items | Operativo |
| **Compras** | compras, ordenes de compra, proveedores, pagos | Sí | - | Operativo |
| **WhatsApp** | dashboard/whatsapp, conversaciones, setup-api, train-agent | Sí | Trial/Premium | WAHA webhook, trial, config |
| **Citas** | citas | Sí | - | Operativo |
| **Mecánicos / Empleados** | mecanicos, usuarios | Sí | max_users | Operativo |
| **Reportes** | reportes, ventas, inventario, financieros | Sí | - | Operativo |
| **Configuración** | configuraciones (empresa, sistema, usuarios), settings/billing | Sí | - | Moneda LATAM, company_settings, billing |
| **Billing** | settings/billing, checkout, portal, webhook | Sí | - | Stripe completo |

---

## 6. Porcentajes globales (estimado)

- **Stripe y planes:** ~95%
- **Funcionalidad core (órdenes, clientes, vehículos, edición):** ~90%
- **Leads y comercial:** ~90%
- **WhatsApp / mensajería:** ~85%
- **Inventario y compras:** ~85%
- **Cotizaciones (con mock en nueva):** ~75%
- **Reportes y dashboard:** ~85%
- **Configuración y empresa:** ~85%
- **Onboarding (tour):** ~40%

**Total proyecto (ponderado por módulos):** aprox. **~85%** listo para uso en producción, con el reemplazo del mock en cotizaciones/nueva y (opcional) persistencia de términos en órdenes de trabajo como mejoras prioritarias.

---

## 7. Variables de entorno relevantes

- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- **App:** `NEXT_PUBLIC_APP_URL` (redirects Stripe, etc.)
- **Exchange rates:** `EXCHANGE_RATE_API_KEY`, `NEXT_PUBLIC_EXCHANGE_RATE_CACHE_HOURS`
- **WhatsApp/WAHA:** `WAHA_API_URL`, `WAHA_API_KEY`, etc.

---

*Generado a partir del estado del código a fecha 2025-02-09.*
