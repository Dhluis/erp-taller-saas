-- =====================================================
-- MIGRACIÓN 021: Asegurar Columnas en Tabla Users
-- Fecha: 2025-01-XX
-- Objetivo: Asegurar que la tabla users tenga las columnas
--           necesarias para multi-tenancy (organization_id, 
--           workshop_id, auth_user_id)
-- =====================================================

-- =====================================================
-- PARTE 1: AGREGAR COLUMNAS SI NO EXISTEN
-- =====================================================

-- Agregar auth_user_id si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'auth_user_id'
    ) THEN
        ALTER TABLE public.users 
        ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        
        -- Crear índice para mejorar rendimiento
        CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
        
        RAISE NOTICE 'Columna auth_user_id agregada a users';
    ELSE
        RAISE NOTICE 'Columna auth_user_id ya existe en users';
    END IF;
END $$;

-- Agregar organization_id si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.users 
        ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
        
        -- Crear índice para mejorar rendimiento
        CREATE INDEX IF NOT EXISTS idx_users_organization_id ON public.users(organization_id);
        
        RAISE NOTICE 'Columna organization_id agregada a users';
    ELSE
        RAISE NOTICE 'Columna organization_id ya existe en users';
    END IF;
END $$;

-- Agregar workshop_id si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'workshop_id'
    ) THEN
        ALTER TABLE public.users 
        ADD COLUMN workshop_id UUID REFERENCES workshops(id) ON DELETE SET NULL;
        
        -- Crear índice para mejorar rendimiento
        CREATE INDEX IF NOT EXISTS idx_users_workshop_id ON public.users(workshop_id);
        
        RAISE NOTICE 'Columna workshop_id agregada a users';
    ELSE
        RAISE NOTICE 'Columna workshop_id ya existe en users';
    END IF;
END $$;

-- Agregar full_name si no existe (compatibilidad)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'full_name'
    ) THEN
        ALTER TABLE public.users 
        ADD COLUMN full_name TEXT;
        
        -- Si existe first_name y last_name, combinar en full_name
        UPDATE public.users
        SET full_name = TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
        WHERE full_name IS NULL 
          AND (first_name IS NOT NULL OR last_name IS NOT NULL);
        
        RAISE NOTICE 'Columna full_name agregada a users';
    ELSE
        RAISE NOTICE 'Columna full_name ya existe en users';
    END IF;
END $$;

-- Agregar name si no existe (compatibilidad con código que usa 'name')
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'name'
    ) THEN
        ALTER TABLE public.users 
        ADD COLUMN name TEXT;
        
        -- Si existe full_name, copiar a name
        UPDATE public.users
        SET name = full_name
        WHERE name IS NULL AND full_name IS NOT NULL;
        
        RAISE NOTICE 'Columna name agregada a users';
    ELSE
        RAISE NOTICE 'Columna name ya existe en users';
    END IF;
END $$;

-- =====================================================
-- PARTE 2: VERIFICAR Y CREAR CONSTRAINTS
-- =====================================================

-- Verificar constraint de auth_user_id único
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public'
          AND table_name = 'users'
          AND constraint_name = 'users_auth_user_id_key'
          AND constraint_type = 'UNIQUE'
    ) THEN
        -- Crear índice único si no existe
        CREATE UNIQUE INDEX IF NOT EXISTS users_auth_user_id_key ON public.users(auth_user_id) 
        WHERE auth_user_id IS NOT NULL;
        
        RAISE NOTICE 'Índice único para auth_user_id creado';
    ELSE
        RAISE NOTICE 'Constraint único para auth_user_id ya existe';
    END IF;
END $$;

-- =====================================================
-- PARTE 3: ACTUALIZAR POLÍTICAS RLS SI ES NECESARIO
-- =====================================================

-- Habilitar RLS si no está habilitado
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios puedan ver su propio perfil
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'users' 
          AND policyname = 'Users can view own profile'
    ) THEN
        CREATE POLICY "Users can view own profile" ON public.users
            FOR SELECT
            USING (auth_user_id = auth.uid());
        
        RAISE NOTICE 'Política RLS "Users can view own profile" creada';
    ELSE
        RAISE NOTICE 'Política RLS "Users can view own profile" ya existe';
    END IF;
END $$;

-- Política para que los usuarios puedan actualizar su propio perfil
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'users' 
          AND policyname = 'Users can update own profile'
    ) THEN
        CREATE POLICY "Users can update own profile" ON public.users
            FOR UPDATE
            USING (auth_user_id = auth.uid())
            WITH CHECK (auth_user_id = auth.uid());
        
        RAISE NOTICE 'Política RLS "Users can update own profile" creada';
    ELSE
        RAISE NOTICE 'Política RLS "Users can update own profile" ya existe';
    END IF;
END $$;

-- Política para que los usuarios puedan insertar su propio perfil
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'users' 
          AND policyname = 'Users can insert own profile'
    ) THEN
        CREATE POLICY "Users can insert own profile" ON public.users
            FOR INSERT
            WITH CHECK (auth_user_id = auth.uid());
        
        RAISE NOTICE 'Política RLS "Users can insert own profile" creada';
    ELSE
        RAISE NOTICE 'Política RLS "Users can insert own profile" ya existe';
    END IF;
END $$;

-- =====================================================
-- PARTE 4: VERIFICACIÓN FINAL
-- =====================================================

-- Verificar que todas las columnas existen
SELECT 
    'VERIFICACIÓN DE COLUMNAS' as status,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
  AND column_name IN ('auth_user_id', 'organization_id', 'workshop_id', 'full_name', 'name')
ORDER BY column_name;

-- Verificar índices creados
SELECT 
    'VERIFICACIÓN DE ÍNDICES' as status,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'users'
  AND indexname LIKE '%auth_user_id%' 
     OR indexname LIKE '%organization_id%'
     OR indexname LIKE '%workshop_id%'
ORDER BY indexname;

-- Verificar políticas RLS
SELECT 
    'VERIFICACIÓN DE POLÍTICAS RLS' as status,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'users'
ORDER BY policyname;
