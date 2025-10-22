-- ===============================================
-- CONFIGURACIÓN DE STORAGE PARA FOTOS DE ÓRDENES
-- ===============================================

-- 1. Crear bucket para fotos de órdenes
INSERT INTO storage.buckets (id, name, public)
VALUES ('work-order-images', 'work-order-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Política para lectura pública
CREATE POLICY "Public Access" ON storage.objects FOR SELECT
USING (bucket_id = 'work-order-images');

-- 3. Política para subir (autenticados)
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'work-order-images' 
  AND auth.role() = 'authenticated'
);

-- 4. Política para eliminar (autenticados)
CREATE POLICY "Authenticated users can delete" ON storage.objects FOR DELETE
USING (
  bucket_id = 'work-order-images' 
  AND auth.role() = 'authenticated'
);

-- 5. Política para actualizar (autenticados)
CREATE POLICY "Authenticated users can update" ON storage.objects FOR UPDATE
USING (
  bucket_id = 'work-order-images' 
  AND auth.role() = 'authenticated'
);

-- ===============================================
-- MODIFICAR TABLA work_orders PARA IMÁGENES
-- ===============================================

-- 6. Agregar columna para almacenar imágenes con metadata
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb;

-- 7. Índice para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_work_orders_images 
ON work_orders USING gin(images);

-- 8. Verificar la estructura
SELECT id, status, images 
FROM work_orders 
LIMIT 3;

-- ===============================================
-- QUERIES DE VERIFICACIÓN
-- ===============================================

-- Ver todas las órdenes con fechas
SELECT 
  id,
  status,
  created_at,
  entry_date,
  organization_id,
  workshop_id,
  DATE(created_at) as fecha_creacion,
  jsonb_array_length(COALESCE(images, '[]'::jsonb)) as total_fotos
FROM work_orders
ORDER BY created_at DESC;

-- Contar órdenes de los últimos 7 días por estado
SELECT 
  status,
  COUNT(*) as total,
  MIN(created_at) as primera,
  MAX(created_at) as ultima,
  SUM(jsonb_array_length(COALESCE(images, '[]'::jsonb))) as total_fotos
FROM work_orders
WHERE created_at >= (CURRENT_DATE - INTERVAL '7 days')
GROUP BY status
ORDER BY status;

-- Ver si hay órdenes sin organization_id
SELECT COUNT(*) as ordenes_sin_org
FROM work_orders 
WHERE organization_id IS NULL;

-- Ver si hay múltiples organizations
SELECT 
  organization_id,
  COUNT(*) as total_ordenes
FROM work_orders
GROUP BY organization_id;



