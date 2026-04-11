-- 📋 SCRIPT PARA VINCULAR LA CUENTA DE ALFONSO HERNANDEZ
-- Ejecutar esto en el SQL Editor de Supabase

-- 1. Actualizar el auth_user_id en la tabla system_users
-- Esto vincula el correo con el ID de Google Auth
UPDATE system_users 
SET auth_user_id = '301eb55a-f6f9-449f-ab04-8dcf8fc081a6' -- ID detectado en logs recientes
WHERE email ILIKE '%hdzalfonso%';

-- 2. Asegurar que existe el perfil en la tabla 'users' (si se usa para el dashboard)
-- Nota: Si system_users ya tiene el organization_id, esto es lo principal.
-- Pero para redundancia, vinculamos o insertamos en 'users'
INSERT INTO users (
  auth_user_id, 
  email, 
  full_name, 
  role, 
  organization_id, 
  is_active
)
SELECT 
  '301eb55a-f6f9-449f-ab04-8dcf8fc081a6', 
  email, 
  first_name || ' ' || last_name, 
  role, 
  organization_id, 
  true
FROM system_users 
WHERE email ILIKE '%hdzalfonso%'
ON CONFLICT (auth_user_id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  email = EXCLUDED.email;

-- 3. Verificar el resultado
SELECT id, email, auth_user_id, organization_id, role 
FROM system_users 
WHERE email ILIKE '%hdzalfonso%';
