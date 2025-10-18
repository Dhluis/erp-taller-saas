-- =====================================================
-- TABLAS PARA VERSIONADO Y TRACKING DE COTIZACIONES
-- =====================================================
-- Script para crear tablas de auditoría y versionado
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. TABLA DE VERSIONES DE COTIZACIONES
-- Guarda snapshots de cada versión de una cotización
CREATE TABLE IF NOT EXISTS public.quotation_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    data JSONB NOT NULL, -- Snapshot completo de la cotización
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices para quotation_versions
CREATE INDEX IF NOT EXISTS idx_quotation_versions_quotation_id 
ON public.quotation_versions(quotation_id);

CREATE INDEX IF NOT EXISTS idx_quotation_versions_created_at 
ON public.quotation_versions(created_at DESC);

-- Comentarios
COMMENT ON TABLE public.quotation_versions IS 'Historial de versiones de cotizaciones';
COMMENT ON COLUMN public.quotation_versions.data IS 'Snapshot JSON de la cotización en este punto';
COMMENT ON COLUMN public.quotation_versions.version_number IS 'Número de versión incremental';

-- =====================================================

-- 2. TABLA DE TRACKING DE CAMBIOS
-- Registra todas las acciones realizadas en cotizaciones
CREATE TABLE IF NOT EXISTS public.quotation_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'cancelled', 'converted', 'duplicated', 'sent', 'approved', 'rejected'
    details JSONB, -- Detalles específicos del cambio
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para quotation_tracking
CREATE INDEX IF NOT EXISTS idx_quotation_tracking_quotation_id 
ON public.quotation_tracking(quotation_id);

CREATE INDEX IF NOT EXISTS idx_quotation_tracking_action 
ON public.quotation_tracking(action);

CREATE INDEX IF NOT EXISTS idx_quotation_tracking_created_at 
ON public.quotation_tracking(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quotation_tracking_user_id 
ON public.quotation_tracking(user_id);

-- Comentarios
COMMENT ON TABLE public.quotation_tracking IS 'Auditoría de acciones en cotizaciones';
COMMENT ON COLUMN public.quotation_tracking.action IS 'Tipo de acción realizada';
COMMENT ON COLUMN public.quotation_tracking.details IS 'Detalles JSON de la acción';

-- =====================================================

-- 3. AGREGAR CAMPOS A TABLA QUOTATIONS (si no existen)
-- Agregar campo de versión
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotations' AND column_name = 'version'
    ) THEN
        ALTER TABLE public.quotations ADD COLUMN version INTEGER DEFAULT 1 NOT NULL;
    END IF;
END $$;

-- Agregar campo cancelled_at
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotations' AND column_name = 'cancelled_at'
    ) THEN
        ALTER TABLE public.quotations ADD COLUMN cancelled_at TIMESTAMPTZ;
    END IF;
END $$;

-- Agregar campo converted_at
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotations' AND column_name = 'converted_at'
    ) THEN
        ALTER TABLE public.quotations ADD COLUMN converted_at TIMESTAMPTZ;
    END IF;
END $$;

-- Agregar campo vehicle_id si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotations' AND column_name = 'vehicle_id'
    ) THEN
        ALTER TABLE public.quotations ADD COLUMN vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_quotations_vehicle_id ON public.quotations(vehicle_id);
    END IF;
END $$;

-- =====================================================

-- 4. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.quotation_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_tracking ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para quotation_versions
CREATE POLICY "Users can view versions of their organization's quotations" 
ON public.quotation_versions FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.quotations q
        WHERE q.id = quotation_versions.quotation_id
        AND q.organization_id::TEXT = auth.jwt() ->> 'organization_id'
    )
);

CREATE POLICY "Users can insert versions for their organization's quotations" 
ON public.quotation_versions FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.quotations q
        WHERE q.id = quotation_versions.quotation_id
        AND q.organization_id::TEXT = auth.jwt() ->> 'organization_id'
    )
);

-- Políticas RLS para quotation_tracking
CREATE POLICY "Users can view tracking of their organization's quotations" 
ON public.quotation_tracking FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.quotations q
        WHERE q.id = quotation_tracking.quotation_id
        AND q.organization_id::TEXT = auth.jwt() ->> 'organization_id'
    )
);

CREATE POLICY "Users can insert tracking for their organization's quotations" 
ON public.quotation_tracking FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.quotations q
        WHERE q.id = quotation_tracking.quotation_id
        AND q.organization_id::TEXT = auth.jwt() ->> 'organization_id'
    )
);

-- =====================================================

-- 5. FUNCIÓN PARA LIMPIAR VERSIONES ANTIGUAS (OPCIONAL)
-- Mantiene solo las últimas N versiones de cada cotización
CREATE OR REPLACE FUNCTION clean_old_quotation_versions(keep_versions INTEGER DEFAULT 10)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    WITH versions_to_delete AS (
        SELECT id
        FROM (
            SELECT 
                id,
                ROW_NUMBER() OVER (
                    PARTITION BY quotation_id 
                    ORDER BY version_number DESC
                ) as rn
            FROM public.quotation_versions
        ) ranked
        WHERE rn > keep_versions
    )
    DELETE FROM public.quotation_versions
    WHERE id IN (SELECT id FROM versions_to_delete);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION clean_old_quotation_versions IS 'Limpia versiones antiguas, mantiene solo las últimas N versiones por cotización';

-- =====================================================

-- 6. VISTA PARA HISTORIAL COMPLETO DE COTIZACIONES
CREATE OR REPLACE VIEW quotation_history AS
SELECT 
    q.id as quotation_id,
    q.quotation_number,
    q.organization_id,
    q.customer_id,
    q.status,
    q.version,
    qt.action,
    qt.details,
    qt.user_id,
    qt.created_at as action_at,
    c.name as customer_name,
    u.email as user_email
FROM public.quotations q
LEFT JOIN public.quotation_tracking qt ON q.id = qt.quotation_id
LEFT JOIN public.customers c ON q.customer_id = c.id
LEFT JOIN auth.users u ON qt.user_id = u.id
ORDER BY qt.created_at DESC;

COMMENT ON VIEW quotation_history IS 'Vista consolidada del historial de acciones en cotizaciones';

-- =====================================================

-- 7. FUNCIÓN TRIGGER PARA AUTO-TRACKING DE CAMBIOS
-- Registra automáticamente cada actualización
CREATE OR REPLACE FUNCTION track_quotation_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo registrar si hay cambios reales
    IF (TG_OP = 'UPDATE' AND OLD IS DISTINCT FROM NEW) OR TG_OP = 'INSERT' THEN
        INSERT INTO public.quotation_tracking (
            quotation_id,
            action,
            details,
            created_at
        ) VALUES (
            NEW.id,
            CASE 
                WHEN TG_OP = 'INSERT' THEN 'created'
                WHEN OLD.status != NEW.status THEN 'status_changed'
                ELSE 'updated'
            END,
            jsonb_build_object(
                'operation', TG_OP,
                'old_status', OLD.status,
                'new_status', NEW.status,
                'old_version', OLD.version,
                'new_version', NEW.version
            ),
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger (opcional, comentado por defecto)
-- Descomentar si quieres tracking automático
-- CREATE TRIGGER quotation_changes_trigger
-- AFTER INSERT OR UPDATE ON public.quotations
-- FOR EACH ROW
-- EXECUTE FUNCTION track_quotation_changes();

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

-- Verificar que las tablas se crearon correctamente
SELECT 
    'quotation_versions' as table_name,
    COUNT(*) as record_count
FROM public.quotation_versions
UNION ALL
SELECT 
    'quotation_tracking' as table_name,
    COUNT(*) as record_count
FROM public.quotation_tracking;

-- Mostrar estructura de las nuevas tablas
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name IN ('quotation_versions', 'quotation_tracking')
ORDER BY table_name, ordinal_position;


