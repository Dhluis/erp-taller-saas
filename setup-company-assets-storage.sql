-- ═══════════════════════════════════════════════════════════════
-- SOLUCIÓN INTEGRAL PARA STORAGE Y MIGRACIONES
-- ═══════════════════════════════════════════════════════════════

-- PASO 1: Crear función helper 'exec_sql' (si no existe)
-- Esta función es necesaria para que las migraciones desde el código funcionen
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
END;
$$;

-- PASO 2: Asegurar que el bucket 'company-assets' existe y es público
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets',
  true,
  10485760, -- 10 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']::text[];

-- PASO 3: Configurar políticas RLS para el bucket
-- Esto permite lectura pública pero restringe la subida a usuarios autenticados
DROP POLICY IF EXISTS "Public read access for company assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload company assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete company assets" ON storage.objects;

-- Política de lectura pública
CREATE POLICY "Public read access for company assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-assets');

-- Política de subida (autenticados)
CREATE POLICY "Authenticated users can upload company assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-assets');

-- Política de actualización (autenticados)
CREATE POLICY "Authenticated users can update company assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'company-assets')
WITH CHECK (bucket_id = 'company-assets');

-- Política de eliminación (autenticados)
CREATE POLICY "Authenticated users can delete company assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'company-assets');

-- PASO 4: Asegurar la columna en la tabla de configuración
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS terms_pdf_url TEXT NULL;

-- 🏁 VERIFICACIÓN FINAL
SELECT id, name, public FROM storage.buckets WHERE id = 'company-assets';
