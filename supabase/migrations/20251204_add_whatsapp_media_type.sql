-- ============================================
-- Migración: Agregar columna media_type a whatsapp_messages
-- Fecha: 2025-12-04
-- Descripción: Agrega soporte para identificar el tipo de media en mensajes de WhatsApp
-- ============================================

-- Agregar columna media_type si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'whatsapp_messages' 
        AND column_name = 'media_type'
    ) THEN
        ALTER TABLE whatsapp_messages 
        ADD COLUMN media_type TEXT;
        
        COMMENT ON COLUMN whatsapp_messages.media_type IS 'Tipo de media: image, audio, video, document, o null para texto';
    END IF;
END $$;

-- Crear índice para búsquedas por tipo de media (opcional, pero útil para reportes)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE indexname = 'idx_whatsapp_messages_media_type'
    ) THEN
        CREATE INDEX idx_whatsapp_messages_media_type 
        ON whatsapp_messages(media_type) 
        WHERE media_type IS NOT NULL;
    END IF;
END $$;

