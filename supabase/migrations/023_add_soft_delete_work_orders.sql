-- ============================================================================
-- MIGRACIÓN: Agregar Soft Delete a work_orders
-- ============================================================================
-- Descripción: Agrega columna deleted_at para implementar soft delete
--              en lugar de hard delete, preservando integridad referencial
-- Fecha: 2025-01-05
-- ============================================================================

-- 1. Agregar columna deleted_at a work_orders
ALTER TABLE public.work_orders 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- 2. Crear índice para mejorar performance de queries que filtran deleted_at
CREATE INDEX IF NOT EXISTS idx_work_orders_deleted_at 
ON public.work_orders(deleted_at) 
WHERE deleted_at IS NULL;

-- 3. Crear índice compuesto para organization_id + deleted_at (queries comunes)
CREATE INDEX IF NOT EXISTS idx_work_orders_org_not_deleted 
ON public.work_orders(organization_id, deleted_at) 
WHERE deleted_at IS NULL;

-- 4. Comentario en la columna
COMMENT ON COLUMN public.work_orders.deleted_at IS 
'Fecha de eliminación (soft delete). NULL = activo, NOT NULL = eliminado';

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. Todas las queries deben filtrar: WHERE deleted_at IS NULL
-- 2. Soft delete preserva integridad referencial con:
--    - order_items
--    - vehicle_inspections
--    - whatsapp_order_metadata (si existe)
-- 3. Para recuperar órdenes eliminadas: WHERE deleted_at IS NOT NULL
-- 4. Para eliminar permanentemente: DELETE FROM work_orders WHERE deleted_at IS NOT NULL
-- ============================================================================

