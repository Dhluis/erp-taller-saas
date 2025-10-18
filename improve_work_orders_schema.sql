-- =====================================================
-- MEJORA: Esquema de work_orders con campos adicionales
-- =====================================================
-- Este script mejora la tabla work_orders agregando campos
-- para mecánico asignado y usuario creador

-- 1. Agregar columna assigned_to (mecánico asignado)
ALTER TABLE public.work_orders 
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.employees(id);

-- 2. Agregar columna created_by (usuario que creó la orden)
ALTER TABLE public.work_orders 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- 3. Crear índices para optimizar queries
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to 
ON public.work_orders(assigned_to);

CREATE INDEX IF NOT EXISTS idx_work_orders_created_by 
ON public.work_orders(created_by);

CREATE INDEX IF NOT EXISTS idx_work_orders_status 
ON public.work_orders(status);

-- 4. Agregar comentarios para documentación
COMMENT ON COLUMN public.work_orders.assigned_to IS 'Mecánico asignado a la orden de trabajo';
COMMENT ON COLUMN public.work_orders.created_by IS 'Usuario que creó la orden de trabajo';

-- 5. Verificar que se agregaron las columnas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'work_orders' 
  AND column_name IN ('assigned_to', 'created_by')
ORDER BY column_name;

-- 6. Verificar índices creados
SELECT indexname, tablename, indexdef
FROM pg_indexes 
WHERE tablename = 'work_orders'
  AND indexname LIKE 'idx_work_orders_%'
ORDER BY indexname;

