-- ============================================
-- VERIFICAR Y CORREGIR workshops
-- (La columna organization_id ya existe)
-- ============================================

-- 1. Ver el estado actual de workshops
SELECT 
    id,
    name,
    organization_id,
    CASE 
        WHEN organization_id IS NULL THEN '❌ NULL'
        ELSE '✅ OK'
    END as status
FROM workshops
ORDER BY name;

-- 2. Actualizar workshops que tengan organization_id NULL
UPDATE workshops 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 3. Verificar que todos tengan organization_id
SELECT 
    COUNT(*) as total_workshops,
    COUNT(organization_id) as con_organization_id,
    COUNT(*) - COUNT(organization_id) as sin_organization_id
FROM workshops;

-- 4. Ver workshops actualizados
SELECT 
    id,
    name,
    organization_id,
    created_at
FROM workshops
ORDER BY name;



