-- Verificar la estructura de la tabla users
-- Ejecuta esto en Supabase SQL Editor

-- 1. Ver la estructura de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 2. Ver las constraints
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'users';

-- 3. Ver si existe el campo specialties
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name = 'specialties';

-- 4. Ver si existe el campo is_active
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name = 'is_active';

-- 5. Ver un ejemplo de registro actual
SELECT * FROM users LIMIT 1;

-- 6. SOLUCIÓN TEMPORAL: Si la tabla no tiene los campos necesarios
-- Ejecuta esto solo si los campos no existen:

-- Agregar campo specialties (array de texto)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS specialties TEXT[];

-- Agregar campo is_active
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Agregar campo organization_id si no existe
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Agregar foreign key para organization_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_organization_id_fkey'
    ) THEN
        ALTER TABLE users 
        ADD CONSTRAINT users_organization_id_fkey 
        FOREIGN KEY (organization_id) 
        REFERENCES organizations(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Verificar que los cambios se aplicaron
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('specialties', 'is_active', 'organization_id')
ORDER BY column_name;









