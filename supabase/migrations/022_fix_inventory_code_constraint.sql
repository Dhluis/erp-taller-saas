-- =============================================
-- MIGRACIÓN: Corregir constraint de inventory.code para multi-tenant
-- =============================================
-- 
-- PROBLEMA: El constraint actual es UNIQUE(code) global, lo que impide
-- que diferentes organizaciones usen el mismo código.
--
-- SOLUCIÓN: Cambiar a UNIQUE(organization_id, code) para que cada
-- organización pueda tener sus propios códigos únicos.
--
-- =============================================

-- 1. Eliminar el constraint global existente (si existe)
DO $$ 
BEGIN
    -- Intentar eliminar el constraint si existe
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'inventory_code_key' 
        AND table_name = 'inventory'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inventory DROP CONSTRAINT inventory_code_key;
        RAISE NOTICE '✅ Constraint inventory_code_key eliminado';
    ELSE
        RAISE NOTICE 'ℹ️  Constraint inventory_code_key no existe, continuando...';
    END IF;

    -- También intentar eliminar otros posibles nombres de constraint
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%inventory%code%' 
        AND table_name = 'inventory'
        AND table_schema = 'public'
        AND constraint_type = 'UNIQUE'
    ) THEN
        -- Obtener el nombre exacto y eliminarlo
        EXECUTE (
            SELECT 'ALTER TABLE public.inventory DROP CONSTRAINT ' || constraint_name
            FROM information_schema.table_constraints 
            WHERE constraint_name LIKE '%inventory%code%' 
            AND table_name = 'inventory'
            AND table_schema = 'public'
            AND constraint_type = 'UNIQUE'
            LIMIT 1
        );
        RAISE NOTICE '✅ Constraint de código único global eliminado';
    END IF;
END $$;

-- 2. Crear el constraint correcto multi-tenant
DO $$ 
BEGIN
    -- Verificar si ya existe el constraint correcto
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'inventory_organization_code_unique' 
        AND table_name = 'inventory'
        AND table_schema = 'public'
    ) THEN
        -- Crear constraint UNIQUE(organization_id, code)
        -- Solo aplicar a filas donde code NO es NULL
        CREATE UNIQUE INDEX inventory_organization_code_unique 
        ON public.inventory(organization_id, code) 
        WHERE code IS NOT NULL;
        
        RAISE NOTICE '✅ Constraint multi-tenant creado: UNIQUE(organization_id, code)';
    ELSE
        RAISE NOTICE 'ℹ️  Constraint multi-tenant ya existe';
    END IF;
END $$;

-- 3. Verificar que la columna code puede ser NULL (por si acaso)
DO $$ 
BEGIN
    -- Si code tiene NOT NULL, cambiarlo a nullable
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'inventory' 
        AND column_name = 'code'
        AND table_schema = 'public'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.inventory ALTER COLUMN code DROP NOT NULL;
        RAISE NOTICE '✅ Columna code ahora permite NULL';
    ELSE
        RAISE NOTICE 'ℹ️  Columna code ya permite NULL';
    END IF;
END $$;

-- 4. Comentario de documentación
COMMENT ON INDEX inventory_organization_code_unique IS 
'Constraint multi-tenant: permite que diferentes organizaciones tengan el mismo código, pero cada organización tiene códigos únicos internos';

