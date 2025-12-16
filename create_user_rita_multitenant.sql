-- =====================================================
-- CREAR USUARIO RITA EN TABLA users (Solución Multi-Tenant)
-- =====================================================
-- Este script crea el registro en la tabla users para rita@gmail.com
-- siguiendo el patrón multi-tenant de la aplicación
-- =====================================================

-- =====================================================
-- PASO 1: Verificar estado actual
-- =====================================================

-- 1.1 Usuario en auth.users
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  raw_user_meta_data->>'organization_id' as metadata_org_id
FROM auth.users 
WHERE email = 'rita@gmail.com'
   OR id = 'd28163ea-f601-48b3-907d-d8aa61098752';

-- 1.2 Usuario en tabla users
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

-- =====================================================
-- PASO 2: Determinar organization_id correcto
-- =====================================================

-- Opción A: Si Rita debe estar en la misma organización que otros usuarios existentes
-- (buscar el organization_id más común o el de un admin)
SELECT 
  organization_id,
  COUNT(*) as user_count,
  STRING_AGG(DISTINCT role, ', ') as roles
FROM users
WHERE organization_id IS NOT NULL
  AND is_active = true
GROUP BY organization_id
ORDER BY user_count DESC
LIMIT 1;

-- Opción B: Ver todas las organizaciones disponibles
SELECT 
  id,
  name,
  email,
  created_at
FROM organizations
ORDER BY created_at DESC;

-- Opción C: Si Rita fue creada por otro usuario (buscar en metadata o contexto)
-- Esto requiere información del contexto, pero podemos usar una org existente

-- =====================================================
-- PASO 3: Crear el registro en users (Multi-Tenant)
-- =====================================================

-- ⚠️ IMPORTANTE: Reemplaza 'ORGANIZATION_ID_AQUI' con el organization_id correcto
-- Puedes obtenerlo del PASO 2, Opción A o B

-- Si ya tienes el organization_id, ejecuta este INSERT:
INSERT INTO users (
  auth_user_id,
  organization_id,        -- ⚠️ CAMBIAR: Usa el organization_id correcto del PASO 2
  full_name,
  email,
  role,                   -- ADMIN, ASESOR, o MECANICO
  phone,
  is_active
) VALUES (
  'd28163ea-f601-48b3-907d-d8aa61098752',  -- auth_user_id de rita@gmail.com
  'bbca1229-2c4f-4838-b5f9-9e8a8ca79261',  -- ⚠️ VERIFICAR: organization_id correcto
  'Rita Mecánico',                          -- Nombre completo
  'rita@gmail.com',
  'MECANICO',                               -- Rol (ADMIN, ASESOR, MECANICO)
  '4443219856',                             -- Teléfono (opcional)
  true                                      -- Activo
)
ON CONFLICT (auth_user_id) DO UPDATE
SET 
  organization_id = EXCLUDED.organization_id,
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- =====================================================
-- PASO 4: Verificar que el registro se creó correctamente
-- =====================================================

SELECT 
  id,
  auth_user_id,
  organization_id,
  full_name,
  email,
  role,
  phone,
  is_active,
  created_at,
  updated_at
FROM users 
WHERE auth_user_id = 'd28163ea-f601-48b3-907d-d8aa61098752';

-- =====================================================
-- PASO 5: Verificar integridad multi-tenant
-- =====================================================

-- 5.1 Verificar que el organization_id existe en organizations
SELECT 
  u.id,
  u.email,
  u.organization_id,
  o.name as organization_name,
  o.email as organization_email
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE u.auth_user_id = 'd28163ea-f601-48b3-907d-d8aa61098752';

-- 5.2 Ver todos los usuarios de la misma organización
SELECT 
  id,
  auth_user_id,
  email,
  full_name,
  role,
  is_active
FROM users 
WHERE organization_id = (
  SELECT organization_id 
  FROM users 
  WHERE auth_user_id = 'd28163ea-f601-48b3-907d-d8aa61098752'
)
ORDER BY created_at DESC;

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 1. organization_id es OBLIGATORIO para multi-tenant
-- 2. Debe existir en la tabla organizations
-- 3. El rol debe ser uno de: ADMIN, ASESOR, MECANICO
-- 4. auth_user_id debe coincidir con auth.users.id
-- 5. El campo 'id' se genera automáticamente (NO incluirlo en INSERT)
-- =====================================================

