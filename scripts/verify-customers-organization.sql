-- =====================================================
-- SCRIPT DE VERIFICACIÓN DE ORGANIZACIÓN DE CLIENTES
-- Verifica en qué organización están los clientes específicos
-- =====================================================

-- =====================================================
-- CAPTURA 1: Clientes de la lista principal
-- =====================================================
SELECT 
    '=== CAPTURA 1: Clientes de la Lista Principal ===' as seccion;

SELECT 
    c.id,
    c.name as nombre_cliente,
    c.email,
    c.phone,
    c.organization_id,
    o.name as nombre_organizacion,
    c.created_at,
    c.created_by,
    u.email as creado_por_email,
    u.organization_id as usuario_org_id,
    u.workshop_id as usuario_workshop_id,
    w.organization_id as workshop_org_id
FROM customers c
LEFT JOIN organizations o ON o.id = c.organization_id
LEFT JOIN users u ON u.id = c.created_by
LEFT JOIN workshops w ON w.id = u.workshop_id
WHERE c.name IN (
    'Mario Pérez Serás',
    'Chano Prado',
    'Domingo López',
    'Orbelin Pineda',
    'Raul Jimenez'
)
ORDER BY c.name;

-- =====================================================
-- CAPTURA 2: Clientes del buscador
-- =====================================================
SELECT 
    '=== CAPTURA 2: Clientes del Buscador (po) ===' as seccion;

SELECT 
    c.id,
    c.name as nombre_cliente,
    c.email,
    c.phone,
    c.organization_id,
    o.name as nombre_organizacion,
    c.created_at,
    c.created_by,
    u.email as creado_por_email,
    u.organization_id as usuario_org_id,
    u.workshop_id as usuario_workshop_id,
    w.organization_id as workshop_org_id
FROM customers c
LEFT JOIN organizations o ON o.id = c.organization_id
LEFT JOIN users u ON u.id = c.created_by
LEFT JOIN workshops w ON w.id = u.workshop_id
WHERE c.name ILIKE '%Chopon%' 
   OR c.name ILIKE '%PONCHIS%'
   OR c.phone IN ('8866555222', '44655464646')
ORDER BY c.name;

-- =====================================================
-- VERIFICACIÓN: Todos los clientes y sus organizaciones
-- =====================================================
SELECT 
    '=== RESUMEN: Todos los Clientes y sus Organizaciones ===' as seccion;

SELECT 
    c.organization_id,
    o.name as nombre_organizacion,
    COUNT(*) as total_clientes,
    STRING_AGG(c.name, ', ' ORDER BY c.name) as nombres_clientes
FROM customers c
LEFT JOIN organizations o ON o.id = c.organization_id
GROUP BY c.organization_id, o.name
ORDER BY total_clientes DESC;

-- =====================================================
-- VERIFICACIÓN: Clientes sin organization_id
-- =====================================================
SELECT 
    '=== CLIENTES SIN ORGANIZACIÓN (PROBLEMA) ===' as seccion;

SELECT 
    c.id,
    c.name,
    c.email,
    c.phone,
    c.organization_id,
    c.created_at,
    c.created_by,
    u.email as creado_por_email
FROM customers c
LEFT JOIN users u ON u.id = c.created_by
WHERE c.organization_id IS NULL
ORDER BY c.created_at DESC;

-- =====================================================
-- VERIFICACIÓN: Organización del usuario actual
-- =====================================================
SELECT 
    '=== ORGANIZACIÓN DEL USUARIO ACTUAL ===' as seccion;

SELECT 
    u.id as user_id,
    u.email,
    u.organization_id as user_org_id,
    u.workshop_id,
    w.organization_id as workshop_org_id,
    COALESCE(u.organization_id, w.organization_id) as org_id_final
FROM users u
LEFT JOIN workshops w ON w.id = u.workshop_id
WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
   OR u.auth_user_id = auth.uid()
LIMIT 1;

-- =====================================================
-- VERIFICACIÓN: Comparar clientes de lista vs buscador
-- =====================================================
SELECT 
    '=== COMPARACIÓN: Clientes Lista vs Buscador ===' as seccion;

-- Clientes que aparecen en la lista (captura 1)
WITH lista_clientes AS (
    SELECT id, name, organization_id
    FROM customers
    WHERE name IN (
        'Mario Pérez Serás',
        'Chano Prado',
        'Domingo López',
        'Orbelin Pineda',
        'Raul Jimenez'
    )
),
buscador_clientes AS (
    SELECT id, name, organization_id
    FROM customers
    WHERE name ILIKE '%Chopon%' 
       OR name ILIKE '%PONCHIS%'
       OR phone IN ('8866555222', '44655464646')
)
SELECT 
    'Lista Principal' as fuente,
    lc.name,
    lc.organization_id,
    o.name as nombre_org
FROM lista_clientes lc
LEFT JOIN organizations o ON o.id = lc.organization_id
UNION ALL
SELECT 
    'Buscador' as fuente,
    bc.name,
    bc.organization_id,
    o.name as nombre_org
FROM buscador_clientes bc
LEFT JOIN organizations o ON o.id = bc.organization_id
ORDER BY fuente, name;

