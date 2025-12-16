-- =====================================================
-- SOLUCIÓN MULTI-TENANT: Crear usuario Rita en tabla users
-- =====================================================
-- Este script determina automáticamente el organization_id correcto
-- y crea el registro respetando el contexto multi-tenant
-- =====================================================

-- =====================================================
-- PASO 1: Verificar estado actual
-- =====================================================

-- 1.1 Verificar usuario en auth.users
DO $$
DECLARE
  v_auth_user_id UUID;
  v_email TEXT;
BEGIN
  SELECT id, email INTO v_auth_user_id, v_email
  FROM auth.users 
  WHERE email = 'rita@gmail.com'
     OR id = 'd28163ea-f601-48b3-907d-d8aa61098752';
  
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado en auth.users';
  END IF;
  
  RAISE NOTICE '✅ Usuario encontrado en auth.users: % (%)', v_email, v_auth_user_id;
END $$;

-- 1.2 Verificar si ya existe en tabla users
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = 'd28163ea-f601-48b3-907d-d8aa61098752'
         OR email = 'rita@gmail.com'
    ) 
    THEN '⚠️ Usuario YA EXISTE en tabla users'
    ELSE '✅ Usuario NO existe en tabla users (necesita creación)'
  END as estado_actual;

-- =====================================================
-- PASO 2: Determinar organization_id automáticamente
-- =====================================================

-- 2.1 Buscar organization_id más común entre usuarios activos
-- (asumiendo que Rita debe estar en la misma org que otros usuarios)
WITH org_stats AS (
  SELECT 
    organization_id,
    COUNT(*) as user_count,
    STRING_AGG(DISTINCT role::TEXT, ', ' ORDER BY role::TEXT) as roles,
    MAX(created_at) as last_user_created
  FROM users
  WHERE organization_id IS NOT NULL
    AND is_active = true
  GROUP BY organization_id
)
SELECT 
  organization_id as recommended_org_id,
  user_count,
  roles,
  last_user_created,
  '✅ Esta es la organización recomendada (más usuarios activos)' as recommendation
FROM org_stats
ORDER BY user_count DESC, last_user_created DESC
LIMIT 1;

-- 2.2 Si no hay usuarios activos, mostrar todas las organizaciones disponibles
SELECT 
  id as organization_id,
  name as organization_name,
  email as organization_email,
  created_at,
  '⚠️ No hay usuarios activos, estas son las organizaciones disponibles' as note
FROM organizations
WHERE NOT EXISTS (
  SELECT 1 FROM users 
  WHERE organization_id IS NOT NULL 
    AND is_active = true
)
ORDER BY created_at DESC;

-- =====================================================
-- PASO 3: Crear registro en users (Multi-Tenant)
-- =====================================================
-- ⚠️ IMPORTANTE: Ejecutar este bloque DESPUÉS de verificar el PASO 2
-- Reemplaza 'ORGANIZATION_ID_AQUI' con el ID recomendado del PASO 2.1

DO $$
DECLARE
  v_auth_user_id UUID := 'd28163ea-f601-48b3-907d-d8aa61098752';
  v_organization_id UUID;
  v_user_exists BOOLEAN;
BEGIN
  -- Verificar si el usuario ya existe
  SELECT EXISTS(
    SELECT 1 FROM users 
    WHERE auth_user_id = v_auth_user_id
  ) INTO v_user_exists;
  
  IF v_user_exists THEN
    RAISE NOTICE '⚠️ Usuario ya existe en tabla users. No se creará duplicado.';
    RETURN;
  END IF;
  
  -- Determinar organization_id automáticamente
  -- Opción 1: Buscar la organización más común entre usuarios activos
  SELECT organization_id INTO v_organization_id
  FROM (
    SELECT 
      organization_id,
      COUNT(*) as user_count
    FROM users
    WHERE organization_id IS NOT NULL
      AND is_active = true
    GROUP BY organization_id
    ORDER BY user_count DESC
    LIMIT 1
  ) org_stats;
  
  -- Opción 2: Si no hay usuarios activos, usar la primera organización disponible
  IF v_organization_id IS NULL THEN
    SELECT id INTO v_organization_id
    FROM organizations
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  
  -- Validar que tenemos un organization_id
  IF v_organization_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró ninguna organización disponible. Crea una organización primero.';
  END IF;
  
  -- Verificar que el organization_id existe
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = v_organization_id) THEN
    RAISE EXCEPTION 'Organization_id % no existe en la tabla organizations', v_organization_id;
  END IF;
  
  RAISE NOTICE '✅ Usando organization_id: %', v_organization_id;
  
  -- Crear el registro en users
  INSERT INTO users (
    auth_user_id,
    organization_id,
    full_name,
    email,
    role,
    phone,
    is_active
  ) VALUES (
    v_auth_user_id,
    v_organization_id,
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
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
  
  RAISE NOTICE '✅ Usuario creado exitosamente en tabla users';
  
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE '⚠️ Usuario ya existe (conflicto de clave única). No se creó duplicado.';
  WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'Error: El organization_id no existe en la tabla organizations. Verifica el PASO 2.';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al crear usuario: %', SQLERRM;
END $$;

-- =====================================================
-- PASO 4: Verificar resultado
-- =====================================================

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
  '✅ Usuario creado correctamente' as estado
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE u.auth_user_id = 'd28163ea-f601-48b3-907d-d8aa61098752';

-- =====================================================
-- PASO 5: Verificar integridad multi-tenant
-- =====================================================

-- 5.1 Ver todos los usuarios de la misma organización
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
)
ORDER BY u.created_at DESC;

-- =====================================================
-- NOTAS MULTI-TENANT:
-- =====================================================
-- ✅ organization_id se determina automáticamente:
--    1. Primero busca la organización con más usuarios activos
--    2. Si no hay usuarios, usa la organización más reciente
-- ✅ Respeta las constraints de la base de datos
-- ✅ Valida que organization_id existe antes de insertar
-- ✅ Usa ON CONFLICT para evitar duplicados
-- ✅ Mantiene integridad referencial multi-tenant
-- =====================================================

