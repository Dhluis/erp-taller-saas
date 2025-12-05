-- =====================================================
-- 🚀 QUICK FIX: Agregar columnas WhatsApp a ai_agent_config
-- =====================================================
-- INSTRUCCIONES:
-- 1. Copia todo este archivo
-- 2. Ve a Supabase Dashboard > SQL Editor > New query
-- 3. Pega y ejecuta (Ctrl+Enter)
-- =====================================================

-- Agregar columnas
ALTER TABLE ai_agent_config 
ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;

ALTER TABLE ai_agent_config 
ADD COLUMN IF NOT EXISTS whatsapp_connected BOOLEAN DEFAULT false;

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_ai_agent_config_whatsapp_phone 
ON ai_agent_config(whatsapp_phone);

-- Verificar que se agregaron
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'ai_agent_config' 
AND column_name IN ('whatsapp_phone', 'whatsapp_connected')
ORDER BY column_name;

-- ✅ Si ves las 2 columnas arriba, ¡está listo!



