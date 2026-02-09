-- =====================================================
-- MIGRACIÓN 033: Agregar stripe_customer_id a organizations
-- Autor: Eagles ERP
-- Fecha: 2026-02-09
-- Descripción: Permite vincular organizaciones con Stripe Customer
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organizations'
    AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE public.organizations
    ADD COLUMN stripe_customer_id TEXT UNIQUE;

    COMMENT ON COLUMN public.organizations.stripe_customer_id IS
      'ID del cliente en Stripe (cus_xxx). Usado para Checkout y suscripciones.';

    CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer
    ON public.organizations(stripe_customer_id)
    WHERE stripe_customer_id IS NOT NULL;
  END IF;
END $$;
