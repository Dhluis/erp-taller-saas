-- =====================================================
-- VERIFICAR USUARIO EN BASE DE DATOS
-- =====================================================
-- Ejecutar en Supabase SQL Editor para diagnosticar problemas
-- =====================================================

-- 1. Verificar usuario Rita en auth.users
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users 
WHERE email = 'rita@gmail.com'
   OR id = 'd28163ea-f601-48b3-907d-d8aa61098752';

-- 2. Verificar usuario Rita en tabla users
SELECT 
  id,
  auth_user_id,
  organization_id,
  full_name,
  email,
  role,
  is_active,
  created_at
FROM users 
WHERE auth_user_id = 'd28163ea-f601-48b3-907d-d8aa61098752'
   OR email = 'rita@gmail.com';

-- 3. Si el usuario NO existe en tabla users, crear manualmente:
-- (Descomentar solo si el usuario falta en users pero existe en auth.users)
/*
INSERT INTO users (
  auth_user_id,
  organization_id,
  full_name,
  email,
  role,
  phone,
  is_active
) VALUES (
  'd28163ea-f601-48b3-907d-d8aa61098752',
  'bbca1229-2c4f-4838-b5f9-9e8a8ca79261',  -- Verificar que esta org existe
  'Rita Mecánico',
  'rita@gmail.com',
  'MECANICO',
  '4443219856',
  true
)
ON CONFLICT (auth_user_id) DO UPDATE
SET 
  organization_id = EXCLUDED.organization_id,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  email = EXCLUDED.email;
*/

-- 4. Verificar todos los usuarios de la organización
SELECT 
  id,
  auth_user_id,
  email,
  full_name,
  role,
  is_active,
  organization_id
FROM users 
WHERE organization_id = 'bbca1229-2c4f-4838-b5f9-9e8a8ca79261'
ORDER BY created_at DESC;

-- 5. Verificar constraint de organization_id
SELECT 
  column_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name = 'organization_id';

