-- =====================================================
-- SCRIPT DE CORRECCIÓN: Mover Clientes a Organización Correcta
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PASO 1: Verificar Organización del Usuario Actual
-- =====================================================
SELECT 
    '👤 PASO 1: Organización del Usuario Actual' as paso,
    u.email,
    u.organization_id as user_org_id,
    u.workshop_id,
    w.organization_id as workshop_org_id,
    COALESCE(u.organization_id, w.organization_id) as org_id_final,
    o.name as nombre_organizacion_final
FROM users u
LEFT JOIN workshops w ON w.id = u.workshop_id
LEFT JOIN organizations o ON o.id = COALESCE(u.organization_id, w.organization_id)
WHERE u.auth_user_id = auth.uid()
LIMIT 1;

-- =====================================================
-- PASO 2: Verificar Clientes Antes de Mover
-- =====================================================
SELECT 
    '📋 PASO 2: Estado Actual de los Clientes' as paso,
    c.name as cliente,
    c.organization_id as org_actual,
    o.name as organizacion_actual,
    CASE 
        WHEN c.organization_id = '042ab6bd-8979-4166-882a-c244b5e51e51' THEN '✅ En Xpandifai (correcta)'
        WHEN c.organization_id = '00000000-0000-0000-0000-000000000001' THEN '⚠️ En Taller Eagles System Demo (mover a Xpandifai)'
        ELSE '❓ Otra organización'
    END as estado
FROM customers c
LEFT JOIN organizations o ON o.id = c.organization_id
WHERE c.name IN (
    'Mario Pérez Serás',
    'Chano Prado',
    'Domingo López',
    'Orbelin Pineda',
    'Raul Jimenez',
    'Chopon Chopon',
    'PONCHIS'
)
ORDER BY c.organization_id, c.name;

-- =====================================================
-- PASO 3: Mover Clientes del Buscador a Xpandifai
-- IMPORTANTE: Revisa los resultados del PASO 1 antes de ejecutar
-- =====================================================

-- ⚠️ DESCOMENTAR Y EJECUTAR SOLO DESPUÉS DE VERIFICAR EL PASO 1
-- ⚠️ Asegúrate de que tu organización es "Xpandifai" (042ab6bd-8979-4166-882a-c244b5e51e51)

/*
UPDATE customers
SET organization_id = '042ab6bd-8979-4166-882a-c244b5e51e51'::UUID
WHERE name IN ('Chopon Chopon', 'PONCHIS')
  AND organization_id = '00000000-0000-0000-0000-000000000001'::UUID;

-- Verificar que se movieron correctamente
SELECT 
    '✅ Verificación: Clientes Movidos' as paso,
    c.name as cliente,
    c.organization_id,
    o.name as organizacion
FROM customers c
LEFT JOIN organizations o ON o.id = c.organization_id
WHERE c.name IN ('Chopon Chopon', 'PONCHIS')
ORDER BY c.name;
*/

-- =====================================================
-- ALTERNATIVA: Si quieres mover TODOS los clientes a Xpandifai
-- =====================================================

-- ⚠️ SOLO EJECUTAR SI ESTÁS SEGURO
-- ⚠️ Esto moverá TODOS los clientes de estos 7 a Xpandifai

/*
UPDATE customers
SET organization_id = '042ab6bd-8979-4166-882a-c244b5e51e51'::UUID
WHERE name IN (
    'Mario Pérez Serás',
    'Chano Prado',
    'Domingo López',
    'Orbelin Pineda',
    'Raul Jimenez',
    'Chopon Chopon',
    'PONCHIS'
);

-- Verificar que todos están en Xpandifai
SELECT 
    '✅ Verificación Final: Todos en Xpandifai' as paso,
    c.name as cliente,
    c.organization_id,
    o.name as organizacion
FROM customers c
LEFT JOIN organizations o ON o.id = c.organization_id
WHERE c.name IN (
    'Mario Pérez Serás',
    'Chano Prado',
    'Domingo López',
    'Orbelin Pineda',
    'Raul Jimenez',
    'Chopon Chopon',
    'PONCHIS'
)
ORDER BY c.name;
*/

-- =====================================================
-- NOTA IMPORTANTE
-- =====================================================
-- 
-- Este script tiene 3 pasos:
-- 1. Verifica tu organización actual
-- 2. Muestra el estado actual de los clientes
-- 3. Tiene el UPDATE comentado para que lo ejecutes manualmente
--
-- INSTRUCCIONES:
-- 1. Ejecuta el script completo primero (PASO 1 y PASO 2)
-- 2. Revisa los resultados
-- 3. Si tu organización es "Xpandifai", descomenta y ejecuta el UPDATE del PASO 3
-- 4. Verifica que los clientes se movieron correctamente
--
-- =====================================================

