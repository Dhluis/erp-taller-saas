-- ============================================
-- 🧹 LIMPIEZA DE DATOS DE PRUEBA - WhatsApp
-- ============================================
-- Fecha: 2025-01-06
-- Objetivo: Eliminar conversaciones y mensajes de testing
-- IMPORTANTE: Ejecutar en orden y verificar organization_id antes de ejecutar

-- ============================================
-- 1. IDENTIFICAR DATOS DE PRUEBA
-- ============================================

-- Ver todas las conversaciones con "Cliente de Prueba"
SELECT 
  id,
  organization_id,
  customer_name,
  phone_number,
  last_message,
  created_at
FROM whatsapp_conversations 
WHERE customer_name = 'Cliente de Prueba'
ORDER BY created_at DESC;

-- Ver todas las conversaciones con "Cliente WhatsApp" (nombre por defecto)
SELECT 
  id,
  organization_id,
  customer_name,
  phone_number,
  last_message,
  created_at
FROM whatsapp_conversations 
WHERE customer_name = 'Cliente WhatsApp'
ORDER BY created_at DESC;

-- Ver conversaciones sin nombre (NULL)
SELECT 
  id,
  organization_id,
  customer_name,
  phone_number,
  last_message,
  created_at
FROM whatsapp_conversations 
WHERE customer_name IS NULL
ORDER BY created_at DESC;

-- ============================================
-- 2. ELIMINAR MENSAJES ASOCIADOS (PRIMERO)
-- ============================================
-- IMPORTANTE: Reemplazar 'tu-org-id' con el organization_id real

-- Eliminar mensajes de conversaciones con "Cliente de Prueba"
DELETE FROM whatsapp_messages 
WHERE conversation_id IN (
  SELECT id 
  FROM whatsapp_conversations 
  WHERE customer_name = 'Cliente de Prueba' 
    AND organization_id = 'tu-org-id'
);

-- Verificar cuántos mensajes se eliminarían (ejecutar ANTES del DELETE)
SELECT COUNT(*) as mensajes_a_eliminar
FROM whatsapp_messages 
WHERE conversation_id IN (
  SELECT id 
  FROM whatsapp_conversations 
  WHERE customer_name = 'Cliente de Prueba' 
    AND organization_id = 'tu-org-id'
);

-- ============================================
-- 3. ELIMINAR CONVERSACIONES DE PRUEBA
-- ============================================

-- Eliminar conversaciones con "Cliente de Prueba"
DELETE FROM whatsapp_conversations 
WHERE customer_name = 'Cliente de Prueba' 
  AND organization_id = 'tu-org-id';

-- Verificar cuántas conversaciones se eliminarían (ejecutar ANTES del DELETE)
SELECT COUNT(*) as conversaciones_a_eliminar
FROM whatsapp_conversations 
WHERE customer_name = 'Cliente de Prueba' 
  AND organization_id = 'tu-org-id';

-- ============================================
-- 4. LIMPIAR CONVERSACIONES SIN MENSAJES
-- ============================================

-- Identificar conversaciones sin mensajes
SELECT 
  c.id,
  c.organization_id,
  c.customer_name,
  c.phone_number,
  c.created_at,
  COUNT(m.id) as mensaje_count
FROM whatsapp_conversations c
LEFT JOIN whatsapp_messages m ON c.id = m.conversation_id
WHERE c.organization_id = 'tu-org-id'
GROUP BY c.id, c.organization_id, c.customer_name, c.phone_number, c.created_at
HAVING COUNT(m.id) = 0
ORDER BY c.created_at DESC;

-- Eliminar conversaciones sin mensajes (OPCIONAL - usar con precaución)
-- DELETE FROM whatsapp_conversations 
-- WHERE id IN (
--   SELECT c.id
--   FROM whatsapp_conversations c
--   LEFT JOIN whatsapp_messages m ON c.id = m.conversation_id
--   WHERE c.organization_id = 'tu-org-id'
--   GROUP BY c.id
--   HAVING COUNT(m.id) = 0
-- );

-- ============================================
-- 5. VERIFICACIÓN POST-LIMPIEZA
-- ============================================

-- Verificar que no quedan conversaciones de prueba
SELECT COUNT(*) as conversaciones_prueba_restantes
FROM whatsapp_conversations 
WHERE customer_name = 'Cliente de Prueba' 
  AND organization_id = 'tu-org-id';

-- Verificar total de conversaciones después de limpieza
SELECT 
  COUNT(*) as total_conversaciones,
  COUNT(DISTINCT customer_name) as clientes_unicos,
  MIN(created_at) as primera_conversacion,
  MAX(created_at) as ultima_conversacion
FROM whatsapp_conversations 
WHERE organization_id = 'tu-org-id';

-- ============================================
-- 6. LIMPIEZA AVANZADA (OPCIONAL)
-- ============================================

-- Eliminar conversaciones antiguas sin actividad (más de 90 días)
-- DELETE FROM whatsapp_messages 
-- WHERE conversation_id IN (
--   SELECT id 
--   FROM whatsapp_conversations 
--   WHERE organization_id = 'tu-org-id'
--     AND last_message_at < NOW() - INTERVAL '90 days'
-- );

-- DELETE FROM whatsapp_conversations 
-- WHERE organization_id = 'tu-org-id'
--   AND last_message_at < NOW() - INTERVAL '90 days';

-- ============================================
-- 7. COMANDOS RÁPIDOS POR ORGANIZACIÓN
-- ============================================

-- Para ejecutar limpieza completa en una organización específica:
-- 1. Reemplazar 'tu-org-id' con el ID real
-- 2. Ejecutar en orden:

-- Paso 1: Eliminar mensajes
-- DELETE FROM whatsapp_messages 
-- WHERE conversation_id IN (
--   SELECT id 
--   FROM whatsapp_conversations 
--   WHERE customer_name = 'Cliente de Prueba' 
--     AND organization_id = 'tu-org-id'
-- );

-- Paso 2: Eliminar conversaciones
-- DELETE FROM whatsapp_conversations 
-- WHERE customer_name = 'Cliente de Prueba' 
--   AND organization_id = 'tu-org-id';

-- ============================================
-- 8. PREVENCIÓN DE DATOS DE PRUEBA
-- ============================================

-- Crear función de validación (OPCIONAL)
-- CREATE OR REPLACE FUNCTION prevent_test_customer_names()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   IF NEW.customer_name = 'Cliente de Prueba' THEN
--     RAISE EXCEPTION 'No se permiten nombres de prueba en producción';
--   END IF;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- Crear trigger (OPCIONAL)
-- CREATE TRIGGER check_test_customer_names
-- BEFORE INSERT OR UPDATE ON whatsapp_conversations
-- FOR EACH ROW
-- EXECUTE FUNCTION prevent_test_customer_names();

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 
-- 1. SIEMPRE ejecutar SELECT antes de DELETE para verificar
-- 2. SIEMPRE especificar organization_id para evitar eliminar datos de otras organizaciones
-- 3. Hacer backup antes de ejecutar DELETE masivos
-- 4. Los mensajes DEBEN eliminarse ANTES que las conversaciones (foreign key)
-- 5. Considerar usar SOFT DELETE (status = 'deleted') en lugar de DELETE
-- 
-- ============================================

