-- ============================================================
-- Migration 041: Work Order History / Audit Log
-- Eagles System - Historial de cambios en órdenes de trabajo
-- ============================================================

-- Tabla principal de historial
CREATE TABLE IF NOT EXISTS public.work_order_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL DEFAULT 'Sistema',
    action TEXT NOT NULL CHECK (action IN (
        'created',
        'status_change',
        'field_update',
        'assignment',
        'vehicle_update',
        'customer_update',
        'inspection_update',
        'item_added',
        'item_updated',
        'item_removed',
        'note_added',
        'document_uploaded',
        'document_deleted',
        'deleted'
    )),
    description TEXT NOT NULL,
    old_value JSONB DEFAULT NULL,
    new_value JSONB DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_work_order_history_work_order_id 
    ON public.work_order_history(work_order_id);

CREATE INDEX IF NOT EXISTS idx_work_order_history_organization_id 
    ON public.work_order_history(organization_id);

CREATE INDEX IF NOT EXISTS idx_work_order_history_created_at 
    ON public.work_order_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_work_order_history_action 
    ON public.work_order_history(action);

-- RLS: Permitir acceso completo (consistente con el patrón del proyecto)
ALTER TABLE public.work_order_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'work_order_history' 
    AND policyname = 'Enable all for work_order_history'
  ) THEN
    CREATE POLICY "Enable all for work_order_history"
      ON public.work_order_history
      FOR ALL
      USING (true);
  END IF;
END $$;

-- Comentarios de documentación
COMMENT ON TABLE public.work_order_history IS 'Historial de cambios y actividad en órdenes de trabajo';
COMMENT ON COLUMN public.work_order_history.action IS 'Tipo de acción: created, status_change, field_update, assignment, vehicle_update, customer_update, inspection_update, item_added, item_updated, item_removed, note_added, document_uploaded, document_deleted, deleted';
COMMENT ON COLUMN public.work_order_history.old_value IS 'Valor anterior (JSONB) para cambios de campo';
COMMENT ON COLUMN public.work_order_history.new_value IS 'Valor nuevo (JSONB) para cambios de campo';
