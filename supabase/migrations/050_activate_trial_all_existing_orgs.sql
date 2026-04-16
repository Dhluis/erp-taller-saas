-- ============================================================
-- MIGRACIÓN 050: Trial Premium de 7 días para TODAS las cuentas
-- ============================================================
-- Objetivo:
--   1. Todas las orgs en 'free' o 'expired_trial' → ponerlas en trial
--      premium por 7 días desde HOW (dia 8 vuelven a free automáticamente).
--   2. Las orgs que YA tienen trial activo y aún no vence → dejarlas sin cambio.
--   3. Las orgs con suscripción premium activa (pagada) → sin cambio.
-- ============================================================

-- ── PASO 1: Activar trial para orgs FREE o EXPIRED (no pagas) ──────────────
UPDATE organizations
SET
  plan_tier          = 'premium',
  subscription_status = 'trial',
  trial_ends_at      = (NOW() + INTERVAL '7 days'),
  plan_started_at    = COALESCE(plan_started_at, NOW()),
  updated_at         = NOW()
WHERE
  -- Solo afectar cuentas que NO tienen suscripción de pago activa
  subscription_status IN ('free', 'expired_trial', 'expired', 'inactive', 'canceled')
  OR (subscription_status IS NULL AND (plan_tier = 'free' OR plan_tier IS NULL));

-- ── PASO 2: Verificación ────────────────────────────────────────────────────
-- Ejecuta esto para confirmar cuántos registros se actualizaron:
-- SELECT count(*), subscription_status, plan_tier FROM organizations GROUP BY subscription_status, plan_tier;

-- ── Resultado esperado después de la migración: ─────────────────────────────
-- • plan_tier = 'premium', subscription_status = 'trial'
--   → Todas las cuentas sin pago activo (trial vence en 7 días)
-- • plan_tier = 'premium', subscription_status = 'active'
--   → Cuentas con pago confirmado (sin cambio)
-- • plan_tier = 'premium', subscription_status = 'trial' (trial_ends_at futuro)
--   → Cuentas que ya tenían trial vigente (sin cambio)
-- ============================================================
