-- Migración para corregir la tabla inventory existente
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Verificar si la columna category_id existe, si no, agregarla
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

-- 2. Verificar si la columna sku existe, si no, agregarla
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

-- 3. Verificar si la columna barcode existe, si no, agregarla
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

-- 4. Verificar si la columna unit_price existe, si no, agregarla
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

-- 5. Verificar si la columna current_stock existe, si no, agregarla
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

-- 6. Verificar si la columna min_stock existe, si no, agregarla
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

-- 7. Verificar si la columna max_stock existe, si no, agregarla
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

-- 8. Verificar si la columna unit existe, si no, agregarla
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

-- 9. Verificar si la columna status existe, si no, agregarla
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

-- 10. Insertar datos de ejemplo para inventory (sin conflictos)
INSERT INTO public.inventory (id, organization_id, category_id, name, description, sku, unit_price, current_stock, min_stock, max_stock, status) VALUES
    ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'Aceite Motor 5W-30', 'Aceite sintético para motor', 'ACE-001', 250.00, 50, 10, 100, 'active'),
    ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'Filtro de Aire', 'Filtro de aire para automóviles', 'FIL-001', 150.00, 25, 5, 50, 'active')
ON CONFLICT (id) DO NOTHING;
