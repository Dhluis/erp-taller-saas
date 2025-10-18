-- =====================================================
-- FIX: Políticas RLS para tabla employees
-- =====================================================
-- Este script corrige las políticas de seguridad para que funcionen
-- correctamente con la estructura actual de autenticación

-- 1. Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "employees_org_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_access_policy" ON public.employees;

-- 2. Crear nueva política que permita acceso basado en workshop_id
-- Esta política verifica que el usuario tenga acceso a través de su workshop
CREATE POLICY "employees_access_policy" ON public.employees
FOR ALL
USING (
  workshop_id IN (
    SELECT u.workshop_id 
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  workshop_id IN (
    SELECT u.workshop_id 
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
  )
);

-- 3. Verificar que RLS está habilitado
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- 4. Comentarios para documentación
COMMENT ON POLICY "employees_access_policy" ON public.employees IS 
'Permite a los usuarios acceder a empleados de su organización a través de su workshop';

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Puedes ejecutar estas consultas para verificar:

-- Ver las políticas actuales:
-- SELECT * FROM pg_policies WHERE tablename = 'employees';

-- Ver si RLS está habilitado:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'employees';

