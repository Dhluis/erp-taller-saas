-- =====================================================
-- WhatsApp solo Twilio: defaults y datos
-- =====================================================
-- Quita referencias a WAHA en defaults y actualiza filas existentes.
-- No se renombran columnas (waha_id, waha_api_url, etc.) para no romper la app.

-- 1. organization_messaging_config: default y datos
-- =====================================================
UPDATE organization_messaging_config
SET whatsapp_provider = 'twilio'
WHERE whatsapp_provider = 'waha';

ALTER TABLE organization_messaging_config
  ALTER COLUMN whatsapp_provider SET DEFAULT 'twilio';

-- Comentarios (por si existen en el esquema)
COMMENT ON COLUMN organization_messaging_config.whatsapp_provider IS 'Proveedor de WhatsApp: twilio';

-- 2. whatsapp_messages: default y datos (columna provider si existe)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'whatsapp_messages' AND column_name = 'provider'
  ) THEN
    UPDATE public.whatsapp_messages SET provider = 'twilio' WHERE provider = 'waha';
    ALTER TABLE public.whatsapp_messages ALTER COLUMN provider SET DEFAULT 'twilio';
    COMMENT ON COLUMN public.whatsapp_messages.provider IS 'Proveedor de WhatsApp: twilio';
  END IF;
END $$;

-- 3. organization_messaging_config: whatsapp_api_provider si existe
-- =====================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organization_messaging_config' AND column_name = 'whatsapp_api_provider'
  ) THEN
    UPDATE organization_messaging_config SET whatsapp_api_provider = 'twilio' WHERE whatsapp_api_provider = 'waha';
    ALTER TABLE organization_messaging_config ALTER COLUMN whatsapp_api_provider SET DEFAULT 'twilio';
    COMMENT ON COLUMN organization_messaging_config.whatsapp_api_provider IS 'Proveedor de WhatsApp API: twilio';
  END IF;
END $$;

-- 4. Comentarios en ai_agent_config (sin mencionar WAHA)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_agent_config' AND column_name = 'whatsapp_session_name') THEN
    EXECUTE 'COMMENT ON COLUMN public.ai_agent_config.whatsapp_session_name IS ''Nombre de sesión WhatsApp para esta organización (legacy)''';
  END IF;
END $$;

-- 5. whatsapp_messages.waha_id: comentario genérico si existe la columna
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'whatsapp_messages' AND column_name = 'waha_id') THEN
    EXECUTE 'COMMENT ON COLUMN public.whatsapp_messages.waha_id IS ''ID externo del mensaje (ej. Twilio MessageSid)''';
  END IF;
END $$;
