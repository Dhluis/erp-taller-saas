-- =====================================================
-- MIGRACIÓN SIMPLE: AGREGAR organization_id A WORKSHOPS
-- Ejecutar directamente en el SQL Editor de Supabase
-- =====================================================

-- PASO 1: Agregar columna organization_id a workshops
ALTER TABLE workshops 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- PASO 2: Crear workshops de demo con organization_id
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

-- PASO 3: Verificar resultados
SELECT 'WORKSHOPS CREADOS:' as status;
SELECT id, name, organization_id FROM workshops ORDER BY name;

SELECT 'WORK_ORDERS CON WORKSHOP_ID:' as status;
SELECT id, organization_id, workshop_id, status FROM work_orders LIMIT 5;

SELECT 'USUARIOS Y SUS WORKSHOPS:' as status;
SELECT id, full_name, workshop_id FROM users LIMIT 3;












