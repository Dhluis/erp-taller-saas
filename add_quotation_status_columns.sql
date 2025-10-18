-- =====================================================
-- AGREGAR COLUMNAS DE ESTADO A QUOTATIONS
-- =====================================================
-- Script para agregar columnas de aprobación y rechazo
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. AGREGAR COLUMNA approved_at
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotations' AND column_name = 'approved_at'
    ) THEN
        ALTER TABLE public.quotations ADD COLUMN approved_at TIMESTAMPTZ;
        COMMENT ON COLUMN public.quotations.approved_at IS 'Fecha y hora de aprobación de la cotización';
    END IF;
END $$;

-- 2. AGREGAR COLUMNA rejected_at
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotations' AND column_name = 'rejected_at'
    ) THEN
        ALTER TABLE public.quotations ADD COLUMN rejected_at TIMESTAMPTZ;
        COMMENT ON COLUMN public.quotations.rejected_at IS 'Fecha y hora de rechazo de la cotización';
    END IF;
END $$;

-- 3. AGREGAR COLUMNA rejection_reason
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotations' AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE public.quotations ADD COLUMN rejection_reason TEXT;
        COMMENT ON COLUMN public.quotations.rejection_reason IS 'Motivo del rechazo de la cotización';
    END IF;
END $$;

-- 3.5 AGREGAR COLUMNA sent_at
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotations' AND column_name = 'sent_at'
    ) THEN
        ALTER TABLE public.quotations ADD COLUMN sent_at TIMESTAMPTZ;
        COMMENT ON COLUMN public.quotations.sent_at IS 'Fecha y hora de envío de la cotización al cliente';
    END IF;
END $$;

-- 4. ACTUALIZAR CONSTRAINT DE STATUS (si existe)
-- Agregar 'rejected' a los valores permitidos
DO $$ 
BEGIN
    -- Eliminar constraint existente si existe
    IF EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_name = 'quotations' AND constraint_name = 'quotations_status_check'
    ) THEN
        ALTER TABLE public.quotations DROP CONSTRAINT quotations_status_check;
    END IF;
    
    -- Crear nuevo constraint con todos los valores
    ALTER TABLE public.quotations 
    ADD CONSTRAINT quotations_status_check 
    CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'converted', 'cancelled'));
END $$;

-- 5. CREAR ÍNDICES PARA MEJORAR RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_quotations_status ON public.quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_approved_at ON public.quotations(approved_at) WHERE approved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotations_rejected_at ON public.quotations(rejected_at) WHERE rejected_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotations_sent_at ON public.quotations(sent_at) WHERE sent_at IS NOT NULL;

-- 6. CREAR VISTA PARA MÉTRICAS DE APROBACIÓN/RECHAZO
CREATE OR REPLACE VIEW quotation_approval_metrics AS
SELECT 
    organization_id,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
    COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
    COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
    COUNT(*) FILTER (WHERE status = 'converted') as converted_count,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
    COUNT(*) as total_count,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'approved')::numeric * 100.0 / 
        NULLIF(COUNT(*) FILTER (WHERE status IN ('approved', 'rejected')), 0),
        2
    ) as approval_rate,
    AVG(
        EXTRACT(EPOCH FROM (approved_at - created_at)) / 3600
    ) FILTER (WHERE approved_at IS NOT NULL) as avg_hours_to_approval,
    AVG(
        EXTRACT(EPOCH FROM (rejected_at - created_at)) / 3600
    ) FILTER (WHERE rejected_at IS NOT NULL) as avg_hours_to_rejection
FROM public.quotations
GROUP BY organization_id;

COMMENT ON VIEW quotation_approval_metrics IS 'Métricas de aprobación y rechazo de cotizaciones por organización';

-- 7. FUNCIÓN PARA OBTENER COTIZACIONES PENDIENTES DE APROBACIÓN
CREATE OR REPLACE FUNCTION get_pending_approval_quotations(
    org_id UUID,
    days_old INTEGER DEFAULT 7
)
RETURNS TABLE (
    id UUID,
    quotation_number VARCHAR,
    customer_name VARCHAR,
    total_amount DECIMAL,
    created_at TIMESTAMPTZ,
    days_pending INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id,
        q.quotation_number,
        c.name as customer_name,
        q.total_amount,
        q.created_at,
        EXTRACT(DAY FROM NOW() - q.created_at)::INTEGER as days_pending
    FROM public.quotations q
    LEFT JOIN public.customers c ON q.customer_id = c.id
    WHERE q.organization_id = org_id
    AND q.status = 'sent'
    AND q.created_at <= NOW() - (days_old || ' days')::INTERVAL
    ORDER BY q.created_at ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_pending_approval_quotations IS 'Obtiene cotizaciones enviadas que llevan más de X días sin respuesta';

-- 8. FUNCIÓN PARA OBTENER RAZONES DE RECHAZO MÁS COMUNES
CREATE OR REPLACE FUNCTION get_top_rejection_reasons(
    org_id UUID,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    rejection_reason TEXT,
    count BIGINT,
    percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.rejection_reason,
        COUNT(*) as count,
        ROUND(
            COUNT(*)::numeric * 100.0 / 
            (SELECT COUNT(*) FROM public.quotations WHERE organization_id = org_id AND status = 'rejected'),
            2
        ) as percentage
    FROM public.quotations q
    WHERE q.organization_id = org_id
    AND q.status = 'rejected'
    AND q.rejection_reason IS NOT NULL
    AND q.rejection_reason != ''
    GROUP BY q.rejection_reason
    ORDER BY count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_top_rejection_reasons IS 'Obtiene las razones de rechazo más comunes';

-- 9. TRIGGER PARA VALIDAR TRANSICIONES DE ESTADO
CREATE OR REPLACE FUNCTION validate_quotation_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- No permitir cambiar de 'converted' a otro estado
    IF OLD.status = 'converted' AND NEW.status != 'converted' THEN
        RAISE EXCEPTION 'No se puede cambiar el estado de una cotización convertida';
    END IF;
    
    -- No permitir aprobar si ya está rechazada
    IF OLD.status = 'rejected' AND NEW.status = 'approved' THEN
        RAISE EXCEPTION 'No se puede aprobar una cotización que ya fue rechazada. Cree una nueva cotización.';
    END IF;
    
    -- No permitir rechazar si ya está aprobada
    IF OLD.status = 'approved' AND NEW.status = 'rejected' THEN
        RAISE EXCEPTION 'No se puede rechazar una cotización que ya fue aprobada';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger (comentado por defecto, descomentar si se desea usar)
-- DROP TRIGGER IF EXISTS quotation_status_validation_trigger ON public.quotations;
-- CREATE TRIGGER quotation_status_validation_trigger
-- BEFORE UPDATE OF status ON public.quotations
-- FOR EACH ROW
-- EXECUTE FUNCTION validate_quotation_status_transition();

-- 10. DATOS DE PRUEBA (opcional, solo para desarrollo)
-- Actualizar algunas cotizaciones de prueba
-- UPDATE public.quotations
-- SET 
--     status = 'approved',
--     approved_at = NOW() - INTERVAL '2 days'
-- WHERE quotation_number = 'Q-2024-0001';

-- UPDATE public.quotations
-- SET 
--     status = 'rejected',
--     rejected_at = NOW() - INTERVAL '1 day',
--     rejection_reason = 'Precio muy alto'
-- WHERE quotation_number = 'Q-2024-0002';

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Verificar que las columnas se agregaron correctamente
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'quotations'
AND column_name IN ('approved_at', 'rejected_at', 'rejection_reason', 'sent_at')
ORDER BY column_name;

-- Ver métricas actuales
SELECT * FROM quotation_approval_metrics;

-- Ver cotizaciones pendientes (últimos 7 días)
-- SELECT * FROM get_pending_approval_quotations('00000000-0000-0000-0000-000000000000'::UUID, 7);

-- Ver razones de rechazo más comunes
-- SELECT * FROM get_top_rejection_reasons('00000000-0000-0000-0000-000000000000'::UUID, 10);

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
