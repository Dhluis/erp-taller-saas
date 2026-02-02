-- ==========================================
-- Habilitar Realtime para WhatsApp
-- ==========================================
-- Este script habilita Supabase Realtime para las tablas
-- whatsapp_conversations y whatsapp_messages
-- ==========================================

-- Habilitar realtime en whatsapp_conversations
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_conversations;

-- Habilitar realtime en whatsapp_messages
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;

-- Verificar que están habilitadas
SELECT 
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('whatsapp_conversations', 'whatsapp_messages')
ORDER BY tablename;

-- ==========================================
-- NOTAS:
-- ==========================================
-- 1. Realtime requiere que las RLS policies permitan SELECT
-- 2. Los usuarios deben tener permisos de lectura en las tablas
-- 3. Realtime funciona con WebSocket, no afecta performance significativamente
-- 4. Para deshabilitar: ALTER PUBLICATION supabase_realtime DROP TABLE whatsapp_conversations;
-- ==========================================
