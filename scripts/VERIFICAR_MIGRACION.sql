-- =====================================================
-- SCRIPT: Verificar si la migración se ejecutó correctamente
-- =====================================================

-- Verificar si las funciones existen
SELECT 
    'Funciones' as tipo,
    routine_name as nombre,
    CASE 
        WHEN routine_name IS NOT NULL THEN '✅ Existe'
        ELSE '❌ No existe'
    END as estado
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'verify_legacy_data',
    'fix_legacy_organization_id',
    'get_user_organization_id',
    'ensure_organization_id_on_insert',
    'prevent_organization_id_change',
    'log_organization_change'
  )
ORDER BY routine_name;

-- Verificar si los triggers existen
SELECT 
    'Triggers' as tipo,
    trigger_name as nombre,
    event_object_table as tabla,
    CASE 
        WHEN trigger_name IS NOT NULL THEN '✅ Existe'
        ELSE '❌ No existe'
    END as estado
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table = 'customers'
  AND trigger_name IN (
    'ensure_org_id_customers_insert',
    'prevent_org_change_customers',
    'audit_org_change_customers'
  )
ORDER BY trigger_name;

-- Verificar si RLS está habilitado
SELECT 
    'RLS' as tipo,
    tablename as nombre,
    CASE 
        WHEN rowsecurity THEN '✅ Habilitado'
        ELSE '❌ Deshabilitado'
    END as estado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'customers';

-- Verificar si organization_id es NOT NULL
SELECT 
    'Constraint' as tipo,
    column_name as nombre,
    CASE 
        WHEN is_nullable = 'NO' THEN '✅ NOT NULL'
        ELSE '❌ NULL permitido'
    END as estado
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'customers'
  AND column_name = 'organization_id';

-- Verificar si la tabla de auditoría existe
SELECT 
    'Tabla' as tipo,
    table_name as nombre,
    CASE 
        WHEN table_name IS NOT NULL THEN '✅ Existe'
        ELSE '❌ No existe'
    END as estado
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'organization_audit_log';
