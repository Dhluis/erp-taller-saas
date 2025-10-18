-- ===============================================
-- VERIFICACIÓN DEL SISTEMA DE FOTOS
-- ===============================================

-- 1. Verificar que el bucket existe
SELECT * FROM storage.buckets WHERE id = 'work-order-images';

-- 2. Verificar políticas de storage
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- 3. Verificar columna images en work_orders
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'work_orders' AND column_name = 'images';

-- 4. Verificar si hay órdenes con imágenes
SELECT 
  id,
  status,
  created_at,
  CASE 
    WHEN images IS NULL THEN 'NULL'
    WHEN images = '[]'::jsonb THEN 'VACÍO'
    ELSE 'CON IMÁGENES: ' || jsonb_array_length(images)::text
  END as estado_imagenes
FROM work_orders 
LIMIT 10;

-- 5. Verificar objetos en storage
SELECT * FROM storage.objects WHERE bucket_id = 'work-order-images' LIMIT 10;

-- 6. Crear bucket si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('work-order-images', 'work-order-images', true)
ON CONFLICT (id) DO NOTHING;

-- 7. Crear políticas (eliminar si existen primero)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT
USING (bucket_id = 'work-order-images');

CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'work-order-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete" ON storage.objects FOR DELETE
USING (
  bucket_id = 'work-order-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update" ON storage.objects FOR UPDATE
USING (
  bucket_id = 'work-order-images' 
  AND auth.role() = 'authenticated'
);

-- 8. Agregar columna images si no existe
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb;

-- 9. Crear índice si no existe
CREATE INDEX IF NOT EXISTS idx_work_orders_images 
ON work_orders USING gin(images);

-- 10. Verificación final
SELECT 
  'BUCKET' as tipo,
  CASE WHEN COUNT(*) > 0 THEN '✅ EXISTE' ELSE '❌ FALTANTE' END as estado
FROM storage.buckets WHERE id = 'work-order-images'

UNION ALL

SELECT 
  'POLÍTICAS' as tipo,
  CASE WHEN COUNT(*) >= 4 THEN '✅ COMPLETAS' ELSE '❌ FALTANTES' END as estado
FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage'

UNION ALL

SELECT 
  'COLUMNA_IMAGES' as tipo,
  CASE WHEN COUNT(*) > 0 THEN '✅ EXISTE' ELSE '❌ FALTANTE' END as estado
FROM information_schema.columns 
WHERE table_name = 'work_orders' AND column_name = 'images';
