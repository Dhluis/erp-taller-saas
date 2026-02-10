-- Moneda base del taller: en qué moneda están almacenados los montos (ingresos, precios, etc.)
-- La moneda de visualización (currency) la elige el usuario en el selector.
-- Si base_currency es NULL, se asume MXN.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'company_settings' AND column_name = 'base_currency'
  ) THEN
    ALTER TABLE public.company_settings ADD COLUMN base_currency TEXT DEFAULT 'MXN';
  END IF;
END $$;

COMMENT ON COLUMN public.company_settings.base_currency IS 'Moneda en la que el taller registra montos (ej. MXN). Por defecto MXN.';
