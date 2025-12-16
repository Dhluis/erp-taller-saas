-- =====================================================
-- VERIFICAR SI RITA FUE CREADA CORRECTAMENTE
-- =====================================================
-- Ejecuta esto para verificar el resultado completo
-- =====================================================

-- 1. Verificar si existe en tabla users
SELECT 
  u.id,
  u.auth_user_id,
  u.organization_id,
  o.name as organization_name,
  u.full_name,
  u.email,
  u.role,
  u.phone,
  u.is_active,
  u.created_at,
  u.updated_at,
  CASE 
    WHEN u.id IS NOT NULL THEN '✅ Usuario EXISTE en tabla users'
    ELSE '❌ Usuario NO existe en tabla users'
  END as estado
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE u.auth_user_id = 'd28163ea-f601-48b3-907d-d8aa61098752'
   OR u.email = 'rita@gmail.com';

-- 2. Si NO existe, ejecutar SOLO el bloque de creación (PASO 3 del script anterior)
-- El bloque DO $$ que crea el usuario automáticamente

-- 3. Ver todos los usuarios de la organización de Rita (si existe)
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.is_active,
  o.name as organization_name
FROM users u
JOIN organizations o ON u.organization_id = o.id
WHERE u.organization_id = (
  SELECT organization_id 
  FROM users 
  WHERE auth_user_id = 'd28163ea-f601-48b3-907d-d8aa61098752'
  LIMIT 1
)
ORDER BY u.created_at DESC;

