# Estado del Proyecto — Confia Drive ERP

**Última actualización:** Abril 2026
**Versión:** 5.0.0 — Producción estable
**Rama principal:** `main`

---

## Resumen Ejecutivo

ERP SaaS multi-tenant para talleres mecánicos. Sistema en producción activa con clientes reales. Stack: Next.js 15 (App Router), TypeScript, Supabase (PostgreSQL + RLS), Tailwind CSS, shadcn/ui.

---

## Módulos Implementados

### Núcleo
- ✅ Autenticación: email/contraseña, Google OAuth, magic link (Supabase Auth)
- ✅ Multi-tenancy con RLS en 41+ tablas
- ✅ Onboarding: registro → organización → taller → dashboard
- ✅ Roles y permisos (admin, mecánico, recepcionista)
- ✅ Invitaciones de usuario por email

### Operaciones del Taller
- ✅ Órdenes de trabajo (flujo completo con estados, imágenes, ítems)
- ✅ Cotizaciones → conversión a nota de venta u orden
- ✅ Notas de venta (facturas) con ítems y descuentos
- ✅ Clientes y vehículos con historial
- ✅ Agenda / citas
- ✅ Inventario con categorías, movimientos y alertas de stock bajo
- ✅ Empleados / mecánicos
- ✅ Servicios y paquetes de servicio

### Finanzas
- ✅ Pagos de facturas (`invoice_payments`) con actualización automática de estado
- ✅ Cuentas de efectivo (`cash_accounts`): tipo `cash`, `bank`, `card`
- ✅ Movimientos de caja (`cash_account_movements`): ingresos y retiros
- ✅ Entradas y salidas (`financial_transactions`): libro de movimientos diario
- ✅ Cobros a clientes (`collections`)
- ✅ Pagos a proveedores (`supplier_payments`)
- ✅ KPIs en dashboard: ingresos del mes, efectivo, bancos/tarjetas, ticket promedio

### Proveedores y Compras
- ✅ Proveedores con estadísticas
- ✅ Órdenes de compra
- ✅ Pagos a proveedores

### Comunicaciones
- ✅ WhatsApp via Twilio (webhooks, conversaciones, respuestas automáticas)
- ✅ Notificaciones por email (SendGrid / SMTP)
- ✅ Push notifications (Web Push con VAPID, service worker propio)
- ✅ Notificaciones internas en la app

### Facturación SaaS
- ✅ Planes de suscripción via Hotmart (pago mensual)
- ✅ Trial de 7 días con banner y bloqueo al vencer
- ✅ Webhook Hotmart con verificación `hottok` por `timingSafeEqual`

### PWA
- ✅ Service worker propio (`public/sw.js`) con push notifications
- ✅ Manifest en `src/app/manifest.ts` (Next.js 15 nativo)
- ✅ Instalable en móvil y desktop

### Seguridad (Abril 2026)
- ✅ CORS con lista blanca de orígenes (no wildcard) + `Vary: Origin`
- ✅ HSTS + Referrer-Policy en headers de Next.js
- ✅ CSP en modo report-only (para observar antes de activar enforced)
- ✅ Endpoints de demo bloqueados en producción (`NODE_ENV` guard)
- ✅ Error sanitization en rutas críticas (helper `safeError`)
- ✅ Verificación de webhooks con `crypto.timingSafeEqual`
- ✅ TypeScript `strict: true`
- ✅ Contraseñas: mínimo 8 caracteres + al menos un número

---

## Integraciones Activas

| Servicio | Propósito | Notas |
|---|---|---|
| Supabase | Base de datos + Auth + Storage | Principal |
| Twilio | WhatsApp Business | Webhooks por organización |
| Hotmart | Facturación SaaS | Mensual, sin Stripe |
| SendGrid | Email transaccional | Invitaciones, notificaciones |
| Upstash Redis | Rate limiting en login | Fail-open si Redis no responde |
| Web Push (VAPID) | Push notifications | SW propio sin next-pwa |

---

## Integraciones Eliminadas

| Servicio | Reemplazado por | Fecha |
|---|---|---|
| WAHA (WhatsApp HTTP API) | Twilio | Feb 2026 |
| Stripe | Hotmart | Feb 2026 |

---

## Pendientes / Deuda Técnica

| Item | Prioridad | Notas |
|---|---|---|
| Activar CSP enforced | Media | Observar violaciones en report-only primero |
| Rate limiting fail-closed | Baja | Requiere evaluar confiabilidad de Redis |
| Extender `safeError` a ~145 rutas restantes | Baja | Helper en `@/lib/utils/api-error`, adoptar gradualmente |
| FASE 4 WhatsApp BD cleanup | Baja | Ejecutar en Supabase SQL Editor manualmente |

---

## Comandos Útiles

```bash
npm run dev          # Desarrollo
npm run build        # Build producción
npm run type-check   # Verificar tipos sin emitir
npm run test         # Vitest
npm run diagnose     # type-check + test
npm run full-check   # type-check + test + build
npm run env:check    # Verificar variables de entorno
```
