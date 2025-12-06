-- =====================================================
-- DIAGNÓSTICO: Problema de Inicio de Sesión
-- =====================================================
-- Ejecuta este script en Supabase SQL Editor para diagnosticar
-- el problema de login

-- 1. VERIFICAR ESTRUCTURA DE LA TABLA users
-- =====================================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- 2. VERIFICAR SI EXISTE LA COLUMNA auth_user_id
-- =====================================================
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
AND column_name = 'auth_user_id';

-- 3. VERIFICAR USUARIO ESPECÍFICO
-- =====================================================
-- Reemplaza 'TU_EMAIL_AQUI' con el email del usuario con problemas
DO $$
DECLARE
    v_email TEXT := 'TU_EMAIL_AQUI'; -- 👈 CAMBIAR AQUÍ
    v_auth_user_id UUID;
    v_profile_exists BOOLEAN;
BEGIN
    -- Obtener auth_user_id
    SELECT id INTO v_auth_user_id
    FROM auth.users
    WHERE email = v_email;
    
    IF v_auth_user_id IS NULL THEN
        RAISE NOTICE '❌ Usuario no encontrado en auth.users con email: %', v_email;
    ELSE
        RAISE NOTICE '✅ Usuario encontrado en auth.users:';
        RAISE NOTICE '   - ID: %', v_auth_user_id;
        RAISE NOTICE '   - Email: %', v_email;
        
        -- Verificar si existe perfil en public.users
        SELECT EXISTS(
            SELECT 1 FROM public.users 
            WHERE auth_user_id = v_auth_user_id
        ) INTO v_profile_exists;
        
        IF v_profile_exists THEN
            RAISE NOTICE '✅ Perfil encontrado en public.users';
            
            -- Mostrar detalles del perfil
            PERFORM * FROM public.users 
            WHERE auth_user_id = v_auth_user_id;
        ELSE
            RAISE NOTICE '❌ PERFIL NO ENCONTRADO en public.users';
            RAISE NOTICE '   - auth_user_id buscado: %', v_auth_user_id;
        END IF;
    END IF;
END $$;

-- 4. VER RELACIÓN COMPLETA (auth.users -> public.users -> workshop -> organization)
-- =====================================================
SELECT 
    au.id as auth_user_id,
    au.email as auth_email,
    au.email_confirmed_at,
    u.id as user_id,
    u.auth_user_id as user_auth_user_id,
    u.email as user_email,
    u.organization_id,
    u.workshop_id,
    u.role,
    w.name as workshop_name,
    o.name as organization_name,
    CASE 
        WHEN u.id IS NULL THEN '❌ Sin perfil en public.users'
        WHEN u.organization_id IS NULL THEN '⚠️ Sin organización (necesita onboarding)'
        ELSE '✅ OK'
    END as status
FROM auth.users au
LEFT JOIN public.users u ON u.auth_user_id = au.id
LEFT JOIN public.workshops w ON w.id = u.workshop_id
LEFT JOIN public.organizations o ON o.id = u.organization_id OR o.id = w.organization_id
ORDER BY au.created_at DESC
LIMIT 10;

-- 5. VERIFICAR POLÍTICAS RLS EN TABLA users
-- =====================================================
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users'
ORDER BY policyname;

-- 6. CONTAR USUARIOS SIN PERFIL
-- =====================================================
SELECT 
    COUNT(*) as usuarios_sin_perfil,
    STRING_AGG(email, ', ') as emails
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.auth_user_id = au.id
);

-- 7. VERIFICAR SI HAY DISCREPANCIA ENTRE auth_user_id Y id
-- =====================================================
SELECT 
    u.id,
    u.auth_user_id,
    u.email,
    au.id as auth_users_id,
    CASE 
        WHEN u.auth_user_id = au.id THEN '✅ Coincide'
        ELSE '❌ NO COINCIDE'
    END as coincidencia
FROM public.users u
LEFT JOIN auth.users au ON au.id = u.auth_user_id
WHERE u.auth_user_id IS NOT NULL
LIMIT 10;
