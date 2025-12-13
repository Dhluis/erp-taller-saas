-- =====================================================
-- SOLUCIÓN ALTERNATIVA: Políticas RLS simplificadas
-- =====================================================
-- PROBLEMA: Error 500 al leer tabla users debido a políticas circulares
-- SOLUCIÓN: Políticas más simples que evitan referencias circulares
--
-- EJECUTAR EN: Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PASO 1: Eliminar políticas problemáticas existentes
-- =====================================================
DROP POLICY IF EXISTS "Allow service role to insert users" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to insert in same org" ON users;
DROP POLICY IF EXISTS "Allow users to read same org" ON users;
DROP POLICY IF EXISTS "Allow users to read own record" ON users;
DROP POLICY IF EXISTS "Allow users to update same org" ON users;
DROP POLICY IF EXISTS "Allow users to delete same org" ON users;

-- =====================================================
-- PASO 2: Crear función helper para obtener organization_id
-- =====================================================
-- Esta función evita referencias circulares en las políticas
CREATE OR REPLACE FUNCTION get_user_organization_id(user_auth_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT organization_id 
  FROM users 
  WHERE auth_user_id = user_auth_id
  LIMIT 1;
$$;

-- =====================================================
-- PASO 3: Política SELECT - Permitir leer propio registro
-- =====================================================
CREATE POLICY "users_select_own"
ON users
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

-- =====================================================
-- PASO 4: Política SELECT - Permitir leer misma organización
-- =====================================================
CREATE POLICY "users_select_same_org"
ON users
FOR SELECT
TO authenticated
USING (
  organization_id = get_user_organization_id(auth.uid())
);

-- =====================================================
-- PASO 5: Política INSERT - Service Role (sin restricciones)
-- =====================================================
CREATE POLICY "users_insert_service_role"
ON users
FOR INSERT
TO service_role
WITH CHECK (true);

-- =====================================================
-- PASO 6: Política INSERT - Authenticated (misma organización)
-- =====================================================
CREATE POLICY "users_insert_same_org"
ON users
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = get_user_organization_id(auth.uid())
);

-- =====================================================
-- PASO 7: Política UPDATE - Misma organización
-- =====================================================
CREATE POLICY "users_update_same_org"
ON users
FOR UPDATE
TO authenticated
USING (
  organization_id = get_user_organization_id(auth.uid())
)
WITH CHECK (
  organization_id = get_user_organization_id(auth.uid())
);

-- =====================================================
-- PASO 8: Política DELETE - Misma organización
-- =====================================================
CREATE POLICY "users_delete_same_org"
ON users
FOR DELETE
TO authenticated
USING (
  organization_id = get_user_organization_id(auth.uid())
);

-- =====================================================
-- PASO 9: Verificar políticas creadas
-- =====================================================
SELECT 
  policyname,
  cmd,
  roles,
  CASE 
    WHEN qual IS NOT NULL THEN 'Yes' 
    ELSE 'No' 
  END as has_using,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Yes' 
    ELSE 'No' 
  END as has_with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

-- Deberías ver:
-- - users_select_own (SELECT)
-- - users_select_same_org (SELECT)
-- - users_insert_service_role (INSERT)
-- - users_insert_same_org (INSERT)
-- - users_update_same_org (UPDATE)
-- - users_delete_same_org (DELETE)

-- =====================================================
-- NOTAS:
-- =====================================================
-- 1. La función get_user_organization_id es SECURITY DEFINER
--    para evitar problemas de permisos
-- 2. La política "users_select_own" se evalúa primero
--    permitiendo que cada usuario lea su propio registro
-- 3. Luego "users_select_same_org" permite leer otros usuarios
--    de la misma organización
-- =====================================================

