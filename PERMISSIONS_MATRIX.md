# MATRIZ DE PERMISOS POR ROL

**Última actualización**: Diciembre 2024

Este documento describe los permisos completos para cada rol de usuario en el sistema ERP de Taller.

---

## ROLES DEFINIDOS

El sistema define **4 roles principales**:

1. **`admin`**: Administrador completo del sistema
2. **`manager`**: Gerente con permisos de gestión (sin eliminar)
3. **`employee`**: Empleado con permisos limitados de creación y lectura
4. **`viewer`**: Solo lectura, sin permisos de modificación

**Nota**: Existen referencias a roles adicionales (`mechanic`, `receptionist`) en algunos lugares del código, pero no están implementados en el sistema de permisos central. Se recomienda mapearlos a `employee` o crear roles específicos si se requiere.

---

## JERARQUÍA DE ROLES

```
admin (nivel 4)
  └─ manager (nivel 3)
      └─ employee (nivel 2)
          └─ viewer (nivel 1)
```

**Regla**: Un rol solo puede gestionar roles inferiores a él.

---

## MATRIZ COMPLETA DE PERMISOS

### Módulo: Clientes (`customers`)

| Acción | Admin | Manager | Employee | Viewer |
|--------|:-----:|:-------:|:--------:|:------:|
| Ver todos | ✅ | ✅ | ✅ | ✅ |
| Crear | ✅ | ✅ | ✅ | ❌ |
| Editar | ✅ | ✅ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ | ❌ |

**Código de validación**:
```typescript
// src/lib/auth/permissions.ts
admin: { customers: ['create', 'read', 'update', 'delete'] }
manager: { customers: ['create', 'read', 'update'] }
employee: { customers: ['create', 'read'] }
viewer: { customers: ['read'] }
```

---

### Módulo: Vehículos (`vehicles`)

| Acción | Admin | Manager | Employee | Viewer |
|--------|:-----:|:-------:|:--------:|:------:|
| Ver todos | ✅ | ✅ | ✅ | ✅ |
| Crear | ✅ | ✅ | ✅ | ❌ |
| Editar | ✅ | ✅ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ | ❌ |

**Código de validación**:
```typescript
admin: { vehicles: ['create', 'read', 'update', 'delete'] }
manager: { vehicles: ['create', 'read', 'update'] }
employee: { vehicles: ['create', 'read'] }
viewer: { vehicles: ['read'] }
```

---

### Módulo: Cotizaciones (`quotations`)

| Acción | Admin | Manager | Employee | Viewer |
|--------|:-----:|:-------:|:--------:|:------:|
| Ver todas | ✅ | ✅ | ✅ | ✅ |
| Crear | ✅ | ✅ | ✅ | ❌ |
| Editar | ✅ | ✅ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ | ❌ |
| Aprobar | ✅ | ✅ | ❌ | ❌ |
| Convertir a factura | ✅ | ✅ | ❌ | ❌ |

**Código de validación**:
```typescript
admin: { quotations: ['create', 'read', 'update', 'delete', 'approve', 'convert'] }
manager: { quotations: ['create', 'read', 'update', 'approve', 'convert'] }
employee: { quotations: ['create', 'read'] }
viewer: { quotations: ['read'] }
```

---

### Módulo: Órdenes de Trabajo (`work_orders`)

| Acción | Admin | Manager | Employee | Viewer |
|--------|:-----:|:-------:|:--------:|:------:|
| Ver todas | ✅ | ✅ | ⚠️ Solo asignadas | ✅ |
| Crear | ✅ | ✅ | ✅ | ❌ |
| Editar | ✅ | ✅ | ⚠️ Solo asignadas | ❌ |
| Eliminar | ✅ | ❌ | ❌ | ❌ |
| Aprobar | ✅ | ✅ | ❌ | ❌ |
| Completar | ✅ | ✅ | ⚠️ Solo asignadas | ❌ |
| Asignar mecánico | ✅ | ✅ | ❌ | ❌ |

**Nota**: Los empleados (`employee`) solo pueden ver/editar órdenes asignadas a ellos. Esta lógica debe implementarse en las queries, no solo en permisos.

**Código de validación**:
```typescript
admin: { work_orders: ['create', 'read', 'update', 'delete', 'approve', 'complete'] }
manager: { work_orders: ['create', 'read', 'update', 'approve', 'complete'] }
employee: { work_orders: ['create', 'read', 'update'] }
viewer: { work_orders: ['read'] }
```

---

### Módulo: Facturas (`invoices`)

| Acción | Admin | Manager | Employee | Viewer |
|--------|:-----:|:-------:|:--------:|:------:|
| Ver todas | ✅ | ✅ | ✅ | ✅ |
| Crear | ✅ | ✅ | ❌ | ❌ |
| Editar | ✅ | ✅ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ | ❌ |
| Procesar pago | ✅ | ✅ | ❌ | ❌ |
| Cancelar | ✅ | ❌ | ❌ | ❌ |

**Código de validación**:
```typescript
admin: { invoices: ['create', 'read', 'update', 'delete', 'pay', 'cancel'] }
manager: { invoices: ['create', 'read', 'update', 'pay'] }
employee: { invoices: ['read'] }
viewer: { invoices: ['read'] }
```

---

### Módulo: Inventario (`inventory`)

| Acción | Admin | Manager | Employee | Viewer |
|--------|:-----:|:-------:|:--------:|:------:|
| Ver todos | ✅ | ✅ | ✅ | ✅ |
| Crear producto | ✅ | ❌ | ❌ | ❌ |
| Editar producto | ✅ | ❌ | ❌ | ❌ |
| Eliminar producto | ✅ | ❌ | ❌ | ❌ |
| Ajustar stock | ✅ | ✅ | ❌ | ❌ |

**Código de validación**:
```typescript
admin: { inventory: ['create', 'read', 'update', 'delete', 'adjust'] }
manager: { inventory: ['read', 'adjust'] }
employee: { inventory: ['read'] }
viewer: { inventory: ['read'] }
```

---

### Módulo: Proveedores (`suppliers`)

| Acción | Admin | Manager | Employee | Viewer |
|--------|:-----:|:-------:|:--------:|:------:|
| Ver todos | ✅ | ✅ | ✅ | ✅ |
| Crear | ✅ | ❌ | ❌ | ❌ |
| Editar | ✅ | ❌ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ | ❌ |

**Código de validación**:
```typescript
admin: { suppliers: ['create', 'read', 'update', 'delete'] }
manager: { suppliers: ['read'] }
employee: { suppliers: ['read'] }
viewer: { suppliers: ['read'] }
```

---

### Módulo: Órdenes de Compra (`purchase_orders`)

| Acción | Admin | Manager | Employee | Viewer |
|--------|:-----:|:-------:|:--------:|:------:|
| Ver todas | ✅ | ✅ | ✅ | ✅ |
| Crear | ✅ | ❌ | ❌ | ❌ |
| Editar | ✅ | ❌ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ | ❌ |
| Aprobar | ✅ | ✅ | ❌ | ❌ |
| Recibir | ✅ | ❌ | ❌ | ❌ |
| Cancelar | ✅ | ❌ | ❌ | ❌ |

**Código de validación**:
```typescript
admin: { purchase_orders: ['create', 'read', 'update', 'delete', 'approve', 'receive', 'cancel'] }
manager: { purchase_orders: ['read', 'approve'] }
employee: { purchase_orders: ['read'] }
viewer: { purchase_orders: ['read'] }
```

---

### Módulo: Reportes (`reports`)

| Acción | Admin | Manager | Employee | Viewer |
|--------|:-----:|:-------:|:--------:|:------:|
| Ver reportes | ✅ | ✅ | ❌ | ✅ |

**Código de validación**:
```typescript
admin: { reports: ['read'] }
manager: { reports: ['read'] }
employee: { reports: [] }
viewer: { reports: ['read'] }
```

**Nota**: Los empleados no tienen acceso a reportes, pero los viewers sí (solo lectura).

---

### Módulo: Configuraciones (`settings`)

| Acción | Admin | Manager | Employee | Viewer |
|--------|:-----:|:-------:|:--------:|:------:|
| Ver configuración | ✅ | ✅ | ❌ | ❌ |
| Modificar configuración | ✅ | ❌ | ❌ | ❌ |

**Código de validación**:
```typescript
admin: { settings: ['read', 'update'] }
manager: { settings: ['read'] }
employee: { settings: [] }
viewer: { settings: [] }
```

---

## FUNCIONES ESPECIALES POR ROL

### Gestión de Usuarios

| Función | Admin | Manager | Employee | Viewer |
|---------|:-----:|:-------:|:--------:|:------:|
| Ver usuarios | ✅ | ✅ | ❌ | ❌ |
| Crear usuarios | ✅ | ✅ | ❌ | ❌ |
| Editar usuarios | ✅ | ✅ | ❌ | ❌ |
| Eliminar usuarios | ✅ | ❌ | ❌ | ❌ |
| Cambiar roles | ✅ | ⚠️ Solo inferiores | ❌ | ❌ |

**Código de validación**:
```typescript
// src/lib/auth/permissions.ts
export function canManageUsers(userRole: UserRole): boolean {
  return ['admin', 'manager'].includes(userRole)
}
```

**Regla de jerarquía**: Un manager solo puede gestionar usuarios con roles inferiores (`employee`, `viewer`).

---

### WhatsApp AI Agent

| Función | Admin | Manager | Employee | Viewer |
|---------|:-----:|:-------:|:--------:|:------:|
| Ver conversaciones | ✅ | ✅ | ❌ | ❌ |
| Configurar bot | ✅ | ✅ | ❌ | ❌ |
| Entrenar bot | ✅ | ✅ | ❌ | ❌ |
| Responder manualmente | ✅ | ✅ | ❌ | ❌ |

**Nota**: Basado en código en `supabase/migrations/013_add_whatsapp_sessions.sql`:
```sql
AND user_profiles.role IN ('admin', 'manager')
```

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

export const POST = withRoleValidation(['admin', 'manager'], async (request, user) => {
  // Solo admin y manager pueden acceder
  return NextResponse.json({ message: 'Autorizado' })
})
```

### Patrón 3: Validación con Wrapper de Acceso

```typescript
// src/lib/auth/validation.ts
import { withAccessValidation } from '@/lib/auth/validation'

export const GET = withAccessValidation('quotations', 'approve', async (req, user) => {
  // Solo usuarios con permiso 'approve' en 'quotations' pueden acceder
  return NextResponse.json({ message: 'Cotización aprobada' })
})
```

### Patrón 4: Validación Directa con hasPermission

```typescript
// En componente o función
import { hasPermission } from '@/lib/auth/permissions'

const userRole = 'manager'
const canApprove = hasPermission(userRole, 'quotations', 'approve')
// canApprove = true

const canDelete = hasPermission(userRole, 'customers', 'delete')
// canDelete = false
```

---

## CASOS ESPECIALES

### 1. Órdenes de Trabajo Asignadas

**Problema**: Los empleados solo deben ver/editar órdenes asignadas a ellos.

**Solución**: Implementar filtro adicional en queries:
```typescript
// src/lib/database/queries/work-orders.ts
export async function getWorkOrdersForEmployee(employeeId: string) {
  const supabase = await createClient()
  
  const { data } = await supabase
    .from('work_orders')
    .select('*')
    .eq('assigned_to', employeeId) // ← Filtro por asignación
    .order('created_at', { ascending: false })
  
  return data || []
}
```

**Validación en API**:
```typescript
// Verificar que el empleado solo acceda a sus órdenes
if (user.role === 'employee' && order.assigned_to !== user.id) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

### 2. Multi-Tenant: Filtro por Organization

**Todas las queries deben filtrar por `organization_id`**:
```typescript
const { data } = await supabase
  .from('customers')
  .select('*')
  .eq('organization_id', user.organization_id) // ← CRÍTICO
  .is('deleted_at', null) // Si aplica soft delete
```

### 3. Jerarquía de Roles

**Un manager no puede gestionar otro manager o admin**:
```typescript
// src/lib/auth/validation.ts
export async function canManageUser(managerId: string, targetUserId: string): Promise<boolean> {
  const roleHierarchy: Record<UserRole, number> = {
    admin: 4,
    manager: 3,
    employee: 2,
    viewer: 1
  }
  
  const managerLevel = roleHierarchy[manager.role]
  const targetLevel = roleHierarchy[target.role]
  
  return managerLevel > targetLevel // Solo si es superior
}
```

---

## FUNCIONES HELPER DISPONIBLES

### Verificar Permisos

```typescript
import { hasPermission } from '@/lib/auth/permissions'

// Verificar permiso específico
hasPermission('manager', 'quotations', 'approve') // true
hasPermission('employee', 'quotations', 'approve') // false
```

### Obtener Acciones Permitidas

```typescript
import { getAllowedActions } from '@/lib/auth/permissions'

// Obtener todas las acciones permitidas para un recurso
getAllowedActions('manager', 'quotations')
// ['create', 'read', 'update', 'approve', 'convert']
```

### Verificar Nivel de Acceso

```typescript
import { getAccessLevel } from '@/lib/auth/permissions'

getAccessLevel('admin') // 'full'
getAccessLevel('manager') // 'limited'
getAccessLevel('viewer') // 'readonly'
```

### Verificar Jerarquía

```typescript
import { isRoleSuperior } from '@/lib/auth/permissions'

isRoleSuperior('admin', 'manager') // true
isRoleSuperior('manager', 'admin') // false
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
        disabled={!canApprove} // Deshabilitar si no tiene permiso
      />
    </form>
  )
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
  if (!['admin', 'manager'].includes(userRole || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}
```

---

## ROLES ADICIONALES (NO IMPLEMENTADOS)

### Mechanic / Receptionist

**Estado**: Referenciados en código pero no implementados en sistema de permisos.

**Recomendación**:
1. **Opción A**: Mapear a `employee` (más simple)
2. **Opción B**: Agregar como roles nuevos en `PERMISSIONS`:
   ```typescript
   mechanic: {
     work_orders: ['read', 'update'], // Solo asignadas
     customers: ['read'],
     vehicles: ['read'],
     // ...
   }
   ```

**Código de referencia**:
- `src/app/api/invitations/route.ts`: `const validRoles = ['admin', 'manager', 'mechanic', 'receptionist', 'user']`
- `src/app/mecanicos/page.tsx`: Filtra por `role === 'mechanic'`

---

## TABLA DE RESUMEN RÁPIDO

| Módulo | Admin | Manager | Employee | Viewer |
|--------|:-----:|:-------:|:--------:|:------:|
| **Clientes** | CRUD | CRU | CR | R |
| **Vehículos** | CRUD | CRU | CR | R |
| **Cotizaciones** | CRUD+AC | CRU+AC | CR | R |
| **Órdenes** | CRUD+AC | CRU+AC | CR* | R |
| **Facturas** | CRUD+PC | CRU+P | R | R |
| **Inventario** | CRUD+A | R+A | R | R |
| **Proveedores** | CRUD | R | R | R |
| **Compras** | CRUD+ARC | R+A | R | R |
| **Reportes** | R | R | - | R |
| **Configuración** | RU | R | - | - |
| **Usuarios** | CRUD | CRU* | - | - |

**Leyenda**:
- **C** = Create (Crear)
- **R** = Read (Leer)
- **U** = Update (Actualizar)
- **D** = Delete (Eliminar)
- **A** = Approve (Aprobar)
- **P** = Pay (Pagar)
- **C** = Convert (Convertir)
- **+** = Acciones adicionales
- **\*** = Con restricciones (solo asignadas o roles inferiores)

---

## MEJORAS RECOMENDADAS

1. **Implementar roles `mechanic` y `receptionist`** si se requieren permisos específicos
2. **Agregar permisos granulares** para acciones específicas (ej: "ver reportes financieros" vs "ver reportes generales")
3. **Implementar permisos por módulo** en lugar de solo por rol (ej: "puede ver facturas pero no pagos")
4. **Agregar auditoría de permisos** (log cuando se deniega acceso)
5. **Crear UI para gestión de permisos** (asignar roles, ver permisos por rol)

---

**Última actualización**: Diciembre 2024

