# Spec: Facturación SaaS y Planes

**Última actualización:** Mayo 2026
**Proveedor:** Hotmart (no Stripe)
**Rutas:** `src/app/(dashboard)/settings/billing/`, `src/app/api/billing/`, `src/app/api/webhooks/hotmart/`

---

## Planes Disponibles

Los planes controlan límites de uso. Definidos en `src/lib/config/plans.ts` (o equivalente).

| Plan | Descripción |
|------|-------------|
| `free` | Plan gratuito con funciones básicas |
| `trial` | Trial de 7 días con acceso completo |
| `basic` | Plan básico de pago |
| `pro` | Plan profesional |
| `enterprise` | Sin límites |

**Trial:** 7 días desde el registro. Al vencer, banner de advertencia y bloqueo de funciones premium.

---

## Límites por Plan

Los límites se aplican en tiempo real. Si una organización supera un límite:
- Se muestra advertencia en UI
- En límites críticos se bloquea la acción

Límites típicos: número de usuarios, órdenes/mes, almacenamiento de imágenes, módulos habilitados.
Verificar implementación actual en `src/lib/config/` y `src/app/(dashboard)/settings/billing/page.tsx`.

---

## Webhook Hotmart

- Endpoint: `POST /api/webhooks/hotmart`
- Verificación: `crypto.timingSafeEqual` con variable `HOTMART_WEBHOOK_SECRET`
- Al recibir pago aprobado: actualiza `plan` y `plan_expires_at` en la organización
- Al recibir cancelación/reembolso: degrada el plan

**Nunca exponer `HOTMART_WEBHOOK_SECRET` en logs ni responses.**

---

## Variables de Entorno Requeridas

```
HOTMART_WEBHOOK_SECRET  — verificación de webhooks
```

---

## Componentes UI

- `src/components/billing/plan-usage.tsx` — barra de uso del plan
- `src/app/(dashboard)/settings/billing/page.tsx` — página de billing
- Banner de trial: en layout del dashboard, visible cuando `isTrialExpired`
