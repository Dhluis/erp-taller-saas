-- =====================================================
-- SCRIPT DE VERIFICACIÓN INMEDIATA
-- Ejecutar en Supabase SQL Editor
-- Muestra la organización de los clientes específicos
-- =====================================================

-- =====================================================
-- CAPTURA 1: Clientes de la Lista Principal (5 clientes)
-- =====================================================
SELECT 
    '📋 CAPTURA 1: Clientes de la Lista Principal' as seccion,
    c.name as cliente,
    c.phone,
    c.email,
    c.organization_id,
    COALESCE(o.name, '❌ SIN ORGANIZACIÓN') as organizacion,
    CASE 
        WHEN c.organization_id IS NULL THEN '⚠️ PROBLEMA: Sin organización'
        ELSE '✅ OK'
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
   OR c.email IN (
    'mariopserz@gmail.com',
    'chano@gmail.com',
    'domingo@gmail.com',
    'dhkshcsh322222@gmail.com',
    'dhkshcsh123@gmail.com'
)
   OR c.phone IN (
    '+52 444 77 2020',
    '4491799910',
    '521141111122',
    '4848131323',
    '4545445555'
)
ORDER BY c.name;

-- =====================================================
-- CAPTURA 2: Clientes del Buscador (búsqueda "po")
-- =====================================================
SELECT 
    '🔍 CAPTURA 2: Clientes del Buscador (búsqueda "po")' as seccion,
    c.name as cliente,
    c.phone,
    c.email,
    c.organization_id,
    COALESCE(o.name, '❌ SIN ORGANIZACIÓN') as organizacion,
    CASE 
        WHEN c.organization_id IS NULL THEN '⚠️ PROBLEMA: Sin organización'
        ELSE '✅ OK'
    END as estado
FROM customers c
LEFT JOIN organizations o ON o.id = c.organization_id
WHERE c.name ILIKE '%Chopon%' 
   OR c.name ILIKE '%PONCHIS%'
   OR c.phone IN ('8866555222', '44655464646')
ORDER BY c.name;

-- =====================================================
-- COMPARACIÓN: ¿Están en la misma organización?
-- =====================================================
SELECT 
    '🔍 COMPARACIÓN: Organizaciones de Ambos Grupos' as seccion,
    CASE 
        WHEN c.name IN ('Mario Pérez Serás', 'Chano Prado', 'Domingo López', 'Orbelin Pineda', 'Raul Jimenez')
             OR c.email IN ('mariopserz@gmail.com', 'chano@gmail.com', 'domingo@gmail.com', 'dhkshcsh322222@gmail.com', 'dhkshcsh123@gmail.com')
        THEN '📋 Lista Principal'
        ELSE '🔍 Buscador'
    END as fuente,
    c.name as cliente,
    c.phone,
    c.organization_id,
    COALESCE(o.name, 'SIN ORGANIZACIÓN') as organizacion
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
   OR c.email IN (
    'mariopserz@gmail.com',
    'chano@gmail.com',
    'domingo@gmail.com',
    'dhkshcsh322222@gmail.com',
    'dhkshcsh123@gmail.com'
)
   OR c.phone IN (
    '+52 444 77 2020',
    '4491799910',
    '521141111122',
    '4848131323',
    '4545445555',
    '8866555222',
    '44655464646'
)
ORDER BY fuente, c.name;

-- =====================================================
-- RESUMEN: ¿Cuántas organizaciones diferentes hay?
-- =====================================================
SELECT 
    '📊 RESUMEN: Organizaciones de Estos Clientes' as seccion,
    c.organization_id,
    COALESCE(o.name, 'SIN ORGANIZACIÓN') as organizacion,
    COUNT(*) as cantidad_clientes,
    STRING_AGG(c.name, ', ' ORDER BY c.name) as nombres
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
   OR c.email IN (
    'mariopserz@gmail.com',
    'chano@gmail.com',
    'domingo@gmail.com',
    'dhkshcsh322222@gmail.com',
    'dhkshcsh123@gmail.com'
)
   OR c.phone IN (
    '+52 444 77 2020',
    '4491799910',
    '521141111122',
    '4848131323',
    '4545445555',
    '8866555222',
    '44655464646'
)
GROUP BY c.organization_id, o.name
ORDER BY cantidad_clientes DESC;

-- =====================================================
-- VERIFICACIÓN ADICIONAL: Usuario actual y su organización
-- =====================================================
SELECT 
    '👤 ORGANIZACIÓN DEL USUARIO ACTUAL' as seccion,
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

