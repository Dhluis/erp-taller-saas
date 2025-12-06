# 🔍 Diagnóstico: Problema de Inicio de Sesión

**Fecha:** 2025-01-XX  
**Problema:** Usuarios no pueden iniciar sesión correctamente

---

## ❌ PROBLEMA REPORTADO

- Usuario existe en `auth.users` (email confirmado)
- Usuario existe en `public.users`
- Al hacer login, la consola muestra "Usuario no autenticado" repetidamente
- El SessionContext no detecta al usuario

---

## 🔍 ARCHIVOS MODIFICADOS PARA DIAGNÓSTICO

### 1. `src/lib/context/SessionContext.tsx`

**Logs agregados:**
- ✅ `[Session] Paso 1: Obteniendo usuario autenticado...`
- ✅ `[Session] Usuario autenticado encontrado: { id, email, email_confirmed }`
- ✅ `[Session] Paso 2: Buscando perfil en tabla users...`
- ✅ `[Session] Buscando perfil para auth_user_id: {user.id}`
- ✅ `[Session] Perfil encontrado: { detalles completos }`
- ✅ `[Session] Organization ID del perfil: {organization_id}`
- ✅ `[Session] IDs extraídos del perfil: {organizationId, workshopId}`

**Mejoras:**
- Manejo de errores más detallado con códigos de error
- Fallback para buscar perfil por email si falla con `auth_user_id`
- Logs de errores con códigos específicos (PGRST116 = no encontrado)

---

### 2. `src/app/auth/login/page.tsx`

**Cambios:**
- Agregado delay de 500ms después del login para asegurar que la sesión se establezca
- Logs agregados: `✅ [Login] Login exitoso, esperando establecimiento de sesión...`
- Logs agregados: `🔄 [Login] Redirigiendo a: {redirectTo}`

---

## 🔍 DIAGNÓSTICO REQUERIDO

### Verificar en la consola del navegador:

1. **Después de hacer login, buscar estos logs:**

```
✅ [Login] Login exitoso, esperando establecimiento de sesión...
🔄 [Login] Redirigiendo a: /dashboard
🚀 [Session] SessionProvider montado
🔄 [Session] Iniciando carga de sesión...
🔍 [Session] Paso 1: Obteniendo usuario autenticado...
✅ [Session] Usuario autenticado encontrado: { id, email, email_confirmed }
🔍 [Session] Paso 2: Buscando perfil en tabla users...
🔍 [Session] Buscando perfil para auth_user_id: {user.id}
```

2. **Si falla, deberías ver:**

```
❌ [Session] Error obteniendo perfil: {
  code: 'PGRST116',  // = No encontrado
  message: '...',
  details: '...',
  hint: '...'
}
```

3. **Si el perfil existe pero hay otro problema:**

```
❌ [Session] PERFIL NO ENCONTRADO - El usuario no tiene registro en public.users
🔍 [Session] Verificar que existe un registro en public.users con:
   - auth_user_id = {user.id}
   - email = {user.email}
```

---

## 🔧 POSIBLES PROBLEMAS Y SOLUCIONES

### Problema 1: La tabla `users` no tiene columna `auth_user_id`

**Síntoma:**
- Error code: `42703` (column does not exist)

**Solución:**
- Verificar la estructura de la tabla `users`
- Ejecutar migración para agregar la columna si falta

---

### Problema 2: El perfil no existe para el usuario

**Síntoma:**
- Error code: `PGRST116` (no rows returned)
- Log: `PERFIL NO ENCONTRADO`

**Solución:**
- Verificar que existe un registro en `public.users` con `auth_user_id = {user.id}`
- Si no existe, crear el perfil manualmente o usar el trigger

---

### Problema 3: La sesión no se establece correctamente

**Síntoma:**
- Después del login, `supabase.auth.getUser()` retorna null

**Solución:**
- Verificar cookies del navegador
- Verificar que `signInWithPassword` retorna sesión válida
- Verificar configuración de Supabase (Site URL, Redirect URLs)

---

### Problema 4: RLS está bloqueando la consulta

**Síntoma:**
- Error code: `42501` (permission denied)
- La consulta falla silenciosamente

**Solución:**
- Verificar políticas RLS en la tabla `users`
- Asegurar que el usuario puede leer su propio perfil

---

## 📋 CHECKLIST DE VERIFICACIÓN

### 1. Verificar estructura de tabla `users`:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;
```

**Debe tener:**
- `id` (UUID)
- `auth_user_id` (UUID) - **CRÍTICO**
- `email` (VARCHAR/TEXT)
- `organization_id` (UUID)
- `workshop_id` (UUID, opcional)

---

### 2. Verificar que el usuario tiene perfil:

```sql
SELECT 
    u.id,
    u.auth_user_id,
    u.email,
    u.organization_id,
    u.workshop_id,
    au.id as auth_users_id,
    au.email as auth_email
FROM public.users u
FULL OUTER JOIN auth.users au ON au.id = u.auth_user_id
WHERE au.email = 'TU_EMAIL_AQUI';
```

**Debe mostrar:**
- Un registro con `auth_user_id` que coincida con `auth.users.id`
- `organization_id` no nulo (o null si necesita onboarding)

---

### 3. Verificar políticas RLS:

```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'users';
```

**Debe haber políticas que permitan:**
- Usuario leer su propio perfil: `auth_user_id = auth.uid()`
- Usuario actualizar su propio perfil

---

## 🎯 PRÓXIMOS PASOS

1. **Hacer login y revisar logs en la consola**
2. **Identificar el error específico** de los logs
3. **Ejecutar queries de verificación** en Supabase SQL Editor
4. **Reportar el error específico** para corregirlo

---

---

## 📝 CAMBIOS IMPLEMENTADOS

### SessionContext.tsx:
1. ✅ Logs detallados en cada paso del proceso
2. ✅ Manejo de errores mejorado con códigos específicos
3. ✅ Fallback para buscar perfil por email si falla con `auth_user_id`
4. ✅ Logs específicos cuando el perfil no se encuentra
5. ✅ Verificación de `organization_id` antes de finalizar

### login/page.tsx:
1. ✅ Delay de 500ms después del login para asegurar sesión
2. ✅ Logs del proceso de login
3. ✅ Logs antes de redirigir

### callback/route.ts:
1. ✅ Logs detallados del proceso de callback
2. ✅ Verificación de sesión después de verificar token
3. ✅ Manejo de errores mejorado

---

## 🧪 CÓMO DIAGNOSTICAR

### Paso 1: Abrir consola del navegador
- Abre DevTools (F12)
- Ve a la pestaña "Console"

### Paso 2: Intentar hacer login
- Ingresa email y contraseña
- Haz clic en "Iniciar Sesión"
- Observa los logs en la consola

### Paso 3: Buscar estos logs específicos

**✅ Si todo funciona:**
```
✅ [Login] Login exitoso
✅ [Session] Usuario autenticado encontrado
✅ [Session] Perfil encontrado
✅ [Session] Sesión completamente cargada
```

**❌ Si hay problema:**
```
❌ [Session] Error obteniendo perfil: { código, mensaje }
❌ [Session] PERFIL NO ENCONTRADO
```

### Paso 4: Ejecutar script SQL de diagnóstico
- Abre Supabase SQL Editor
- Ejecuta `scripts/DIAGNOSTICO_LOGIN.sql`
- Revisa los resultados

---

## 🔍 QUÉ BUSCAR EN LOS LOGS

1. **Si ves "Usuario no autenticado":**
   - Verifica que el login realmente fue exitoso
   - Revisa si hay errores de cookies
   - Verifica configuración de Supabase

2. **Si ves "Perfil no encontrado":**
   - El usuario no tiene registro en `public.users`
   - O la columna `auth_user_id` no coincide
   - Ejecuta el script SQL para verificar

3. **Si ves errores de RLS:**
   - Las políticas están bloqueando la consulta
   - Necesitas ajustar las políticas RLS

---

**FIN DEL DIAGNÓSTICO**
