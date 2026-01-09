-- ============================================================================
-- MIGRACIÓN 025: Política RLS para ver usuarios de la misma organización
-- ============================================================================
-- Objetivo: Permitir que los usuarios autenticados vean otros usuarios
--           de su misma organización (necesario para dropdowns de mecánicos,
--           asignación de órdenes, etc.)
-- Fecha: 2025-01-XX
-- ============================================================================

-- ============================================================================
-- PARTE 1: Crear función helper para obtener organization_id del usuario
-- ============================================================================

-- Función que obtiene el organization_id del usuario autenticado desde la tabla users
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_org_id UUID;
BEGIN
    SELECT organization_id INTO v_org_id
    FROM public.users
    WHERE auth_user_id = auth.uid()
    LIMIT 1;
    
    RETURN v_org_id;
END;
$$;

-- ============================================================================
-- PARTE 2: Agregar política RLS para ver usuarios de la misma organización
-- ============================================================================

-- Política para que los usuarios puedan ver otros usuarios de su organización
-- Esto es necesario para:
-- - Dropdown de asignación de mecánicos en órdenes de trabajo
-- - Listado de empleados/mecánicos
-- - Gestión de usuarios por administradores
DO $$
BEGIN
    -- Eliminar política si existe para recrearla
    DROP POLICY IF EXISTS "Users can view organization users" ON public.users;
    
    -- Crear nueva política
    CREATE POLICY "Users can view organization users" ON public.users
        FOR SELECT
        USING (
            -- El usuario puede ver su propio perfil
            auth_user_id = auth.uid()
            OR
            -- O puede ver usuarios de su misma organización
            (
                organization_id IS NOT NULL
                AND organization_id = get_user_organization_id()
                AND get_user_organization_id() IS NOT NULL
            )
        );
    
    RAISE NOTICE 'Política RLS "Users can view organization users" creada';
END $$;

-- ============================================================================
-- PARTE 3: Comentarios de documentación
-- ============================================================================

COMMENT ON POLICY "Users can view organization users" ON public.users IS 
'Permite a los usuarios autenticados ver otros usuarios de su misma organización. 
Necesario para funcionalidades como:
- Dropdown de asignación de mecánicos en órdenes de trabajo
- Listado de empleados/mecánicos
- Gestión de usuarios por administradores

La política permite ver:
1. Su propio perfil (auth_user_id = auth.uid())
2. Otros usuarios de la misma organización (organization_id coincide)';

-- ============================================================================
-- PARTE 4: Verificación
-- ============================================================================

-- Verificar que la política fue creada
SELECT 
    'VERIFICACIÓN DE POLÍTICA RLS' as status,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'users'
  AND policyname = 'Users can view organization users';

