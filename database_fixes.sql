-- =====================================================
-- SCRIPTS SQL PARA CORRECCIONES DE AUDITORÍA ERP
-- =====================================================
-- Fecha: 2025-01-03
-- Propósito: Corregir inconsistencias identificadas en la auditoría

-- =====================================================
-- 1. VERIFICAR ESQUEMA ACTUAL
-- =====================================================

-- Verificar columnas de la tabla inventory_items
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'inventory_items'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar columnas de la tabla vehicles
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'vehicles'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar columnas de la tabla work_orders
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'work_orders'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- 2. CORRECCIONES DE ESQUEMA (SI SE NECESITAN)
-- =====================================================

-- NOTA: Las siguientes correcciones solo se ejecutarán si es necesario
-- Verificar primero el esquema actual antes de aplicar cambios

-- Si la tabla inventory_items tiene 'minimum_stock' en lugar de 'min_quantity'
-- ALTER TABLE inventory_items RENAME COLUMN minimum_stock TO min_quantity;

-- Si la tabla vehicles tiene 'make' en lugar de 'brand'
-- ALTER TABLE vehicles RENAME COLUMN make TO brand;

-- Si la tabla work_orders tiene 'customer_name' (campo que no debería existir)
-- ALTER TABLE work_orders DROP COLUMN IF EXISTS customer_name;

-- =====================================================
-- 3. VERIFICAR RELACIONES
-- =====================================================

-- Verificar foreign keys
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- =====================================================
-- 4. VERIFICAR DATOS DE ORGANIZACIÓN
-- =====================================================

-- Verificar que existe la organización por defecto
SELECT id, name FROM organizations 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Si no existe, crearla
-- INSERT INTO organizations (id, name, created_at, updated_at)
-- VALUES ('00000000-0000-0000-0000-000000000001', 'Organización por Defecto', NOW(), NOW())
-- ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 5. VERIFICAR ÍNDICES
-- =====================================================

-- Verificar índices existentes
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- =====================================================
-- 6. LIMPIAR DATOS INCONSISTENTES (SI ES NECESARIO)
-- =====================================================

-- Verificar registros con organization_id inconsistente
SELECT COUNT(*) as total_records,
       COUNT(CASE WHEN organization_id = '00000000-0000-0000-0000-000000000001' THEN 1 END) as correct_org,
       COUNT(CASE WHEN organization_id = 'temp-org-123' THEN 1 END) as temp_org
FROM customers;

-- Si hay registros con 'temp-org-123', actualizarlos
-- UPDATE customers 
-- SET organization_id = '00000000-0000-0000-0000-000000000001'
-- WHERE organization_id = 'temp-org-123';

-- UPDATE vehicles 
-- SET organization_id = '00000000-0000-0000-0000-000000000001'
-- WHERE organization_id = 'temp-org-123';

-- UPDATE work_orders 
-- SET organization_id = '00000000-0000-0000-0000-000000000001'
-- WHERE organization_id = 'temp-org-123';

-- =====================================================
-- 7. VERIFICAR RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- 8. SCRIPT DE VERIFICACIÓN FINAL
-- =====================================================

-- Verificar que todas las correcciones se aplicaron correctamente
DO $$
DECLARE
    inventory_columns TEXT;
    vehicle_columns TEXT;
    work_order_columns TEXT;
BEGIN
    -- Verificar inventory_items
    SELECT string_agg(column_name, ', ') INTO inventory_columns
    FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND table_schema = 'public';
    
    -- Verificar vehicles
    SELECT string_agg(column_name, ', ') INTO vehicle_columns
    FROM information_schema.columns
    WHERE table_name = 'vehicles' AND table_schema = 'public';
    
    -- Verificar work_orders
    SELECT string_agg(column_name, ', ') INTO work_order_columns
    FROM information_schema.columns
    WHERE table_name = 'work_orders' AND table_schema = 'public';
    
    RAISE NOTICE 'Columnas inventory_items: %', inventory_columns;
    RAISE NOTICE 'Columnas vehicles: %', vehicle_columns;
    RAISE NOTICE 'Columnas work_orders: %', work_order_columns;
    
    -- Verificar que no existen campos problemáticos
    IF inventory_columns LIKE '%minimum_stock%' THEN
        RAISE WARNING 'Campo minimum_stock encontrado en inventory_items - requiere corrección';
    END IF;
    
    IF vehicle_columns LIKE '%make%' THEN
        RAISE WARNING 'Campo make encontrado en vehicles - requiere corrección';
    END IF;
    
    IF work_order_columns LIKE '%customer_name%' THEN
        RAISE WARNING 'Campo customer_name encontrado en work_orders - requiere corrección';
    END IF;
    
    RAISE NOTICE 'Verificación completada';
END $$;

-- =====================================================
-- INSTRUCCIONES DE USO
-- =====================================================

/*
INSTRUCCIONES PARA APLICAR ESTOS SCRIPTS:

1. CONECTAR A SUPABASE:
   - Abrir Supabase Dashboard
   - Ir a SQL Editor
   - Crear nueva query

2. EJECUTAR VERIFICACIONES:
   - Ejecutar sección 1 para verificar esquema actual
   - Revisar resultados

3. APLICAR CORRECCIONES (SI ES NECESARIO):
   - Descomentar y ejecutar las líneas de ALTER TABLE si se requieren
   - Ejecutar sección 4 para crear organización por defecto si no existe
   - Ejecutar sección 6 para limpiar datos inconsistentes

4. VERIFICAR RESULTADOS:
   - Ejecutar sección 8 para verificación final
   - Revisar warnings y notices

5. BACKUP ANTES DE CAMBIOS:
   - Siempre hacer backup antes de ejecutar ALTER TABLE
   - Probar en ambiente de desarrollo primero

NOTAS IMPORTANTES:
- Estos scripts son de corrección, no de migración inicial
- Verificar el esquema actual antes de aplicar cambios
- Hacer backup de la base de datos antes de cambios estructurales
- Probar en ambiente de desarrollo primero
*/













