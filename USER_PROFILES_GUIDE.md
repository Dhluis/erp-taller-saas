# 👤 Guía de User Profiles

## 📋 Descripción

La tabla `user_profiles` es el componente central que vincula los usuarios de Supabase Auth con las organizaciones del sistema ERP. Proporciona un sistema robusto de multi-tenancy con roles y permisos.

## 🏗️ Arquitectura

### Estructura de la Tabla

```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'mechanic', 'receptionist', 'user')),
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    department TEXT,
    position TEXT,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    preferences JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Relaciones

- **auth.users**: Relación 1:1 con la tabla de usuarios de Supabase Auth
- **organizations**: Relación N:1 (muchos usuarios por organización)

## 🔐 Sistema de Roles

### Roles Disponibles

1. **admin**: Administrador completo del sistema
2. **manager**: Gerente con permisos de gestión
3. **mechanic**: Mecánico con acceso a órdenes de trabajo
4. **receptionist**: Recepcionista con acceso a citas y clientes
5. **user**: Usuario básico con acceso limitado

### Jerarquía de Permisos

```
admin > manager > mechanic/receptionist > user
```

## 🛡️ Row Level Security (RLS)

### Políticas Implementadas

1. **Users can view own profile**: Los usuarios pueden ver su propio perfil
2. **Users can update own profile**: Los usuarios pueden actualizar su propio perfil
3. **Admins can view organization profiles**: Los administradores pueden ver todos los perfiles de su organización
4. **Admins can insert organization profiles**: Los administradores pueden crear perfiles en su organización
5. **Admins can update organization profiles**: Los administradores pueden actualizar perfiles de su organización
6. **Admins can delete organization profiles**: Los administradores pueden eliminar perfiles (excepto el suyo propio)

## 🚀 Uso en la Aplicación

### 1. Servicios Disponibles

```typescript
import {
  getUserProfiles,
  getUserProfileById,
  getCurrentUserProfile,
  createUserProfile,
  updateUserProfile,
  deleteUserProfile,
  searchUserProfiles,
  getUserProfileStats
} from '@/lib/supabase/user-profiles'
```

### 2. Autenticación y Autorización

```typescript
import {
  getAuthenticatedUser,
  requireAuth,
  requireAdmin,
  requireRole,
  requireOrganizationAccess
} from '@/lib/auth/auth-helpers'

// Obtener usuario autenticado con perfil
const authData = await getAuthenticatedUser()

// Requerir autenticación
const authData = await requireAuth()

// Requerir rol de administrador
const authData = await requireAdmin()

// Requerir rol específico
const authData = await requireRole('manager')

// Requerir acceso a organización específica
const authData = await requireOrganizationAccess(organizationId)
```

### 3. Middleware de Autenticación

El middleware automáticamente:
- Verifica la autenticación en rutas protegidas
- Redirige usuarios no autenticados al login
- Redirige usuarios autenticados desde rutas de auth
- Verifica perfiles de usuario
- Maneja usuarios inactivos

### 4. Componentes de React

```typescript
import { getUserContext } from '@/lib/auth/auth-helpers'

export default async function ProtectedPage() {
  const userContext = await getUserContext()
  
  if (!userContext) {
    redirect('/auth/login')
  }

  return (
    <div>
      <h1>Bienvenido, {userContext.fullName}</h1>
      <p>Rol: {userContext.role}</p>
      <p>Organización: {userContext.organizationId}</p>
    </div>
  )
}
```

## 🔄 Flujo de Registro

### 1. Registro de Usuario

```typescript
import { signUpWithProfile } from '@/lib/auth/auth-helpers'

const result = await signUpWithProfile({
  email: 'usuario@ejemplo.com',
  password: 'password123',
  organizationId: 'org-uuid',
  fullName: 'Juan Pérez',
  role: 'mechanic',
  phone: '+1234567890',
  department: 'Mecánica',
  position: 'Mecánico Senior'
})
```

### 2. Trigger Automático

El sistema incluye un trigger que automáticamente crea un perfil cuando se registra un nuevo usuario:

```sql
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user_profile();
```

### 3. Verificación de Email

```typescript
import { updateUserProfile } from '@/lib/supabase/user-profiles'

// Marcar email como verificado
await updateUserProfile(userId, {
  email_verified: true
})
```

## 📊 Estadísticas y Reportes

### Obtener Estadísticas

```typescript
import { getUserProfileStats } from '@/lib/supabase/user-profiles'

const stats = await getUserProfileStats(organizationId)

console.log({
  totalUsers: stats.totalUsers,
  activeUsers: stats.activeUsers,
  usersByRole: stats.usersByRole,
  usersByDepartment: stats.usersByDepartment
})
```

### Búsqueda y Filtrado

```typescript
// Buscar usuarios
const users = await searchUserProfiles('Juan', organizationId)

// Filtrar por rol
const mechanics = await getUserProfilesByRole('mechanic', organizationId)

// Filtrar por departamento
const mechanicsDept = await getUserProfilesByDepartment('Mecánica', organizationId)
```

## 🔧 Funciones de Utilidad

### 1. Verificar Permisos

```typescript
import { canAccessResource } from '@/lib/auth/auth-helpers'

const canAccess = await canAccessResource({
  organizationId: 'org-uuid',
  requiredRoles: ['admin', 'manager'],
  requireActive: true
})
```

### 2. Obtener Información del Usuario

```typescript
import { 
  hasUserRole, 
  isUserAdmin, 
  getUserOrganization 
} from '@/lib/supabase/user-profiles'

// Verificar rol específico
const isMechanic = await hasUserRole(userId, 'mechanic')

// Verificar si es administrador
const isAdmin = await isUserAdmin(userId)

// Obtener organización del usuario
const orgId = await getUserOrganization(userId)
```

### 3. Gestión de Estado

```typescript
import { 
  toggleUserProfileStatus, 
  updateLastLogin, 
  updateUserPreferences 
} from '@/lib/supabase/user-profiles'

// Activar/desactivar usuario
await toggleUserProfileStatus(userId, false)

// Actualizar último login
await updateLastLogin(userId)

// Actualizar preferencias
await updateUserPreferences(userId, {
  theme: 'dark',
  language: 'es',
  notifications: true
})
```

## 🚨 Manejo de Errores

### Errores Comunes

1. **Usuario no autenticado**: Redirigir al login
2. **Perfil no encontrado**: Crear perfil o redirigir al setup
3. **Usuario inactivo**: Redirigir a página de cuenta suspendida
4. **Sin permisos**: Redirigir a página de acceso denegado

### Validaciones

```typescript
import { z } from 'zod'

const userProfileSchema = z.object({
  role: z.enum(['admin', 'manager', 'mechanic', 'receptionist', 'user']),
  full_name: z.string().min(1),
  phone: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional()
})
```

## 🔄 Sincronización con Auth

### Sincronizar Datos

```typescript
import { syncAuthUserData } from '@/lib/supabase/user-profiles'

// Sincronizar datos de auth.users con user_profiles
const updatedProfile = await syncAuthUserData(userId)
```

### Actualizar Metadatos

```typescript
import { updateUserProfile } from '@/lib/supabase/user-profiles'

await updateUserProfile(userId, {
  metadata: {
    last_auth_update: new Date().toISOString(),
    auth_provider: 'google',
    login_count: 5
  }
})
```

## 📱 Integración con Frontend

### Hook Personalizado

```typescript
// hooks/useAuth.ts
import { useState, useEffect } from 'react'
import { getUserContext } from '@/lib/auth/auth-helpers'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      try {
        const userContext = await getUserContext()
        setUser(userContext)
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  return { user, loading }
}
```

### Componente de Protección

```typescript
// components/ProtectedRoute.tsx
import { requireAuth } from '@/lib/auth/auth-helpers'
import { redirect } from 'next/navigation'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: string[]
  organizationId?: string
}

export default async function ProtectedRoute({ 
  children, 
  requiredRoles, 
  organizationId 
}: ProtectedRouteProps) {
  try {
    const authData = await requireAuth()
    
    if (requiredRoles && !requiredRoles.includes(authData.profile.role)) {
      redirect('/unauthorized')
    }
    
    if (organizationId && authData.profile.organization_id !== organizationId) {
      redirect('/unauthorized')
    }
    
    return <>{children}</>
  } catch (error) {
    redirect('/auth/login')
  }
}
```

## 🧪 Testing

### Tests Unitarios

```typescript
// __tests__/user-profiles.test.ts
import { createUserProfile, getUserProfileById } from '@/lib/supabase/user-profiles'

describe('User Profiles', () => {
  test('should create user profile', async () => {
    const profileData = {
      id: 'test-user-id',
      organization_id: 'test-org-id',
      role: 'mechanic',
      full_name: 'Test User'
    }
    
    const profile = await createUserProfile(profileData)
    expect(profile.id).toBe('test-user-id')
  })
  
  test('should get user profile by id', async () => {
    const profile = await getUserProfileById('test-user-id')
    expect(profile).toBeDefined()
  })
})
```

## 🔒 Consideraciones de Seguridad

### 1. Validación de Datos

- Todos los datos de entrada se validan con Zod
- Los roles se validan contra una lista permitida
- Los UUIDs se validan antes de usar en consultas

### 2. Políticas RLS

- Los usuarios solo pueden acceder a datos de su organización
- Los administradores tienen permisos especiales
- Las políticas se aplican a nivel de base de datos

### 3. Auditoría

```typescript
// Log de cambios en perfiles
const auditLog = {
  action: 'UPDATE_USER_PROFILE',
  userId: authData.user.id,
  targetUserId: userId,
  changes: { role: 'admin' },
  timestamp: new Date().toISOString()
}
```

## 📚 Recursos Adicionales

- [Documentación de Supabase Auth](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Middleware de Next.js](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Zod Validation](https://zod.dev/)

## 🆘 Solución de Problemas

### Problemas Comunes

1. **Error de RLS**: Verificar que el usuario esté autenticado
2. **Perfil no encontrado**: Verificar que el trigger se ejecutó correctamente
3. **Permisos insuficientes**: Verificar el rol del usuario
4. **Organización incorrecta**: Verificar que el usuario pertenece a la organización correcta

### Logs de Debug

```typescript
// Habilitar logs detallados
console.log('User ID:', userId)
console.log('Organization ID:', organizationId)
console.log('User Role:', userRole)
console.log('Is Active:', isActive)
```


















