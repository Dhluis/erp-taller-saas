-- =====================================================
-- VERIFICACIÓN: Política RLS INSERT de work_orders
-- =====================================================
-- Este script verifica que la política INSERT tiene
-- la condición WITH CHECK correcta
-- =====================================================

-- Ver la política INSERT completa
SELECT 
    'POLÍTICA INSERT' as info,
    policyname,
    cmd,
    roles,
    with_check as with_check_condition
FROM pg_policies 
WHERE tablename = 'work_orders'
  AND cmd = 'INSERT'
  AND policyname = 'work_orders_insert_policy';

-- Verificar que la condición WITH CHECK es correcta
SELECT 
    CASE 
        WHEN with_check LIKE '%organization_id IN (SELECT organization_id FROM public.users WHERE auth_user_id = auth.uid()%' 
        THEN '✅ CORRECTO: La política valida organization_id del usuario'
        ELSE '⚠️ ADVERTENCIA: La condición WITH CHECK puede estar incorrecta'
    END as verification,
    with_check
FROM pg_policies 
WHERE tablename = 'work_orders'
  AND cmd = 'INSERT'
  AND policyname = 'work_orders_insert_policy';

-- Verificar que RLS está habilitado
SELECT 
    'RLS STATUS' as info,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'work_orders';

