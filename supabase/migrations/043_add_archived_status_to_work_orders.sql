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
--   - La lista preserva todos los estados existentes en producción
--     y agrega 'archived'.
-- =====================================================

ALTER TABLE public.work_orders
  DROP CONSTRAINT IF EXISTS work_orders_status_check;

ALTER TABLE public.work_orders
  ADD CONSTRAINT work_orders_status_check
  CHECK (
    status = ANY (ARRAY[
      'reception',
      'diagnosis',
      'initial_quote',
      'waiting_approval',
      'disassembly',
      'waiting_parts',
      'assembly',
      'testing',
      'ready',
      'completed',
      'cancelled',
      'archived'
    ])
  );
