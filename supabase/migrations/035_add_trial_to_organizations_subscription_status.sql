-- =====================================================
-- MIGRACIÓN 035: Permitir 'trial' en subscription_status de organizations
-- =====================================================
-- Fecha: 2026-02-10
-- Descripción: Extiende el CHECK para incluir 'trial' (7 días gratis nuevas orgs)

DO $$
BEGIN
  -- Remover constraint existente y agregar nueva con 'trial'
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'organizations'
    AND constraint_name LIKE '%subscription_status%'
  ) THEN
    ALTER TABLE public.organizations
    DROP CONSTRAINT IF EXISTS organizations_subscription_status_check;
  END IF;

  ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_subscription_status_check
  CHECK (subscription_status IN ('none', 'trial', 'active', 'canceled', 'expired', 'past_due'));
END $$;

COMMENT ON COLUMN public.organizations.subscription_status IS
  'Estado: none, trial=prueba gratis 7 días, active, canceled, expired, past_due';
