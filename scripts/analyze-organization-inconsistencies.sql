-- =====================================================
-- ANÁLISIS COMPLETO DE INCONSISTENCIAS DE ORGANIZACIÓN
-- Este script ayuda a identificar por qué hay inconsistencias
-- =====================================================

-- =====================================================
-- 1. VERIFICAR TODAS LAS ORGANIZACIONES EXISTENTES
-- =====================================================
SELECT 
    '=== ORGANIZACIONES EN EL SISTEMA ===' as seccion;

SELECT 
    id,
    name,
    created_at,
    (SELECT COUNT(*) FROM customers WHERE organization_id = o.id) as total_clientes
FROM organizations o
ORDER BY created_at;

-- =====================================================
-- 2. CLIENTES POR ORGANIZACIÓN
-- =====================================================
SELECT 
    '=== DISTRIBUCIÓN DE CLIENTES POR ORGANIZACIÓN ===' as seccion;

SELECT 
    COALESCE(o.name, 'SIN ORGANIZACIÓN') as organizacion,
    COUNT(*) as total_clientes,
    STRING_AGG(c.name, ', ' ORDER BY c.name) as nombres
FROM customers c
LEFT JOIN organizations o ON o.id = c.organization_id
GROUP BY o.id, o.name
ORDER BY total_clientes DESC;

-- =====================================================
-- 3. CLIENTES ESPECÍFICOS DE LAS CAPTURAS
-- =====================================================
SELECT 
    '=== CLIENTES ESPECÍFICOS: CAPTURA 1 ===' as seccion;

SELECT 
    c.name,
    c.phone,
    c.email,
    c.organization_id,
    o.name as organizacion,
    CASE 
        WHEN c.organization_id IS NULL THEN '❌ SIN ORGANIZACIÓN'
        ELSE '✅ CON ORGANIZACIÓN'
    END as estado
FROM customers c
LEFT JOIN organizations o ON o.id = c.organization_id
WHERE c.name IN (
    'Mario Pérez Serás',
    'Chano Prado',
    'Domingo López',
    'Orbelin Pineda',
    'Raul Jimenez'
)
ORDER BY c.name;

SELECT 
    '=== CLIENTES ESPECÍFICOS: CAPTURA 2 (Buscador) ===' as seccion;

SELECT 
    c.name,
    c.phone,
    c.email,
    c.organization_id,
    o.name as organizacion,
    CASE 
        WHEN c.organization_id IS NULL THEN '❌ SIN ORGANIZACIÓN'
        ELSE '✅ CON ORGANIZACIÓN'
    END as estado
FROM customers c
LEFT JOIN organizations o ON o.id = c.organization_id
WHERE c.name ILIKE '%Chopon%' 
   OR c.name ILIKE '%PONCHIS%'
   OR c.phone IN ('8866555222', '44655464646')
ORDER BY c.name;

-- =====================================================
-- 4. VERIFICAR SI HAY CLIENTES DUPLICADOS EN DIFERENTES ORGS
-- =====================================================
SELECT 
    '=== POSIBLES DUPLICADOS (Mismo nombre, diferente org) ===' as seccion;

SELECT 
    c1.name,
    c1.phone,
    c1.organization_id as org_1,
    o1.name as nombre_org_1,
    c2.organization_id as org_2,
    o2.name as nombre_org_2
FROM customers c1
JOIN customers c2 ON c1.name = c2.name AND c1.id != c2.id
LEFT JOIN organizations o1 ON o1.id = c1.organization_id
LEFT JOIN organizations o2 ON o2.id = c2.organization_id
WHERE c1.organization_id IS DISTINCT FROM c2.organization_id
ORDER BY c1.name;

-- =====================================================
-- 5. VERIFICAR USUARIOS Y SUS ORGANIZACIONES
-- =====================================================
SELECT 
    '=== USUARIOS Y SUS ORGANIZACIONES ===' as seccion;

SELECT 
    u.id,
    u.email,
    u.organization_id as user_org_id,
    u.workshop_id,
    w.organization_id as workshop_org_id,
    COALESCE(u.organization_id, w.organization_id) as org_final,
    o.name as nombre_organizacion_final
FROM users u
LEFT JOIN workshops w ON w.id = u.workshop_id
LEFT JOIN organizations o ON o.id = COALESCE(u.organization_id, w.organization_id)
ORDER BY u.email;

-- =====================================================
-- 6. VERIFICAR QUÉ CLIENTES DEBERÍA VER EL USUARIO ACTUAL
-- =====================================================
SELECT 
    '=== CLIENTES QUE DEBERÍA VER EL USUARIO ACTUAL ===' as seccion;

-- Obtener organization_id del usuario actual
WITH current_user_org AS (
    SELECT 
        COALESCE(u.organization_id, w.organization_id) as org_id
    FROM users u
    LEFT JOIN workshops w ON w.id = u.workshop_id
    WHERE u.auth_user_id = auth.uid()
    LIMIT 1
)
SELECT 
    c.name,
    c.phone,
    c.email,
    c.organization_id,
    o.name as organizacion,
    CASE 
        WHEN c.organization_id = (SELECT org_id FROM current_user_org) THEN '✅ DEBERÍA VER'
        WHEN c.organization_id IS NULL THEN '⚠️ SIN ORGANIZACIÓN'
        ELSE '❌ NO DEBERÍA VER (diferente org)'
    END as estado
FROM customers c
LEFT JOIN organizations o ON o.id = c.organization_id
CROSS JOIN current_user_org
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

-- =====================================================
-- 7. RESUMEN DE PROBLEMAS DETECTADOS
-- =====================================================
SELECT 
    '=== RESUMEN DE PROBLEMAS ===' as seccion;

SELECT 
    'Clientes sin organization_id' as problema,
    COUNT(*) as cantidad
FROM customers
WHERE organization_id IS NULL

UNION ALL

SELECT 
    'Clientes con organization_id inválido' as problema,
    COUNT(*) as cantidad
FROM customers c
WHERE c.organization_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = c.organization_id)

UNION ALL

SELECT 
    'Clientes en diferentes organizaciones' as problema,
    COUNT(DISTINCT organization_id) as cantidad
FROM customers
WHERE organization_id IS NOT NULL;

