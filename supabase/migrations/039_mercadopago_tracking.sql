-- Migración 039: Tracking de pagos MercadoPago en organizations
-- 1. Agregar columna mercadopago_payment_id (si no existe)
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS mercadopago_payment_id TEXT;

-- 2. Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_organizations_mp_payment
  ON public.organizations(mercadopago_payment_id)
  WHERE mercadopago_payment_id IS NOT NULL;

COMMENT ON COLUMN public.organizations.mercadopago_payment_id IS 'ID del pago en MercadoPago para tracking';

-- 3. Verificar que quedó bien (deberías ver la columna en los resultados)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'organizations'
  AND column_name = 'mercadopago_payment_id';
