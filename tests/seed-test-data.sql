-- =====================================================
-- DATOS DE PRUEBA PARA TESTS DE COTIZACIONES
-- =====================================================
-- Script para insertar datos mínimos necesarios para tests
-- Ejecutar en Supabase SQL Editor ANTES de correr tests
-- =====================================================

-- IDs fijos para tests (cambiar según tu organización)
DO $$ 
DECLARE
    test_org_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
    -- 1. INSERTAR CUSTOMER DE PRUEBA (si no existe)
    INSERT INTO public.customers (
        id,
        organization_id,
        name,
        email,
        phone,
        address,
        created_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000001',
        test_org_id,
        'Test Customer',
        'test@example.com',
        '555-0001',
        'Test Address 123',
        NOW()
    ) ON CONFLICT (id) DO NOTHING;

    -- 2. INSERTAR VEHICLE DE PRUEBA (si no existe)
    INSERT INTO public.vehicles (
        id,
        organization_id,
        customer_id,
        brand,
        model,
        year,
        license_plate,
        vin,
        created_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000002',
        test_org_id,
        '00000000-0000-0000-0000-000000000001',
        'Toyota',
        'Corolla',
        2020,
        'TEST-001',
        'TEST1234567890VIN',
        NOW()
    ) ON CONFLICT (id) DO NOTHING;

    -- 3. INSERTAR PRODUCT DE PRUEBA (si no existe)
    INSERT INTO public.products (
        id,
        organization_id,
        code,
        name,
        description,
        type,
        price,
        stock_quantity,
        min_stock,
        is_active,
        created_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000003',
        test_org_id,
        'TEST-PROD-001',
        'Test Product - Filtro de Aceite',
        'Filtro de aceite para tests',
        'product',
        150.00,
        100,
        10,
        true,
        NOW()
    ) ON CONFLICT (id) DO NOTHING;

    -- 4. INSERTAR SERVICE DE PRUEBA (si no existe)
    INSERT INTO public.services (
        id,
        organization_id,
        code,
        name,
        description,
        category,
        base_price,
        estimated_duration,
        is_active,
        created_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000004',
        test_org_id,
        'TEST-SRV-001',
        'Test Service - Cambio de Aceite',
        'Cambio de aceite para tests',
        'Mantenimiento',
        500.00,
        30,
        true,
        NOW()
    ) ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE '✅ Datos de prueba insertados correctamente';
END $$;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Verificar que los datos se insertaron
SELECT 
    'customers' as table_name,
    COUNT(*) as count
FROM public.customers
WHERE id = '00000000-0000-0000-0000-000000000001'

UNION ALL

SELECT 
    'vehicles' as table_name,
    COUNT(*) as count
FROM public.vehicles
WHERE id = '00000000-0000-0000-0000-000000000002'

UNION ALL

SELECT 
    'products' as table_name,
    COUNT(*) as count
FROM public.products
WHERE id = '00000000-0000-0000-0000-000000000003'

UNION ALL

SELECT 
    'services' as table_name,
    COUNT(*) as count
FROM public.services
WHERE id = '00000000-0000-0000-0000-000000000004';

-- =====================================================
-- LIMPIEZA (Opcional - Descomentar para limpiar tests)
-- =====================================================

-- DELETE FROM public.quotation_items WHERE quotation_id IN (
--     SELECT id FROM public.quotations WHERE quotation_number LIKE 'Q-%-TEST'
-- );

-- DELETE FROM public.quotations WHERE quotation_number LIKE 'Q-%-TEST';

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================


