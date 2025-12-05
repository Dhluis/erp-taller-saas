-- =====================================================
-- SCRIPT DE CORRECCIÓN DE DATOS LEGACY
-- ⚠️ IMPORTANTE: Revisar los resultados antes de ejecutar
-- =====================================================

-- PASO 1: Verificar datos legacy (EJECUTAR PRIMERO)
SELECT * FROM verify_legacy_data();

-- PASO 2: Verificar que existe la organización por defecto
SELECT id, name FROM organizations 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Si no existe, crearla:
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

-- PASO 3: Corregir datos legacy
-- ⚠️ ESTO MODIFICARÁ DATOS EXISTENTES
-- Revisa los resultados del PASO 1 antes de ejecutar

SELECT * FROM fix_legacy_organization_id('00000000-0000-0000-0000-000000000001'::UUID);

-- PASO 4: Verificar que se corrigieron todos los datos
SELECT * FROM verify_legacy_data();

-- Si aún hay datos sin organization_id, revisar manualmente:
/*
-- Ejemplo: Ver customers que aún no tienen organization_id
SELECT 
    id,
    name,
    email,
    created_at,
    created_by
FROM customers
WHERE organization_id IS NULL;

-- Asignar manualmente si es necesario:
UPDATE customers
SET organization_id = '00000000-0000-0000-0000-000000000001'::UUID
WHERE id = 'ID_DEL_CLIENTE_AQUI';
*/

