-- ═══════════════════════════════════════════════════════════════
-- CONFIGURACIÓN DE STORAGE PARA ACTIVOS DE LA EMPRESA (PDFs, Logos)
-- ═══════════════════════════════════════════════════════════════

-- PASO 1: Crear bucket 'company-assets'
-- Se configura como público para permitir el acceso directo a los PDFs de términos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets',
  true,
  10485760, -- 10 MB en bytes
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']::text[];

-- PASO 2: Configurar políticas RLS para el bucket
-- Esto asegura que cualquiera pueda leer (público) pero solo usuarios autenticados puedan subir/borrar
DROP POLICY IF EXISTS "Public read access for company assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload company assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete company assets" ON storage.objects;

-- Política 1: Lectura pública
CREATE POLICY "Public read access for company assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-assets');

-- Política 2: Subir/Actualizar (usuarios autenticados)
CREATE POLICY "Authenticated users can upload company assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-assets');

-- Política 3: Eliminar (usuarios autenticados)
CREATE POLICY "Authenticated users can delete company assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'company-assets');

-- PASO 3: Verificar configuración
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'company-assets';
