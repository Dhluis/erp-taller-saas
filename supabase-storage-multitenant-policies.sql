-- ================================================
-- POLÍTICAS RLS MULTI-TENANT PARA STORAGE
-- ================================================
-- Estas políticas aseguran que los usuarios solo puedan
-- acceder a imágenes de su propia organización

-- ================================================
-- 1. ELIMINAR POLÍTICAS ANTIGUAS (si existen)
-- ================================================

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;

-- ================================================
-- 2. FUNCIÓN HELPER: Obtener organization_id del usuario
-- ================================================

CREATE OR REPLACE FUNCTION storage.get_user_organization_id()
RETURNS TEXT AS $$
  SELECT organization_id::TEXT
  FROM users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- ================================================
-- 3. FUNCIÓN HELPER: Extraer organization_id del path
-- ================================================
-- Path format: {organizationId}/{orderId}/{category}-{timestamp}-{random}.{ext}
-- Esta función extrae el primer segmento del path (organizationId)

CREATE OR REPLACE FUNCTION storage.extract_organization_id_from_path(path TEXT)
RETURNS TEXT AS $$
  SELECT (string_to_array(path, '/'))[1];
$$ LANGUAGE sql IMMUTABLE;

-- ================================================
-- 4. POLÍTICAS RLS MULTI-TENANT
-- ================================================

-- ✅ SELECT: Usuarios solo pueden leer imágenes de su organización
CREATE POLICY "Users can only read their organization images" 
ON storage.objects FOR SELECT
USING (
  bucket_id = 'work-order-images'
  AND auth.role() = 'authenticated'
  AND storage.extract_organization_id_from_path(name) = storage.get_user_organization_id()
);

-- ✅ INSERT: Usuarios solo pueden subir a paths de su organización
CREATE POLICY "Users can only upload to their organization" 
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'work-order-images' 
  AND auth.role() = 'authenticated'
  AND storage.extract_organization_id_from_path(name) = storage.get_user_organization_id()
);

-- ✅ DELETE: Usuarios solo pueden eliminar imágenes de su organización
CREATE POLICY "Users can only delete their organization images" 
ON storage.objects FOR DELETE
USING (
  bucket_id = 'work-order-images'
  AND auth.role() = 'authenticated'
  AND storage.extract_organization_id_from_path(name) = storage.get_user_organization_id()
);

-- ✅ UPDATE: Usuarios solo pueden actualizar imágenes de su organización
CREATE POLICY "Users can only update their organization images" 
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'work-order-images'
  AND auth.role() = 'authenticated'
  AND storage.extract_organization_id_from_path(name) = storage.get_user_organization_id()
);

-- ================================================
-- 5. VERIFICACIÓN
-- ================================================

-- Verificar que las políticas se crearon correctamente
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
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%organization%'
ORDER BY policyname;

-- ================================================
-- NOTAS IMPORTANTES
-- ================================================
-- 1. Estas políticas requieren que el path de las imágenes
--    siga el formato: {organizationId}/{orderId}/{filename}
-- 2. La función get_user_organization_id() usa SECURITY DEFINER
--    para poder acceder a la tabla users sin problemas de RLS
-- 3. Si una imagen no tiene organization_id en el path, será
--    rechazada por las políticas (seguridad por defecto)
-- 4. Las imágenes antiguas (sin organization_id en path) seguirán
--    funcionando si se migran o se dejan como están (sin protección RLS)

