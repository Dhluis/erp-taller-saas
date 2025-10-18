-- =====================================================
-- MIGRACIÓN COMPLETA: IMPLEMENTACIÓN MULTI-TENANT
-- ERP Taller SaaS - Arquitectura Multi-Workshop
-- =====================================================

-- PASO 1: AGREGAR organization_id A WORKSHOPS
-- =====================================================
ALTER TABLE workshops 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- PASO 2: CREAR WORKSHOPS DE DEMO PARA ORGANIZACIÓN EXISTENTE
-- =====================================================
INSERT INTO workshops (id, name, email, phone, address, organization_id, created_at, updated_at) VALUES
('042ab6bd-8979-4166-882a-c244b5e51e51', 'Taller Principal', 'taller@example.com', '555-0123', 'Dirección Principal', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('167b8cbf-fe6d-4e67-93e6-8b000c3ce19f', 'Taller Secundario', 'taller2@example.com', '555-0124', 'Dirección Secundaria', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('00000000-0000-0000-0000-000000000000', 'Taller Demo', 'demo@example.com', '555-0000', 'Dirección Demo', '00000000-0000-0000-0000-000000000001', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  organization_id = EXCLUDED.organization_id,
  updated_at = NOW();

-- PASO 3: ACTUALIZAR work_orders CON workshop_id CORRECTO
-- =====================================================
UPDATE work_orders 
SET workshop_id = (
  SELECT w.id 
  FROM workshops w 
  WHERE w.organization_id = work_orders.organization_id 
  AND w.name = 'Taller Principal'
  LIMIT 1
)
WHERE workshop_id IS NULL 
AND organization_id = '00000000-0000-0000-0000-000000000001';

-- PASO 4: CREAR FUNCIÓN PARA OBTENER ORGANIZATION_ID DESDE WORKSHOP_ID
-- =====================================================
CREATE OR REPLACE FUNCTION get_organization_id_from_user()
RETURNS UUID AS $$
DECLARE
  user_workshop_id UUID;
  org_id UUID;
BEGIN
  -- Obtener workshop_id del usuario autenticado
  SELECT u.workshop_id INTO user_workshop_id
  FROM users u
  WHERE u.auth_user_id = auth.uid();
  
  -- Si no hay usuario autenticado, usar organización demo
  IF user_workshop_id IS NULL THEN
    RETURN '00000000-0000-0000-0000-000000000001'::UUID;
  END IF;
  
  -- Obtener organization_id desde workshop
  SELECT w.organization_id INTO org_id
  FROM workshops w
  WHERE w.id = user_workshop_id;
  
  -- Si no se encuentra, usar organización demo
  IF org_id IS NULL THEN
    RETURN '00000000-0000-0000-0000-000000000001'::UUID;
  END IF;
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 5: CREAR FUNCIÓN PARA OBTENER WORKSHOP_ID DEL USUARIO
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_workshop_id()
RETURNS UUID AS $$
DECLARE
  workshop_id UUID;
BEGIN
  SELECT u.workshop_id INTO workshop_id
  FROM users u
  WHERE u.auth_user_id = auth.uid();
  
  RETURN workshop_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 6: ACTUALIZAR TRIGGERS PARA USAR NUEVA FUNCIÓN
-- =====================================================
CREATE OR REPLACE FUNCTION set_org_and_workshop_from_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Asignar organization_id desde workshop del usuario
  NEW.organization_id = get_organization_id_from_user();
  
  -- Asignar workshop_id si la tabla lo tiene
  IF TG_TABLE_NAME IN ('work_orders', 'customers', 'vehicles') THEN
    NEW.workshop_id = get_user_workshop_id();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 7: RECREAR TRIGGERS CON NUEVA LÓGICA
-- =====================================================
DROP TRIGGER IF EXISTS set_organization_id_work_orders ON work_orders;
DROP TRIGGER IF EXISTS set_organization_id_customers ON customers;
DROP TRIGGER IF EXISTS set_organization_id_vehicles ON vehicles;

CREATE TRIGGER set_org_and_workshop_work_orders
BEFORE INSERT ON work_orders
FOR EACH ROW EXECUTE FUNCTION set_org_and_workshop_from_user();

CREATE TRIGGER set_org_and_workshop_customers
BEFORE INSERT ON customers
FOR EACH ROW EXECUTE FUNCTION set_org_and_workshop_from_user();

CREATE TRIGGER set_org_and_workshop_vehicles
BEFORE INSERT ON vehicles
FOR EACH ROW EXECUTE FUNCTION set_org_and_workshop_from_user();

-- PASO 8: ACTUALIZAR POLÍTICAS RLS PARA USAR NUEVA FUNCIÓN
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own work orders." ON work_orders;
DROP POLICY IF EXISTS "Users can insert their own work orders." ON work_orders;
DROP POLICY IF EXISTS "Users can update their own work orders." ON work_orders;
DROP POLICY IF EXISTS "Users can delete their own work orders." ON work_orders;

CREATE POLICY "Users can view their organization work orders." ON work_orders
FOR SELECT USING (organization_id = get_organization_id_from_user());

CREATE POLICY "Users can insert their organization work orders." ON work_orders
FOR INSERT WITH CHECK (organization_id = get_organization_id_from_user());

CREATE POLICY "Users can update their organization work orders." ON work_orders
FOR UPDATE USING (organization_id = get_organization_id_from_user());

CREATE POLICY "Users can delete their organization work orders." ON work_orders
FOR DELETE USING (organization_id = get_organization_id_from_user());

-- PASO 9: CREAR ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_workshops_organization_id ON workshops(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_workshop_id ON work_orders(workshop_id);
CREATE INDEX IF NOT EXISTS idx_users_workshop_id ON users(workshop_id);

-- PASO 10: VERIFICACIÓN DE INTEGRIDAD
-- =====================================================
-- Verificar que todos los workshops tienen organization_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM workshops WHERE organization_id IS NULL) THEN
    RAISE EXCEPTION 'Hay workshops sin organization_id asignado';
  END IF;
  
  RAISE NOTICE '✅ Todos los workshops tienen organization_id asignado';
END $$;

-- Verificar que todos los usuarios tienen workshop_id válido
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM users u 
    WHERE u.workshop_id IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM workshops w WHERE w.id = u.workshop_id)
  ) THEN
    RAISE EXCEPTION 'Hay usuarios con workshop_id inválido';
  END IF;
  
  RAISE NOTICE '✅ Todos los usuarios tienen workshop_id válido';
END $$;

-- =====================================================
-- FINALIZACIÓN
-- =====================================================
COMMENT ON FUNCTION get_organization_id_from_user() IS 'Obtiene organization_id desde workshop del usuario autenticado';
COMMENT ON FUNCTION get_user_workshop_id() IS 'Obtiene workshop_id del usuario autenticado';
COMMENT ON FUNCTION set_org_and_workshop_from_user() IS 'Asigna organization_id y workshop_id automáticamente en INSERT';

-- Log de finalización
INSERT INTO notifications (organization_id, type, title, message, data) VALUES
('00000000-0000-0000-0000-000000000001', 'info', 'Migración Multi-Tenant Completada', 'La arquitectura multi-workshop ha sido implementada exitosamente', '{"migration": "multi_tenant", "status": "completed"}');



