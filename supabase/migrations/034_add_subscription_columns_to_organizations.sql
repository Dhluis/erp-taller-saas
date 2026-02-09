-- =====================================================
-- MIGRACIÓN 034: Agregar columnas de suscripción a organizations
-- Autor: Eagles ERP
-- Fecha: 2026-02-09
-- Descripción: Para tracking de suscripciones Stripe (webhook)
-- =====================================================

DO $$
BEGIN
  -- subscription_status: Estado de la suscripción Stripe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organizations'
    AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE public.organizations
    ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'none'
    CHECK (subscription_status IN ('none', 'active', 'canceled', 'expired', 'past_due'));

    COMMENT ON COLUMN public.organizations.subscription_status IS
      'Estado de la suscripción: none, active, canceled, expired, past_due';
  END IF;

  -- subscription_id: Stripe subscription ID (sub_xxx)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organizations'
    AND column_name = 'subscription_id'
  ) THEN
    ALTER TABLE public.organizations
    ADD COLUMN subscription_id TEXT UNIQUE;

    COMMENT ON COLUMN public.organizations.subscription_id IS
      'ID de la suscripción en Stripe (sub_xxx)';
  END IF;

  -- current_period_start
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organizations'
    AND column_name = 'current_period_start'
  ) THEN
    ALTER TABLE public.organizations
    ADD COLUMN current_period_start TIMESTAMP WITH TIME ZONE;

    COMMENT ON COLUMN public.organizations.current_period_start IS
      'Inicio del período actual de facturación';
  END IF;

  -- current_period_end
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organizations'
    AND column_name = 'current_period_end'
  ) THEN
    ALTER TABLE public.organizations
    ADD COLUMN current_period_end TIMESTAMP WITH TIME ZONE;

    COMMENT ON COLUMN public.organizations.current_period_end IS
      'Fin del período actual de facturación';
  END IF;
END $$;
