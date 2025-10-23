-- ═══════════════════════════════════════════════════════════════
-- CONFIGURACIÓN DE DOCUMENTOS PARA WORK ORDERS
-- ═══════════════════════════════════════════════════════════════

-- PASO 1: Agregar columna documents a work_orders
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN work_orders.documents IS 'Array de documentos: [{id, name, url, type, category, size, uploaded_by, uploaded_at}]';

-- Crear índice GIN para búsquedas eficientes en documents
CREATE INDEX IF NOT EXISTS idx_work_orders_documents ON work_orders USING gin(documents);

COMMENT ON INDEX idx_work_orders_documents IS 'Índice para búsquedas eficientes en documentos';

-- ═══════════════════════════════════════════════════════════════
-- PASO 2: Verificar que la columna se creó correctamente
-- ═══════════════════════════════════════════════════════════════

SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'work_orders' 
AND column_name = 'documents';

-- ═══════════════════════════════════════════════════════════════
-- PASO 3: Crear bucket en Supabase Storage
-- ═══════════════════════════════════════════════════════════════

-- Insertar bucket (solo si no existe)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'work-order-documents',
  'work-order-documents',
  true,
  52428800, -- 50 MB en bytes
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]::text[];

-- ═══════════════════════════════════════════════════════════════
-- PASO 4: Configurar políticas RLS para el bucket
-- ═══════════════════════════════════════════════════════════════

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Public read access for work order documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload work order documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update work order documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete work order documents" ON storage.objects;

-- Política 1: Lectura pública
CREATE POLICY "Public read access for work order documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'work-order-documents');

-- Política 2: Subir documentos (usuarios autenticados)
CREATE POLICY "Authenticated users can upload work order documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'work-order-documents');

-- Política 3: Actualizar documentos (usuarios autenticados)
CREATE POLICY "Authenticated users can update work order documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'work-order-documents')
WITH CHECK (bucket_id = 'work-order-documents');

-- Política 4: Eliminar documentos (usuarios autenticados)
CREATE POLICY "Authenticated users can delete work order documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'work-order-documents');

-- ═══════════════════════════════════════════════════════════════
-- PASO 5: Verificar configuración del bucket
-- ═══════════════════════════════════════════════════════════════

SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE id = 'work-order-documents';

-- ═══════════════════════════════════════════════════════════════
-- PASO 6: Verificar políticas RLS
-- ═══════════════════════════════════════════════════════════════

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
AND policyname LIKE '%work order documents%'
ORDER BY policyname;

-- ═══════════════════════════════════════════════════════════════
-- ✅ SCRIPT COMPLETADO
-- ═══════════════════════════════════════════════════════════════

-- Resumen de lo que se creó:
-- ✅ Columna 'documents' en work_orders (jsonb)
-- ✅ Índice GIN para búsquedas eficientes
-- ✅ Bucket 'work-order-documents' en Supabase Storage
-- ✅ 4 políticas RLS (SELECT, INSERT, UPDATE, DELETE)
-- ✅ Límite de tamaño: 50 MB por archivo
-- ✅ Tipos MIME permitidos: PDF, imágenes, Word, Excel, texto

-- SIGUIENTE PASO:
-- Ejecuta este script en Supabase SQL Editor
-- Luego verifica que todo se creó correctamente





