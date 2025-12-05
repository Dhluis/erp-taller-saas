-- =====================================================
-- VERIFICACIÓN FINAL COMPLETA - Protección Multi-Tenancy
-- Ejecutar después de la migración 020
-- =====================================================

-- =====================================================
-- 1. VERIFICAR FUNCIONES CREADAS
-- =====================================================
SELECT 
    '1. FUNCIONES' as seccion,
    routine_name as funcion,
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

-- =====================================================
-- 2. VERIFICAR TRIGGERS EN CUSTOMERS
-- =====================================================
SELECT 
    '2. TRIGGERS (customers)' as seccion,
    trigger_name as trigger,
    event_manipulation as evento,
    CASE 
        WHEN trigger_name IS NOT NULL THEN '✅ Activo'
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

-- =====================================================
-- 3. VERIFICAR RLS HABILITADO
-- =====================================================
SELECT 
    '3. RLS (customers)' as seccion,
    tablename as tabla,
    CASE 
        WHEN rowsecurity THEN '✅ Habilitado'
        ELSE '❌ Deshabilitado'
    END as estado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'customers';

-- =====================================================
-- 4. VERIFICAR POLICIES RLS
-- =====================================================
SELECT 
    '4. RLS POLICIES (customers)' as seccion,
    policyname as policy,
    cmd as comando,
    CASE 
        WHEN policyname IS NOT NULL THEN '✅ Activa'
        ELSE '❌ No existe'
    END as estado
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'customers'
ORDER BY policyname;

-- =====================================================
-- 5. VERIFICAR CONSTRAINT NOT NULL
-- =====================================================
SELECT 
    '5. CONSTRAINT (customers.organization_id)' as seccion,
    column_name as columna,
    CASE 
        WHEN is_nullable = 'NO' THEN '✅ NOT NULL'
        ELSE '❌ NULL permitido'
    END as estado
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'customers'
  AND column_name = 'organization_id';

-- =====================================================
-- 6. VERIFICAR TABLA DE AUDITORÍA
-- =====================================================
SELECT 
    '6. TABLA AUDITORÍA' as seccion,
    table_name as tabla,
    CASE 
        WHEN table_name IS NOT NULL THEN '✅ Existe'
        ELSE '❌ No existe'
    END as estado
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'organization_audit_log';

-- =====================================================
-- 7. VERIFICAR DATOS LEGACY
-- =====================================================
SELECT 
    '7. DATOS LEGACY' as seccion,
    table_name,
    total_records,
    records_without_org,
    percentage_without_org,
    CASE 
        WHEN records_without_org = 0 THEN '✅ Sin problemas'
        ELSE '⚠️ Hay datos sin organization_id'
    END as estado
FROM verify_legacy_data()
ORDER BY records_without_org DESC;

-- =====================================================
-- RESUMEN FINAL
-- =====================================================
SELECT 
    '✅ RESUMEN FINAL' as seccion,
    'Protección Multi-Tenancy' as componente,
    CASE 
        WHEN (
            (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN ('verify_legacy_data', 'get_user_organization_id', 'ensure_organization_id_on_insert', 'prevent_organization_id_change')) = 4
            AND (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public' AND event_object_table = 'customers' AND trigger_name IN ('ensure_org_id_customers_insert', 'prevent_org_change_customers')) = 2
            AND (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customers') = true
            AND (SELECT is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'organization_id') = 'NO'
        ) THEN '✅ COMPLETAMENTE PROTEGIDO'
        ELSE '⚠️ Verificar componentes faltantes'
    END as estado;
