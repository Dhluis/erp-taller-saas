# 📋 Flujo Completo: Registro → Onboarding → Dashboard

**Fecha:** 2025-01-XX  
**Objetivo:** Documentar el flujo completo desde el registro de usuario hasta que su `organization_id` funcione correctamente

---

## 🎯 Visión General

El flujo completo consta de **3 etapas principales**:

1. **Registro** (`/auth/register`) - Crear cuenta de usuario
2. **Onboarding** (`/onboarding`) - Configurar organización y taller
3. **Dashboard** (`/dashboard`) - Acceso completo al sistema

---

## 1️⃣ ETAPA: REGISTRO (`/auth/register`)

### Archivo: `src/app/auth/register/page.tsx`

### Pasos del Usuario:

1. **Paso 1: Datos del Taller**
   - Usuario ingresa: `workshopName`, `workshopEmail`, `workshopPhone`, `workshopAddress`
   - **Nota:** A pesar del nombre, estos datos se usarán para crear la **organización**

2. **Paso 2: Datos del Usuario**
   - Usuario ingresa: `fullName`, `email`, `phone`, `password`, `confirmPassword`
   - Al enviar el formulario, se ejecuta `handleRegister()`

3. **Paso 3: Confirmación de Email**
   - Se muestra mensaje pidiendo confirmar email
   - **NO se redirige al dashboard** hasta confirmar email

### Flujo Técnico en `handleRegister()`:

```typescript
// PASO 1: Crear organización
const { data: organization } = await supabase
  .from('organizations')
  .insert({
    name: workshopName,
    email: workshopEmail,
    phone: workshopPhone,
    address: workshopAddress,
  })
  .select()
  .single()

// PASO 2: Registrar usuario con Supabase Auth
const { user, session, error } = await signUpWithProfile({
  email,
  password,
  fullName,
  organizationId: organization.id  // ✅ Pasa organization_id
})
```

### Función `signUpWithProfile()` en `src/lib/auth/client-auth.ts`:

```typescript
// 1. Crear usuario en auth.users (Supabase Auth)
const { data } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${baseUrl}/auth/callback`,
    data: {
      full_name: fullName,
      organization_id: organizationId  // ✅ Se guarda en metadata
    }
  }
})

// 2. Crear registro en tabla users (public.users)
await supabase.from('users').insert({
  id: data.user.id,                    // ✅ PRIMARY KEY = auth.users.id
  auth_user_id: data.user.id,          // ✅ FK a auth.users
  email: data.user.email,
  full_name: fullName,
  organization_id: organizationId,     // ✅ Ya tiene organization_id
  workshop_id: null,                   // ⚠️ Se asignará en onboarding
  role: 'ADMIN',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
})
```

### ✅ Estado después del registro:

- ✅ Usuario creado en `auth.users` (Supabase Auth)
- ✅ Organización creada en `organizations`
- ✅ Registro creado en `users` con:
  - `id` = `auth.users.id`
  - `auth_user_id` = `auth.users.id`
  - `organization_id` = ID de la organización creada
  - `workshop_id` = `null` (se asignará en onboarding)
- ⏳ Email pendiente de confirmación

### ⚠️ Manejo de Errores:

- Si falla el registro, se elimina la organización (rollback manual)
- Si falla la creación del perfil, el usuario puede completarlo en onboarding

---

## 2️⃣ ETAPA: CONFIRMACIÓN DE EMAIL

### Flujo:

1. Usuario recibe email de confirmación
2. Hace clic en el enlace
3. Supabase redirige a `/auth/callback`
4. Email confirmado en `auth.users.email_confirmed_at`

### Después de confirmar:

- El usuario puede iniciar sesión
- Al iniciar sesión, `SessionContext` carga el perfil

---

## 3️⃣ ETAPA: INICIO DE SESIÓN

### Archivo: `src/lib/context/SessionContext.tsx`

### Flujo en `loadSession()`:

```typescript
// 1. Obtener usuario autenticado
const { data } = await supabase.auth.getUser()
const user = data.user

// 2. Buscar perfil en tabla users
let { data: profile } = await supabase
  .from('users')
  .select('*')
  .eq('auth_user_id', user.id)
  .single()

// 3. Si no existe, intentar crear automáticamente
if (!profile) {
  profile = await supabase
    .from('users')
    .insert({
      id: user.id,
      auth_user_id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
      organization_id: user.user_metadata?.organization_id || null,
      workshop_id: null,
      role: 'ASESOR',
      is_active: true
    })
    .select()
    .single()
}

// 4. Extraer organization_id y workshop_id
const organizationId = profile?.organization_id || null
const workshopId = profile?.workshop_id || null
```

### ✅ Estado después de iniciar sesión:

- ✅ Usuario autenticado en `auth.users`
- ✅ Perfil cargado de `users`
- ✅ `organizationId` disponible en `SessionContext`
- ✅ `workshopId` disponible en `SessionContext`

---

## 4️⃣ ETAPA: REDIRECCIÓN Y ONBOARDING

### Archivo: `src/app/(dashboard)/layout.tsx`

### Lógica de Redirección:

```typescript
// Si el usuario NO tiene organization_id, redirigir a onboarding
if (!organizationId || organizationId === '' || organizationId === 'null') {
  router.push('/onboarding')
}
```

### Escenarios:

#### Escenario A: Usuario completó registro exitosamente
- ✅ Tiene `organization_id` en `users`
- ✅ **NO** se redirige a onboarding
- ✅ Accede directamente al dashboard

#### Escenario B: Usuario necesita onboarding
- ⚠️ No tiene `organization_id` (por error, usuario antiguo, etc.)
- ✅ Se redirige a `/onboarding`
- ✅ Debe completar el proceso de onboarding

---

## 5️⃣ ETAPA: ONBOARDING (`/onboarding`)

### Archivo: `src/app/onboarding/page.tsx`

### Pasos del Usuario:

1. **Paso 1: Bienvenida**
   - Mensaje de bienvenida
   - No requiere datos

2. **Paso 2: Datos de la Organización**
   - `orgName`, `orgEmail`, `orgPhone`, `orgAddress`
   - Validación de campos obligatorios

3. **Paso 3: Datos del Taller**
   - `workshopName`, `workshopEmail`, `workshopPhone`, `workshopAddress`
   - Validación de campos obligatorios

4. **Paso 4: Confirmación**
   - Resumen de datos ingresados
   - Botón "Comenzar a usar Confia Drive ERP"

### Flujo Técnico en `handleComplete()`:

```typescript
// PASO 1: Crear organización
const { data: organization } = await supabase
  .from('organizations')
  .insert({
    name: orgName,
    email: orgEmail,
    phone: orgPhone,
    address: orgAddress,
  })
  .select()
  .single()

// PASO 2: Crear taller/sucursal
const { data: workshop } = await supabase
  .from('workshops')
  .insert({
    name: workshopName,
    email: workshopEmail || orgEmail,
    phone: workshopPhone || orgPhone,
    address: workshopAddress || orgAddress,
    organization_id: organization.id,  // ✅ Vincula taller con organización
  })
  .select()
  .single()

// PASO 3: Verificar/crear y actualizar usuario
// Primero verificar si existe
const { data: existingUser } = await supabase
  .from('users')
  .select('*')
  .eq('auth_user_id', user.id)
  .single()

if (!existingUser) {
  // Crear registro si no existe
  const { data: newUser } = await supabase
    .from('users')
    .insert({
      id: user.id,
      auth_user_id: user.id,
      email: user.email,
      full_name: profile?.full_name || 'Usuario',
      organization_id: organization.id,
      workshop_id: workshop.id,
      role: 'ADMIN',
      is_active: true
    })
    .select()
    .single()
} else {
  // Actualizar registro existente
  const { data: updatedUser } = await supabase
    .from('users')
    .update({
      organization_id: organization.id,
      workshop_id: workshop.id,
      updated_at: new Date().toISOString()
    })
    .eq('auth_user_id', user.id)
    .select()
    .single()
}

// PASO 4: Refrescar sesión
await refresh()

// PASO 5: Redirigir al dashboard
router.push('/dashboard')
```

### ✅ Estado después del onboarding:

- ✅ Organización creada en `organizations`
- ✅ Taller creado en `workshops`
- ✅ Usuario actualizado en `users` con:
  - `organization_id` = ID de la organización
  - `workshop_id` = ID del taller
- ✅ Sesión refrescada
- ✅ Redirigido al dashboard

### ⚠️ Manejo de Errores:

- Si falla la creación del taller, se elimina la organización (rollback)
- Si falla la actualización del usuario, se eliminan organización y taller (rollback)
- Validación estricta de que `organization_id` se asignó correctamente

---

## 6️⃣ ETAPA: DASHBOARD (`/dashboard`)

### Archivo: `src/app/(dashboard)/layout.tsx`

### Verificación Final:

```typescript
// Layout verifica que el usuario tenga organization_id
if (!organizationId || organizationId === '' || organizationId === 'null') {
  // Redirige a onboarding
  router.push('/onboarding')
} else {
  // Renderiza el dashboard
  return <AppLayout>{children}</AppLayout>
}
```

### ✅ Estado Final:

- ✅ Usuario autenticado
- ✅ `organization_id` válido
- ✅ `workshop_id` válido
- ✅ Acceso completo al dashboard
- ✅ Todas las queries incluyen `organization_id` automáticamente

---

## 🔧 PROBLEMAS COMUNES Y SOLUCIONES

### Problema 1: Usuario no aparece en `users` después del registro

**Causa:** Falló la creación del registro en `signUpWithProfile()`

**Solución:**
- `SessionContext` intenta crear el registro automáticamente al iniciar sesión
- Si no funciona, el onboarding lo crea

### Problema 2: `organization_id` es `null` después del registro

**Causa:** 
- El registro no se completó correctamente
- El usuario es antiguo y no tenía `organization_id`

**Solución:**
- El usuario es redirigido automáticamente a onboarding
- El onboarding asigna el `organization_id` correctamente

### Problema 3: Loop de redirección entre dashboard y onboarding

**Causa:** El `organization_id` está como string `'null'` o `''` en lugar de `null`

**Solución:**
- El layout verifica: `!organizationId || organizationId === '' || organizationId === 'null'`
- Si es string vacío o 'null', se considera como sin organización

### Problema 4: Onboarding no actualiza el usuario

**Causa:** El registro no existe en `users` y el `INSERT` falla

**Solución:**
- El onboarding ahora verifica si existe antes de actualizar
- Si no existe, lo crea
- Si existe, lo actualiza

---

## 📊 DIAGRAMA DE FLUJO

```
[Usuario nuevo]
    ↓
[Registro /auth/register]
    ↓
[Crear organización]
    ↓
[Crear usuario en auth.users]
    ↓
[Crear registro en users con organization_id]
    ↓
[Email de confirmación]
    ↓
[Usuario confirma email]
    ↓
[Iniciar sesión]
    ↓
[SessionContext carga perfil]
    ↓
{¿Tiene organization_id?}
    ↓
    ├─ SÍ → [Dashboard] ✅
    └─ NO → [Onboarding]
              ↓
         [Crear organización]
              ↓
         [Crear taller]
              ↓
         [Actualizar users con organization_id y workshop_id]
              ↓
         [Refrescar sesión]
              ↓
         [Dashboard] ✅
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

Para verificar que el flujo funciona correctamente:

- [ ] Usuario puede registrarse en `/auth/register`
- [ ] Se crea organización durante el registro
- [ ] Se crea registro en `users` con `organization_id`
- [ ] Usuario puede confirmar email
- [ ] Usuario puede iniciar sesión
- [ ] `SessionContext` carga el perfil correctamente
- [ ] Si no tiene `organization_id`, se redirige a onboarding
- [ ] Onboarding crea organización y taller
- [ ] Onboarding actualiza/crea registro en `users`
- [ ] Usuario accede al dashboard después del onboarding
- [ ] `organization_id` está disponible en toda la app

---

## 🔐 SEGURIDAD Y VALIDACIONES

### Validaciones Implementadas:

1. **Registro:**
   - Email válido (formato)
   - Contraseña mínima 6 caracteres
   - Campos obligatorios validados

2. **Onboarding:**
   - Validación de email
   - Campos obligatorios validados
   - Rollback en caso de error

3. **SessionContext:**
   - Verifica existencia de usuario
   - Crea registro si falta
   - Maneja errores gracefully

4. **Layout Dashboard:**
   - Verifica autenticación
   - Verifica `organization_id`
   - Redirige apropiadamente

---

## 📝 NOTAS IMPORTANTES

1. **Tabla principal:** `users` (no `system_users`)
   - El `SessionContext` busca en `users`
   - El registro crea en `users`
   - El onboarding actualiza `users`

2. **Relación con auth.users:**
   - `users.id` = `auth.users.id` (PRIMARY KEY)
   - `users.auth_user_id` = `auth.users.id` (FK)

3. **Multi-tenancy:**
   - Todos los registros deben tener `organization_id`
   - Las queries deben filtrar por `organization_id`
   - RLS policies protegen los datos

4. **Onboarding opcional:**
   - Si el usuario tiene `organization_id` en el registro, NO necesita onboarding
   - El onboarding es solo para usuarios que no completaron el registro o usuarios antiguos

---

**FIN DE LA DOCUMENTACIÓN**


