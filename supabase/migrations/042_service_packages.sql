-- ============================================================
-- Migration 042: Service Packages Module (Paquetes de Servicio)
-- Eagles ERP - Catálogo de paquetes y líneas de servicio en órdenes
-- ============================================================
-- Referencia: docs/DEVELOPER_GUIDE.md (RLS multi-tenant)
-- Tabla de inventario del proyecto: public.inventory (no inventory_items)
-- ============================================================

-- ==========================================
-- 1. TABLA: service_packages
-- Catálogo de paquetes predefinidos por organización
-- ==========================================

CREATE TABLE IF NOT EXISTS public.service_packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  estimated_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_service_packages_org
  ON public.service_packages(organization_id)
  WHERE deleted_at IS NULL;

-- ==========================================
-- 2. TABLA: service_package_items
-- "Receta": qué productos del inventario usa cada paquete
-- FK a public.inventory (nombre real en el proyecto)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.service_package_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  service_package_id UUID NOT NULL
    REFERENCES public.service_packages(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL
    REFERENCES public.inventory(id) ON DELETE RESTRICT,
  quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_package_items_package
  ON public.service_package_items(service_package_id);

CREATE INDEX IF NOT EXISTS idx_service_package_items_org
  ON public.service_package_items(organization_id);

-- ==========================================
-- 3. TABLA: work_order_services
-- Servicios/conceptos agregados a cada orden de trabajo
-- ==========================================

CREATE TABLE IF NOT EXISTS public.work_order_services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL
    REFERENCES public.work_orders(id) ON DELETE CASCADE,

  line_type TEXT NOT NULL CHECK (
    line_type IN ('package', 'free_service', 'loose_product')
  ),

  service_package_id UUID
    REFERENCES public.service_packages(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  description TEXT,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
  total_price DECIMAL(10,2) GENERATED ALWAYS AS
    (unit_price * quantity) STORED,

  inventory_deducted BOOLEAN DEFAULT false,
  inventory_deducted_at TIMESTAMPTZ,

  inventory_item_id UUID
    REFERENCES public.inventory(id) ON DELETE SET NULL,

  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_order_services_order
  ON public.work_order_services(work_order_id);

CREATE INDEX IF NOT EXISTS idx_work_order_services_org
  ON public.work_order_services(organization_id);

-- ==========================================
-- 4. RLS - service_packages
-- Patrón: organization_id IN (SELECT organization_id FROM users WHERE auth_user_id = auth.uid())
-- ==========================================

ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_packages_select" ON public.service_packages;
CREATE POLICY "service_packages_select" ON public.service_packages
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "service_packages_insert" ON public.service_packages;
CREATE POLICY "service_packages_insert" ON public.service_packages
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "service_packages_update" ON public.service_packages;
CREATE POLICY "service_packages_update" ON public.service_packages
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "service_packages_delete" ON public.service_packages;
CREATE POLICY "service_packages_delete" ON public.service_packages
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE auth_user_id = auth.uid()
    )
  );

-- ==========================================
-- 5. RLS - service_package_items
-- ==========================================

ALTER TABLE public.service_package_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_package_items_select" ON public.service_package_items;
CREATE POLICY "service_package_items_select" ON public.service_package_items
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "service_package_items_insert" ON public.service_package_items;
CREATE POLICY "service_package_items_insert" ON public.service_package_items
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "service_package_items_update" ON public.service_package_items;
CREATE POLICY "service_package_items_update" ON public.service_package_items
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "service_package_items_delete" ON public.service_package_items;
CREATE POLICY "service_package_items_delete" ON public.service_package_items
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE auth_user_id = auth.uid()
    )
  );

-- ==========================================
-- 6. RLS - work_order_services
-- ==========================================

ALTER TABLE public.work_order_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "work_order_services_select" ON public.work_order_services;
CREATE POLICY "work_order_services_select" ON public.work_order_services
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "work_order_services_insert" ON public.work_order_services;
CREATE POLICY "work_order_services_insert" ON public.work_order_services
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "work_order_services_update" ON public.work_order_services;
CREATE POLICY "work_order_services_update" ON public.work_order_services
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "work_order_services_delete" ON public.work_order_services;
CREATE POLICY "work_order_services_delete" ON public.work_order_services
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE auth_user_id = auth.uid()
    )
  );

-- ==========================================
-- 7. VERIFICACIÓN
-- ==========================================

-- Verificar tablas creadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'service_packages',
    'service_package_items',
    'work_order_services'
  );

-- Verificar columnas de work_order_services
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'work_order_services'
ORDER BY ordinal_position;

-- Verificar RLS habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'service_packages',
    'service_package_items',
    'work_order_services'
  );
