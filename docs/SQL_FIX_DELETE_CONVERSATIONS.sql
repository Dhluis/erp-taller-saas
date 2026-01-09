-- ============================================================================
-- SQL: Arreglar eliminación de conversaciones de WhatsApp
-- ============================================================================
-- Este script debe ejecutarse en Supabase SQL Editor
-- 
-- Pasos:
-- 1. Habilitar RLS en las tablas
-- 2. Crear políticas DELETE
-- 3. Configurar CASCADE DELETE para mensajes
-- ============================================================================

-- ============================================================================
-- PASO 1: Verificar foreign keys actuales
-- ============================================================================
-- Ejecutar primero para ver el estado actual:
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'whatsapp_messages'
  AND tc.constraint_type = 'FOREIGN KEY';

-- ============================================================================
-- PASO 2: Habilitar RLS en las tablas
-- ============================================================================
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASO 3: Eliminar políticas DELETE antiguas si existen
-- ============================================================================
DROP POLICY IF EXISTS "Users can delete conversations from their organization" ON whatsapp_conversations;
DROP POLICY IF EXISTS "Users can delete messages from their organization" ON whatsapp_messages;

-- ============================================================================
-- PASO 4: Crear políticas DELETE para whatsapp_conversations
-- ============================================================================
CREATE POLICY "Users can delete conversations from their organization"
ON whatsapp_conversations
FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM users 
    WHERE auth_user_id = auth.uid()
  )
);

-- ============================================================================
-- PASO 5: Crear políticas DELETE para whatsapp_messages
-- ============================================================================
CREATE POLICY "Users can delete messages from their organization"
ON whatsapp_messages
FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM users 
    WHERE auth_user_id = auth.uid()
  )
);

-- ============================================================================
-- PASO 6: Configurar CASCADE DELETE
-- ============================================================================
-- NOTA: Si el constraint ya existe, primero hay que eliminarlo

-- Verificar el nombre exacto del constraint:
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'whatsapp_messages'
  AND constraint_type = 'FOREIGN KEY'
  AND constraint_name LIKE '%conversation_id%';

-- Eliminar constraint viejo (reemplazar 'nombre_del_constraint' con el nombre real)
-- Ejemplo: ALTER TABLE whatsapp_messages DROP CONSTRAINT whatsapp_messages_conversation_id_fkey;

-- Si no sabes el nombre exacto, ejecuta esto para ver todos los constraints:
SELECT 
  constraint_name,
  table_name
FROM information_schema.table_constraints
WHERE table_name = 'whatsapp_messages'
  AND constraint_type = 'FOREIGN KEY';

-- Una vez eliminado el constraint viejo, crear uno nuevo con CASCADE:
-- ALTER TABLE whatsapp_messages
-- ADD CONSTRAINT whatsapp_messages_conversation_id_fkey
-- FOREIGN KEY (conversation_id)
-- REFERENCES whatsapp_conversations(id)
-- ON DELETE CASCADE;

-- ============================================================================
-- PASO 7: Verificar que las políticas estén activas
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('whatsapp_conversations', 'whatsapp_messages')
ORDER BY tablename, policyname;

-- ============================================================================
-- PASO 8: Verificar CASCADE DELETE configurado
-- ============================================================================
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
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

-- El delete_rule debe ser 'CASCADE' para que funcione correctamente
-- ============================================================================

