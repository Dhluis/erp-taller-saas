-- Migración para corregir la estructura de inventory_movements
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Agregar columnas faltantes a inventory_movements
DO $$ 
BEGIN
    -- Agregar movement_type si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_movements' 
        AND column_name = 'movement_type'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inventory_movements ADD COLUMN movement_type TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    -- Agregar reference_type si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_movements' 
        AND column_name = 'reference_type'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inventory_movements ADD COLUMN reference_type TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    -- Agregar reference_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_movements' 
        AND column_name = 'reference_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inventory_movements ADD COLUMN reference_id TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    -- Agregar user_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_movements' 
        AND column_name = 'user_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inventory_movements ADD COLUMN user_id UUID;
    END IF;
END $$;

-- 2. Migrar datos existentes de 'type' a 'movement_type'
UPDATE public.inventory_movements 
SET movement_type = CASE 
    WHEN type = 'entrada' THEN 'in'
    WHEN type = 'salida' THEN 'out'
    WHEN type = 'ajuste' THEN 'adjustment'
    ELSE 'in'
END
WHERE movement_type IS NULL;

-- 3. Establecer valores por defecto para reference_type
UPDATE public.inventory_movements 
SET reference_type = 'adjustment'
WHERE reference_type IS NULL;

-- 4. Agregar constraints para movement_type
ALTER TABLE public.inventory_movements 
ADD CONSTRAINT check_movement_type 
CHECK (movement_type IN ('in', 'out', 'adjustment', 'transfer'));

-- 5. Agregar constraints para reference_type
ALTER TABLE public.inventory_movements 
ADD CONSTRAINT check_reference_type 
CHECK (reference_type IN ('purchase', 'sale', 'adjustment', 'transfer', 'return'));

-- 6. Hacer movement_type NOT NULL
ALTER TABLE public.inventory_movements 
ALTER COLUMN movement_type SET NOT NULL;

-- 7. Hacer reference_type NOT NULL
ALTER TABLE public.inventory_movements 
ALTER COLUMN reference_type SET NOT NULL;

-- 8. Eliminar la columna 'type' antigua si existe
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_movements' 
        AND column_name = 'type'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inventory_movements DROP COLUMN type;
    END IF;
END $$;

-- 9. Eliminar la columna 'movement_date' antigua si existe
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_movements' 
        AND column_name = 'movement_date'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inventory_movements DROP COLUMN movement_date;
    END IF;
END $$;

-- 10. Insertar algunos datos de ejemplo para testing
INSERT INTO public.inventory_movements (
    organization_id,
    product_id,
    movement_type,
    quantity,
    reference_type,
    reference_id,
    notes,
    user_id
) VALUES
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', 'in', 10, 'purchase', 'PO-001', 'Compra inicial de stock', NULL),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000012', 'in', 5, 'purchase', 'PO-002', 'Reposición de inventario', NULL),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', 'out', 2, 'sale', 'SO-001', 'Venta a cliente', NULL),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000013', 'adjustment', 1, 'adjustment', NULL, 'Ajuste de inventario por conteo', NULL)
ON CONFLICT DO NOTHING;



