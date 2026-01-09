-- =====================================================
-- LIMPIEZA: Eliminar políticas duplicadas de work_orders
-- =====================================================
-- Este script elimina las políticas antiguas y deja solo
-- las políticas correctas con roles {authenticated}
-- =====================================================

-- PASO 1: ELIMINAR TODAS LAS POLÍTICAS ANTIGUAS (con roles {public} o nombres antiguos)
-- =====================================================
-- Eliminar políticas con nombres antiguos
DROP POLICY IF EXISTS "Users can delete work_orders from their organization" ON public.work_orders;
DROP POLICY IF EXISTS "Users can insert work_orders to their organization" ON public.work_orders;
DROP POLICY IF EXISTS "Users can update work_orders from their organization" ON public.work_orders;
DROP POLICY IF EXISTS "Users can view work_orders from their organization" ON public.work_orders;
DROP POLICY IF EXISTS "Users can insert their organization work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can view their organization work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can update their organization work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can delete their organization work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Enable all for work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "work_orders_access_policy" ON public.work_orders;

-- PASO 2: VERIFICAR QUE LAS POLÍTICAS NUEVAS EXISTEN
-- =====================================================
-- Si no existen, crearlas
DO $$
BEGIN
    -- Verificar y crear INSERT policy si no existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'work_orders' 
        AND policyname = 'work_orders_insert_policy'
    ) THEN
        CREATE POLICY "work_orders_insert_policy" ON public.work_orders
        FOR INSERT
        TO authenticated
        WITH CHECK (
          organization_id IN (
            SELECT organization_id 
            FROM public.users 
            WHERE auth_user_id = auth.uid()
            AND organization_id IS NOT NULL
          )
        );
    END IF;

    -- Verificar y crear SELECT policy si no existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'work_orders' 
        AND policyname = 'work_orders_select_policy'
    ) THEN
        CREATE POLICY "work_orders_select_policy" ON public.work_orders
        FOR SELECT
        TO authenticated
        USING (
          organization_id IN (
            SELECT organization_id 
            FROM public.users 
            WHERE auth_user_id = auth.uid()
            AND organization_id IS NOT NULL
          )
        );
    END IF;

    -- Verificar y crear UPDATE policy si no existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'work_orders' 
        AND policyname = 'work_orders_update_policy'
    ) THEN
        CREATE POLICY "work_orders_update_policy" ON public.work_orders
        FOR UPDATE
        TO authenticated
        USING (
          organization_id IN (
            SELECT organization_id 
            FROM public.users 
            WHERE auth_user_id = auth.uid()
            AND organization_id IS NOT NULL
          )
        )
        WITH CHECK (
          organization_id IN (
            SELECT organization_id 
            FROM public.users 
            WHERE auth_user_id = auth.uid()
            AND organization_id IS NOT NULL
          )
        );
    END IF;

    -- Verificar y crear DELETE policy si no existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'work_orders' 
        AND policyname = 'work_orders_delete_policy'
    ) THEN
        CREATE POLICY "work_orders_delete_policy" ON public.work_orders
        FOR DELETE
        TO authenticated
        USING (
          organization_id IN (
            SELECT organization_id 
            FROM public.users 
            WHERE auth_user_id = auth.uid()
            AND organization_id IS NOT NULL
          )
        );
    END IF;
END $$;

-- PASO 3: VERIFICAR POLÍTICAS FINALES
-- =====================================================
SELECT 
    '✅ POLÍTICAS FINALES' as status,
    policyname,
    cmd,
    roles,
    CASE 
        WHEN qual IS NOT NULL THEN substring(qual, 1, 150)
        ELSE 'Sin USING'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN substring(with_check, 1, 150)
        ELSE 'Sin WITH CHECK'
    END as with_check_clause
FROM pg_policies 
WHERE tablename = 'work_orders'
ORDER BY policyname, cmd;

-- PASO 4: VERIFICAR QUE SOLO HAY 4 POLÍTICAS (una por operación)
-- =====================================================
SELECT 
    CASE 
        WHEN COUNT(*) = 4 THEN '✅ CORRECTO: 4 políticas (una por operación)'
        ELSE '⚠️ ADVERTENCIA: Hay ' || COUNT(*) || ' políticas (deberían ser 4)'
    END as status,
    COUNT(*) as total_policies
FROM pg_policies 
WHERE tablename = 'work_orders';

