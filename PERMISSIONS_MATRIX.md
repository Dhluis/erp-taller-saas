# MATRIZ DE PERMISOS POR ROL

**Última actualización**: Enero 2025

Este documento describe los permisos completos para cada rol de usuario en el sistema ERP de Taller.

---

## ROLES DEFINIDOS

El sistema define **3 roles principales** específicos para taller mecánico:

### 1. Administrador (admin)
- **Nivel**: 3 (máximo)
- **Descripción**: Dueño o gerente del taller
- **Acceso**: Total sin restricciones
- **Funciones**: Puede gestionar todo el sistema, usuarios, configuraciones y transacciones financieras

### 2. Asesor (advisor)
- **Nivel**: 2
- **Descripción**: Recepcionista o asesor de servicio
- **Acceso**: Gestión completa de clientes y órdenes
- **Restricciones**: NO maneja dinero (cobros, pagos). NO puede aprobar cotizaciones ni eliminar órdenes
- **Funciones**: Atender clientes, crear órdenes, gestionar inventario para órdenes, responder WhatsApp

### 3. Mecánico (mechanic)
- **Nivel**: 1
- **Descripción**: Técnico que ejecuta el trabajo
- **Acceso**: Solo órdenes asignadas a él
- **Restricciones**: NO crea órdenes, NO gestiona clientes, NO ve información financiera
- **Funciones**: Ver órdenes asignadas, actualizar estado del trabajo, ver inventario disponible

---

## JERARQUÍA DE ROLES

```
admin (nivel 3) - Acceso total
  └─ advisor (nivel 2) - Gestión operativa
      └─ mechanic (nivel 1) - Ejecución de trabajo
```

**Regla**: Un rol solo puede gestionar roles inferiores a él. Solo `admin` puede gestionar usuarios.

---

## MATRIZ COMPLETA DE PERMISOS

### Módulo: Clientes (`customers`)

| Acción | Admin | Advisor | Mechanic |
|--------|:-----:|:-------:|:--------:|
| Ver todos | ✅ | ✅ | ✅ |
| Crear | ✅ | ✅ | ❌ |
| Editar | ✅ | ✅ | ❌ |
| Eliminar | ✅ | ✅ | ❌ |

**Código de validación**:
```typescript
// src/lib/auth/permissions.ts
admin: { customers: ['create', 'read', 'update', 'delete'] }
advisor: { customers: ['create', 'read', 'update', 'delete'] }
mechanic: { customers: ['read'] }
```

---

### Módulo: Vehículos (`vehicles`)

| Acción | Admin | Advisor | Mechanic |
|--------|:-----:|:-------:|:--------:|
| Ver todos | ✅ | ✅ | ✅ |
| Crear | ✅ | ✅ | ❌ |
| Editar | ✅ | ✅ | ❌ |
| Eliminar | ✅ | ✅ | ❌ |

**Código de validación**:
```typescript
admin: { vehicles: ['create', 'read', 'update', 'delete'] }
advisor: { vehicles: ['create', 'read', 'update', 'delete'] }
mechanic: { vehicles: ['read'] }
```

---

### Módulo: Cotizaciones (`quotations`)

| Acción | Admin | Advisor | Mechanic |
|--------|:-----:|:-------:|:--------:|
| Ver todas | ✅ | ✅ | ✅ |
| Crear | ✅ | ✅ | ❌ |
| Editar | ✅ | ✅ | ❌ |
| Eliminar | ✅ | ❌ | ❌ |
| Aprobar | ✅ | ❌ | ❌ |

**Nota**: Solo `admin` puede aprobar y eliminar cotizaciones.

**Código de validación**:
```typescript
admin: { quotations: ['create', 'read', 'update', 'delete', 'approve'] }
advisor: { quotations: ['create', 'read', 'update'] }
mechanic: { quotations: ['read'] }
```

---

### Módulo: Órdenes de Trabajo (`work_orders`)

| Acción | Admin | Advisor | Mechanic |
|--------|:-----:|:-------:|:--------:|
| Ver todas | ✅ | ✅ | ⚠️ Solo asignadas |
| Crear | ✅ | ✅ | ❌ |
| Editar | ✅ | ✅ | ⚠️ Solo asignadas |
| Eliminar | ✅ | ✅ | ❌ |

**Nota**: Los mecánicos (`mechanic`) solo pueden ver/editar órdenes asignadas a ellos. Usar función `canAccessWorkOrder()` para validar.

**Código de validación**:
```typescript
admin: { work_orders: ['create', 'read', 'update', 'delete'] }
advisor: { work_orders: ['create', 'read', 'update', 'delete'] }
mechanic: { work_orders: ['read', 'update'] } // Solo asignadas
```

**Validación especial**:
```typescript
import { canAccessWorkOrder } from '@/lib/auth/permissions'

// Validar acceso a orden específica
const canAccess = await canAccessWorkOrder(userId, workOrderId, userRole)
```

---

### Módulo: Facturas (`invoices`)

| Acción | Admin | Advisor | Mechanic |
|--------|:-----:|:-------:|:--------:|
| Ver todas | ✅ | ✅ | ❌ |
| Crear | ✅ | ❌ | ❌ |
| Editar | ✅ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ |
| Procesar pago | ✅ | ❌ | ❌ |

**Nota**: Solo `admin` maneja transacciones financieras (facturas y pagos).

**Código de validación**:
```typescript
admin: { invoices: ['create', 'read', 'update', 'delete', 'pay'] }
advisor: { invoices: ['read'] }
mechanic: { invoices: [] }
```

---

### Módulo: Pagos (`payments`)

| Acción | Admin | Advisor | Mechanic |
|--------|:-----:|:-------:|:--------:|
| Ver todos | ✅ | ✅ | ❌ |
| Crear | ✅ | ❌ | ❌ |
| Editar | ✅ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ |

**Nota**: Solo `admin` puede gestionar pagos a proveedores.

**Código de validación**:
```typescript
admin: { payments: ['create', 'read', 'update', 'delete'] }
advisor: { payments: ['read'] }
mechanic: { payments: [] }
```

---

### Módulo: Inventario (`inventory`)

| Acción | Admin | Advisor | Mechanic |
|--------|:-----:|:-------:|:--------:|
| Ver todos | ✅ | ✅ | ✅ |
| Crear producto | ✅ | ❌ | ❌ |
| Editar producto | ✅ | ✅ | ❌ |
| Eliminar producto | ✅ | ❌ | ❌ |
| Ajustar stock | ✅ | ✅ | ❌ |

**Nota**: `advisor` puede actualizar inventario (usar productos en órdenes), pero no crear/eliminar.

**Código de validación**:
```typescript
admin: { inventory: ['create', 'read', 'update', 'delete', 'adjust'] }
advisor: { inventory: ['read', 'update'] }
mechanic: { inventory: ['read'] }
```

---

### Módulo: Proveedores (`suppliers`)

| Acción | Admin | Advisor | Mechanic |
|--------|:-----:|:-------:|:--------:|
| Ver todos | ✅ | ❌ | ❌ |
| Crear | ✅ | ❌ | ❌ |
| Editar | ✅ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ |

**Nota**: Solo `admin` gestiona proveedores.

**Código de validación**:
```typescript
admin: { suppliers: ['create', 'read', 'update', 'delete'] }
advisor: { suppliers: [] }
mechanic: { suppliers: [] }
```

---

### Módulo: Órdenes de Compra (`purchase_orders`)

| Acción | Admin | Advisor | Mechanic |
|--------|:-----:|:-------:|:--------:|
| Ver todas | ✅ | ❌ | ❌ |
| Crear | ✅ | ❌ | ❌ |
| Editar | ✅ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ |
| Aprobar | ✅ | ❌ | ❌ |

**Nota**: Solo `admin` gestiona órdenes de compra.

**Código de validación**:
```typescript
admin: { purchase_orders: ['create', 'read', 'update', 'delete', 'approve'] }
advisor: { purchase_orders: [] }
mechanic: { purchase_orders: [] }
```

---

### Módulo: Empleados (`employees`)

| Acción | Admin | Advisor | Mechanic |
|--------|:-----:|:-------:|:--------:|
| Ver todos | ✅ | ✅ | ❌ |
| Crear | ✅ | ❌ | ❌ |
| Editar | ✅ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ |

**Código de validación**:
```typescript
admin: { employees: ['create', 'read', 'update', 'delete'] }
advisor: { employees: ['read'] }
mechanic: { employees: [] }
```

---

### Módulo: Usuarios (`users`)

| Acción | Admin | Advisor | Mechanic |
|--------|:-----:|:-------:|:--------:|
| Ver todos | ✅ | ❌ | ❌ |
| Crear | ✅ | ❌ | ❌ |
| Editar | ✅ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ |

**Nota**: Solo `admin` puede gestionar usuarios del sistema.

**Código de validación**:
```typescript
admin: { users: ['create', 'read', 'update', 'delete'] }
advisor: { users: [] }
mechanic: { users: [] }
```

---

### Módulo: Reportes (`reports`)

| Acción | Admin | Advisor | Mechanic |
|--------|:-----:|:-------:|:--------:|
| Ver reportes | ✅ | ✅ | ❌ |

**Nota**: 
- `admin` ve todos los reportes (incluyendo financieros)
- `advisor` ve reportes básicos (sin información financiera)
- `mechanic` no tiene acceso a reportes

**Código de validación**:
```typescript
admin: { reports: ['read'] }
advisor: { reports: ['read'] }
mechanic: { reports: [] }
```

**Validación especial**:
```typescript
import { canViewFinancialReports } from '@/lib/auth/permissions'

// Validar si puede ver reportes financieros
const canViewFinancial = canViewFinancialReports(userRole) // Solo admin
```

---

### Módulo: Configuraciones (`settings`)

| Acción | Admin | Advisor | Mechanic |
|--------|:-----:|:-------:|:--------:|
| Ver configuración | ✅ | ❌ | ❌ |
| Modificar configuración | ✅ | ❌ | ❌ |

**Nota**: Solo `admin` puede acceder a configuraciones.

**Código de validación**:
```typescript
admin: { settings: ['read', 'update'] }
advisor: { settings: [] }
mechanic: { settings: [] }
```

---

### Módulo: WhatsApp (`whatsapp`)

| Acción | Admin | Advisor | Mechanic |
|--------|:-----:|:-------:|:--------:|
| Ver conversaciones | ✅ | ✅ | ❌ |
| Configurar bot | ✅ | ❌ | ❌ |
| Entrenar bot | ✅ | ❌ | ❌ |
| Responder manualmente | ✅ | ✅ | ❌ |

**Nota**: `advisor` puede ver y responder conversaciones de WhatsApp, pero no configurar el bot.

**Código de validación**:
```typescript
admin: { whatsapp: ['create', 'read', 'update', 'delete'] }
advisor: { whatsapp: ['read', 'update'] }
mechanic: { whatsapp: [] }
```

---

## FUNCIONES ESPECIALES POR ROL

### Gestión de Usuarios

| Función | Admin | Advisor | Mechanic |
|---------|:-----:|:-------:|:--------:|
| Ver usuarios | ✅ | ❌ | ❌ |
| Crear usuarios | ✅ | ❌ | ❌ |
| Editar usuarios | ✅ | ❌ | ❌ |
| Eliminar usuarios | ✅ | ❌ | ❌ |
| Cambiar roles | ✅ | ❌ | ❌ |

**Código de validación**:
```typescript
// src/lib/auth/permissions.ts
export function canManageUsers(userRole: UserRole): boolean {
  return userRole === 'admin'
}
```

**Regla**: Solo `admin` puede gestionar usuarios. `advisor` no tiene permisos de gestión de usuarios.

---

## CÓMO SE VALIDA EN EL CÓDIGO

### Patrón 1: Validación en API Routes

```typescript
// src/app/api/customers-protected/route.ts
import { requireAuth, validateAccess } from '@/lib/auth/validation'

export async function GET(request: NextRequest) {
  // 1. Requerir autenticación
  const user = await requireAuth(request)
  
  // 2. Validar permisos específicos
  if (!await validateAccess(user.id, 'customers', 'read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // 3. Continuar con la lógica
  const data = await getAllCustomers(user.organization_id)
  return NextResponse.json({ data })
}
```

### Patrón 2: Middleware Wrapper

```typescript
// src/app/api/protected-example/route.ts
import { withRoleValidation } from '@/lib/auth/validation'

export const POST = withRoleValidation(['admin', 'advisor'], async (request, user) => {
  // Solo admin y advisor pueden acceder
  return NextResponse.json({ message: 'Autorizado' })
})
```

### Patrón 3: Validación con Wrapper de Acceso

```typescript
// src/lib/auth/validation.ts
import { withAccessValidation } from '@/lib/auth/validation'

export const GET = withAccessValidation('quotations', 'approve', async (req, user) => {
  // Solo usuarios con permiso 'approve' en 'quotations' pueden acceder (solo admin)
  return NextResponse.json({ message: 'Cotización aprobada' })
})
```

### Patrón 4: Validación Directa con hasPermission

```typescript
// En componente o función
import { hasPermission } from '@/lib/auth/permissions'

const userRole = 'advisor'
const canDelete = hasPermission(userRole, 'customers', 'delete') // true
const canApprove = hasPermission(userRole, 'quotations', 'approve') // false
```

---

## CASOS ESPECIALES

### 1. Órdenes de Trabajo Asignadas (Mecánicos)

**Problema**: Los mecánicos solo deben ver/editar órdenes asignadas a ellos.

**Solución**: Usar función `canAccessWorkOrder()`:

```typescript
import { canAccessWorkOrder } from '@/lib/auth/permissions'

// En API Route
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth(request)
  
  // Validar acceso específico para mecánicos
  if (user.role === 'mechanic') {
    const canAccess = await canAccessWorkOrder(user.id, params.id, user.role)
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }
  
  // Continuar con la lógica
}
```

**En Queries**:
```typescript
// src/lib/database/queries/work-orders.ts
export async function getWorkOrdersForMechanic(employeeId: string) {
  const supabase = await createClient()
  
  const { data } = await supabase
    .from('work_orders')
    .select('*')
    .eq('assigned_to', employeeId) // ← Filtro por asignación
    .order('created_at', { ascending: false })
  
  return data || []
}
```

---

### 2. Reportes Financieros

**Problema**: Solo `admin` debe ver reportes con información financiera.

**Solución**: Usar función `canViewFinancialReports()`:

```typescript
import { canViewFinancialReports } from '@/lib/auth/permissions'

// En componente o API
if (!canViewFinancialReports(userRole)) {
  // Ocultar secciones financieras
  // O retornar error 403
}
```

---

### 3. Multi-Tenant: Filtro por Organization

**Todas las queries deben filtrar por `organization_id`**:
```typescript
const { data } = await supabase
  .from('customers')
  .select('*')
  .eq('organization_id', user.organization_id) // ← CRÍTICO
  .is('deleted_at', null) // Si aplica soft delete
```

---

### 4. Jerarquía de Roles

**Solo `admin` puede gestionar usuarios**:
```typescript
// src/lib/auth/validation.ts
export async function canManageUser(managerId: string, targetUserId: string): Promise<boolean> {
  // Solo admin puede gestionar usuarios
  return userRole === 'admin'
}
```

---

## FUNCIONES HELPER DISPONIBLES

### Verificar Permisos

```typescript
import { hasPermission } from '@/lib/auth/permissions'

// Verificar permiso específico
hasPermission('advisor', 'customers', 'delete') // true
hasPermission('advisor', 'quotations', 'approve') // false
hasPermission('mechanic', 'customers', 'create') // false
```

### Obtener Acciones Permitidas

```typescript
import { getAllowedActions } from '@/lib/auth/permissions'

// Obtener todas las acciones permitidas para un recurso
getAllowedActions('advisor', 'quotations')
// ['create', 'read', 'update']
```

### Obtener Nombres de Roles

```typescript
import { ROLE_NAMES } from '@/lib/auth/permissions'

ROLE_NAMES['admin'] // 'Administrador'
ROLE_NAMES['advisor'] // 'Asesor'
ROLE_NAMES['mechanic'] // 'Mecánico'
```

### Verificar Nivel de Acceso

```typescript
import { getAccessLevel } from '@/lib/auth/permissions'

getAccessLevel('admin') // 'full'
getAccessLevel('advisor') // 'limited'
getAccessLevel('mechanic') // 'readonly'
```

### Verificar Jerarquía

```typescript
import { isRoleSuperior } from '@/lib/auth/permissions'

isRoleSuperior('admin', 'advisor') // true
isRoleSuperior('advisor', 'mechanic') // true
isRoleSuperior('mechanic', 'admin') // false
```

### Validar Acceso a Orden Específica

```typescript
import { canAccessWorkOrder } from '@/lib/auth/permissions'

// Validar si un mecánico puede acceder a una orden
const canAccess = await canAccessWorkOrder(userId, workOrderId, userRole)
// Retorna true para admin/advisor, o verifica asignación para mechanic
```

### Validar Acceso a Reportes Financieros

```typescript
import { canViewFinancialReports } from '@/lib/auth/permissions'

// Solo admin puede ver reportes financieros
const canView = canViewFinancialReports(userRole) // true solo si es admin
```

---

## IMPLEMENTACIÓN EN COMPONENTES REACT

### Ejemplo: Ocultar Botón Según Permiso

```typescript
'use client'
import { useSession } from '@/contexts/SessionContext'
import { hasPermission } from '@/lib/auth/permissions'

export function CustomerActions({ customerId }: { customerId: string }) {
  const { user } = useSession()
  
  const canEdit = hasPermission(user.role, 'customers', 'update')
  const canDelete = hasPermission(user.role, 'customers', 'delete')
  
  return (
    <div>
      {canEdit && <Button>Editar</Button>}
      {canDelete && <Button variant="destructive">Eliminar</Button>}
    </div>
  )
}
```

### Ejemplo: Deshabilitar Campo Según Permiso

```typescript
'use client'
import { useSession } from '@/contexts/SessionContext'
import { hasPermission } from '@/lib/auth/permissions'

export function QuotationForm() {
  const { user } = useSession()
  
  const canApprove = hasPermission(user.role, 'quotations', 'approve')
  
  return (
    <form>
      <Input name="total" />
      <Checkbox 
        name="approved" 
        disabled={!canApprove} // Deshabilitar si no tiene permiso (solo admin)
      />
    </form>
  )
}
```

### Ejemplo: Filtrar Órdenes por Rol

```typescript
'use client'
import { useSession } from '@/contexts/SessionContext'
import { useAuth } from '@/hooks/useAuth'
import { useEffect, useState } from 'react'

export function WorkOrdersList() {
  const { user } = useSession()
  const { profile } = useAuth()
  const [orders, setOrders] = useState([])
  
  useEffect(() => {
    if (user.role === 'mechanic') {
      // Solo órdenes asignadas
      fetchMyAssignedOrders(profile?.employee_id)
    } else {
      // Todas las órdenes
      fetchAllOrders()
    }
  }, [user.role])
}
```

---

## VALIDACIÓN EN MIDDLEWARE

El middleware (`src/lib/auth/middleware.ts`) agrega información del usuario a los headers:

```typescript
requestHeaders.set('x-user-id', session.user.id)
requestHeaders.set('x-user-email', session.user.email || '')
requestHeaders.set('x-user-role', profile?.role || 'user')
requestHeaders.set('x-organization-id', profile?.organization_id || '')
```

**Obtener en API Route**:
```typescript
export async function GET(request: NextRequest) {
  const userRole = request.headers.get('x-user-role')
  const organizationId = request.headers.get('x-organization-id')
  
  // Validar rol
  if (!['admin', 'advisor'].includes(userRole || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}
```

---

## TABLA DE RESUMEN RÁPIDO

| Módulo | Admin | Advisor | Mechanic |
|--------|:-----:|:-------:|:--------:|
| **Clientes** | CRUD | CRUD | R |
| **Vehículos** | CRUD | CRUD | R |
| **Cotizaciones** | CRUD+A | CRU | R |
| **Órdenes** | CRUD | CRUD | RU* |
| **Facturas** | CRUD+P | R | - |
| **Pagos** | CRUD | R | - |
| **Inventario** | CRUD+A | RU | R |
| **Proveedores** | CRUD | - | - |
| **Compras** | CRUD+A | - | - |
| **Empleados** | CRUD | R | - |
| **Usuarios** | CRUD | - | - |
| **Reportes** | R | R** | - |
| **Configuración** | RU | - | - |
| **WhatsApp** | CRUD | RU | - |

**Leyenda**:
- **C** = Create (Crear)
- **R** = Read (Leer)
- **U** = Update (Actualizar)
- **D** = Delete (Eliminar)
- **A** = Approve (Aprobar)
- **P** = Pay (Pagar)
- **\*** = Solo órdenes asignadas
- **\*\*** = Solo reportes básicos (sin financieros)

---

## FUNCIONES NUEVAS

### `canAccessWorkOrder(userId, workOrderId, role, supabaseClient?)`
Valida si un mecánico puede acceder a una orden específica. Retorna `true` para admin/advisor, o verifica que la orden esté asignada al empleado del mecánico.

### `canViewFinancialReports(role)`
Valida si puede ver reportes financieros. Solo retorna `true` para `admin`.

---

## MEJORAS RECOMENDADAS

1. **Migrar roles existentes**: Actualizar usuarios con roles antiguos (`manager`, `employee`, `viewer`) a los nuevos roles
2. **Agregar migración de BD**: Script SQL para actualizar roles en `system_users` y `user_profiles`
3. **Actualizar UI**: Modificar componentes que muestran roles para usar los nuevos nombres
4. **Actualizar validaciones**: Revisar todos los endpoints que validan roles antiguos
5. **Documentar cambios**: Notificar a usuarios sobre el cambio de roles

---

**Última actualización**: Enero 2025
