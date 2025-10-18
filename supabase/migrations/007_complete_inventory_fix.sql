-- Migración completa para corregir el sistema de inventario
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Crear tabla inventory_categories si no existe
CREATE TABLE IF NOT EXISTS public.inventory_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    name TEXT NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Crear tabla inventory si no existe
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    category_id UUID REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT,
    barcode TEXT,
    unit_price DECIMAL(10,2) DEFAULT 0,
    current_stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    max_stock INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'pcs',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Crear tabla inventory_movements si no existe
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    product_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('entrada', 'salida', 'ajuste')),
    quantity INTEGER NOT NULL,
    movement_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Agregar columnas faltantes a inventory si ya existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory' 
        AND column_name = 'category_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inventory ADD COLUMN category_id UUID REFERENCES public.inventory_categories(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory' 
        AND column_name = 'sku'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inventory ADD COLUMN sku TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory' 
        AND column_name = 'barcode'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inventory ADD COLUMN barcode TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory' 
        AND column_name = 'unit_price'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inventory ADD COLUMN unit_price DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory' 
        AND column_name = 'current_stock'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inventory ADD COLUMN current_stock INTEGER DEFAULT 0;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory' 
        AND column_name = 'min_stock'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inventory ADD COLUMN min_stock INTEGER DEFAULT 0;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory' 
        AND column_name = 'max_stock'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inventory ADD COLUMN max_stock INTEGER DEFAULT 0;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory' 
        AND column_name = 'unit'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inventory ADD COLUMN unit TEXT DEFAULT 'pcs';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory' 
        AND column_name = 'status'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inventory ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'));
    END IF;
END $$;

-- 5. Habilitar RLS en las tablas
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- 6. Crear políticas RLS básicas
DO $$ BEGIN
    CREATE POLICY "Enable all for inventory_categories" ON public.inventory_categories FOR ALL USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Enable all for inventory" ON public.inventory FOR ALL USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Enable all for inventory_movements" ON public.inventory_movements FOR ALL USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 7. Insertar datos de ejemplo para inventory_categories
INSERT INTO public.inventory_categories (id, organization_id, name, description, status) VALUES
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'Aceites y Lubricantes', 'Aceites para motor, transmisión y diferencial', 'active'),
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'Filtros', 'Filtros de aire, aceite, combustible y habitáculo', 'active'),
    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'Frenos', 'Pastillas, discos, líquido de frenos y componentes', 'active'),
    ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'Motor', 'Componentes del sistema de motor', 'active')
ON CONFLICT (id) DO NOTHING;

-- 8. Insertar datos de ejemplo para inventory
INSERT INTO public.inventory (id, organization_id, category_id, name, description, sku, unit_price, current_stock, min_stock, max_stock, status) VALUES
    ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'Aceite Motor 5W-30', 'Aceite sintético para motor', 'ACE-001', 250.00, 50, 10, 100, 'active'),
    ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'Filtro de Aire', 'Filtro de aire para automóviles', 'FIL-001', 150.00, 25, 5, 50, 'active'),
    ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000003', 'Pastillas de Freno', 'Pastillas de freno delanteras', 'FRE-001', 180.00, 15, 5, 30, 'active'),
    ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000004', 'Bujía de Encendido', 'Bujía de encendido estándar', 'BUJ-001', 45.00, 40, 10, 80, 'active')
ON CONFLICT (id) DO NOTHING;
