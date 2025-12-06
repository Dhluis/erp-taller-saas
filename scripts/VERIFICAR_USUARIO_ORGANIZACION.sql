-- =====================================================
-- VERIFICACIÓN: Usuario y Organización
-- =====================================================
-- Ejecuta este script para verificar el estado del usuario

-- 1. VERIFICAR USUARIO EN auth.users
-- =====================================================
-- Reemplaza 'TU_EMAIL_AQUI' con tu email
SELECT 
    id as auth_user_id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users
WHERE email = 'TU_EMAIL_AQUI'; -- 👈 CAMBIAR AQUÍ

-- 2. VERIFICAR PERFIL EN public.users
-- =====================================================
SELECT 
    u.id,
    u.auth_user_id,
    u.email,
    u.full_name,
    u.organization_id,
    u.workshop_id,
    u.role,
    u.is_active,
    u.created_at
FROM public.users u
WHERE u.email = 'TU_EMAIL_AQUI' -- 👈 CAMBIAR AQUÍ
   OR u.auth_user_id IN (
       SELECT id FROM auth.users WHERE email = 'TU_EMAIL_AQUI' -- 👈 CAMBIAR AQUÍ
   );

-- 3. VERIFICAR RELACIÓN COMPLETA (auth.users -> users -> organizations)
-- =====================================================
SELECT 
    au.id as auth_user_id,
    au.email as auth_email,
    au.email_confirmed_at,
    u.id as user_profile_id,
    u.auth_user_id as user_auth_user_id,
    u.email as user_email,
    u.full_name,
    u.organization_id,
    u.workshop_id,
    u.role,
    o.id as org_id,
    o.name as org_name,
    o.email as org_email,
    w.id as workshop_id,
    w.name as workshop_name,
    CASE 
        WHEN u.id IS NULL THEN '❌ Sin perfil en public.users'
        WHEN u.organization_id IS NULL THEN '⚠️ Sin organización (necesita onboarding)'
        WHEN o.id IS NULL THEN '❌ Organization_id inválido'
        ELSE '✅ OK'
    END as estado
FROM auth.users au
LEFT JOIN public.users u ON u.auth_user_id = au.id
LEFT JOIN public.organizations o ON o.id = u.organization_id
LEFT JOIN public.workshops w ON w.id = u.workshop_id
WHERE au.email = 'TU_EMAIL_AQUI' -- 👈 CAMBIAR AQUÍ
ORDER BY au.created_at DESC;

-- 4. VERIFICAR SI HAY ORGANIZACIONES EN LA BD
-- =====================================================
SELECT 
    id,
    name,
    email,
    phone,
    created_at,
    (SELECT COUNT(*) FROM public.users WHERE organization_id = o.id) as total_usuarios
FROM public.organizations o
ORDER BY created_at DESC
LIMIT 10;

-- 5. VERIFICAR ESTRUCTURA DE LA TABLA users
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

-- 6. CONTAR USUARIOS SIN ORGANIZACIÓN
-- =====================================================
SELECT 
    COUNT(*) as usuarios_sin_organizacion,
    STRING_AGG(email, ', ') as emails
FROM public.users
WHERE organization_id IS NULL;
