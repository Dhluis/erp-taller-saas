-- Migración 039: Tracking de pagos MercadoPago en organizations
-- Agregar columna para MercadoPago payment ID

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS mercadopago_payment_id TEXT;

CREATE INDEX IF NOT EXISTS idx_organizations_mercadopago_payment
  ON public.organizations(mercadopago_payment_id)
  WHERE mercadopago_payment_id IS NOT NULL;

COMMENT ON COLUMN public.organizations.mercadopago_payment_id IS 'ID del pago en MercadoPago para tracking';
