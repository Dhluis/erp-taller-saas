-- =====================================================
-- MIGRACIÓN: Fix WhatsApp columns en ai_agent_config
-- =====================================================
-- Fecha: 2025-01-03
-- Descripción: Agrega columnas whatsapp_phone y whatsapp_connected si no existen

-- Agregar columnas de manera segura
DO $$ 
BEGIN
    -- Agregar columna whatsapp_phone
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_agent_config' 
        AND column_name = 'whatsapp_phone'
    ) THEN
        ALTER TABLE public.ai_agent_config 
        ADD COLUMN whatsapp_phone TEXT;
        
        RAISE NOTICE 'Columna whatsapp_phone agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna whatsapp_phone ya existe, omitiendo...';
    END IF;

    -- Agregar columna whatsapp_connected
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_agent_config' 
        AND column_name = 'whatsapp_connected'
    ) THEN
        ALTER TABLE public.ai_agent_config 
        ADD COLUMN whatsapp_connected BOOLEAN DEFAULT false;
        
        RAISE NOTICE 'Columna whatsapp_connected agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna whatsapp_connected ya existe, omitiendo...';
    END IF;
END $$;

-- Agregar comentarios a las columnas
COMMENT ON COLUMN public.ai_agent_config.whatsapp_phone IS 
    'Número de teléfono de WhatsApp Business vinculado (formato: +[código país][número])';

COMMENT ON COLUMN public.ai_agent_config.whatsapp_connected IS 
    'Indica si el número de WhatsApp está conectado y activo (actualizado por webhook)';

-- Crear índice para búsquedas por número de WhatsApp
CREATE INDEX IF NOT EXISTS idx_ai_agent_config_whatsapp_phone 
ON public.ai_agent_config(whatsapp_phone) 
WHERE whatsapp_phone IS NOT NULL;

RAISE NOTICE '✅ Migración de columnas WhatsApp completada exitosamente';
















