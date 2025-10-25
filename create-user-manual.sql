-- =====================================================
-- CREAR USUARIO MANUALMENTE
-- =====================================================
-- Script para crear usuario hdzalfonsodigital@gmail.com
-- Ejecutar en Supabase SQL Editor

-- 1. Crear organización (si no existe)
INSERT INTO organizations (id, name, description)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Taller Demo',
  'Organización de prueba para desarrollo'
) ON CONFLICT (id) DO NOTHING;

-- 2. Crear usuario en Supabase Auth
-- IMPORTANTE: Primero ve a Authentication → Users → Add User
-- Email: hdzalfonsodigital@gmail.com
-- Password: Gabyyluis2025@%
-- Auto Confirm User: ✅ (marcado)
-- Luego copia el UUID y reemplaza 'USER_UUID_AQUI' abajo

-- 3. Crear perfil del usuario (reemplaza USER_UUID_AQUI con el UUID real)
INSERT INTO user_profiles (
  id, 
  organization_id, 
  role, 
  full_name,
  is_active,
  email_verified,
  preferences,
  metadata
)
VALUES (
  'USER_UUID_AQUI',  -- ⚠️ REEMPLAZA CON EL UUID REAL DEL USUARIO
  '00000000-0000-0000-0000-000000000001',
  'admin',
  'Luis Díaz',
  true,
  true,
  '{}',
  '{"is_demo_user": true, "created_by": "manual_setup"}'
) ON CONFLICT (id) DO NOTHING;

-- 4. Verificar que todo se creó correctamente
SELECT 
  o.id as org_id,
  o.name as org_name,
  up.id as user_id,
  up.full_name,
  up.role,
  up.is_active,
  up.email_verified
FROM organizations o
LEFT JOIN user_profiles up ON up.organization_id = o.id
WHERE o.id = '00000000-0000-0000-0000-000000000001';

-- =====================================================
-- INSTRUCCIONES PASO A PASO:
-- =====================================================
-- 1. Ve al dashboard de Supabase → Authentication → Users
-- 2. Haz clic en "Add User"
-- 3. Ingresa:
--    - Email: hdzalfonsodigital@gmail.com
--    - Password: Gabyyluis2025@%
--    - Auto Confirm User: ✅ (marcado)
-- 4. Haz clic en "Create User"
-- 5. Copia el UUID del usuario creado
-- 6. Reemplaza 'USER_UUID_AQUI' en el script de arriba
-- 7. Ejecuta el script completo en SQL Editor
-- 8. Verifica que el usuario aparezca en la consulta final
-- =====================================================















