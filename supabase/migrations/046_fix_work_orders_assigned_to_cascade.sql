-- ============================================================================
-- MIGRACIÓN: Fix FK work_orders.assigned_to para permitir eliminar usuarios
-- ============================================================================
-- Problema: work_orders_assigned_to_fkey no tiene ON DELETE, lo que bloquea
--           la eliminación de usuarios desde el dashboard de Supabase aunque
--           el API route ya maneja la desasignación programáticamente.
-- Solución: Cambiar a ON DELETE SET NULL para que si se elimina un usuario
--           directamente (ej. dashboard Supabase), las órdenes queden sin asignar.
-- ============================================================================

ALTER TABLE public.work_orders
DROP CONSTRAINT IF EXISTS work_orders_assigned_to_fkey;

ALTER TABLE public.work_orders
ADD CONSTRAINT work_orders_assigned_to_fkey
FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;
