-- =====================================================
-- Migración: company_settings con currency y base_currency
-- Idempotente: crea tabla mínima si no existe; si existe, añade columnas y políticas.
-- =====================================================

-- 1. Función updated_at (por si no existe en el proyecto)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Crear tabla solo si no existe (esquema mínimo para moneda)
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'MXN',
  base_currency TEXT NOT NULL DEFAULT 'MXN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_org_settings UNIQUE (organization_id)
);

-- 3. Si la tabla ya existía (p. ej. de 004), añadir columnas que falten
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'company_settings' AND column_name = 'currency'
  ) THEN
    ALTER TABLE public.company_settings ADD COLUMN currency TEXT NOT NULL DEFAULT 'MXN';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'company_settings' AND column_name = 'base_currency'
  ) THEN
    ALTER TABLE public.company_settings ADD COLUMN base_currency TEXT NOT NULL DEFAULT 'MXN';
  END IF;
END $$;

-- 4. Constraint UNIQUE en organization_id si no existe (solo si la tabla no tiene ya muchas columnas, puede fallar si hay duplicados)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_org_settings' AND conrelid = 'public.company_settings'::regclass
  ) THEN
    ALTER TABLE public.company_settings ADD CONSTRAINT unique_org_settings UNIQUE (organization_id);
  END IF;
EXCEPTION
  WHEN unique_violation THEN NULL; -- ya hay duplicados, no forzar
END $$;

-- 5. Índice
CREATE INDEX IF NOT EXISTS idx_company_settings_org ON public.company_settings(organization_id);

-- 6. RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- 7. Políticas (eliminar las viejas por nombre si existen para evitar duplicado)
DROP POLICY IF EXISTS "Users can view their org settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can update their org settings" ON public.company_settings;
DROP POLICY IF EXISTS "System can insert settings" ON public.company_settings;
DROP POLICY IF EXISTS "Enable all for company_settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can manage company settings from their organization" ON public.company_settings;

CREATE POLICY "Users can view their org settings"
  ON public.company_settings
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their org settings"
  ON public.company_settings
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert settings"
  ON public.company_settings
  FOR INSERT
  WITH CHECK (true);

-- 8. Trigger updated_at
DROP TRIGGER IF EXISTS update_company_settings_updated_at ON public.company_settings;
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Crear registro para organizaciones que aún no tienen settings
DO $$
BEGIN
  INSERT INTO public.company_settings (organization_id, currency, base_currency)
  SELECT o.id, 'MXN', 'MXN'
  FROM public.organizations o
  WHERE o.id NOT IN (SELECT organization_id FROM public.company_settings)
  ON CONFLICT (organization_id) DO NOTHING;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- tabla sin unique(organization_id), o con más columnas NOT NULL
END $$;

-- 10. Comentarios
COMMENT ON TABLE public.company_settings IS 'Configuración general de la empresa/organización';
COMMENT ON COLUMN public.company_settings.currency IS 'Moneda seleccionada para visualización (puede cambiar)';
COMMENT ON COLUMN public.company_settings.base_currency IS 'Moneda base de la organización (para operaciones del taller)';
