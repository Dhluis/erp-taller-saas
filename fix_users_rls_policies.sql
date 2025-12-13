-- =====================================================
-- FIX: Políticas RLS en tabla users para permitir creación
-- =====================================================
-- PROBLEMA: Error al crear usuario: "new row violates row-level security policy for table users"
-- SOLUCIÓN: Crear/actualizar políticas RLS correctas
--
-- EJECUTAR EN: Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PASO 1: Ver políticas actuales
-- =====================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- =====================================================
-- PASO 2: Eliminar políticas existentes si es necesario
-- =====================================================
-- Descomentar solo si necesitas eliminar políticas conflictivas
/*
DROP POLICY IF EXISTS "Allow service role to insert users" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to insert in same org" ON users;
DROP POLICY IF EXISTS "Allow users to read same org" ON users;
DROP POLICY IF EXISTS "Allow users to update same org" ON users;
DROP POLICY IF EXISTS "Allow users to delete same org" ON users;
*/

-- =====================================================
-- PASO 3: Crear política para INSERT (Service Role)
-- =====================================================
-- Política para permitir INSERT desde el backend usando Service Role
CREATE POLICY IF NOT EXISTS "Allow service role to insert users"
ON users
FOR INSERT
TO service_role
WITH CHECK (true);

-- Política para permitir INSERT a usuarios autenticados (admins)
-- Usa una función para evitar problemas circulares
CREATE POLICY IF NOT EXISTS "Allow authenticated users to insert in same org"
ON users
FOR INSERT
TO authenticated
WITH CHECK (
  -- Permite insertar si el organization_id coincide con el del usuario autenticado
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.auth_user_id = auth.uid()
      AND u.organization_id = users.organization_id
  )
);

-- =====================================================
-- PASO 4: Crear política SELECT (orden importante)
-- =====================================================
-- Primero: Permitir que cada usuario lea SU PROPIO registro
-- Esto evita el problema circular de verificar organization_id
CREATE POLICY IF NOT EXISTS "Allow users to read own record"
ON users
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

-- Segundo: Permitir leer otros usuarios de la misma organización
-- Esta política funciona porque ya tenemos acceso a nuestro propio registro
CREATE POLICY IF NOT EXISTS "Allow users to read same org" 
ON users
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM users 
    WHERE auth_user_id = auth.uid()
  )
);

-- =====================================================
-- PASO 5: Crear política UPDATE
-- =====================================================
CREATE POLICY IF NOT EXISTS "Allow users to update same org"
ON users
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM users 
    WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM users 
    WHERE auth_user_id = auth.uid()
  )
);

-- =====================================================
-- PASO 6: Crear política DELETE
-- =====================================================
CREATE POLICY IF NOT EXISTS "Allow users to delete same org"
ON users
FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM users 
    WHERE auth_user_id = auth.uid()
  )
);

-- =====================================================
-- PASO 7: Verificar que funcionó
-- =====================================================
-- Contar políticas
SELECT 
  COUNT(*) as total_policies,
  cmd,
  COUNT(*) as count_by_command
FROM pg_policies 
WHERE tablename = 'users'
GROUP BY cmd
ORDER BY cmd;

-- Listar todas las políticas de users
SELECT 
  policyname,
  cmd,
  roles,
  CASE 
    WHEN qual IS NOT NULL THEN 'Yes' 
    ELSE 'No' 
  END as has_using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Yes' 
    ELSE 'No' 
  END as has_with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 1. La política para service_role permite INSERT sin restricciones
-- 2. Las políticas para authenticated requieren que el usuario 
--    pertenezca a la misma organización
-- 3. Todas las políticas usan subconsulta para verificar organization_id
-- 4. Si tienes problemas, ejecuta primero las sentencias DROP POLICY
--    (descomentadas arriba) y luego las CREATE POLICY
-- =====================================================

