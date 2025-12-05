-- =====================================================
-- SCRIPT DE VERIFICACIÓN DE DATOS LEGACY
-- Ejecutar en Supabase SQL Editor para verificar datos sin organization_id
-- =====================================================

-- 1. Verificar datos sin organization_id
SELECT * FROM verify_legacy_data();

-- 2. Ver detalles de customers sin organization_id
SELECT 
    id,
    name,
    email,
    phone,
    created_at,
    created_by,
    (SELECT email FROM users WHERE id = customers.created_by) as creator_email
FROM customers
WHERE organization_id IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- 3. Ver detalles de work_orders sin organization_id
SELECT 
    wo.id,
    wo.order_number,
    wo.status,
    wo.created_at,
    wo.created_by,
    wo.customer_id,
    c.name as customer_name,
    (SELECT email FROM users WHERE id = wo.created_by) as creator_email
FROM work_orders wo
LEFT JOIN customers c ON c.id = wo.customer_id
WHERE wo.organization_id IS NULL
ORDER BY wo.created_at DESC
LIMIT 20;

-- 4. Ver detalles de products sin organization_id
SELECT 
    id,
    name,
    code,
    created_at,
    created_by,
    (SELECT email FROM users WHERE id = products.created_by) as creator_email
FROM products
WHERE organization_id IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- 5. Verificar que existe la organización por defecto
SELECT 
    id,
    name,
    created_at
FROM organizations
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 6. Si no existe, crearla (descomentar para ejecutar)
/*
INSERT INTO organizations (id, name, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Organización por Defecto',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;
*/

