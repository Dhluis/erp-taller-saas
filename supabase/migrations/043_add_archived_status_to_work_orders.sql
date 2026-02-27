-- =====================================================
-- 043_add_archived_status_to_work_orders.sql
-- 
-- Objetivo:
--   Permitir el nuevo estado 'archived' en work_orders.status
--   para soportar la columna "Archivadas" en el Kanban y vistas relacionadas.
--
-- NOTAS:
--   - No toca RLS ni otras políticas de seguridad.
--   - Solo actualiza el CHECK CONSTRAINT de la columna status.
--   - La lista incluye todos los estados actualmente usados
--     por el backend y la capa de queries.
-- =====================================================

ALTER TABLE public.work_orders
  DROP CONSTRAINT IF EXISTS work_orders_status_check;

ALTER TABLE public.work_orders
  ADD CONSTRAINT work_orders_status_check
  CHECK (
    status IN (
      'pending',
      'in_progress',
      'diagnosed',
      'approved',
      'in_repair',
      'waiting_parts',
      'completed',
      'delivered',
      'archived'
    )
  );

