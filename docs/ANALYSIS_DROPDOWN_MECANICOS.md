# 🔍 ANÁLISIS COMPLETO: Dropdown de Mecánicos Vacío

**Fecha:** 2026-01-06  
**Problema:** El dropdown de "Asignar Mecánico" está vacío aunque Supabase SQL Editor devuelve 1 mecánico  
**Componente:** `src/components/ordenes/CreateWorkOrderModal.tsx`  
**Función:** `loadEmployees()`

---

## 📋 CONTEXTO DEL PROBLEMA

### **Síntomas:**
- ✅ Dropdown muestra: "No hay mecánicos disponibles"
- ✅ Log muestra: `total: 0, hasMultipleWorkshops: false, workshopId: "sin filtro workshop"`
- ✅ En Supabase SQL Editor, la query SÍ devuelve 1 mecánico (Nan Quiroz)
- ✅ Política RLS `"Users can view organization users"` existe y está activa
- ✅ Migración 025 ejecutada correctamente

### **Query que funciona en Supabase SQL Editor:**
```sql
SELECT id, full_name, email, role, workshop_id, organization_id, is_active
FROM users
WHERE organization_id = 'b3962fe4-d238-42bc-9455-4ed84a38c6b4'
  AND role IN ('MECANICO', 'ASESOR')
  AND is_active = true
ORDER BY full_name ASC;
-- ✅ Devuelve 1 registro: Nan Quiroz
```

---

## 🔬 ANÁLISIS DEL CÓDIGO ACTUAL

### **1. Cliente Supabase Usado**

```typescript
// Línea 223: src/components/ordenes/CreateWorkOrderModal.tsx
const supabase = createClient()
```

**Origen:** `src/lib/supabase/client.ts`
- ✅ Usa `createBrowserClient` de `@supabase/ssr`
- ✅ Configurado con `autoRefreshToken: true` y `persistSession: true`
- ✅ Debería tener la sesión del usuario automáticamente

**Problema potencial:** El cliente se crea una sola vez al montar el componente, pero la sesión puede no estar lista todavía.

---

### **2. Función loadEmployees() - Código Actual**

```typescript
// Líneas 437-542: src/components/ordenes/CreateWorkOrderModal.tsx
const loadEmployees = useCallback(async () => {
  if (!organizationId) {
    console.warn('⚠️ [loadEmployees] No hay organizationId disponible')
    setEmployees([])
    setLoadingEmployees(false)
    return
  }

  try {
    setLoadingEmployees(true)

    const assignableRoles = ['MECANICO', 'ASESOR']
    console.log('🔍 [loadEmployees] Buscando empleados asignables con:', {
      organizationId,
      roles: assignableRoles,
      is_active: true
    })
    
    const { data: mechanics, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, workshop_id, organization_id, is_active')
      .eq('organization_id', organizationId)
      .in('role', assignableRoles)
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    if (error) {
      console.error('❌ [loadEmployees] Error cargando empleados:', error)
      // ... más logs
      throw error
    }

    console.log('📊 [loadEmployees] Resultado raw de Supabase:', {
      mechanicsCount: mechanics?.length || 0,
      mechanics: mechanics,
      error: error
    })

    // ... resto del código
  } catch (error) {
    // ... manejo de errores
  } finally {
    setLoadingEmployees(false)
  }
}, [organizationId, sessionWorkshopId, hasMultipleWorkshops, supabase])
```

**Análisis:**
- ✅ Query correcta: tabla `users`, roles `MECANICO` y `ASESOR`
- ✅ Filtros correctos: `organization_id`, `role`, `is_active`
- ❌ **PROBLEMA CRÍTICO:** No verifica si el usuario está autenticado antes de ejecutar la query
- ❌ **PROBLEMA CRÍTICO:** No verifica si la sesión está lista
- ❌ **PROBLEMA CRÍTICO:** No verifica si el cliente tiene la sesión del usuario

---

### **3. Dependencias del useEffect**

```typescript
// Líneas 544-553: src/components/ordenes/CreateWorkOrderModal.tsx
useEffect(() => {
  if (open) {
    loadSystemUsers()
    loadEmployees()
  }
}, [open, loadSystemUsers, loadEmployees])
```

**Análisis:**
- ✅ Se ejecuta cuando el modal se abre
- ❌ **PROBLEMA:** No verifica si `organizationId` está disponible
- ❌ **PROBLEMA:** No verifica si el usuario está autenticado
- ❌ **PROBLEMA:** No verifica si la sesión está lista

---

## 🐛 CAUSAS RAÍZ IDENTIFICADAS

### **Causa #1: Sesión del Usuario No Disponible (MÁS PROBABLE)**

**Problema:**
- El cliente `createBrowserClient` puede no tener la sesión del usuario cuando se ejecuta `loadEmployees()`
- La política RLS `"Users can view organization users"` requiere que el usuario esté autenticado
- Si no hay sesión, RLS bloquea la query y devuelve array vacío

**Evidencia:**
- La query funciona en Supabase SQL Editor (usa service role, bypass RLS)
- La query falla en el componente React (usa anon key, requiere RLS)

**Solución:**
```typescript
// ✅ VERIFICAR SESIÓN ANTES DE EJECUTAR QUERY
const { data: { session }, error: sessionError } = await supabase.auth.getSession()
if (!session || sessionError) {
  console.error('❌ [loadEmployees] Usuario no autenticado:', sessionError)
  setEmployees([])
  return
}
```

---

### **Causa #2: Timing - Sesión No Lista**

**Problema:**
- El componente se monta antes de que la sesión esté completamente cargada
- `loadEmployees()` se ejecuta antes de que el usuario esté autenticado
- RLS bloquea la query porque no hay `auth.uid()` disponible

**Evidencia:**
- El log muestra `total: 0` inmediatamente
- No hay errores en la consola (RLS silenciosamente bloquea)

**Solución:**
```typescript
// ✅ ESPERAR A QUE LA SESIÓN ESTÉ LISTA
const { user, profile, ready } = useAuth()
useEffect(() => {
  if (open && ready && user && organizationId) {
    loadEmployees()
  }
}, [open, ready, user, organizationId, loadEmployees])
```

---

### **Causa #3: Cliente Supabase Sin Sesión**

**Problema:**
- `createClient()` crea un cliente singleton que puede no tener la sesión actualizada
- El cliente se crea una vez y se reutiliza, pero la sesión puede cambiar
- Si la sesión expira o se refresca, el cliente puede quedar desincronizado

**Evidencia:**
- El cliente se crea en el nivel del componente (línea 223)
- No se verifica la sesión antes de usarlo

**Solución:**
```typescript
// ✅ OBTENER SESIÓN FRESCA ANTES DE CADA QUERY
const { data: { session } } = await supabase.auth.getSession()
if (!session) {
  console.error('❌ [loadEmployees] No hay sesión disponible')
  return
}
```

---

### **Causa #4: Política RLS No Funciona Correctamente**

**Problema:**
- La política RLS puede no estar funcionando correctamente con el cliente del navegador
- La función `get_user_organization_id()` puede no estar retornando el `organization_id` correcto
- El `auth.uid()` puede no coincidir con el `auth_user_id` en la tabla `users`

**Evidencia:**
- La política existe y está activa
- Pero puede haber un problema con cómo se obtiene el `organization_id` del usuario autenticado

**Solución:**
```sql
-- ✅ VERIFICAR QUE LA FUNCIÓN FUNCIONA CORRECTAMENTE
SELECT get_user_organization_id() as org_id;

-- ✅ VERIFICAR QUE auth.uid() COINCIDE CON auth_user_id
SELECT 
  auth.uid() as current_auth_uid,
  auth_user_id,
  organization_id
FROM users
WHERE auth_user_id = auth.uid();
```

---

## ✅ SOLUCIÓN PROPUESTA (FIX COMPLETO)

### **Fix #1: Verificar Sesión Antes de Query**

```typescript
const loadEmployees = useCallback(async () => {
  if (!organizationId) {
    console.warn('⚠️ [loadEmployees] No hay organizationId disponible')
    setEmployees([])
    setLoadingEmployees(false)
    return
  }

  try {
    setLoadingEmployees(true)

    // ✅ FIX 1: Verificar que el usuario esté autenticado
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (!session || sessionError) {
      console.error('❌ [loadEmployees] Usuario no autenticado:', {
        sessionError,
        hasSession: !!session,
        userId: session?.user?.id
      })
      setEmployees([])
      setLoadingEmployees(false)
      return
    }

    console.log('✅ [loadEmployees] Usuario autenticado:', {
      userId: session.user.id,
      email: session.user.email,
      organizationId
    })

    const assignableRoles = ['MECANICO', 'ASESOR']
    console.log('🔍 [loadEmployees] Buscando empleados asignables con:', {
      organizationId,
      roles: assignableRoles,
      is_active: true,
      userId: session.user.id // ✅ Agregar userId al log
    })
    
    const { data: mechanics, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, workshop_id, organization_id, is_active')
      .eq('organization_id', organizationId)
      .in('role', assignableRoles)
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    if (error) {
      console.error('❌ [loadEmployees] Error cargando empleados:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        userId: session.user.id,
        organizationId
      })
      throw error
    }

    console.log('📊 [loadEmployees] Resultado raw de Supabase:', {
      mechanicsCount: mechanics?.length || 0,
      mechanics: mechanics,
      error: error,
      userId: session.user.id // ✅ Agregar userId al log
    })

    // ... resto del código sin cambios
  } catch (error) {
    console.error('❌ [loadEmployees] Error general:', error)
    setEmployees([])
  } finally {
    setLoadingEmployees(false)
  }
}, [organizationId, sessionWorkshopId, hasMultipleWorkshops, supabase])
```

---

### **Fix #2: Esperar a que la Sesión Esté Lista**

```typescript
// ✅ Obtener estado de autenticación del hook
const { user, profile, ready } = useAuth()

// ✅ Modificar useEffect para esperar a que la sesión esté lista
useEffect(() => {
  if (open && ready && user && organizationId) {
    console.log('✅ [useEffect] Condiciones cumplidas para cargar empleados:', {
      open,
      ready,
      hasUser: !!user,
      userId: user?.id,
      organizationId
    })
    loadSystemUsers()
    loadEmployees()
  } else {
    console.log('⏳ [useEffect] Esperando condiciones:', {
      open,
      ready,
      hasUser: !!user,
      organizationId
    })
  }
}, [open, ready, user, organizationId, loadSystemUsers, loadEmployees])
```

---

### **Fix #3: Agregar Logs de Debugging Detallados**

```typescript
// ✅ Agregar al inicio de loadEmployees()
console.log('🔍 [loadEmployees] Estado inicial:', {
  organizationId,
  hasSupabaseClient: !!supabase,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
  timestamp: new Date().toISOString()
})

// ✅ Verificar sesión con más detalle
const { data: { session }, error: sessionError } = await supabase.auth.getSession()
console.log('🔐 [loadEmployees] Estado de sesión:', {
  hasSession: !!session,
  userId: session?.user?.id,
  userEmail: session?.user?.email,
  sessionError: sessionError?.message,
  accessToken: session?.access_token ? 'present' : 'missing'
})
```

---

## 🧪 VERIFICACIÓN Y TESTING

### **Paso 1: Verificar Sesión en Consola del Navegador**

```javascript
// Ejecutar en la consola del navegador cuando el modal esté abierto
const { createClient } = await import('/src/lib/supabase/client')
const supabase = createClient()
const { data: { session } } = await supabase.auth.getSession()
console.log('Sesión:', session)
console.log('Usuario ID:', session?.user?.id)
console.log('Email:', session?.user?.email)
```

### **Paso 2: Verificar Query Directa con Cliente del Navegador**

```javascript
// Ejecutar en la consola del navegador
const { createClient } = await import('/src/lib/supabase/client')
const supabase = createClient()
const { data, error } = await supabase
  .from('users')
  .select('id, full_name, email, role, organization_id, is_active')
  .eq('organization_id', 'b3962fe4-d238-42bc-9455-4ed84a38c6b4')
  .in('role', ['MECANICO', 'ASESOR'])
  .eq('is_active', true)
console.log('Resultado:', data)
console.log('Error:', error)
```

### **Paso 3: Verificar Política RLS**

```sql
-- Ejecutar en Supabase SQL Editor
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'users'
  AND policyname = 'Users can view organization users';

-- Verificar que la función funciona
SELECT get_user_organization_id() as org_id;
```

---

## 📊 COMPARACIÓN: Código Actual vs Fix Propuesto

| Aspecto | Código Actual | Fix Propuesto |
|---------|---------------|---------------|
| **Verificación de sesión** | ❌ No verifica | ✅ Verifica antes de query |
| **Espera a que sesión esté lista** | ❌ No espera | ✅ Espera con `ready` y `user` |
| **Logs de debugging** | ⚠️ Básicos | ✅ Detallados con userId |
| **Manejo de errores de sesión** | ❌ No maneja | ✅ Maneja y retorna early |
| **Verificación de autenticación** | ❌ No verifica | ✅ Verifica con `getSession()` |

---

## 🎯 PRIORIDAD DE FIXES

### **ALTA PRIORIDAD (Implementar primero):**
1. ✅ **Fix #1:** Verificar sesión antes de query
2. ✅ **Fix #2:** Esperar a que la sesión esté lista

### **MEDIA PRIORIDAD (Implementar después):**
3. ✅ **Fix #3:** Agregar logs de debugging detallados

### **BAJA PRIORIDAD (Si persiste el problema):**
4. ⚠️ Verificar política RLS en Supabase
5. ⚠️ Verificar función `get_user_organization_id()`

---

## 🔍 DIAGNÓSTICO ADICIONAL

Si después de implementar los fixes el problema persiste, verificar:

1. **Política RLS en Supabase:**
   ```sql
   -- Verificar que la política existe y está activa
   SELECT * FROM pg_policies WHERE tablename = 'users';
   ```

2. **Función get_user_organization_id():**
   ```sql
   -- Verificar que la función retorna el organization_id correcto
   SELECT get_user_organization_id() as org_id;
   ```

3. **Coincidencia de auth.uid() con auth_user_id:**
   ```sql
   -- Verificar que el usuario autenticado tiene un registro en users
   SELECT * FROM users WHERE auth_user_id = auth.uid();
   ```

4. **Headers de autenticación en requests:**
   - Abrir DevTools > Network
   - Filtrar por "rest/v1/users"
   - Verificar que el header `Authorization: Bearer <token>` está presente

---

## ✅ CONCLUSIÓN

**Problema más probable:** El cliente Supabase no tiene la sesión del usuario cuando se ejecuta `loadEmployees()`, causando que RLS bloquee la query silenciosamente.

**Solución recomendada:** Implementar Fix #1 y Fix #2 para verificar y esperar a que la sesión esté lista antes de ejecutar la query.

**Próximos pasos:**
1. Implementar los fixes propuestos
2. Agregar logs de debugging detallados
3. Verificar en la consola del navegador que la sesión está disponible
4. Si persiste, verificar política RLS y función `get_user_organization_id()`



