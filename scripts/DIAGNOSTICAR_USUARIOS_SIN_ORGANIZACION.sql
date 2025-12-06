-- =====================================================
-- DIAGNÓSTICO Y CORRECCIÓN: Usuarios sin organization_id
-- =====================================================
-- Este script ayuda a identificar y corregir usuarios
-- que tienen organization_id null después del login

-- 1. VERIFICAR USUARIOS SIN ORGANIZATION_ID
-- =====================================================
SELECT 
    'USUARIOS SIN ORGANIZATION_ID' as diagnostico,
    u.id,
    u.auth_user_id,
    u.email,
    u.full_name,
    u.organization_id,
    u.workshop_id,
    u.role,
    u.created_at,
    au.email as auth_email,
    au.created_at as auth_created_at
FROM public.users u
LEFT JOIN auth.users au ON au.id = u.auth_user_id
WHERE u.organization_id IS NULL
ORDER BY u.created_at DESC;

-- 2. VERIFICAR SI HAY ORGANIZACIONES DISPONIBLES
-- =====================================================
SELECT 
    'ORGANIZACIONES DISPONIBLES' as diagnostico,
    o.id,
    o.name,
    o.email,
    o.created_at,
    (SELECT COUNT(*) FROM workshops w WHERE w.organization_id = o.id) as num_workshops
FROM organizations o
ORDER BY o.created_at DESC;

-- 3. VERIFICAR WORKSHOPS DISPONIBLES
-- =====================================================
SELECT 
    'WORKSHOPS DISPONIBLES' as diagnostico,
    w.id,
    w.name,
    w.organization_id,
    o.name as organization_name,
    w.email,
    w.created_at
FROM workshops w
LEFT JOIN organizations o ON o.id = w.organization_id
ORDER BY w.created_at DESC;

-- 4. VERIFICAR ESTRUCTURA DE LA TABLA USERS
-- =====================================================
SELECT 
    'ESTRUCTURA TABLA USERS' as diagnostico,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
  AND column_name IN ('organization_id', 'workshop_id', 'auth_user_id')
ORDER BY ordinal_position;

-- 5. VERIFICAR POLÍTICAS RLS EN USERS
-- =====================================================
SELECT 
    'POLÍTICAS RLS EN USERS' as diagnostico,
    schemaname,
    tablename,
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

-- =====================================================
-- CORRECCIÓN MANUAL (EJECUTAR SOLO SI ES NECESARIO)
-- =====================================================
-- ⚠️ ADVERTENCIA: Solo ejecutar si entiendes las consecuencias
-- Este script asigna una organización demo a usuarios sin organización

-- Opción 1: Asignar organización demo a usuarios sin organización
/*
DO $$
DECLARE
    demo_org_id UUID := '00000000-0000-0000-0000-000000000001';
    demo_workshop_id UUID;
    user_record RECORD;
BEGIN
    -- Obtener el primer workshop de la organización demo
    SELECT id INTO demo_workshop_id
    FROM workshops
    WHERE organization_id = demo_org_id
    LIMIT 1;

    -- Si no hay workshop demo, crear uno
    IF demo_workshop_id IS NULL THEN
        INSERT INTO workshops (id, name, email, organization_id, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'Taller Demo',
            'demo@example.com',
            demo_org_id,
            NOW(),
            NOW()
        )
        RETURNING id INTO demo_workshop_id;
    END IF;

    -- Actualizar usuarios sin organización
    FOR user_record IN 
        SELECT id, auth_user_id, email
        FROM public.users
        WHERE organization_id IS NULL
    LOOP
        UPDATE public.users
        SET 
            organization_id = demo_org_id,
            workshop_id = demo_workshop_id,
            updated_at = NOW()
        WHERE id = user_record.id;

        RAISE NOTICE 'Usuario actualizado: % (email: %)', user_record.id, user_record.email;
    END LOOP;

    RAISE NOTICE 'Corrección completada';
END $$;
*/

-- Opción 2: Eliminar usuarios huérfanos (Solo si están inactivos)
/*
-- Primero verificar qué usuarios se eliminarían
SELECT 
    u.id,
    u.email,
    u.auth_user_id,
    u.created_at,
    CASE 
        WHEN au.id IS NULL THEN 'Sin usuario auth'
        ELSE 'Con usuario auth'
    END as estado_auth
FROM public.users u
LEFT JOIN auth.users au ON au.id = u.auth_user_id
WHERE u.organization_id IS NULL
  AND u.created_at < NOW() - INTERVAL '30 days'; -- Solo usuarios antiguos

-- Si estás seguro, descomenta esto:
-- DELETE FROM public.users
-- WHERE organization_id IS NULL
--   AND created_at < NOW() - INTERVAL '30 days'
--   AND auth_user_id NOT IN (SELECT id FROM auth.users);
*/

-- =====================================================
-- VERIFICACIÓN POST-CORRECCIÓN
-- =====================================================
-- Ejecutar después de cualquier corrección manual

SELECT 
    'VERIFICACIÓN POST-CORRECCIÓN' as diagnostico,
    COUNT(*) FILTER (WHERE organization_id IS NULL) as usuarios_sin_org,
    COUNT(*) FILTER (WHERE organization_id IS NOT NULL) as usuarios_con_org,
    COUNT(*) as total_usuarios
FROM public.users;
