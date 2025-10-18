# 🔧 Solución Completa: Error en Creación de Mecánicos

## 📋 Resumen del Problema

Se estaba intentando insertar mecánicos en una tabla incorrecta (`users` en lugar de `employees`), y además había problemas con las políticas RLS (Row Level Security) de Supabase.

### Error Original
```
❌ [CreateMechanic] Error de Supabase: {}
```

## ✅ Cambios Realizados en el Código

### 1. CreateMechanicModal.tsx
- ✅ Cambiado de tabla `users` a `employees`
- ✅ Eliminado campo `workshop_id` (no existe en `employees`)
- ✅ Mejorado el manejo de errores para detectar problemas de RLS
- ✅ Agregado validación cuando el error está vacío

### 2. page.tsx (Listado de Mecánicos)
- ✅ Cambiado consulta de `users` a `employees`
- ✅ Agregada lógica para obtener `organization_id` desde `workshops`
- ✅ Actualizado método de activar/desactivar

## 🔐 Paso Crítico: Arreglar Políticas RLS

El error de objeto vacío `{}` generalmente indica un problema con las políticas de seguridad de Supabase. 

### Ejecuta este Script en Supabase

Ve a tu panel de Supabase → SQL Editor y ejecuta el archivo `fix_employees_rls.sql`:

```sql
-- 1. Eliminar política existente si existe
DROP POLICY IF EXISTS "employees_org_policy" ON public.employees;

-- 2. Crear nueva política que permita acceso basado en organization_id
CREATE POLICY "employees_access_policy" ON public.employees
FOR ALL
USING (
  organization_id IN (
    SELECT w.organization_id 
    FROM public.workshops w
    INNER JOIN public.users u ON u.workshop_id = w.id
    WHERE u.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT w.organization_id 
    FROM public.workshops w
    INNER JOIN public.users u ON u.workshop_id = w.id
    WHERE u.auth_user_id = auth.uid()
  )
);

-- 3. Verificar que RLS está habilitado
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
```

## 🧪 Verificación

### 1. Verifica las políticas actuales:
```sql
SELECT * FROM pg_policies WHERE tablename = 'employees';
```

### 2. Verifica que RLS está habilitado:
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'employees';
```

### 3. Verifica la estructura de la tabla:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'employees' 
ORDER BY ordinal_position;
```

## 🔍 Debugging

Si el problema persiste después de aplicar estos cambios:

### 1. Verifica los logs en la consola del navegador:
- Busca los logs que empiezan con `🔍 [CreateMechanic]`
- Revisa especialmente el log `📋 [CreateMechanic] Datos a insertar`
- Verifica que `organization_id` tenga un valor válido (no `null` o `undefined`)

### 2. Verifica tu perfil de usuario:
```sql
SELECT * FROM public.users WHERE auth_user_id = auth.uid();
```

### 3. Verifica que tu workshop tenga organization_id:
```sql
SELECT id, name, organization_id FROM public.workshops;
```

### 4. Prueba insertar manualmente:
```sql
-- Reemplaza con tus valores reales
INSERT INTO public.employees (
  organization_id,
  name,
  email,
  phone,
  role,
  is_active
) VALUES (
  'tu-organization-id-aqui',
  'Test Mechanic',
  'test@example.com',
  '1234567890',
  'mechanic',
  true
);
```

## 📊 Estructura Correcta de `employees`

```sql
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,  -- ✅ Requerido
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    role TEXT CHECK (role IN ('mechanic', 'supervisor', 'admin', 'receptionist')),
    specialties TEXT[] DEFAULT '{}',
    hourly_rate DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    hire_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🚀 Próximos Pasos

1. **Ejecuta el script SQL** (`fix_employees_rls.sql`) en Supabase
2. **Recarga tu aplicación** (Ctrl+F5 o Cmd+Shift+R)
3. **Intenta crear un mecánico nuevamente**
4. **Revisa los nuevos logs** en la consola

## 💡 Mensaje de Error Mejorado

Ahora, si el error persiste, verás un mensaje más descriptivo:
```
Error de permisos: Verifica las políticas RLS de la tabla employees
```

O:
```
No se pudo crear el mecánico. Verifica los permisos de la tabla.
```

## 📞 Si el Problema Persiste

Si después de aplicar todos estos cambios el problema continúa:

1. **Verifica que la tabla `workshops` tiene la columna `organization_id`**
2. **Verifica que tu usuario tiene un `workshop_id` válido**
3. **Verifica que ese workshop tiene un `organization_id` válido**
4. **Considera deshabilitar temporalmente RLS para debugging:**
   ```sql
   ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
   ```
   ⚠️ **IMPORTANTE**: Solo para desarrollo. ¡No hagas esto en producción!

## 📝 Notas Adicionales

- La tabla `employees` usa `organization_id`, no `workshop_id`
- Las políticas RLS vinculan usuarios → workshops → organizations → employees
- El error vacío `{}` es típico de violaciones de políticas RLS en Supabase
- Los cambios en el código ya están aplicados, solo falta el script SQL

---

**Archivos modificados:**
- ✅ `src/components/mecanicos/CreateMechanicModal.tsx`
- ✅ `src/app/mecanicos/page.tsx`
- 📄 `fix_employees_rls.sql` (nuevo, debe ejecutarse en Supabase)


