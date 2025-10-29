-- Agregar columna para notas en work_orders
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS notes jsonb DEFAULT '[]'::jsonb;

-- Índice para búsquedas eficientes en notas
CREATE INDEX IF NOT EXISTS idx_work_orders_notes 
ON work_orders USING gin(notes);

-- Verificar que la columna se agregó correctamente
SELECT id, status, notes 
FROM work_orders 
LIMIT 3;

-- Mostrar estructura de la tabla
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'work_orders' 
AND column_name = 'notes';

-- Verificar el índice
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'work_orders' 
AND indexname = 'idx_work_orders_notes';









