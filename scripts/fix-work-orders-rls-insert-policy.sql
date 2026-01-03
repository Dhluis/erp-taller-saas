-- =====================================================
-- FIX: Política RLS INSERT para work_orders
-- =====================================================
-- Este script corrige la política RLS de INSERT para permitir
-- que usuarios autenticados inserten work_orders en su organización
-- =====================================================

-- PASO 1: ELIMINAR POLÍTICAS EXISTENTES (si existen)
-- =====================================================
DROP POLICY IF EXISTS "work_orders_insert_policy" ON public.work_orders;
DROP POLICY IF EXISTS "work_orders_select_policy" ON public.work_orders;
DROP POLICY IF EXISTS "work_orders_update_policy" ON public.work_orders;
DROP POLICY IF EXISTS "work_orders_delete_policy" ON public.work_orders;
DROP POLICY IF EXISTS "Users can insert their organization work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can view their organization work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can update their organization work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can delete their organization work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Enable all for work_orders" ON public.work_orders;

-- PASO 2: HABILITAR RLS (si no está habilitado)
-- =====================================================
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

-- PASO 3: CREAR POLÍTICA RLS PARA INSERT
-- =====================================================
-- ✅ Esta política permite INSERT cuando:
--    - El usuario está autenticado (TO authenticated)
--    - El organization_id del registro coincide con el organization_id del usuario
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

-- PASO 4: CREAR POLÍTICAS PARA SELECT, UPDATE, DELETE (completitud)
-- =====================================================

-- SELECT: Usuarios pueden ver work_orders de su organización
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

-- UPDATE: Usuarios pueden actualizar work_orders de su organización
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

-- DELETE: Usuarios pueden eliminar work_orders de su organización
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

-- PASO 5: VERIFICAR POLÍTICAS CREADAS
-- =====================================================
SELECT 
    '✅ POLÍTICAS CREADAS' as status,
    policyname,
    cmd,
    roles,
    CASE 
        WHEN qual IS NOT NULL THEN 'USING: ' || substring(qual, 1, 100)
        ELSE 'Sin USING'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || substring(with_check, 1, 100)
        ELSE 'Sin WITH CHECK'
    END as with_check_clause
FROM pg_policies 
WHERE tablename = 'work_orders'
ORDER BY policyname, cmd;

-- PASO 6: VERIFICAR QUE RLS ESTÁ HABILITADO
-- =====================================================
SELECT 
    '✅ RLS STATUS' as status,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'work_orders';

