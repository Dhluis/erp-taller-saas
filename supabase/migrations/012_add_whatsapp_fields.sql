-- =====================================================
-- MIGRACIÓN: Agregar campos de WhatsApp a ai_agent_config
-- =====================================================
-- Fecha: 2025-01-XX
-- Descripción: Agrega campos para vincular número de WhatsApp Business

-- Agregar columnas si no existen
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
        
        COMMENT ON COLUMN public.ai_agent_config.whatsapp_phone IS 'Número de teléfono de WhatsApp Business vinculado (formato: +[código país][número])';
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
        
        COMMENT ON COLUMN public.ai_agent_config.whatsapp_connected IS 'Indica si el número de WhatsApp está conectado y activo';
    END IF;
END $$;

-- Crear índice para búsquedas por número de WhatsApp
CREATE INDEX IF NOT EXISTS idx_ai_agent_config_whatsapp_phone 
ON public.ai_agent_config(whatsapp_phone) 
WHERE whatsapp_phone IS NOT NULL;

