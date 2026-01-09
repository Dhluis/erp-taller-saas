-- ============================================================================
-- SQL: Verificar y configurar CASCADE DELETE para whatsapp_messages
-- ============================================================================
-- Este script verifica el estado actual y configura CASCADE DELETE si es necesario
-- ============================================================================

-- ============================================================================
-- PASO 1: Verificar foreign keys actuales y su delete_rule
-- ============================================================================
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule,
  CASE 
    WHEN rc.delete_rule = 'CASCADE' THEN '✅ CASCADE configurado'
    WHEN rc.delete_rule = 'RESTRICT' THEN '❌ RESTRICT - bloqueará eliminación'
    WHEN rc.delete_rule = 'SET NULL' THEN '⚠️ SET NULL - dejará NULL'
    WHEN rc.delete_rule = 'NO ACTION' THEN '⚠️ NO ACTION - puede fallar'
    ELSE '❓ Desconocido: ' || rc.delete_rule
  END AS status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'whatsapp_messages'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'conversation_id';

-- ============================================================================
-- PASO 2: Si delete_rule NO es 'CASCADE', ejecutar esto:
-- ============================================================================
-- IMPORTANTE: Reemplazar 'nombre_del_constraint' con el nombre real del constraint
-- que aparece en el resultado del PASO 1

-- Primero, obtener el nombre exacto del constraint:
SELECT 
  constraint_name,
  table_name
FROM information_schema.table_constraints
WHERE table_name = 'whatsapp_messages'
  AND constraint_type = 'FOREIGN KEY'
  AND constraint_name LIKE '%conversation%';

-- Luego, eliminar el constraint viejo:
-- ALTER TABLE whatsapp_messages
-- DROP CONSTRAINT nombre_del_constraint_aqui;

-- Finalmente, crear uno nuevo con CASCADE:
-- ALTER TABLE whatsapp_messages
-- ADD CONSTRAINT whatsapp_messages_conversation_id_fkey
-- FOREIGN KEY (conversation_id)
-- REFERENCES whatsapp_conversations(id)
-- ON DELETE CASCADE;

-- ============================================================================
-- PASO 3: Verificar que CASCADE DELETE esté activo
-- ============================================================================
-- Después de ejecutar el PASO 2, ejecutar esto para confirmar:
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  rc.delete_rule,
  CASE 
    WHEN rc.delete_rule = 'CASCADE' THEN '✅ CASCADE DELETE ACTIVO'
    ELSE '❌ NO está configurado como CASCADE'
  END AS verification
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'whatsapp_messages'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'conversation_id';

-- ============================================================================
-- PASO 4: Limpiar políticas RLS duplicadas (opcional)
-- ============================================================================
-- Si hay políticas duplicadas, puedes eliminar las que usan 'public' y dejar solo 'authenticated'
-- O viceversa, dependiendo de tu configuración de seguridad

-- Ver políticas DELETE actuales:
SELECT 
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('whatsapp_conversations', 'whatsapp_messages')
  AND cmd = 'DELETE'
ORDER BY tablename, policyname;

-- Si quieres eliminar las políticas duplicadas para 'public' (dejar solo 'authenticated'):
-- DROP POLICY IF EXISTS "Users can delete whatsapp_conversations from their organization" ON whatsapp_conversations;
-- DROP POLICY IF EXISTS "Users can delete whatsapp_messages from their organization" ON whatsapp_messages;

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
-- 1. CASCADE DELETE significa que al eliminar una conversación, 
--    todos sus mensajes se eliminarán automáticamente
-- 
-- 2. Si NO configuras CASCADE, el endpoint DELETE ya elimina los mensajes
--    manualmente antes de eliminar la conversación
--
-- 3. Las políticas RLS ya están configuradas correctamente
--
-- 4. El endpoint DELETE verifica que la conversación pertenezca a la organización
--    del usuario antes de eliminar
-- ============================================================================

