-- =====================================================
-- Migración: Añadir firma de salida a las órdenes de trabajo
-- =====================================================

ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS exit_signature_url TEXT;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS exit_signature_date TIMESTAMPTZ;

-- Comentarios
COMMENT ON COLUMN public.work_orders.exit_signature_url IS 'URL de la firma del cliente al momento de retirar el vehículo (conformidad)';
COMMENT ON COLUMN public.work_orders.exit_signature_date IS 'Fecha y hora en que se capturó la firma de conformidad';
