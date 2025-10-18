-- CORRECCIÓN URGENTE: Agregar columna is_active a inventory_categories
-- Ejecutar este script en el SQL Editor de Supabase

-- =====================================================
-- 1. AGREGAR COLUMNA is_active A inventory_categories
-- =====================================================

-- Verificar si la columna is_active existe
DO $$ 
BEGIN
    -- Agregar columna is_active si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_categories' 
        AND column_name = 'is_active'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inventory_categories 
        ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        
        -- Actualizar registros existentes
        UPDATE public.inventory_categories 
        SET is_active = TRUE 
        WHERE is_active IS NULL;
        
        -- Hacer la columna NOT NULL
        ALTER TABLE public.inventory_categories 
        ALTER COLUMN is_active SET NOT NULL;
        
        RAISE NOTICE '✅ Columna is_active agregada a inventory_categories';
    ELSE
        RAISE NOTICE 'ℹ️ Columna is_active ya existe en inventory_categories';
    END IF;
END $$;

-- =====================================================
-- 2. AGREGAR COLUMNA is_active A inventory (si no existe)
-- =====================================================

DO $$ 
BEGIN
    -- Agregar columna is_active si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory' 
        AND column_name = 'is_active'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inventory 
        ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        
        -- Actualizar registros existentes
        UPDATE public.inventory 
        SET is_active = TRUE 
        WHERE is_active IS NULL;
        
        -- Hacer la columna NOT NULL
        ALTER TABLE public.inventory 
        ALTER COLUMN is_active SET NOT NULL;
        
        RAISE NOTICE '✅ Columna is_active agregada a inventory';
    ELSE
        RAISE NOTICE 'ℹ️ Columna is_active ya existe en inventory';
    END IF;
END $$;

-- =====================================================
-- 3. INSERTAR DATOS DE PRUEBA PARA CATEGORÍAS
-- =====================================================

-- Insertar categorías de inventario de prueba
INSERT INTO public.inventory_categories (
    id,
    organization_id,
    name,
    description,
    status,
    is_active
) VALUES
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'Filtros', 'Filtros de aire, aceite, combustible', 'active', TRUE),
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'Aceites', 'Aceites de motor, transmisión, diferencial', 'active', TRUE),
    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'Frenos', 'Pastillas, discos, líquido de frenos', 'active', TRUE),
    ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'Baterías', 'Baterías automotrices', 'active', TRUE),
    ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'Llantas', 'Llantas y neumáticos', 'active', TRUE)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 4. INSERTAR PRODUCTOS DE PRUEBA
-- =====================================================

-- Insertar productos de inventario de prueba
INSERT INTO public.inventory (
    id,
    organization_id,
    category_id,
    name,
    description,
    quantity,
    min_quantity,
    unit_price,
    category,
    is_active
) VALUES
    ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'Filtro de Aire Toyota Corolla', 'Filtro de aire para Toyota Corolla 2015-2020', 25, 5, 450.00, 'Filtros', TRUE),
    ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'Filtro de Aceite Genérico', 'Filtro de aceite universal', 50, 10, 120.00, 'Filtros', TRUE),
    ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'Aceite 5W-30 Mobil', 'Aceite sintético 5W-30 1 litro', 30, 8, 280.00, 'Aceites', TRUE),
    ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000003', 'Pastillas de Freno Delanteras', 'Pastillas de freno delanteras universales', 15, 5, 850.00, 'Frenos', TRUE),
    ('00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000004', 'Batería 12V 70Ah', 'Batería automotriz 12V 70Ah', 8, 3, 2800.00, 'Baterías', TRUE)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 5. VERIFICAR CORRECCIÓN
-- =====================================================

-- Verificar que las columnas se agregaron correctamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('inventory_categories', 'inventory')
AND column_name = 'is_active'
AND table_schema = 'public'
ORDER BY table_name;

-- Verificar datos insertados
SELECT 'inventory_categories' as table_name, COUNT(*) as record_count FROM public.inventory_categories
UNION ALL
SELECT 'inventory' as table_name, COUNT(*) as record_count FROM public.inventory;

-- Mostrar categorías creadas
SELECT id, name, description, status, is_active 
FROM public.inventory_categories 
WHERE organization_id = '00000000-0000-0000-0000-000000000000'
ORDER BY name;

-- =====================================================
-- 6. MENSAJE DE ÉXITO
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ CORRECCIÓN COMPLETADA EXITOSAMENTE';
    RAISE NOTICE '📊 Columna is_active agregada a inventory_categories e inventory';
    RAISE NOTICE '📝 Datos de prueba insertados: 5 categorías y 5 productos';
    RAISE NOTICE '🎯 Módulo de inventario listo para pruebas';
END $$;
