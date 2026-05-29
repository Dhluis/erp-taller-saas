# Spec: Facturación SaaS y Planes

**Última actualización:** Mayo 2026
**Proveedor:** Hotmart (no Stripe)
**Rutas:** `src/app/settings/billing/`, `src/app/api/billing/`, `src/app/api/webhooks/hotmart/`

---

## Planes Disponibles

El código implementa **dos tiers reales**: `free` y `premium`.

| Plan | `plan_tier` | `subscription_status` | Descripción |
|------|-------------|----------------------|-------------|
| Gratuito | `free` | `none` | Límites básicos, sin IA ni WhatsApp |
| Trial | `free` | `trial` | 7 días con acceso Premium completo |
| Premium | `premium` | `active` | Sin límites, todas las funciones |
| Expirado | `free` | `expired` | Trial vencido, sin pago |
| Cancelado | `free` | `canceled` | Suscripción cancelada |

**Nota:** Los planes `basic`, `pro`, `enterprise` mencionados en versiones anteriores **no existen en el código**. Solo `free` y `premium`.

---

## Límites por Plan

Definidos en `src/types/billing.ts` → `PLAN_LIMITS`:

| Límite | Free | Premium |
|--------|------|---------|
| Clientes | 20 | Ilimitado |
| Órdenes / mes | 20 | Ilimitado |
| Productos en inventario | 30 | Ilimitado |
| Usuarios | 2 | Ilimitado |
| WhatsApp | ❌ | ✅ |
| IA / Dictado por voz | ❌ | ✅ |
| Reportes avanzados | ❌ | ✅ |

---

## Trial

- Duración: 7 días desde el registro (`trial_ends_at` en `organizations`)
- Acceso: igual que Premium durante el trial
- Lógica en `getPlanTier()`: si `subscription_status='trial'` y `trial_ends_at > NOW` → retorna `'premium'`
- Al vencer: `subscription_status` permanece `'trial'` pero `trial_ends_at < NOW` → trata como `'free'`

---

## Verificación de Límites (Servidor)

`src/lib/billing/check-limits.ts`:

- `getPlanTier(orgId)` — determina tier efectivo (considerando trial)
- `checkResourceLimit(userId, resourceType)` — verifica si puede crear (customer, work_order, inventory_item, user)
- `checkAIAgentEnabled(orgId)` — verifica `ai_enabled` del plan. Usado en: `/api/agent/query`, `/api/receipts/scan`, `/api/purchase-orders/[id]/analyze-receipt`

Los gates de billing **deben ser server-side** (API routes retornan 403). Los gates client-side (`useBilling`) se usan solo para UX (mostrar modal de upgrade), no como seguridad real.

---

## Hook useBilling (Cliente)

`src/hooks/useBilling.ts` — retorna estado del plan para UI:

```typescript
canUseAI: boolean          // IA y dictado de voz
canUseWhatsApp: boolean    // WhatsApp
canCreateCustomer: boolean
canCreateOrder: boolean
canCreateInventoryItem: boolean
canCreateUser: boolean
isNearCustomerLimit: boolean
isNearOrderLimit: boolean
daysLeftInTrial: number
isTrialActive: boolean
```

---

## Webhook Hotmart

- Endpoint: `POST /api/webhooks/hotmart`
- Verificación: `crypto.timingSafeEqual` con `HOTMART_WEBHOOK_SECRET`
- Pago aprobado → actualiza `plan_tier='premium'`, `subscription_status='active'`
- Cancelación/reembolso → degrada a `plan_tier='free'`

**Nunca exponer `HOTMART_WEBHOOK_SECRET` en logs ni responses.**

---

## Variables de Entorno Requeridas

```
HOTMART_WEBHOOK_SECRET  — verificación de webhooks
```

---

## Componentes UI

- `src/components/billing/upgrade-modal.tsx` — modal que aparece al intentar usar función Premium en Free
- `src/hooks/useLimitCheck.ts` — maneja errores 403 del servidor y dispara el modal
- `src/app/settings/billing/page.tsx` — página de billing
