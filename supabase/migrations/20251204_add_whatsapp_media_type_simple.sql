-- Versión simple para ejecutar directamente en Supabase SQL Editor
-- Agregar columna media_type a whatsapp_messages

ALTER TABLE whatsapp_messages ADD COLUMN media_type TEXT;

COMMENT ON COLUMN whatsapp_messages.media_type IS 'Tipo de media: image, audio, video, document, o null para texto';

CREATE INDEX idx_whatsapp_messages_media_type ON whatsapp_messages(media_type) WHERE media_type IS NOT NULL;

