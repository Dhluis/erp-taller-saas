-- =====================================================
-- MIGRACIÓN 022: Fix RLS para Workshops durante Onboarding
-- Fecha: 2025-01-XX
-- Objetivo: Permitir que usuarios creen workshops durante onboarding
-- =====================================================

-- =====================================================
-- PARTE 1: ELIMINAR POLÍTICAS EXISTENTES (si existen)
-- =====================================================

-- Eliminar políticas existentes que puedan estar bloqueando
DROP POLICY IF EXISTS "Enable all for workshops" ON public.workshops;
DROP POLICY IF EXISTS "workshops_access_policy" ON public.workshops;
DROP POLICY IF EXISTS "Users can insert workshops" ON public.workshops;
DROP POLICY IF EXISTS "Users can view workshops" ON public.workshops;
DROP POLICY IF EXISTS "Users can update workshops" ON public.workshops;
DROP POLICY IF EXISTS "Users can delete workshops" ON public.workshops;

-- =====================================================
-- PARTE 2: CREAR POLÍTICAS RLS PARA WORKSHOPS
-- =====================================================

-- Política para SELECT: Usuarios pueden ver workshops de su organización
CREATE POLICY "workshops_select_policy" ON public.workshops
FOR SELECT
USING (
  -- Pueden ver workshops de su organización
  organization_id IN (
    SELECT u.organization_id 
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
    AND u.organization_id IS NOT NULL
  )
  OR
  -- O si están en onboarding (sin organization_id aún), pueden ver workshops que acaban de crear
  -- (esto permite verificar que se creó correctamente)
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_user_id = auth.uid()
    AND u.organization_id IS NULL
  )
);

-- Política para INSERT: Permitir crear workshops durante onboarding o para su organización
CREATE POLICY "workshops_insert_policy" ON public.workshops
FOR INSERT
WITH CHECK (
  -- Caso 1: Usuario en onboarding (sin organization_id) puede crear workshops
  -- Esto permite crear el workshop durante el proceso de onboarding
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_user_id = auth.uid()
    AND u.organization_id IS NULL
  )
  OR
  -- Caso 2: Usuario con organización puede crear workshops para su organización
  organization_id IN (
    SELECT u.organization_id 
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
    AND u.organization_id IS NOT NULL
  )
);

-- Política para UPDATE: Usuarios pueden actualizar workshops de su organización
CREATE POLICY "workshops_update_policy" ON public.workshops
FOR UPDATE
USING (
  organization_id IN (
    SELECT u.organization_id 
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
    AND u.organization_id IS NOT NULL
  )
)
WITH CHECK (
  organization_id IN (
    SELECT u.organization_id 
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
    AND u.organization_id IS NOT NULL
  )
);

-- Política para DELETE: Usuarios pueden eliminar workshops de su organización
CREATE POLICY "workshops_delete_policy" ON public.workshops
FOR DELETE
USING (
  organization_id IN (
    SELECT u.organization_id 
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
    AND u.organization_id IS NOT NULL
  )
);

-- =====================================================
-- PARTE 3: VERIFICAR QUE RLS ESTÁ HABILITADO
-- =====================================================

ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PARTE 4: FIX RLS PARA ORGANIZATIONS (onboarding)
-- =====================================================

-- Eliminar políticas existentes que puedan estar bloqueando
DROP POLICY IF EXISTS "Enable all for organizations" ON public.organizations;
DROP POLICY IF EXISTS "organizations_insert_policy" ON public.organizations;
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can update their organizations" ON public.organizations;

-- Política para INSERT: Permitir crear organizaciones durante onboarding
CREATE POLICY "organizations_insert_policy" ON public.organizations
FOR INSERT
WITH CHECK (
  -- Permitir a usuarios autenticados crear organizaciones durante onboarding
  -- (cuando no tienen organization_id aún)
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_user_id = auth.uid()
    AND u.organization_id IS NULL
  )
  OR
  -- O si ya tienen organización, pueden crear organizaciones adicionales
  -- (para casos de multi-tenant avanzado)
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_user_id = auth.uid()
    AND u.organization_id IS NOT NULL
  )
);

-- Política para SELECT: Usuarios pueden ver sus organizaciones
CREATE POLICY "organizations_select_policy" ON public.organizations
FOR SELECT
USING (
  -- Pueden ver organizaciones que les pertenecen
  id IN (
    SELECT u.organization_id 
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
    AND u.organization_id IS NOT NULL
  )
  OR
  -- O si están en onboarding, pueden ver organizaciones que acaban de crear
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_user_id = auth.uid()
    AND u.organization_id IS NULL
  )
);

-- Política para UPDATE: Usuarios pueden actualizar sus organizaciones
CREATE POLICY "organizations_update_policy" ON public.organizations
FOR UPDATE
USING (
  id IN (
    SELECT u.organization_id 
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
    AND u.organization_id IS NOT NULL
  )
)
WITH CHECK (
  id IN (
    SELECT u.organization_id 
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
    AND u.organization_id IS NOT NULL
  )
);

-- Política para DELETE: Usuarios pueden eliminar sus organizaciones
CREATE POLICY "organizations_delete_policy" ON public.organizations
FOR DELETE
USING (
  id IN (
    SELECT u.organization_id 
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
    AND u.organization_id IS NOT NULL
  )
);

-- Asegurar que RLS está habilitado
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PARTE 5: VERIFICACIÓN
-- =====================================================

-- Verificar políticas de workshops
SELECT 
    'VERIFICACIÓN DE POLÍTICAS RLS - WORKSHOPS' as status,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'workshops'
ORDER BY policyname;

-- Verificar políticas de organizations
SELECT 
    'VERIFICACIÓN DE POLÍTICAS RLS - ORGANIZATIONS' as status,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'organizations'
ORDER BY policyname;





