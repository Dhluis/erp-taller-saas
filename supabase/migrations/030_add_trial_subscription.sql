-- =====================================================
-- MIGRACIÓN 030: Agregar Sistema de Trial y Suscripción
-- =====================================================
-- Fecha: 2026-02-05
-- Descripción: 
--   - Agrega campos para trial de 7 días gratis
--   - Agrega campos para estado de suscripción
--   - Migra datos existentes a trial si aplica

-- Agregar columnas para trial y suscripción
DO $$ 
BEGIN
  -- subscription_status: Estado de la suscripción
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_messaging_config' 
    AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE organization_messaging_config 
    ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'none' 
    CHECK (subscription_status IN ('none', 'trial', 'active', 'expired'));
  END IF;

  -- trial_ends_at: Fecha de fin de prueba gratis (7 días desde activación)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_messaging_config' 
    AND column_name = 'trial_ends_at'
  ) THEN
    ALTER TABLE organization_messaging_config 
    ADD COLUMN trial_ends_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- subscription_started_at: Fecha en que inició la suscripción pagada
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_messaging_config' 
    AND column_name = 'subscription_started_at'
  ) THEN
    ALTER TABLE organization_messaging_config 
    ADD COLUMN subscription_started_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_org_subscription_status 
ON organization_messaging_config(organization_id, subscription_status);

CREATE INDEX IF NOT EXISTS idx_org_trial_ends_at 
ON organization_messaging_config(organization_id, trial_ends_at);

-- Comentarios
COMMENT ON COLUMN organization_messaging_config.subscription_status IS 
  'Estado: none=sin configurar, trial=prueba gratis, active=pagando, expired=prueba terminada';
COMMENT ON COLUMN organization_messaging_config.trial_ends_at IS 
  'Fecha de fin de prueba gratis (7 días desde activación)';
COMMENT ON COLUMN organization_messaging_config.subscription_started_at IS 
  'Fecha en que inició la suscripción pagada';

-- Migrar datos existentes
-- Si ya tiene whatsapp_enabled pero no tiene trial_ends_at, iniciar trial
UPDATE organization_messaging_config 
SET 
  subscription_status = CASE
    WHEN whatsapp_api_provider = 'twilio' AND whatsapp_api_status = 'active' THEN 'active'
    WHEN whatsapp_enabled = true AND tier = 'basic' AND trial_ends_at IS NULL THEN 'trial'
    WHEN whatsapp_enabled = true AND tier = 'basic' AND trial_ends_at IS NOT NULL AND trial_ends_at < NOW() THEN 'expired'
    ELSE 'none'
  END,
  trial_ends_at = CASE
    WHEN whatsapp_enabled = true 
      AND tier = 'basic' 
      AND trial_ends_at IS NULL 
      AND created_at IS NOT NULL 
    THEN created_at + INTERVAL '7 days'
    ELSE trial_ends_at
  END
WHERE subscription_status = 'none' OR subscription_status IS NULL;

-- Verificación
DO $$
DECLARE
  trial_count integer;
  active_count integer;
  expired_count integer;
  none_count integer;
BEGIN
  SELECT count(*) INTO trial_count FROM organization_messaging_config WHERE subscription_status = 'trial';
  SELECT count(*) INTO active_count FROM organization_messaging_config WHERE subscription_status = 'active';
  SELECT count(*) INTO expired_count FROM organization_messaging_config WHERE subscription_status = 'expired';
  SELECT count(*) INTO none_count FROM organization_messaging_config WHERE subscription_status = 'none';
  
  RAISE NOTICE '✅ Migración 030 completada: Sistema de Trial y Suscripción';
  RAISE NOTICE '   - Trial: % organizaciones', trial_count;
  RAISE NOTICE '   - Active: % organizaciones', active_count;
  RAISE NOTICE '   - Expired: % organizaciones', expired_count;
  RAISE NOTICE '   - None: % organizaciones', none_count;
END $$;
