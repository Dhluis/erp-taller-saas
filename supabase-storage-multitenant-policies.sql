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
-- 2. FUNCIÓN HELPER: Obtener organization_id del usuario (como TEXT)
-- ================================================
-- ✅ IMPORTANTE: La función get_user_organization_id() ya existe y retorna UUID
-- ✅ Crear una función wrapper que retorne TEXT para usar en Storage policies
-- ✅ NO eliminar la función existente porque otras políticas dependen de ella

CREATE OR REPLACE FUNCTION public.get_user_organization_id_text()
RETURNS TEXT AS $$
  SELECT get_user_organization_id()::TEXT;
$$ LANGUAGE sql SECURITY DEFINER;

-- ================================================
-- 3. FUNCIÓN HELPER: Extraer organization_id del path
-- ================================================
-- Path format: {organizationId}/{orderId}/{category}-{timestamp}-{random}.{ext}
-- Esta función extrae el primer segmento del path (organizationId)
-- ✅ IMPORTANTE: Crear en schema 'public', no 'storage'
-- ✅ Eliminar función existente si existe

DROP FUNCTION IF EXISTS public.extract_organization_id_from_path(TEXT);
DROP FUNCTION IF EXISTS public.extract_organization_id_from_path(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.extract_organization_id_from_path(path TEXT)
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
  AND public.extract_organization_id_from_path(name) = public.get_user_organization_id_text()
);

-- ✅ INSERT: Usuarios solo pueden subir a paths de su organización
CREATE POLICY "Users can only upload to their organization" 
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'work-order-images' 
  AND auth.role() = 'authenticated'
  AND public.extract_organization_id_from_path(name) = public.get_user_organization_id_text()
);

-- ✅ DELETE: Usuarios solo pueden eliminar imágenes de su organización
CREATE POLICY "Users can only delete their organization images" 
ON storage.objects FOR DELETE
USING (
  bucket_id = 'work-order-images'
  AND auth.role() = 'authenticated'
  AND public.extract_organization_id_from_path(name) = public.get_user_organization_id_text()
);

-- ✅ UPDATE: Usuarios solo pueden actualizar imágenes de su organización
CREATE POLICY "Users can only update their organization images" 
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'work-order-images'
  AND auth.role() = 'authenticated'
  AND public.extract_organization_id_from_path(name) = public.get_user_organization_id_text()
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
-- 2. Las funciones helper se crean en schema 'public' (no 'storage')
--    porque no tenemos permisos para crear funciones en 'storage'
-- 3. La función get_user_organization_id() ya existe y retorna UUID
--    Creamos get_user_organization_id_text() como wrapper que retorna TEXT
--    para evitar conflictos con la función existente y sus dependencias
-- 4. La función get_user_organization_id_text() usa SECURITY DEFINER
--    para poder acceder a la función get_user_organization_id() sin problemas
-- 5. Si una imagen no tiene organization_id en el path, será
--    rechazada por las políticas (seguridad por defecto)
-- 6. Las imágenes antiguas (sin organization_id en path) seguirán
--    funcionando si se migran o se dejan como están (sin protección RLS)

