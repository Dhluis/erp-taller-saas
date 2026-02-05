-- =====================================================
-- MIGRACIÓN 029: Eliminar SMS y Agregar Tier WhatsApp
-- =====================================================
-- Fecha: 2026-02-05
-- Descripción: 
--   - Elimina todas las columnas y tablas relacionadas con SMS
--   - Agrega sistema de tiers (basic/premium) para WhatsApp
--   - Agrega columnas para Twilio WhatsApp API Oficial
--   - Migra datos existentes a tier='basic' con provider='waha'

-- =====================================================
-- PASO 1: ELIMINAR COLUMNAS SMS
-- =====================================================

DO $$ 
BEGIN
  -- Eliminar columnas SMS de organization_messaging_config
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_messaging_config' 
    AND column_name = 'sms_enabled'
  ) THEN
    ALTER TABLE organization_messaging_config DROP COLUMN sms_enabled;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_messaging_config' 
    AND column_name = 'sms_from_number'
  ) THEN
    ALTER TABLE organization_messaging_config DROP COLUMN sms_from_number;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_messaging_config' 
    AND column_name = 'sms_provider'
  ) THEN
    ALTER TABLE organization_messaging_config DROP COLUMN sms_provider;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_messaging_config' 
    AND column_name = 'sms_twilio_number'
  ) THEN
    ALTER TABLE organization_messaging_config DROP COLUMN sms_twilio_number;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_messaging_config' 
    AND column_name = 'sms_twilio_sid'
  ) THEN
    ALTER TABLE organization_messaging_config DROP COLUMN sms_twilio_sid;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_messaging_config' 
    AND column_name = 'sms_twilio_phone_sid'
  ) THEN
    ALTER TABLE organization_messaging_config DROP COLUMN sms_twilio_phone_sid;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_messaging_config' 
    AND column_name = 'sms_webhook_url'
  ) THEN
    ALTER TABLE organization_messaging_config DROP COLUMN sms_webhook_url;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_messaging_config' 
    AND column_name = 'sms_auto_notifications'
  ) THEN
    ALTER TABLE organization_messaging_config DROP COLUMN sms_auto_notifications;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_messaging_config' 
    AND column_name = 'sms_notification_statuses'
  ) THEN
    ALTER TABLE organization_messaging_config DROP COLUMN sms_notification_statuses;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_messaging_config' 
    AND column_name = 'sms_monthly_cost_usd'
  ) THEN
    ALTER TABLE organization_messaging_config DROP COLUMN sms_monthly_cost_usd;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_messaging_config' 
    AND column_name = 'sms_per_message_cost_mxn'
  ) THEN
    ALTER TABLE organization_messaging_config DROP COLUMN sms_per_message_cost_mxn;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_messaging_config' 
    AND column_name = 'monthly_sms_limit'
  ) THEN
    ALTER TABLE organization_messaging_config DROP COLUMN monthly_sms_limit;
  END IF;
END $$;

-- =====================================================
-- PASO 2: ELIMINAR TABLA sms_messages
-- =====================================================

DROP TABLE IF EXISTS sms_messages CASCADE;

-- =====================================================
-- PASO 3: AGREGAR COLUMNAS NUEVAS
-- =====================================================

-- Agregar columna tier
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_messaging_config' 
    AND column_name = 'tier'
  ) THEN
    ALTER TABLE organization_messaging_config 
    ADD COLUMN tier VARCHAR(20) DEFAULT 'basic' 
    CHECK (tier IN ('basic', 'premium'));
  END IF;
END $$;

-- Agregar columnas para Twilio WhatsApp API
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_messaging_config' 
    AND column_name = 'whatsapp_api_provider'
  ) THEN
    ALTER TABLE organization_messaging_config
    ADD COLUMN whatsapp_api_provider VARCHAR(20) DEFAULT 'waha'
    CHECK (whatsapp_api_provider IN ('waha', 'twilio'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_messaging_config' 
    AND column_name = 'whatsapp_api_number'
  ) THEN
    ALTER TABLE organization_messaging_config
    ADD COLUMN whatsapp_api_number VARCHAR(20);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_messaging_config' 
    AND column_name = 'whatsapp_api_twilio_sid'
  ) THEN
    ALTER TABLE organization_messaging_config
    ADD COLUMN whatsapp_api_twilio_sid VARCHAR(50);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_messaging_config' 
    AND column_name = 'whatsapp_api_status'
  ) THEN
    ALTER TABLE organization_messaging_config
    ADD COLUMN whatsapp_api_status VARCHAR(20) DEFAULT 'inactive'
    CHECK (whatsapp_api_status IN ('active', 'inactive', 'pending'));
  END IF;
END $$;

-- =====================================================
-- PASO 4: MIGRAR DATOS EXISTENTES
-- =====================================================

-- Migrar organizaciones existentes a tier básico
UPDATE organization_messaging_config 
SET 
  tier = COALESCE(tier, 'basic'),
  whatsapp_api_provider = COALESCE(whatsapp_api_provider, 'waha')
WHERE tier IS NULL OR whatsapp_api_provider IS NULL;

-- Si hay números Twilio WhatsApp existentes, migrarlos
UPDATE organization_messaging_config 
SET 
  whatsapp_api_provider = 'twilio',
  whatsapp_api_number = whatsapp_twilio_number,
  whatsapp_api_twilio_sid = NULL, -- Se actualizará cuando se active premium
  whatsapp_api_status = CASE 
    WHEN whatsapp_enabled = true THEN 'active'
    ELSE 'inactive'
  END,
  tier = 'premium'
WHERE whatsapp_twilio_number IS NOT NULL 
  AND whatsapp_provider = 'twilio'
  AND whatsapp_enabled = true;

-- =====================================================
-- PASO 5: ÍNDICES Y COMENTARIOS
-- =====================================================

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_org_messaging_tier 
ON organization_messaging_config(organization_id, tier);

CREATE INDEX IF NOT EXISTS idx_org_messaging_provider 
ON organization_messaging_config(organization_id, whatsapp_api_provider);

CREATE INDEX IF NOT EXISTS idx_org_messaging_api_status 
ON organization_messaging_config(organization_id, whatsapp_api_status);

-- Comentarios
COMMENT ON COLUMN organization_messaging_config.tier IS 'Tier de WhatsApp: basic (WAHA) o premium (Twilio API)';
COMMENT ON COLUMN organization_messaging_config.whatsapp_api_provider IS 'Proveedor de WhatsApp API: waha o twilio';
COMMENT ON COLUMN organization_messaging_config.whatsapp_api_number IS 'Número de WhatsApp para API (formato: +52 442 XXX XXXX)';
COMMENT ON COLUMN organization_messaging_config.whatsapp_api_twilio_sid IS 'SID del número de teléfono en Twilio (PNXXX...)';
COMMENT ON COLUMN organization_messaging_config.whatsapp_api_status IS 'Estado de la API: active, inactive, pending';

-- =====================================================
-- PASO 6: VERIFICACIÓN
-- =====================================================

DO $$
DECLARE
  config_count integer;
  org_count integer;
  tier_basic_count integer;
  tier_premium_count integer;
BEGIN
  SELECT count(*) INTO config_count FROM organization_messaging_config;
  SELECT count(*) INTO org_count FROM organizations;
  SELECT count(*) INTO tier_basic_count FROM organization_messaging_config WHERE tier = 'basic';
  SELECT count(*) INTO tier_premium_count FROM organization_messaging_config WHERE tier = 'premium';
  
  RAISE NOTICE '✅ Migración 029 completada: Eliminar SMS y Agregar Tier';
  RAISE NOTICE '   - Configuraciones: % de % organizaciones', config_count, org_count;
  RAISE NOTICE '   - Tier Basic: %', tier_basic_count;
  RAISE NOTICE '   - Tier Premium: %', tier_premium_count;
  RAISE NOTICE '   - Columnas SMS eliminadas';
  RAISE NOTICE '   - Tabla sms_messages eliminada';
  RAISE NOTICE '   - Nuevas columnas agregadas (tier, whatsapp_api_*)';
END $$;
