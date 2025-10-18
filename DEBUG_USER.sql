-- ============================================
-- DEBUG: Verificar datos del usuario
-- ============================================

-- 1. Ver tu usuario en auth.users
SELECT 
    id,
    email,
    created_at
FROM auth.users 
WHERE email = 'exclusicoparaclientes@gmail.com';

-- 2. Ver tu perfil en public.users
SELECT 
    id,
    auth_user_id,
    workshop_id,
    role,
    created_at
FROM public.users 
WHERE auth_user_id IN (
    SELECT id FROM auth.users WHERE email = 'exclusicoparaclientes@gmail.com'
);

-- 3. Ver la relación completa (usuario -> workshop -> organization)
SELECT 
    au.email,
    pu.id as user_profile_id,
    pu.workshop_id,
    w.name as workshop_name,
    w.organization_id,
    o.name as organization_name
FROM auth.users au
LEFT JOIN public.users pu ON pu.auth_user_id = au.id
LEFT JOIN public.workshops w ON w.id = pu.workshop_id
LEFT JOIN public.organizations o ON o.id = w.organization_id
WHERE au.email = 'exclusicoparaclientes@gmail.com';

-- 4. Si public.users está vacío, verificar estructura
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;



