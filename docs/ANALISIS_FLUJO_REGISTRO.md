# 📊 Análisis del Flujo de Registro Actual

**Fecha:** 2025-01-XX  
**Objetivo:** Analizar cómo se crean usuarios, organizaciones y workshops en el registro

---

## 1. 📝 ANÁLISIS DE `/app/auth/register/page.tsx`

### Pasos del Formulario:

**Paso 1: Datos del Taller**
- Campos: `workshopName`, `workshopEmail`, `workshopPhone`, `workshopAddress`
- Validación: Solo `workshopName` y `workshopEmail` son obligatorios
- Función: `handleNextStep()` - Valida y avanza al paso 2

**Paso 2: Datos del Usuario**
- Campos: `fullName`, `email`, `phone`, `password`, `confirmPassword`
- Validación: `fullName`, `email`, `password` son obligatorios
- Función: `handleRegister()` - Procesa el registro completo

**Paso 3: Confirmación de Email**
- Muestra mensaje de confirmación
- Opción de reenviar correo
- NO redirige al dashboard

---

### Flujo de Creación en `handleRegister()`:

```typescript
// PASO 1: Crear la organización (NO workshop)
const { data: organization, error: orgError } = await supabase
  .from('organizations')
  .insert({
    name: workshopName,        // ⚠️ Usa datos del "taller" pero crea "organización"
    email: workshopEmail,
    phone: workshopPhone,
    address: workshopAddress,
  })
  .select()
  .single()

// PASO 2: Registrar usuario con la organización
const { user, session, error: signUpError } = await signUpWithProfile({
  email,
  password,
  fullName,
  organizationId: organization.id  // ✅ Pasa organization_id
})
```

**⚠️ OBSERVACIÓN IMPORTANTE:**
- El formulario pregunta por "Datos del Taller" pero crea una **organización**
- NO se crea ningún `workshop` en este flujo
- Los datos del "taller" se usan para crear la `organization`

---

### ¿Se crea en la misma transacción?

**❌ NO** - Se crean en pasos separados:

1. **Primero:** Se crea la `organization` directamente con `supabase.from('organizations').insert()`
2. **Segundo:** Se llama a `signUpWithProfile()` que:
   - Crea usuario en `auth.users` (Supabase Auth)
   - Intenta crear perfil en `system_users` (pero puede fallar silenciosamente)

**⚠️ PROBLEMA POTENCIAL:**
- Si falla el `signUp`, se elimina la organización (rollback manual)
- Si falla la creación del perfil en `system_users`, NO se hace rollback
- No hay transacción atómica

---

### ¿Qué pasa después del registro?

1. **NO redirige al dashboard** (corregido recientemente)
2. Muestra paso 3: Confirmación de email
3. Usuario debe confirmar email antes de acceder

---

## 2. 🔍 ANÁLISIS DE `/app/api/auth/register/route.ts`

### Esta API route NO se usa en el flujo actual

**Evidencia:**
- `register/page.tsx` NO llama a `/api/auth/register`
- Usa directamente `signUpWithProfile()` del cliente

**¿Qué hace esta API?**
1. Crea usuario en `auth.users` con `admin.createUser()` (auto-confirma email)
2. Crea `organization`
3. Crea `system_user` (NO `system_users`)
4. **⚠️ PROBLEMA:** Usa tabla `system_users` pero el código menciona `system_user`

**Diferencia clave:**
- API route: Usa `admin.createUser()` → auto-confirma email
- Cliente: Usa `auth.signUp()` → requiere confirmación de email

---

## 3. 🔗 VINCULACIÓN DE `auth_user_id` CON `users`

### ¿Dónde se vincula?

**Múltiples lugares intentan vincular:**

#### a) `src/lib/auth/client-auth.ts` (signUpWithProfile):
```typescript
// Intenta crear perfil en system_users
await supabase.from('system_users').insert({
  email: data.user.email!,
  name: userData.fullName,
  organization_id: userData.organizationId,
  role: 'admin',
  status: 'active',  // ⚠️ Usa 'status' pero debería ser 'is_active'
  // ❌ NO incluye auth_user_id
})
```

**⚠️ PROBLEMA:** No incluye `auth_user_id` en el insert

---

#### b) `src/lib/auth/auth-helpers.ts` (signUpWithProfile):
```typescript
// Llama a createProfileAfterSignup()
await createProfileAfterSignup(authData.user.id, userData.organizationId, {
  full_name: userData.fullName,
  role: userData.role,
  // ...
})
```

**✅ CORRECTO:** Pasa `authData.user.id` como primer parámetro

---

#### c) `src/lib/supabase/user-profiles.ts` (createProfileAfterSignup):
```typescript
const profileData: CreateUserProfileData = {
  id: userId,  // ✅ Usa userId como id (debe ser auth_user_id)
  organization_id: organizationId,
  // ...
}
```

**⚠️ AMBIGUEDAD:** 
- El parámetro se llama `userId` pero se usa como `id`
- No está claro si `id` en `user_profiles` es el `auth_user_id`

---

#### d) `src/contexts/AuthContext.tsx`:
```typescript
// Intenta crear perfil con auth_user_id
.from('users')  // ⚠️ Usa tabla 'users' no 'system_users'
.insert({
  ...profileData,
  auth_user_id: userId
})
```

**⚠️ PROBLEMA:** 
- Usa tabla `users` (que puede no existir)
- Tiene fallback para crear sin `auth_user_id`

---

### Tablas involucradas:

1. **`system_users`** - Usada en la mayoría del código
2. **`user_profiles`** - Usada en algunos lugares (migración antigua)
3. **`users`** - Mencionada en AuthContext pero puede no existir

**⚠️ CONFUSIÓN:** Hay múltiples tablas para perfiles de usuario

---

## 4. ⚠️ CONFLICTOS POTENCIALES CON TRIGGERS

### Trigger que acabamos de crear:

**`ensure_organization_id_on_insert`** en `020_COMPLETE_ORGANIZATION_PROTECTION.sql`

Este trigger:
- Se ejecuta en `BEFORE INSERT` en `customers`, `work_orders`, `products`
- Asigna `organization_id` automáticamente si es NULL
- Usa `get_user_organization_id()` para obtener la organización del usuario

---

### ¿Puede causar conflicto?

**✅ NO debería causar conflicto directo** porque:

1. **El trigger NO afecta:**
   - `organizations` (solo afecta `customers`, `work_orders`, `products`)
   - `system_users` (no está en la lista)
   - `auth.users` (no está en la lista)

2. **El flujo de registro:**
   - Crea `organization` primero (sin trigger)
   - Crea usuario en `auth.users` (sin trigger)
   - Crea perfil en `system_users` (sin trigger)

3. **El trigger solo se activa cuando:**
   - Se inserta en `customers`, `work_orders`, o `products`
   - Y el `organization_id` es NULL

---

### ⚠️ POSIBLES PROBLEMAS INDIRECTOS:

1. **Si `system_users` no tiene `organization_id`:**
   - El trigger NO se ejecuta (no está en la lista)
   - Pero el código actual intenta asignarlo manualmente

2. **Si se crea un `customer` durante el registro:**
   - El trigger se ejecutaría
   - Intentaría obtener `organization_id` del usuario
   - Pero el usuario puede no tener perfil aún

3. **Si `get_user_organization_id()` falla:**
   - El trigger puede causar error en el INSERT
   - Esto podría romper el flujo de registro si se crea un customer

---

## 5. 📋 RESUMEN DE HALLAZGOS

### ✅ Lo que funciona bien:

1. Flujo de registro tiene 3 pasos claros
2. Se crea organización antes del usuario
3. Hay rollback manual si falla el signUp
4. NO redirige al dashboard antes de confirmar email

### ⚠️ Problemas encontrados:

1. **Confusión de nombres:**
   - Formulario dice "Datos del Taller" pero crea "Organización"
   - No se crea ningún `workshop`

2. **Múltiples tablas de usuarios:**
   - `system_users` (usada principalmente)
   - `user_profiles` (migración antigua)
   - `users` (mencionada pero puede no existir)

3. **Falta `auth_user_id`:**
   - `client-auth.ts` NO incluye `auth_user_id` al crear perfil
   - Solo `auth-helpers.ts` lo incluye correctamente

4. **No hay transacción atómica:**
   - Si falla la creación del perfil, la organización queda huérfana
   - No hay rollback automático

5. **Inconsistencia en campos:**
   - `client-auth.ts` usa `status: 'active'`
   - Pero `system_users` probablemente usa `is_active: true`

6. **API route no utilizada:**
   - `/api/auth/register` existe pero no se usa
   - Tiene lógica diferente (auto-confirma email)

---

## 6. 🎯 RECOMENDACIONES

### Para evitar conflictos:

1. **Verificar que `system_users` tenga `organization_id`:**
   - El código actual lo asigna manualmente
   - Debe estar presente en el INSERT

2. **Asegurar que `auth_user_id` se incluya:**
   - Modificar `client-auth.ts` para incluir `auth_user_id`
   - O usar `auth-helpers.ts` que ya lo hace correctamente

3. **Unificar tablas de usuarios:**
   - Decidir si usar `system_users` o `user_profiles`
   - Eliminar referencias a tablas no utilizadas

4. **Agregar transacción:**
   - Usar transacción de base de datos para crear organización + usuario + perfil
   - O implementar rollback más robusto

5. **Clarificar nombres:**
   - Cambiar "Datos del Taller" a "Datos de la Organización"
   - O crear realmente un `workshop` si es necesario

---

**FIN DEL ANÁLISIS**
