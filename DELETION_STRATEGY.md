# ESTRATEGIA DE ELIMINACIÓN DE REGISTROS

**Última actualización**: Diciembre 2024

Este documento describe la estrategia de eliminación (soft delete vs hard delete) para cada tabla del sistema.

---

## RESUMEN EJECUTIVO

**Estado Actual**:
- ✅ **Soft Delete Implementado**: `products`, `users`, `employees` (usan `is_active = false`)
- ❌ **Hard Delete Implementado**: `customers`, `vehicles`, `work_orders`, `quotations`, `payments`, `invoices`
- ⚠️ **Inconsistencia**: `customers` y `suppliers` tienen campo `is_active` pero NO se usa en DELETE

**Recomendación**: Implementar soft delete consistente usando `deleted_at` para todas las tablas que requieren mantener historial.

---

## ESTRATEGIA POR TABLA

| Tabla | Estrategia Actual | Campo Usado | Implementación | Razón | Recomendación |
|-------|-------------------|-------------|----------------|-------|---------------|
| `customers` | **HARD DELETE** | `.delete()` | `src/app/api/customers/[id]/route.ts` | Validación: No eliminar si tiene órdenes | **CAMBIAR A SOFT DELETE** |
| `vehicles` | **HARD DELETE** | `.delete()` | `src/app/api/vehicles/[id]/route.ts` | Validación: No eliminar si tiene órdenes | **CAMBIAR A SOFT DELETE** |
| `work_orders` | **HARD DELETE** | `.delete()` | `src/lib/database/queries/work-orders.ts` | Solo borradores (draft) | **MANTENER HARD DELETE** (solo draft) |
| `quotations` | **HARD DELETE** | `.delete()` | `src/app/api/quotations/[id]/route.ts` | Validación: Solo draft/cancelled | **CAMBIAR A SOFT DELETE** |
| `quotation_items` | **HARD DELETE** | `.delete()` | `src/app/api/quotations/[id]/route.ts` | Se eliminan al actualizar cotización | **MANTENER HARD DELETE** |
| `products` | **SOFT DELETE** ✅ | `is_active = false` | `src/lib/database/queries/products.ts` | Mantener historial de movimientos | **MANTENER** |
| `users` | **SOFT DELETE** ✅ | `is_active = false` | `src/lib/database/queries/users.ts` | Mantener historial de acciones | **MANTENER** |
| `employees` | **SOFT DELETE** ✅ | `is_active = false` | `src/lib/database/queries/employees.ts` | Mantener historial de asignaciones | **MANTENER** |
| `suppliers` | **HARD DELETE** | `.delete()` | - | - | **CAMBIAR A SOFT DELETE** |
| `invoices` | **HARD DELETE** | `.delete()` | `src/lib/supabase/quotations-invoices.ts` | Integridad financiera | **NUNCA ELIMINAR** |
| `payments` | **HARD DELETE** | `.delete()` | `src/lib/supabase/quotations-invoices.ts` | Integridad financiera | **NUNCA ELIMINAR** |
| `collections` | **HARD DELETE** | `.delete()` | - | Integridad financiera | **NUNCA ELIMINAR** |
| `order_items` | **HARD DELETE** | `.delete()` | `src/lib/database/queries/order-items.ts` | Se eliminan al actualizar orden | **MANTENER HARD DELETE** |
| `inventory_movements` | **NUNCA** | - | - | Auditoría histórica | **NUNCA ELIMINAR** |
| `whatsapp_conversations` | **ARCHIVAR** | `status = 'archived'` | - | Mantener historial | **MANTENER** |
| `whatsapp_messages` | **NUNCA** | - | - | Auditoría histórica | **NUNCA ELIMINAR** |

---

## IMPLEMENTACIÓN ACTUAL

### 1. SOFT DELETE (Implementado)

#### Products
```typescript
// src/lib/database/queries/products.ts
export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({ 
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
}

// Queries filtran por is_active = true
.eq('is_active', true)
```

**Recuperación**: Actualizar `is_active = true`

#### Users
```typescript
// src/lib/database/queries/users.ts
export async function deactivateUser(id: string, updated_by: string) {
  const { data, error } = await supabase
    .from('system_users')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
      updated_by
    })
    .eq('id', id)
}

// Queries filtran por is_active = true
.eq('is_active', true)
```

**Recuperación**: Función `activateUser(id, updated_by)`

#### Employees
```typescript
// Similar a users, usa is_active = false
// Queries filtran por is_active = true
.eq('is_active', true)
```

**Recuperación**: Actualizar `is_active = true`

### 2. HARD DELETE (Implementado)

#### Customers
```typescript
// src/app/api/customers/[id]/route.ts
// Validación: No eliminar si tiene órdenes
const { data: orders } = await supabase
  .from('work_orders')
  .select('id')
  .eq('customer_id', params.id)
  .limit(1)

if (orders && orders.length > 0) {
  return NextResponse.json({ 
    error: 'No se puede eliminar el cliente porque tiene órdenes asociadas' 
  }, { status: 400 })
}

// Hard delete
await supabase
  .from('customers')
  .delete()
  .eq('id', params.id)
```

**Problema**: Si el cliente tiene órdenes completadas, no se puede eliminar, pero si no tiene órdenes, se elimina permanentemente.

#### Vehicles
```typescript
// src/app/api/vehicles/[id]/route.ts
// Validación: No eliminar si tiene órdenes
const { data: orders } = await supabase
  .from('work_orders')
  .select('id')
  .eq('vehicle_id', params.id)
  .limit(1)

if (orders && orders.length > 0) {
  return NextResponse.json({ 
    error: 'No se puede eliminar el vehículo porque tiene órdenes asociadas' 
  }, { status: 400 })
}

// Hard delete
await supabase
  .from('vehicles')
  .delete()
  .eq('id', params.id)
```

**Problema**: Similar a customers.

#### Work Orders
```typescript
// src/lib/database/queries/work-orders.ts
// Hard delete directo
.delete()
.eq('id', id)
```

**Nota**: Solo se permite eliminar órdenes en estado `draft` o `reception`.

#### Quotations
```typescript
// src/app/api/quotations/[id]/route.ts
// Validación: Solo eliminar si status = 'draft' o 'cancelled'
if (!['draft', 'cancelled'].includes(quotation.status)) {
  return NextResponse.json({
    success: false,
    error: 'Solo se pueden eliminar cotizaciones en estado draft o cancelled',
  }, { status: 400 });
}

// Hard delete
await supabase
  .from('quotations')
  .delete()
  .eq('id', params.id)
```

---

## PLAN DE IMPLEMENTACIÓN: SOFT DELETE CON `deleted_at`

### Fase 1: Agregar Campo `deleted_at`

**Migración SQL**:
```sql
-- Agregar deleted_at a tablas que requieren soft delete
ALTER TABLE customers ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE vehicles ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE quotations ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE suppliers ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Crear índices para queries eficientes
CREATE INDEX idx_customers_deleted_at ON customers(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_vehicles_deleted_at ON vehicles(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_quotations_deleted_at ON quotations(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_suppliers_deleted_at ON suppliers(deleted_at) WHERE deleted_at IS NULL;
```

### Fase 2: Crear Función Helper

**Archivo**: `src/lib/database/queries/soft-delete.ts`
```typescript
import { createClient } from '@/lib/supabase/server'

/**
 * Soft delete: Marcar registro como eliminado
 */
export async function softDelete(
  table: string,
  id: string,
  organizationId: string
): Promise<void> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from(table)
    .update({ 
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null) // Solo si no está ya eliminado
  
  if (error) throw error
}

/**
 * Restaurar registro eliminado
 */
export async function restoreDeleted(
  table: string,
  id: string,
  organizationId: string
): Promise<void> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from(table)
    .update({ 
      deleted_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .not('deleted_at', 'is', null) // Solo si está eliminado
  
  if (error) throw error
}

/**
 * Hard delete: Eliminar permanentemente (solo para admin)
 */
export async function hardDelete(
  table: string,
  id: string,
  organizationId: string
): Promise<void> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId)
  
  if (error) throw error
}
```

### Fase 3: Actualizar Queries para Filtrar Eliminados

**Patrón a seguir**:
```typescript
// ANTES (sin filtro)
const { data } = await supabase
  .from('customers')
  .select('*')
  .eq('organization_id', organizationId)

// DESPUÉS (con filtro de soft delete)
const { data } = await supabase
  .from('customers')
  .select('*')
  .eq('organization_id', organizationId)
  .is('deleted_at', null) // ← Filtrar eliminados
```

**Archivos a actualizar**:
- `src/lib/database/queries/customers.ts`
- `src/lib/database/queries/vehicles.ts`
- `src/lib/database/queries/quotations.ts`
- `src/lib/database/queries/suppliers.ts`

### Fase 4: Actualizar Endpoints DELETE

**Ejemplo para Customers**:
```typescript
// src/app/api/customers/[id]/route.ts
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const tenantContext = await getTenantContext()
  if (!tenantContext) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = await createClient()
  
  // Verificar si tiene órdenes activas
  const { data: orders } = await supabase
    .from('work_orders')
    .select('id')
    .eq('customer_id', params.id)
    .eq('organization_id', tenantContext.organizationId)
    .is('deleted_at', null) // Solo órdenes no eliminadas
    .limit(1)

  if (orders && orders.length > 0) {
    return NextResponse.json({ 
      error: 'No se puede eliminar el cliente porque tiene órdenes de trabajo asociadas' 
    }, { status: 400 })
  }

  // Soft delete
  await softDelete('customers', params.id, tenantContext.organizationId)
  
  return NextResponse.json({ success: true })
}
```

### Fase 5: Agregar Endpoint de Restauración

**Nuevo endpoint**: `POST /api/customers/[id]/restore`
```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const tenantContext = await getTenantContext()
  if (!tenantContext) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  await restoreDeleted('customers', params.id, tenantContext.organizationId)
  
  return NextResponse.json({ success: true })
}
```

---

## REGLAS DE NEGOCIO POR TABLA

### Customers
- **Soft Delete**: ✅ Recomendado
- **Validación**: No eliminar si tiene órdenes de trabajo activas
- **Recuperación**: Permitir restaurar si no tiene órdenes nuevas desde eliminación

### Vehicles
- **Soft Delete**: ✅ Recomendado
- **Validación**: No eliminar si tiene órdenes de trabajo activas
- **Recuperación**: Permitir restaurar si no tiene órdenes nuevas desde eliminación

### Work Orders
- **Hard Delete**: ✅ Solo borradores (draft/reception)
- **Restricción**: No eliminar órdenes con estado avanzado (disassembly, assembly, etc.)
- **Razón**: Órdenes completadas deben mantenerse para auditoría

### Quotations
- **Soft Delete**: ✅ Recomendado
- **Validación**: Solo eliminar si status = 'draft' o 'cancelled'
- **Recuperación**: Permitir restaurar cotizaciones eliminadas

### Products
- **Soft Delete**: ✅ Ya implementado (is_active)
- **Mantener**: Sistema actual funciona bien
- **Mejora opcional**: Migrar a `deleted_at` para consistencia

### Invoices / Payments / Collections
- **NUNCA ELIMINAR**: ❌
- **Razón**: Integridad financiera, auditoría legal
- **Alternativa**: Si hay error, crear nota de crédito o ajuste

### Inventory Movements
- **NUNCA ELIMINAR**: ❌
- **Razón**: Auditoría histórica de stock
- **Alternativa**: Crear movimiento de ajuste si hay error

### WhatsApp Messages / Conversations
- **Archivar**: Usar `status = 'archived'` para conversaciones
- **Mensajes**: NUNCA eliminar (auditoría)

---

## QUERIES DE VERIFICACIÓN

### Ver tablas con deleted_at
```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE column_name IN ('deleted_at', 'deleted', 'is_deleted', 'archived_at')
  AND table_schema = 'public'
ORDER BY table_name;
```

### Ver registros eliminados (soft delete)
```sql
-- Customers eliminados
SELECT id, name, deleted_at
FROM customers
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC;

-- Vehicles eliminados
SELECT id, brand, model, deleted_at
FROM vehicles
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC;
```

### Limpiar registros eliminados antiguos (hard delete después de X días)
```sql
-- Eliminar permanentemente registros eliminados hace más de 1 año
DELETE FROM customers
WHERE deleted_at IS NOT NULL
  AND deleted_at < NOW() - INTERVAL '1 year';
```

---

## MIGRACIÓN DE `is_active` A `deleted_at`

Si se decide migrar `products`, `users`, `employees` de `is_active` a `deleted_at`:

```sql
-- Migrar products
UPDATE products
SET deleted_at = updated_at
WHERE is_active = false
  AND deleted_at IS NULL;

-- Migrar users
UPDATE system_users
SET deleted_at = updated_at
WHERE is_active = false
  AND deleted_at IS NULL;

-- Migrar employees
UPDATE employees
SET deleted_at = updated_at
WHERE is_active = false
  AND deleted_at IS NULL;
```

**Ventajas de `deleted_at` sobre `is_active`**:
- ✅ Timestamp de eliminación (auditoría)
- ✅ Permite múltiples estados (activo, inactivo, eliminado)
- ✅ Consistente con estándares de la industria
- ✅ Facilita limpieza automática (eliminar después de X días)

---

## IMPLEMENTACIÓN RECOMENDADA

### Prioridad Alta
1. ✅ Agregar `deleted_at` a `customers`, `vehicles`, `quotations`, `suppliers`
2. ✅ Crear función helper `softDelete()`
3. ✅ Actualizar queries para filtrar `deleted_at IS NULL`
4. ✅ Actualizar endpoints DELETE para usar soft delete

### Prioridad Media
5. ⚠️ Agregar endpoints de restauración (`/restore`)
6. ⚠️ Migrar `products`, `users`, `employees` de `is_active` a `deleted_at`
7. ⚠️ Crear job de limpieza automática (eliminar después de 1 año)

### Prioridad Baja
8. 📋 Dashboard de administración para ver/restaurar eliminados
9. 📋 Logs de auditoría de eliminaciones
10. 📋 Notificaciones cuando se elimina registro importante

---

## EJEMPLOS DE CÓDIGO

### Soft Delete Customer
```typescript
import { softDelete } from '@/lib/database/queries/soft-delete'

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const tenantContext = await getTenantContext()
  
  // Validar que no tenga órdenes activas
  const { data: orders } = await supabase
    .from('work_orders')
    .select('id')
    .eq('customer_id', params.id)
    .is('deleted_at', null)
    .limit(1)
  
  if (orders?.length > 0) {
    return NextResponse.json({ 
      error: 'No se puede eliminar el cliente porque tiene órdenes asociadas' 
    }, { status: 400 })
  }
  
  // Soft delete
  await softDelete('customers', params.id, tenantContext.organizationId)
  
  return NextResponse.json({ success: true })
}
```

### Query con Filtro de Soft Delete
```typescript
export async function getAllCustomers(organizationId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null) // ← Filtrar eliminados
    .order('name')
  
  return data || []
}
```

### Restaurar Registro
```typescript
import { restoreDeleted } from '@/lib/database/queries/soft-delete'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const tenantContext = await getTenantContext()
  
  await restoreDeleted('customers', params.id, tenantContext.organizationId)
  
  return NextResponse.json({ success: true })
}
```

---

**Última actualización**: Diciembre 2024

