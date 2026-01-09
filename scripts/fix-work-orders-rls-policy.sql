-- =====================================================
-- FIX: Política RLS para INSERT en work_orders
-- =====================================================
-- Este script:
-- 1. Muestra las políticas RLS actuales
-- 2. Crea/actualiza la política INSERT correcta
-- 3. Verifica que la función get_user_organization_id() existe
-- =====================================================

-- 1. VER POLÍTICAS RLS ACTUALES
-- =====================================================
SELECT 
    'POLÍTICAS ACTUALES' as info,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'work_orders'
ORDER BY policyname, cmd;

-- 2. VERIFICAR FUNCIÓN get_user_organization_id()
-- =====================================================
SELECT 
    'FUNCIÓN get_user_organization_id' as info,
    routine_name,
    routine_type,
    CASE 
        WHEN routine_definition IS NULL THEN 'No disponible'
        ELSE 'Existe'
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_user_organization_id';

-- 3. ELIMINAR POLÍTICAS EXISTENTES (si existen)
-- =====================================================
DROP POLICY IF EXISTS "work_orders_select_policy" ON public.work_orders;
DROP POLICY IF EXISTS "work_orders_insert_policy" ON public.work_orders;
DROP POLICY IF EXISTS "work_orders_update_policy" ON public.work_orders;
DROP POLICY IF EXISTS "work_orders_delete_policy" ON public.work_orders;
DROP POLICY IF EXISTS "Users can view their organization work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can insert their organization work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can update their organization work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can delete their organization work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Enable all for work_orders" ON public.work_orders;

-- 4. HABILITAR RLS
-- =====================================================
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

-- 5. CREAR POLÍTICAS RLS CORRECTAS
-- =====================================================

-- Política para SELECT: Usuarios pueden ver work_orders de su organización
CREATE POLICY "work_orders_select_policy" ON public.work_orders
FOR SELECT
USING (
    organization_id IN (
        SELECT u.organization_id 
        FROM public.users u
        WHERE u.auth_user_id = auth.uid()
        AND u.organization_id IS NOT NULL
    )
);

-- Política para INSERT: Usuarios pueden insertar work_orders en su organización
-- ✅ IMPORTANTE: La política verifica que organization_id coincida con la del usuario
CREATE POLICY "work_orders_insert_policy" ON public.work_orders
FOR INSERT
WITH CHECK (
    -- Verificar que organization_id coincide con la del usuario autenticado
    organization_id IN (
        SELECT u.organization_id 
        FROM public.users u
        WHERE u.auth_user_id = auth.uid()
        AND u.organization_id IS NOT NULL
    )
    -- ✅ workshop_id puede ser NULL - no se valida en la política
    -- ✅ La política solo verifica organization_id
);

-- Política para UPDATE: Usuarios pueden actualizar work_orders de su organización
CREATE POLICY "work_orders_update_policy" ON public.work_orders
FOR UPDATE
USING (
    organization_id IN (
        SELECT u.organization_id 
        FROM public.users u
        WHERE u.auth_user_id = auth.uid()
        AND u.organization_id IS NOT NULL
    )
)
WITH CHECK (
    organization_id IN (
        SELECT u.organization_id 
        FROM public.users u
        WHERE u.auth_user_id = auth.uid()
        AND u.organization_id IS NOT NULL
    )
);

-- Política para DELETE: Usuarios pueden eliminar work_orders de su organización
CREATE POLICY "work_orders_delete_policy" ON public.work_orders
FOR DELETE
USING (
    organization_id IN (
        SELECT u.organization_id 
        FROM public.users u
        WHERE u.auth_user_id = auth.uid()
        AND u.organization_id IS NOT NULL
    )
);

-- 6. VERIFICAR POLÍTICAS CREADAS
-- =====================================================
SELECT 
    'POLÍTICAS CREADAS' as info,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'work_orders'
ORDER BY policyname, cmd;

-- 7. VERIFICAR ESTRUCTURA DE LA TABLA
-- =====================================================
SELECT 
    'ESTRUCTURA TABLA' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'work_orders'
  AND column_name IN ('organization_id', 'workshop_id', 'customer_id', 'vehicle_id')
ORDER BY ordinal_position;

