-- =====================================================
-- MIGRACIÓN 015: Agregar columna whatsapp_connected
-- =====================================================
-- Fecha: 2025-01-XX
-- Descripción: Asegura que la columna whatsapp_connected existe en ai_agent_config
-- Esta migración es idempotente y se puede ejecutar múltiples veces sin problemas

-- Agregar columna whatsapp_connected si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_agent_config' 
        AND column_name = 'whatsapp_connected'
    ) THEN
        ALTER TABLE public.ai_agent_config 
        ADD COLUMN whatsapp_connected BOOLEAN DEFAULT false;
        
        COMMENT ON COLUMN public.ai_agent_config.whatsapp_connected IS 'Indica si el número de WhatsApp está conectado y activo';
        
        RAISE NOTICE 'Columna whatsapp_connected agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna whatsapp_connected ya existe, no se realizaron cambios';
    END IF;
END $$;

