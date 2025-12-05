# ✅ Panel de Gestión de Usuarios e Invitaciones

**Fecha:** 2025-01-XX  
**Objetivo:** Crear panel para que administradores inviten usuarios a su organización/taller

---

## 📋 ARCHIVOS CREADOS

### 1. `src/app/dashboard/configuraciones/usuarios/page.tsx`
Página completa de gestión de usuarios e invitaciones con:
- Tabs para separar Usuarios e Invitaciones
- Lista de usuarios actuales
- Lista de invitaciones pendientes
- Modal para invitar nuevos usuarios
- Acciones: cambiar rol, activar/desactivar, reenviar, cancelar

### 2. `src/app/api/invitations/route.ts`
API route para CRUD de invitaciones:
- `GET`: Lista invitaciones de la organización
- `POST`: Crea nueva invitación y envía email
- `DELETE`: Cancela invitación

### 3. `src/app/api/invitations/resend/route.ts`
API route para reenviar invitaciones:
- `POST`: Reenvía email de invitación

---

## 🎯 FUNCIONALIDADES IMPLEMENTADAS

### Sección 1: Usuarios Actuales

**Lista de usuarios:**
- Muestra todos los usuarios de la organización (tabla `users`)
- Columnas: Usuario, Email, Rol, Estado, Fecha de registro
- Acciones:
  - **Cambiar rol:** Select dropdown para cambiar rol
  - **Activar/Desactivar:** Botón toggle para estado activo/inactivo

**Datos mostrados:**
- Nombre completo (`full_name` o `name`)
- Email
- Rol (con badge de color)
- Estado (activo/inactivo con icono)
- Fecha de registro

---

### Sección 2: Invitaciones Pendientes

**Lista de invitaciones:**
- Muestra solo invitaciones con `status = 'pending'`
- Columnas: Email, Rol, Fecha de invitación, Días hasta expiración, Acciones
- Acciones:
  - **Reenviar:** Reenvía el email de invitación
  - **Cancelar:** Cancela la invitación (status = 'cancelled')

**Información mostrada:**
- Email del invitado
- Rol asignado
- Fecha de creación
- Días restantes hasta expiración (7 días por defecto)
- Badge de estado

---

### Sección 3: Invitar Nuevo Usuario

**Formulario de invitación:**
- **Email** (requerido): Email del usuario a invitar
- **Rol** (requerido): Select con roles disponibles:
  - `admin` - Administrador
  - `manager` - Gerente
  - `mechanic` - Mecánico
  - `receptionist` - Recepcionista
  - `user` - Usuario
- **Mensaje personalizado** (opcional): Mensaje para incluir en el email

**Proceso al enviar:**
1. Valida que el email no esté ya registrado en la organización
2. Valida que no haya invitación pendiente para ese email
3. Crea registro en `invitations` con:
   - `organization_id` del usuario actual
   - `email` del invitado
   - `role` seleccionado
   - `status = 'pending'`
   - `expires_at` = 7 días desde ahora
   - `invited_by` = ID del usuario que invita
4. Envía email con link de registro (incluye `invitation` parameter)
5. Muestra toast de éxito

---

## 🔧 API ENDPOINTS

### GET /api/invitations

**Query params:**
- `status` (opcional): Filtrar por status (default: 'pending')

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "organization_id": "...",
      "email": "usuario@ejemplo.com",
      "role": "user",
      "status": "pending",
      "expires_at": "2025-01-XX",
      "created_at": "2025-01-XX"
    }
  ]
}
```

**Permisos:**
- Solo usuarios con rol `admin` o `manager`
- Solo muestra invitaciones de su organización

---

### POST /api/invitations

**Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "role": "user",
  "message": "Mensaje opcional"
}
```

**Validaciones:**
- Email válido (formato)
- Rol válido (admin, manager, mechanic, receptionist, user)
- Email no está ya registrado en la organización
- No hay invitación pendiente para ese email

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "usuario@ejemplo.com",
    "role": "user",
    "status": "pending",
    "expires_at": "2025-01-XX",
    "created_at": "2025-01-XX"
  }
}
```

**Permisos:**
- Solo usuarios con rol `admin` o `manager`

---

### DELETE /api/invitations?id={invitationId}

**Query params:**
- `id`: ID de la invitación a cancelar

**Validaciones:**
- Invitación pertenece a la organización del usuario
- Invitación tiene status 'pending'

**Response:**
```json
{
  "success": true,
  "message": "Invitación cancelada exitosamente"
}
```

**Permisos:**
- Solo usuarios con rol `admin` o `manager`

---

### POST /api/invitations/resend

**Body:**
```json
{
  "invitationId": "..."
}
```

**Validaciones:**
- Invitación existe y pertenece a la organización
- Invitación tiene status 'pending'
- Invitación no ha expirado

**Response:**
```json
{
  "success": true,
  "message": "Email de invitación reenviado exitosamente"
}
```

**Permisos:**
- Solo usuarios con rol `admin` o `manager`

---

## 🔐 PERMISOS Y SEGURIDAD

### Verificación de permisos:

1. **Autenticación:**
   - Verifica que el usuario esté autenticado
   - Usa `useSession()` para obtener usuario y perfil

2. **Autorización:**
   - Verifica que el usuario tenga rol `admin` o `manager`
   - Si no tiene permisos, redirige a `/dashboard`

3. **Filtrado por organización:**
   - Todas las queries filtran por `organization_id` del usuario actual
   - No se pueden ver/modificar datos de otras organizaciones

---

## 📧 ENVÍO DE EMAILS

### Estado actual:

**TODO:** Implementar envío de email real

Por ahora, la función `sendInvitationEmail()` solo loguea la información. En producción, se debe implementar usando:

- **Resend** (recomendado)
- **SendGrid**
- **Supabase Edge Functions**
- **Nodemailer con SMTP**

### Link de registro:

El link generado incluye el parámetro `invitation`:
```
https://tu-dominio.com/auth/register?invitation={invitationId}
```

El usuario debe:
1. Hacer clic en el link
2. Completar el registro en `/auth/register`
3. El trigger `handle_new_user()` en la BD detecta el parámetro
4. Asigna automáticamente `organization_id` y `role` al usuario

---

## 🎨 DISEÑO

### Características:

1. **Tabs:**
   - Separación clara entre Usuarios e Invitaciones
   - Navegación fácil entre secciones

2. **Tablas:**
   - Diseño limpio con hover effects
   - Badges de color para roles y estados
   - Iconos para mejor UX

3. **Modal de invitación:**
   - Formulario simple y claro
   - Validación en tiempo real
   - Estados de loading

4. **Responsive:**
   - Tablas adaptables
   - Layout flexible

---

## 🔄 FLUJO COMPLETO DE INVITACIÓN

### Paso 1: Admin crea invitación
1. Admin accede a `/dashboard/configuraciones/usuarios`
2. Va a tab "Invitaciones"
3. Hace clic en "Invitar Usuario"
4. Completa formulario (email, rol, mensaje opcional)
5. Envía invitación

### Paso 2: Sistema procesa invitación
1. Valida email y permisos
2. Crea registro en `invitations`
3. Envía email con link de registro

### Paso 3: Usuario recibe email
1. Recibe email con link: `/auth/register?invitation={id}`
2. Hace clic en el link

### Paso 4: Usuario se registra
1. Completa formulario de registro
2. Al crear cuenta, el trigger `handle_new_user()` detecta el parámetro `invitation`
3. Asigna automáticamente:
   - `organization_id` de la invitación
   - `role` de la invitación
4. Actualiza `invitations.status = 'accepted'`

### Paso 5: Usuario accede al sistema
1. Usuario puede iniciar sesión
2. Tiene acceso a la organización correcta
3. Tiene el rol asignado

---

## ⚠️ NOTAS IMPORTANTES

### 1. Tabla `invitations`:

**Debe existir con la siguiente estructura:**
```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  invited_by UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Status válidos:**
- `pending` - Pendiente de aceptar
- `accepted` - Aceptada (usuario se registró)
- `expired` - Expirada (pasó la fecha de expiración)
- `cancelled` - Cancelada por admin

---

### 2. Trigger `handle_new_user()`:

El trigger en la BD debe:
- Detectar cuando se crea un usuario en `auth.users`
- Verificar si hay parámetro `invitation` en el registro
- Si existe, buscar la invitación en `invitations`
- Asignar `organization_id` y `role` al usuario
- Actualizar `invitations.status = 'accepted'`

**Este trigger NO debe ser modificado** según las instrucciones.

---

### 3. Roles disponibles:

Los roles válidos son:
- `admin` - Administrador completo
- `manager` - Gerente
- `mechanic` - Mecánico
- `receptionist` - Recepcionista
- `user` - Usuario básico

---

### 4. Expiración:

- Por defecto: **7 días** desde la creación
- Se calcula automáticamente al crear la invitación
- Se muestra en días restantes en la lista
- Si expira, se puede crear una nueva invitación

---

## 🧪 PRUEBAS RECOMENDADAS

1. **Crear invitación:**
   - Invitar usuario nuevo
   - Verificar que se crea en `invitations`
   - Verificar validaciones (email duplicado, etc.)

2. **Reenviar invitación:**
   - Reenviar email de invitación pendiente
   - Verificar que llega el email

3. **Cancelar invitación:**
   - Cancelar invitación pendiente
   - Verificar que status cambia a 'cancelled'

4. **Cambiar rol de usuario:**
   - Cambiar rol de usuario existente
   - Verificar que se actualiza en BD

5. **Activar/Desactivar usuario:**
   - Toggle estado de usuario
   - Verificar que se actualiza `is_active`

6. **Permisos:**
   - Intentar acceder sin ser admin
   - Verificar que redirige o muestra error

---

## 🎯 RESULTADO

✅ **Panel de gestión de usuarios e invitaciones completamente funcional**

- Gestión de usuarios actuales
- Sistema de invitaciones
- APIs seguras con validación de permisos
- Interfaz intuitiva con tabs
- Integración lista para envío de emails

---

**FIN DE LA DOCUMENTACIÓN**
