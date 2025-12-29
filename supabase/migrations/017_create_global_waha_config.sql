-- =====================================================
-- MIGRACIÓN 017: Configuración Global WAHA (Multi-tenant)
-- =====================================================
-- Fecha: 2025-01-XX
-- Descripción: Crea configuración global para servidor compartido WAHA
-- Esta configuración será usada por todas las organizaciones con tipo 'shared'

-- ⚠️ IMPORTANTE: 
-- Esta migración NO debe ejecutarse directamente en producción.
-- La configuración de WAHA debe hacerse manualmente mediante:
-- 1. Variables de entorno (WAHA_API_URL, WAHA_API_KEY)
-- 2. O guardándola en ai_agent_config.policies usando el endpoint /api/whatsapp/config
--
-- Si necesitas crear esta configuración manualmente, reemplaza los valores placeholder
-- antes de ejecutar.

DO $$
DECLARE
  global_org_id UUID := '00000000-0000-0000-0000-000000000000'::uuid;
  existing_config_id UUID;
BEGIN
  -- Verificar si ya existe la configuración global
  SELECT id INTO existing_config_id
  FROM ai_agent_config
  WHERE organization_id = global_org_id
  LIMIT 1;
  
  IF existing_config_id IS NOT NULL THEN
    -- Actualizar configuración existente
    UPDATE ai_agent_config
    SET
      enabled = true,
      policies = jsonb_build_object(
        'waha_api_url', 'YOUR_WAHA_URL_HERE',
        'waha_api_key', 'YOUR_WAHA_API_KEY_HERE', -- ⚠️ REEMPLAZA con tu API Key real
        'waha_config_type', 'shared',
        'WAHA_API_URL', 'YOUR_WAHA_URL_HERE',
        'WAHA_API_KEY', 'YOUR_WAHA_API_KEY_HERE' -- ⚠️ REEMPLAZA con tu API Key real
      ),
      waha_config_type = 'shared',
      updated_at = NOW()
    WHERE id = existing_config_id;
    
    RAISE NOTICE '✅ Configuración global actualizada (ID: %)', existing_config_id;
  ELSE
    -- Crear nueva configuración global
    INSERT INTO ai_agent_config (
      organization_id,
      enabled,
      policies,
      waha_config_type,
      created_at,
      updated_at
    ) VALUES (
      global_org_id,
      true,
      jsonb_build_object(
        'waha_api_url', 'YOUR_WAHA_URL_HERE',
        'waha_api_key', 'YOUR_WAHA_API_KEY_HERE', -- ⚠️ REEMPLAZA con tu API Key real
        'waha_config_type', 'shared',
        'WAHA_API_URL', 'YOUR_WAHA_URL_HERE',
        'WAHA_API_KEY', 'YOUR_WAHA_API_KEY_HERE' -- ⚠️ REEMPLAZA con tu API Key real
      ),
      'shared',
      NOW(),
      NOW()
    );
    
    RAISE NOTICE '✅ Configuración global creada exitosamente';
  END IF;
END $$;

-- Comentarios
COMMENT ON TABLE ai_agent_config IS 'Configuraciones de AI Agent por organización. La organización 00000000-0000-0000-0000-000000000000 es la configuración global para servidor compartido.';

