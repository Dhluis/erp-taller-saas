-- =====================================================
-- VERIFICACIÓN RÁPIDA: Organización de Clientes Específicos
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- =====================================================
-- CAPTURA 1: Clientes de la Lista Principal (5 clientes)
-- =====================================================
SELECT 
    '📋 CAPTURA 1: Clientes de la Lista Principal' as info,
    c.name as cliente,
    c.phone,
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
ORDER BY c.name;

-- =====================================================
-- CAPTURA 2: Clientes del Buscador (búsqueda "po")
-- =====================================================
SELECT 
    '🔍 CAPTURA 2: Clientes del Buscador (búsqueda "po")' as info,
    c.name as cliente,
    c.phone,
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
    '🔍 COMPARACIÓN: Organizaciones de Ambos Grupos' as info,
    CASE 
        WHEN c.name IN ('Mario Pérez Serás', 'Chano Prado', 'Domingo López', 'Orbelin Pineda', 'Raul Jimenez')
        THEN 'Lista Principal'
        ELSE 'Buscador'
    END as fuente,
    c.name as cliente,
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
   OR c.phone IN ('8866555222', '44655464646')
ORDER BY fuente, c.name;

-- =====================================================
-- VERIFICAR: ¿Cuántas organizaciones diferentes hay?
-- =====================================================
SELECT 
    '📊 RESUMEN: Organizaciones de Estos Clientes' as info,
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
   OR c.phone IN ('8866555222', '44655464646')
GROUP BY c.organization_id, o.name
ORDER BY cantidad_clientes DESC;

