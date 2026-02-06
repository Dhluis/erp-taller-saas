-- =====================================================
-- MIGRACIÓN 031: Agregar soporte de planes Free/Premium
-- Autor: Eagles ERP
-- Fecha: 2026-02-06
-- Descripción: Agrega columnas y tablas para modelo freemium
-- =====================================================

-- 1. Agregar columnas a organizations (NO tocar otras columnas)
DO $$
BEGIN
  -- plan_tier: Tier del plan (free o premium)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' 
    AND column_name = 'plan_tier'
  ) THEN
    ALTER TABLE organizations 
    ADD COLUMN plan_tier VARCHAR(20) DEFAULT 'free' 
    CHECK (plan_tier IN ('free', 'premium'));
    
    COMMENT ON COLUMN organizations.plan_tier IS 
      'Tier del plan: free (gratis forever) o premium (pago)';
  END IF;

  -- plan_started_at: Fecha de inicio del plan actual
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' 
    AND column_name = 'plan_started_at'
  ) THEN
    ALTER TABLE organizations 
    ADD COLUMN plan_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    
    COMMENT ON COLUMN organizations.plan_started_at IS 
      'Fecha de inicio del plan actual';
  END IF;

  -- trial_ends_at: Fecha de fin del trial (NULL si no está en trial)
  -- NOTA: Esta columna puede ya existir en organization_messaging_config
  -- La agregamos aquí para tracking general de la organización
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' 
    AND column_name = 'trial_ends_at'
  ) THEN
    ALTER TABLE organizations 
    ADD COLUMN trial_ends_at TIMESTAMP WITH TIME ZONE;
    
    COMMENT ON COLUMN organizations.trial_ends_at IS 
      'Fecha de fin del trial de 7 días (NULL si no está en trial)';
  END IF;
END $$;

-- 2. Crear tabla de límites por plan
CREATE TABLE IF NOT EXISTS plan_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_tier VARCHAR(20) NOT NULL CHECK (plan_tier IN ('free', 'premium')),
  feature_key VARCHAR(100) NOT NULL,
  limit_value INTEGER, -- NULL = ilimitado
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(plan_tier, feature_key)
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_plan_limits_tier 
  ON plan_limits(plan_tier);

-- Comentarios
COMMENT ON TABLE plan_limits IS 
  'Define los límites de cada plan (free vs premium)';
COMMENT ON COLUMN plan_limits.limit_value IS 
  'Valor del límite. NULL = ilimitado, 0 = deshabilitado, >0 = límite específico';

-- 3. Seed inicial de límites
INSERT INTO plan_limits (plan_tier, feature_key, limit_value, description) VALUES
-- Plan Free
('free', 'max_customers', 50, 'Máximo de clientes en plan gratis'),
('free', 'max_orders_per_month', 20, 'Máximo de órdenes por mes en plan gratis'),
('free', 'max_inventory_items', 100, 'Máximo de productos en inventario'),
('free', 'max_users', 1, 'Máximo de usuarios (solo dueño)'),
('free', 'whatsapp_enabled', 0, 'WhatsApp deshabilitado en gratis'),
('free', 'ai_enabled', 0, 'IA conversacional deshabilitada en gratis'),
('free', 'advanced_reports', 0, 'Reportes avanzados deshabilitados'),

-- Plan Premium
('premium', 'max_customers', NULL, 'Clientes ilimitados'),
('premium', 'max_orders_per_month', NULL, 'Órdenes ilimitadas'),
('premium', 'max_inventory_items', NULL, 'Inventario ilimitado'),
('premium', 'max_users', NULL, 'Usuarios ilimitados'),
('premium', 'whatsapp_enabled', 1, 'WhatsApp habilitado'),
('premium', 'ai_enabled', 1, 'IA conversacional habilitada'),
('premium', 'advanced_reports', 1, 'Reportes avanzados habilitados')
ON CONFLICT (plan_tier, feature_key) DO NOTHING;

-- 4. Crear tabla de tracking de uso mensual (para contadores)
-- NOTA: Ya existe usage_tracking en migración 002, pero con estructura diferente
-- Creamos organization_usage_tracking para tracking específico de límites de plan
CREATE TABLE IF NOT EXISTS organization_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric_key VARCHAR(100) NOT NULL,
  metric_value INTEGER NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, metric_key, period_start)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_org_usage_org_metric 
  ON organization_usage_tracking(organization_id, metric_key);
CREATE INDEX IF NOT EXISTS idx_org_usage_period 
  ON organization_usage_tracking(period_start, period_end);

-- Comentarios
COMMENT ON TABLE organization_usage_tracking IS 
  'Rastrea el uso mensual de recursos para validar límites de plan';
COMMENT ON COLUMN organization_usage_tracking.period_start IS 
  'Inicio del período de medición (típicamente primer día del mes)';

-- 5. RLS Policies para nuevas tablas

-- plan_limits es de solo lectura para todos
ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'plan_limits' 
    AND policyname = 'plan_limits_select_all'
  ) THEN
    CREATE POLICY "plan_limits_select_all" ON plan_limits
      FOR SELECT
      USING (true); -- Todos pueden leer límites
  END IF;
END $$;

-- organization_usage_tracking solo visible para la org correspondiente
ALTER TABLE organization_usage_tracking ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- SELECT: Solo la propia organización puede ver su uso
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'organization_usage_tracking' 
    AND policyname = 'org_usage_select_own_org'
  ) THEN
    CREATE POLICY "org_usage_select_own_org" ON organization_usage_tracking
      FOR SELECT
      USING (
        organization_id IN (
          SELECT organization_id 
          FROM users 
          WHERE auth_user_id = auth.uid()
        )
      );
  END IF;

  -- INSERT: Solo la propia organización puede insertar su uso
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'organization_usage_tracking' 
    AND policyname = 'org_usage_insert_own_org'
  ) THEN
    CREATE POLICY "org_usage_insert_own_org" ON organization_usage_tracking
      FOR INSERT
      WITH CHECK (
        organization_id IN (
          SELECT organization_id 
          FROM users 
          WHERE auth_user_id = auth.uid()
        )
      );
  END IF;

  -- UPDATE: Solo la propia organización puede actualizar su uso
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'organization_usage_tracking' 
    AND policyname = 'org_usage_update_own_org'
  ) THEN
    CREATE POLICY "org_usage_update_own_org" ON organization_usage_tracking
      FOR UPDATE
      USING (
        organization_id IN (
          SELECT organization_id 
          FROM users 
          WHERE auth_user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 6. Función helper para obtener límite de un plan
CREATE OR REPLACE FUNCTION get_plan_limit(
  p_plan_tier VARCHAR(20),
  p_feature_key VARCHAR(100)
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_limit INTEGER;
BEGIN
  SELECT limit_value INTO v_limit
  FROM plan_limits
  WHERE plan_tier = p_plan_tier 
    AND feature_key = p_feature_key;
  
  RETURN v_limit;
END;
$$;

COMMENT ON FUNCTION get_plan_limit IS 
  'Obtiene el límite de una feature para un plan específico. NULL = ilimitado';

-- 7. Función helper para verificar si una feature está habilitada
CREATE OR REPLACE FUNCTION is_feature_enabled(
  p_plan_tier VARCHAR(20),
  p_feature_key VARCHAR(100)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_limit INTEGER;
BEGIN
  SELECT limit_value INTO v_limit
  FROM plan_limits
  WHERE plan_tier = p_plan_tier 
    AND feature_key = p_feature_key;
  
  -- Si no existe el límite, retornar false
  IF v_limit IS NULL THEN
    RETURN false;
  END IF;
  
  -- Si limit_value = 1, está habilitado
  -- Si limit_value = 0, está deshabilitado
  -- Si limit_value > 1, es un límite numérico (considerar habilitado)
  RETURN v_limit > 0;
END;
$$;

COMMENT ON FUNCTION is_feature_enabled IS 
  'Verifica si una feature está habilitada para un plan. Retorna true si limit_value > 0';

-- 8. Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a organization_usage_tracking
DROP TRIGGER IF EXISTS update_org_usage_tracking_updated_at ON organization_usage_tracking;
CREATE TRIGGER update_org_usage_tracking_updated_at
  BEFORE UPDATE ON organization_usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Aplicar trigger a plan_limits
DROP TRIGGER IF EXISTS update_plan_limits_updated_at ON plan_limits;
CREATE TRIGGER update_plan_limits_updated_at
  BEFORE UPDATE ON plan_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 9. Migrar datos existentes: establecer plan_tier = 'free' para todas las orgs existentes
UPDATE organizations 
SET plan_tier = 'free', plan_started_at = COALESCE(plan_started_at, created_at)
WHERE plan_tier IS NULL;

-- 10. Verificación final
DO $$
DECLARE
  orgs_with_plan INTEGER;
  plan_limits_count INTEGER;
  free_limits_count INTEGER;
  premium_limits_count INTEGER;
BEGIN
  -- Contar organizaciones con plan_tier
  SELECT COUNT(*) INTO orgs_with_plan 
  FROM organizations 
  WHERE plan_tier IS NOT NULL;
  
  -- Contar límites
  SELECT COUNT(*) INTO plan_limits_count FROM plan_limits;
  SELECT COUNT(*) INTO free_limits_count FROM plan_limits WHERE plan_tier = 'free';
  SELECT COUNT(*) INTO premium_limits_count FROM plan_limits WHERE plan_tier = 'premium';
  
  RAISE NOTICE '✅ Migración 031 completada: Sistema de Planes Free/Premium';
  RAISE NOTICE '   - Organizaciones con plan: %', orgs_with_plan;
  RAISE NOTICE '   - Límites totales: %', plan_limits_count;
  RAISE NOTICE '   - Límites Free: %', free_limits_count;
  RAISE NOTICE '   - Límites Premium: %', premium_limits_count;
END $$;
