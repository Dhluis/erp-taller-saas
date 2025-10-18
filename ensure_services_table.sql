-- =====================================================
-- ASEGURAR QUE TABLA SERVICES EXISTA
-- =====================================================
-- Crear tabla services si no existe
-- =====================================================

-- CREAR TABLA SERVICES (si no existe)
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    estimated_duration INTEGER, -- En minutos
    requires_parts BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_services_organization_id ON public.services(organization_id);
CREATE INDEX IF NOT EXISTS idx_services_code ON public.services(code);
CREATE INDEX IF NOT EXISTS idx_services_name ON public.services(name);
CREATE INDEX IF NOT EXISTS idx_services_category ON public.services(category);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON public.services(is_active);

-- Comentarios
COMMENT ON TABLE public.services IS 'Catálogo de servicios del taller';
COMMENT ON COLUMN public.services.base_price IS 'Precio base del servicio (puede variar por vehículo)';
COMMENT ON COLUMN public.services.estimated_duration IS 'Duración estimada del servicio en minutos';
COMMENT ON COLUMN public.services.requires_parts IS 'Indica si el servicio típicamente requiere refacciones';

-- RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Política para ver servicios
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'services' 
        AND policyname = 'Users can view their organization services'
    ) THEN
        CREATE POLICY "Users can view their organization services"
        ON public.services FOR SELECT
        USING (organization_id::TEXT = auth.jwt() ->> 'organization_id');
    END IF;
END $$;

-- Política para insertar servicios
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'services' 
        AND policyname = 'Users can insert services in their organization'
    ) THEN
        CREATE POLICY "Users can insert services in their organization"
        ON public.services FOR INSERT
        WITH CHECK (organization_id::TEXT = auth.jwt() ->> 'organization_id');
    END IF;
END $$;

-- Política para actualizar servicios
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'services' 
        AND policyname = 'Users can update their organization services'
    ) THEN
        CREATE POLICY "Users can update their organization services"
        ON public.services FOR UPDATE
        USING (organization_id::TEXT = auth.jwt() ->> 'organization_id');
    END IF;
END $$;

-- Política para eliminar servicios
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'services' 
        AND policyname = 'Users can delete their organization services'
    ) THEN
        CREATE POLICY "Users can delete their organization services"
        ON public.services FOR DELETE
        USING (organization_id::TEXT = auth.jwt() ->> 'organization_id');
    END IF;
END $$;

-- Insertar servicios de ejemplo (solo si no hay ninguno)
INSERT INTO public.services (
    organization_id,
    code,
    name,
    description,
    category,
    base_price,
    estimated_duration,
    requires_parts,
    is_active
)
SELECT 
    '00000000-0000-0000-0000-000000000000',
    'SRV001',
    'Cambio de Aceite',
    'Cambio de aceite y filtro estándar',
    'Mantenimiento',
    500.00,
    30,
    true,
    true
WHERE NOT EXISTS (SELECT 1 FROM public.services LIMIT 1)

UNION ALL

SELECT 
    '00000000-0000-0000-0000-000000000000',
    'SRV002',
    'Alineación y Balanceo',
    'Alineación y balanceo de las 4 ruedas',
    'Mantenimiento',
    800.00,
    60,
    false,
    true
WHERE NOT EXISTS (SELECT 1 FROM public.services LIMIT 1)

UNION ALL

SELECT 
    '00000000-0000-0000-0000-000000000000',
    'SRV003',
    'Cambio de Frenos',
    'Cambio de pastillas y discos de freno',
    'Reparación',
    1500.00,
    90,
    true,
    true
WHERE NOT EXISTS (SELECT 1 FROM public.services LIMIT 1)

UNION ALL

SELECT 
    '00000000-0000-0000-0000-000000000000',
    'SRV004',
    'Diagnóstico con Scanner',
    'Diagnóstico electrónico completo del vehículo',
    'Diagnóstico',
    350.00,
    20,
    false,
    true
WHERE NOT EXISTS (SELECT 1 FROM public.services LIMIT 1)

UNION ALL

SELECT 
    '00000000-0000-0000-0000-000000000000',
    'SRV005',
    'Lavado Completo',
    'Lavado exterior e interior del vehículo',
    'Estética',
    200.00,
    45,
    false,
    true
WHERE NOT EXISTS (SELECT 1 FROM public.services LIMIT 1);

-- Verificar
SELECT 
    'services' as table_name,
    COUNT(*) as record_count
FROM public.services;


