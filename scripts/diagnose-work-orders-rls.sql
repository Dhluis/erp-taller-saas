-- =====================================================
-- DIAGNÓSTICO: Políticas RLS para work_orders
-- =====================================================
-- Este script muestra:
-- 1. Las políticas RLS actuales para work_orders
-- 2. La estructura de la tabla work_orders
-- 3. Qué campos son requeridos vs opcionales
-- =====================================================

-- 1. VER POLÍTICAS RLS ACTUALES
-- =====================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'work_orders'
ORDER BY policyname, cmd;

-- 2. VER ESTRUCTURA DE LA TABLA work_orders
-- =====================================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'work_orders'
ORDER BY ordinal_position;

-- 3. VER FUNCIÓN get_user_organization_id()
-- =====================================================
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_user_organization_id';

-- 4. VERIFICAR SI RLS ESTÁ HABILITADO
-- =====================================================
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'work_orders';

-- 5. VER TRIGGERS EN work_orders
-- =====================================================
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'work_orders'
ORDER BY trigger_name;

-- 6. VER EJEMPLO DE DATOS QUE SE INTENTAN INSERTAR
-- =====================================================
-- Esto muestra la estructura esperada basada en el código
-- Campos que el código intenta insertar:
-- - organization_id (requerido, viene del usuario autenticado)
-- - customer_id (requerido)
-- - vehicle_id (requerido)
-- - description (requerido)
-- - workshop_id (opcional, puede ser NULL)
-- - status (opcional, default 'pending')
-- - subtotal (default 0)
-- - tax_amount (default 0)
-- - discount_amount (default 0)
-- - total_amount (opcional, default 0)
-- - assigned_to (opcional)
-- - estimated_completion (opcional)

