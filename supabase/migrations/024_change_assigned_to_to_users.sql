-- ============================================================================
-- MIGRACIÓN: Cambiar assigned_to de employees.id a users.id
-- ============================================================================
-- Descripción: Actualiza el foreign key constraint de work_orders.assigned_to
--              para que apunte a users.id en lugar de employees.id
--              Esto permite asignar órdenes a usuarios con rol MECANICO
-- Fecha: 2025-01-05
-- ============================================================================

-- 1. Limpiar TODOS los assigned_to que NO existen en users
-- ✅ IMPORTANTE: Esto limpia cualquier assigned_to que apunte a employees.id
--    o cualquier otro ID que no esté en la tabla users
UPDATE work_orders
SET assigned_to = NULL
WHERE assigned_to IS NOT NULL
  AND assigned_to NOT IN (
    SELECT id FROM public.users
  );

-- 2. Limpiar específicamente para la organización (opcional, por seguridad)
UPDATE work_orders
SET assigned_to = NULL
WHERE assigned_to IS NOT NULL
  AND organization_id = 'b3962fe4-d238-42bc-9455-4ed84a38c6b4'
  AND assigned_to NOT IN (
    SELECT id FROM public.users WHERE organization_id = 'b3962fe4-d238-42bc-9455-4ed84a38c6b4'
  );

-- 3. Eliminar el constraint existente (si existe)
ALTER TABLE public.work_orders 
DROP CONSTRAINT IF EXISTS work_orders_assigned_to_fkey;

-- 4. Crear nuevo constraint apuntando a users.id
ALTER TABLE public.work_orders 
ADD CONSTRAINT work_orders_assigned_to_fkey 
FOREIGN KEY (assigned_to) REFERENCES public.users(id);

-- 5. Agregar comentario de documentación
COMMENT ON COLUMN public.work_orders.assigned_to IS 
'Mecánico asignado a la orden. Debe ser un users.id con role MECANICO';

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. El campo assigned_to ahora referencia users.id (no employees.id)
-- 2. Solo se pueden asignar usuarios con role = 'MECANICO'
-- 3. El dropdown de asignación busca en users con filtro role = 'MECANICO'
-- 4. Si hay datos existentes en assigned_to que apuntan a employees.id,
--    estos deben limpiarse antes de ejecutar esta migración
-- ============================================================================

