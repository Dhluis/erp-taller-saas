# 📋 AUDITORÍA DEL SISTEMA DE USUARIOS Y EMPLEADOS

**Fecha:** 2025-01-27  
**Objetivo:** Verificar funcionalidad completa de creación y gestión de usuarios y empleados

---

## 📊 RESUMEN EJECUTIVO

### Estado General
- **Usuarios (System Users):** ⚠️ **INCOMPLETO** - Endpoints en desarrollo (501)
- **Empleados (Employees):** ✅ **PARCIALMENTE FUNCIONAL** - Solo lectura
- **Invitaciones:** ✅ **PARCIALMENTE FUNCIONAL** - Crea pero sin email/enlace
- **Roles y Permisos:** ✅ **COMPLETO** - Bien definido

---

## 1️⃣ ENDPOINTS DE API

### ✅ `/api/invitations` - FUNCIONAL
**Archivo:** `src/app/api/invitations/route.ts`

**Funcionalidad:**
- ✅ GET: Lista invitaciones (requiere admin/manager)
- ✅ POST: Crea invitación (requiere admin/manager)
- ✅ DELETE: Cancela invitación (requiere admin/manager)

**Estado:**
- ✅ Validación de roles
- ✅ Validación de email
- ✅ Validación de duplicados
- ⚠️ **Email NO implementado** (solo loguea)
- ❌ **No hay link de aceptación funcional**

**Problemas:**
1. Función `sendInvitationEmail()` solo loguea, no envía email real
2. No hay endpoint para aceptar invitación
3. El registro (`/auth/register`) NO acepta parámetro de invitación

---

### ❌ `/api/users` - NO FUNCIONAL
**Archivo:** `src/app/api/users/route.ts`

**Estado Actual:**
```typescript
export async function GET() {
  return NextResponse.json({ error: 'Ruta en desarrollo' }, { status: 501 })
}

export async function POST() {
  return NextResponse.json({ error: 'Ruta en desarrollo' }, { status: 501 })
}
```

**Problemas:**
- ❌ Endpoints retornan 501 (Not Implemented)
- ❌ No hay funcionalidad de creación de usuarios
- ❌ No hay funcionalidad de listado de usuarios

**Nota:** Hay función `createUser()` en `src/lib/database/queries/users.ts` pero no está conectada a API.

---

### ❌ `/api/users/[id]` - NO FUNCIONAL
**Archivo:** `src/app/api/users/[id]/route.ts`

**Estado Actual:**
- ❌ GET: 501 (Not Implemented)
- ❌ PUT: 501 (Not Implemented)  
- ❌ DELETE: 501 (Not Implemented)

**Sub-rutas:**
- `/api/users/[id]/activate` - No revisado
- `/api/users/[id]/role` - No revisado
- `/api/users/stats` - No revisado

---

### ⚠️ `/api/employees` - PARCIALMENTE FUNCIONAL
**Archivo:** `src/app/api/employees/route.ts`

**Estado Actual:**
- ✅ GET: Funciona - Lista empleados activos
- ❌ **POST: NO EXISTE** - No hay creación de empleados por API

**Funcionalidad:**
- ✅ Filtra por `organization_id`
- ✅ Filtra por `is_active = true`
- ✅ Ordena por nombre

**Problemas:**
- ❌ No hay endpoint POST para crear empleados
- ❌ No hay PUT para actualizar
- ❌ No hay DELETE para eliminar

---

## 2️⃣ PÁGINAS DE UI

### ✅ `/configuraciones/usuarios` - PARCIALMENTE FUNCIONAL
**Archivo:** `src/app/configuraciones/usuarios/page.tsx`

**Funcionalidad UI:**
- ✅ Muestra lista de usuarios
- ✅ Tiene formulario de creación
- ✅ Permite editar usuarios
- ✅ Permite activar/desactivar
- ✅ Muestra estadísticas por rol

**Problemas:**
- ⚠️ Usa `getSystemUsers()` y `createSystemUser()` de `@/lib/supabase/system-users`
- ⚠️ No usa endpoints de API (llama directamente a Supabase)
- ❌ Si los endpoints no funcionan, puede fallar

**Componentes:**
- Dialog para crear/editar usuarios
- Select para roles (admin, manager, employee, viewer)
- Badges para mostrar estado activo/inactivo

---

### ✅ `/mecanicos` - FUNCIONAL (con limitaciones)
**Archivo:** `src/app/mecanicos/page.tsx`

**Funcionalidad UI:**
- ✅ Muestra lista de mecánicos/empleados
- ✅ Tiene modal para crear empleado
- ✅ Permite editar empleado
- ✅ Permite activar/desactivar empleado

**Componentes:**
- `CreateEditMechanicModal` - Modal completo de creación/edición
- Validación de campos
- Select de roles (mechanic, supervisor, receptionist, manager)
- Select múltiple de especialidades

**Problemas:**
- ⚠️ Crea empleados directamente en Supabase (no usa API)
- ⚠️ No hay endpoint POST, así que funciona pero no está centralizado

---

## 3️⃣ TABLA INVITATIONS

### Esquema (según código)
```typescript
{
  id: UUID
  organization_id: UUID
  email: string
  role: string
  invited_by: UUID
  status: 'pending' | 'accepted' | 'cancelled' | 'expired'
  expires_at: timestamp
  created_at: timestamp
  updated_at: timestamp
}
```

### Estado de Implementación:
- ✅ Tabla existe en BD
- ✅ Endpoints de CRUD funcionan
- ❌ **Email NO se envía** (solo loguea)
- ❌ **No hay flujo de aceptación**
- ❌ **Registro NO acepta invitación**

---

## 4️⃣ ROLES Y PERMISOS

### ✅ Sistema Completo
**Archivo:** `src/lib/auth/permissions.ts`

**Roles Definidos:**
1. `admin` - Administrador completo
2. `manager` - Gerente con permisos de gestión
3. `employee` - Empleado básico
4. `viewer` - Solo lectura

**Funcionalidades:**
- ✅ Matriz de permisos por rol
- ✅ Función `hasPermission()`
- ✅ Función `canManageUsers()` - Solo admin/manager
- ✅ Jerarquía de roles definida

**Validación en Endpoints:**
- ✅ `/api/invitations` valida roles (admin/manager)
- ⚠️ `/api/users` no valida (no está implementado)
- ⚠️ `/api/employees` no valida roles explícitamente

---

## 5️⃣ FLUJOS COMPLETOS

### ❌ FLUJO A - Invitación por Email (NO FUNCIONAL)

**Pasos Esperados:**
1. Admin va a página "Usuarios" ❌ (página existe pero endpoints no)
2. Click "Invitar Usuario" ❌ (no hay botón de invitación en UI de usuarios)
3. Ingresa email, nombre, rol ❌
4. Sistema envía email ⚠️ (solo loguea, no envía)
5. Usuario recibe link ⚠️ (no se genera link real)
6. Usuario hace click, crea contraseña ❌ (no hay endpoint de aceptación)
7. Usuario se une a organización ❌

**Estado:** ❌ **NO IMPLEMENTADO**

**Problemas:**
- Endpoint de invitaciones existe pero email no se envía
- No hay página para aceptar invitación
- Registro no acepta parámetro `?invitation=id`

---

### ❌ FLUJO B - Creación Directa de Usuario (NO FUNCIONAL)

**Pasos Esperados:**
1. Admin crea usuario directamente ❌ (endpoints retornan 501)
2. Asigna contraseña temporal ❌
3. Usuario recibe credenciales ❌
4. Usuario hace login ❌
5. Usuario cambia contraseña ❌

**Estado:** ❌ **NO IMPLEMENTADO**

**Problemas:**
- `/api/users` POST retorna 501
- No hay funcionalidad de creación con contraseña temporal
- No hay sistema de notificación de credenciales

---

### ⚠️ FLUJO C - Creación de Empleado (PARCIALMENTE FUNCIONAL)

**Pasos Esperados:**
1. Admin va a página "Empleados/Mecánicos" ✅
2. Click "Agregar Empleado" ✅
3. Ingresa: nombre, email, teléfono, rol ✅
4. Empleado se crea en tabla employees ✅
5. Empleado puede asignarse a órdenes ✅
6. (Opcional) Convertir en usuario con login ❌

**Estado:** ⚠️ **FUNCIONAL PERO INCOMPLETO**

**Funciona:**
- ✅ UI completa para crear empleados
- ✅ Validación de campos
- ✅ Guarda en BD correctamente
- ✅ Se puede asignar a órdenes de trabajo

**No Funciona:**
- ❌ No hay endpoint POST (usa Supabase directo)
- ❌ No hay validación de permisos en creación
- ❌ No hay opción para convertir empleado en usuario con login

---

## 📁 ARCHIVOS ENCONTRADOS

### Endpoints
```
✅ src/app/api/invitations/route.ts           (GET, POST, DELETE - funcional)
✅ src/app/api/invitations/resend/route.ts    (No revisado)
❌ src/app/api/users/route.ts                 (GET, POST - 501)
❌ src/app/api/users/[id]/route.ts            (GET, PUT, DELETE - 501)
✅ src/app/api/users/[id]/activate/route.ts   (No revisado)
✅ src/app/api/users/[id]/role/route.ts       (No revisado)
✅ src/app/api/users/stats/route.ts           (No revisado)
⚠️ src/app/api/employees/route.ts             (GET - funcional, POST - no existe)
✅ src/app/api/auth/register/route.ts         (POST - funciona solo para nuevas orgs)
```

### Páginas UI
```
✅ src/app/configuraciones/usuarios/page.tsx  (UI completa, usa Supabase directo)
✅ src/app/mecanicos/page.tsx                 (UI completa, usa Supabase directo)
✅ src/app/auth/register/page.tsx             (Solo para nuevas organizaciones)
```

### Componentes
```
✅ src/components/mecanicos/CreateEditMechanicModal.tsx  (Funcional)
✅ src/components/mecanicos/CreateMechanicModal.tsx      (No revisado)
✅ src/components/mecanicos/AssignMechanicModal.tsx      (No revisado)
```

### Funciones de Backend
```
✅ src/lib/database/queries/users.ts          (Tiene createUser pero no usado)
✅ src/lib/supabase/system-users.ts           (Funciones completas)
⚠️ src/lib/auth/permissions.ts                (Sistema completo de permisos)
```

---

## 🚨 FUNCIONALIDAD FALTANTE (Priorizada)

### 🔴 CRÍTICO (Bloquea funcionalidad básica)

1. **Implementar POST `/api/users`**
   - Crear usuarios con contraseña temporal
   - Validar permisos (solo admin/manager)
   - Crear en Supabase Auth + system_users
   - Enviar credenciales por email

2. **Implementar flujo de aceptación de invitación**
   - Endpoint POST `/api/invitations/[id]/accept`
   - Modificar `/auth/register` para aceptar `?invitation=id`
   - Validar invitación antes de crear usuario
   - Actualizar status de invitación a 'accepted'

3. **Implementar envío de emails**
   - Configurar servicio de email (Resend, SendGrid, etc.)
   - Template de email de invitación
   - Template de email con credenciales temporales
   - Template de email de bienvenida

### 🟡 IMPORTANTE (Mejora experiencia)

4. **Implementar POST `/api/employees`**
   - Centralizar creación de empleados
   - Validar permisos
   - Retornar errores consistentes

5. **Agregar botón "Invitar Usuario" en página de usuarios**
   - Integrar con endpoint de invitaciones existente
   - Modal de invitación similar a creación de empleado

6. **Funcionalidad de "Convertir empleado en usuario"**
   - Botón en lista de empleados
   - Genera invitación automática
   - Envía email de invitación

### 🟢 MEJORAS (Nice to have)

7. **Implementar PUT/DELETE `/api/users/[id]`**
   - Actualizar usuarios
   - Eliminar usuarios (soft delete)
   - Cambiar roles

8. **Implementar PUT/DELETE `/api/employees/[id]`**
   - Actualizar empleados
   - Eliminar empleados

9. **Página de gestión de invitaciones**
   - Lista todas las invitaciones
   - Filtros por status
   - Reenviar invitación
   - Cancelar invitación

---

## 💡 RECOMENDACIONES

### Enfoque Recomendado

**OPCIÓN 1: Completar lo existente (RECOMENDADO)**
- ✅ Ya hay estructura base
- ✅ UI existe y funciona
- ✅ Solo falta conectar endpoints
- ⏱️ **Tiempo estimado: 2-3 días**

**Pasos:**
1. Implementar POST `/api/users` (1 día)
2. Implementar flujo de aceptación de invitación (1 día)
3. Configurar servicio de emails (0.5 día)
4. Agregar POST `/api/employees` (0.5 día)

**OPCIÓN 2: Crear desde cero**
- ❌ Más trabajo
- ❌ Duplica código existente
- ⏱️ **Tiempo estimado: 5-7 días**

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Usuarios (Crítico)
- [ ] Implementar POST `/api/users`
- [ ] Implementar GET `/api/users`
- [ ] Implementar PUT `/api/users/[id]`
- [ ] Validar permisos en todos los endpoints
- [ ] Conectar UI con endpoints (en lugar de Supabase directo)

### Fase 2: Invitaciones (Crítico)
- [ ] Configurar servicio de email
- [ ] Implementar envío real de emails
- [ ] Crear endpoint POST `/api/invitations/[id]/accept`
- [ ] Modificar `/auth/register` para aceptar invitaciones
- [ ] Agregar botón "Invitar" en UI de usuarios

### Fase 3: Empleados (Importante)
- [ ] Implementar POST `/api/employees`
- [ ] Implementar PUT `/api/employees/[id]`
- [ ] Conectar UI con endpoints
- [ ] Agregar función "Convertir en usuario"

### Fase 4: Mejoras
- [ ] Página de gestión de invitaciones
- [ ] Validación de permisos en empleados
- [ ] Logs de auditoría
- [ ] Notificaciones de eventos

---

## 📝 NOTAS TÉCNICAS

### Endpoints que deben implementarse

```typescript
// POST /api/users
POST /api/users
Body: {
  email: string
  first_name: string
  last_name: string
  role: 'admin' | 'manager' | 'employee' | 'viewer'
  organization_id: string  // del contexto
  password?: string  // opcional, genera temporal si no se proporciona
}

// POST /api/users (creación directa con contraseña temporal)
// POST /api/invitations/[id]/accept (aceptar invitación)
// POST /api/employees (crear empleado)
```

### Integración con Email

Recomendado usar **Resend** o **SendGrid**:
- Más fácil de configurar que SMTP
- Mejor deliverability
- Templates HTML
- Tracking de emails

### Flujo de Invitación Recomendado

```
1. Admin crea invitación → POST /api/invitations
2. Sistema envía email con link → /auth/register?invitation={id}
3. Usuario hace click, ve formulario pre-llenado
4. Usuario completa contraseña → POST /api/invitations/{id}/accept
5. Sistema crea usuario en Auth + system_users
6. Sistema actualiza invitación a 'accepted'
7. Usuario es redirigido a login
```

---

## 🎯 CONCLUSIÓN

**Estado Actual:** ⚠️ **INCOMPLETO**

**Funcionalidad Crítica Faltante:**
1. Creación de usuarios (endpoints retornan 501)
2. Flujo de aceptación de invitaciones
3. Envío de emails

**Recomendación:** **Completar lo existente** - La estructura está, solo falta implementar los endpoints faltantes y el flujo de invitaciones.

**Prioridad:** 🔴 **ALTA** - Esta funcionalidad es esencial para multi-tenancy y gestión de usuarios.

---

**Generado por:** Auditoría Automática  
**Última actualización:** 2025-01-27

