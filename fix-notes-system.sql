-- ═══════════════════════════════════════════════════════════════
-- SCRIPT PARA REPARAR SISTEMA DE NOTAS
-- ═══════════════════════════════════════════════════════════════

-- PASO 1: Verificar si la columna 'notes' existe
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'work_orders' 
AND column_name = 'notes';

-- Si NO aparece ningún resultado, ejecuta:
-- ALTER TABLE work_orders ADD COLUMN notes jsonb DEFAULT '[]'::jsonb;

-- PASO 2: Si existe pero es TEXT en vez de JSONB, convertir
-- (Solo ejecuta esto si el tipo de dato es 'text' en vez de 'jsonb')
-- ALTER TABLE work_orders ALTER COLUMN notes TYPE jsonb USING notes::jsonb;
-- ALTER TABLE work_orders ALTER COLUMN notes SET DEFAULT '[]'::jsonb;

-- PASO 3: Verificar contenido actual de una orden específica
SELECT 
  id,
  notes,
  jsonb_array_length(COALESCE(notes, '[]'::jsonb)) as num_notes
FROM work_orders 
WHERE id = 'da57888b-c899-4f40-87a0-4b60dbcae83c'; -- Reemplaza con tu order ID

-- PASO 4: Ver todas las órdenes con notas
SELECT 
  id,
  notes,
  jsonb_array_length(COALESCE(notes, '[]'::jsonb)) as num_notes
FROM work_orders 
WHERE notes IS NOT NULL 
  AND notes != '[]'::jsonb
ORDER BY updated_at DESC
LIMIT 10;

-- PASO 5: Si necesitas agregar la columna notes desde cero:
-- Ejecuta esto SOLO si no existe la columna
/*
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS notes jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN work_orders.notes IS 'Array de notas: [{id, text, createdAt, createdBy, userName, isPinned, category}]';

-- Crear índice GIN para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_work_orders_notes ON work_orders USING gin(notes);
*/

-- PASO 6: Limpiar notas vacías o null (opcional)
-- UPDATE work_orders SET notes = '[]'::jsonb WHERE notes IS NULL;

-- ═══════════════════════════════════════════════════════════════
-- VERIFICACIÓN FINAL
-- ═══════════════════════════════════════════════════════════════

-- Ver estructura de la columna
SELECT 
  table_name,
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'work_orders' 
AND column_name IN ('notes', 'documents', 'images')
ORDER BY column_name;

-- Ver índices relacionados
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'work_orders'
AND indexname LIKE '%notes%';





