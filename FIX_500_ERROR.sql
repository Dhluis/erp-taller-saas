-- ============================================
-- FIX ERROR 500: Agregar organization_id a workshops
-- ============================================

-- 1. Agregar columna organization_id a workshops
ALTER TABLE workshops
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- 2. Agregar foreign key constraint
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'workshops_organization_id_fkey'
    ) THEN
        ALTER TABLE workshops
        ADD CONSTRAINT workshops_organization_id_fkey 
        FOREIGN KEY (organization_id) 
        REFERENCES organizations(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Actualizar workshops existentes con organization_id por defecto
UPDATE workshops 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 4. Verificar que todos los workshops tengan organization_id
SELECT 
    id,
    name,
    organization_id,
    CASE 
        WHEN organization_id IS NULL THEN '❌ Sin organization_id'
        ELSE '✅ Con organization_id'
    END as status
FROM workshops
ORDER BY name;

-- 5. Mostrar resumen
SELECT 
    COUNT(*) as total_workshops,
    COUNT(organization_id) as workshops_with_org,
    COUNT(*) - COUNT(organization_id) as workshops_without_org
FROM workshops;



