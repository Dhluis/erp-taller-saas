-- =====================================================
-- FIX: Políticas RLS para tablas de órdenes de trabajo
-- =====================================================
-- Este script corrige las políticas de seguridad para las tablas
-- relacionadas con work_orders para que funcionen correctamente

-- 1. WORK_ORDERS - Eliminar política insegura y crear una correcta
DROP POLICY IF EXISTS "Enable all for work_orders" ON public.work_orders;
CREATE POLICY "work_orders_access_policy" ON public.work_orders
FOR ALL
USING (
  workshop_id IN (
    SELECT u.workshop_id 
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  workshop_id IN (
    SELECT u.workshop_id 
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
  )
);

-- 2. ORDER_ITEMS - Crear política para order_items
DROP POLICY IF EXISTS "Enable all for order_items" ON public.order_items;
CREATE POLICY "order_items_access_policy" ON public.order_items
FOR ALL
USING (
  workshop_id IN (
    SELECT u.workshop_id 
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  workshop_id IN (
    SELECT u.workshop_id 
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
  )
);

-- 3. CUSTOMERS - Crear política para customers
DROP POLICY IF EXISTS "Enable all for customers" ON public.customers;
CREATE POLICY "customers_access_policy" ON public.customers
FOR ALL
USING (
  workshop_id IN (
    SELECT u.workshop_id 
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  workshop_id IN (
    SELECT u.workshop_id 
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
  )
);

-- 4. VEHICLES - Crear política para vehicles
DROP POLICY IF EXISTS "Enable all for vehicles" ON public.vehicles;
CREATE POLICY "vehicles_access_policy" ON public.vehicles
FOR ALL
USING (
  workshop_id IN (
    SELECT u.workshop_id 
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  workshop_id IN (
    SELECT u.workshop_id 
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
  )
);

-- 5. Asegurar que RLS está habilitado en todas las tablas
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- 6. Comentarios para documentación
COMMENT ON POLICY "work_orders_access_policy" ON public.work_orders IS 
'Permite a los usuarios acceder a órdenes de trabajo de su workshop';
COMMENT ON POLICY "order_items_access_policy" ON public.order_items IS 
'Permite a los usuarios acceder a items de órdenes de su workshop';
COMMENT ON POLICY "customers_access_policy" ON public.customers IS 
'Permite a los usuarios acceder a clientes de su workshop';
COMMENT ON POLICY "vehicles_access_policy" ON public.vehicles IS 
'Permite a los usuarios acceder a vehículos de su workshop';

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Puedes ejecutar estas consultas para verificar:

-- Ver las políticas actuales:
-- SELECT tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename IN ('work_orders', 'order_items', 'customers', 'vehicles')
-- ORDER BY tablename, policyname;

-- Ver si RLS está habilitado:
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename IN ('work_orders', 'order_items', 'customers', 'vehicles')
-- ORDER BY tablename;

