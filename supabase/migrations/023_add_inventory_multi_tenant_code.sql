-- =============================================
-- MIGRACIÓN: Agregar constraint multi-tenant para inventory.code
-- =============================================
-- 
-- OBJETIVO: Permitir que cada organización tenga sus propios códigos únicos
-- Constraint: UNIQUE(organization_id, code)
--
-- =============================================

-- 1. Eliminar cualquier constraint existente en el campo code (si existe)
DO $$ 
DECLARE
    constraint_name_to_drop text;
BEGIN
    -- Buscar cualquier constraint UNIQUE en la columna code
    SELECT tc.constraint_name INTO constraint_name_to_drop
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'inventory' 
        AND tc.constraint_type = 'UNIQUE'
        AND ccu.column_name = 'code'
        AND tc.table_schema = 'public'
    LIMIT 1;

    IF constraint_name_to_drop IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.inventory DROP CONSTRAINT ' || constraint_name_to_drop;
        RAISE NOTICE '✅ Constraint eliminado: %', constraint_name_to_drop;
    ELSE
        RAISE NOTICE 'ℹ️  No hay constraint UNIQUE en la columna code';
    END IF;
END $$;

-- 2. Eliminar cualquier índice único existente en code (si existe)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE indexname = 'inventory_organization_code_unique' 
        AND schemaname = 'public'
    ) THEN
        DROP INDEX public.inventory_organization_code_unique;
        RAISE NOTICE 'ℹ️  Índice existente eliminado';
    END IF;
END $$;

-- 3. Crear el índice único multi-tenant
-- Permite que diferentes organizaciones usen el mismo código
CREATE UNIQUE INDEX inventory_organization_code_unique 
ON public.inventory(organization_id, code) 
WHERE code IS NOT NULL AND organization_id IS NOT NULL;

-- 4. Agregar comentario explicativo
COMMENT ON INDEX inventory_organization_code_unique IS 
'Multi-tenant: Permite que cada organización tenga códigos únicos internos';

-- 5. Verificación final
DO $$ 
BEGIN
    RAISE NOTICE '✅ Migración completada exitosamente';
    RAISE NOTICE 'ℹ️  Cada organización puede ahora tener su propio código "0001", "0002", etc.';
    RAISE NOTICE 'ℹ️  El código es único solo dentro de cada organización';
END $$;

