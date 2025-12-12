# 📋 AUDITORÍA: Uso de `workshop_id` en el Sistema Multi-Tenant

**Fecha**: Diciembre 2024  
**Objetivo**: Clarificar el uso de `workshop_id` y determinar si es funcional o legacy

---

## 🔍 RESULTADOS DE LA AUDITORÍA

### ✅ CONCLUSIÓN: `workshop_id` ES FUNCIONAL Y SE USA

**Estado**: ✅ **EN USO** - Implementado como funcionalidad opcional para soporte multi-workshop

---

## 📊 EVIDENCIA ENCONTRADA

### 1. Tabla `workshops` Existe

**Migraciones encontradas**:
- `022_fix_workshops_rls_onboarding.sql` - Configura RLS para workshops
- `FIX_500_ERROR.sql` - Agrega `organization_id` a workshops
- `MIGRATION_MULTI_TENANT_COMPLETE.sql` - Crea workshops de demo

**Estructura de la tabla**:
```sql
CREATE TABLE workshops (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    organization_id UUID REFERENCES organizations(id), -- ✅ Relación con organización
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

**RLS habilitado**: ✅ Sí, con políticas para SELECT, INSERT, UPDATE, DELETE

---

### 2. Uso en Código

#### SessionContext (`src/lib/context/SessionContext.tsx`)

**Implementación**:
- ✅ Calcula `workshopId` dinámicamente
- ✅ Detecta `hasMultipleWorkshops` (si org tiene >1 workshop)
- ✅ Carga información del workshop si existe
- ✅ Maneja casos donde no hay workshop_id

**Lógica**:
```typescript
// Si usuario tiene workshop_id en perfil, usarlo
// Si no, buscar si la org tiene un solo workshop (usar ese)
// Si la org tiene múltiples workshops, workshopId = null
// Si no hay workshops, usar organizationId como fallback
```

#### Componentes que usan `workshop_id`

**CreateWorkOrderModal** (`src/components/ordenes/CreateWorkOrderModal.tsx`):
- ✅ Filtra clientes por `workshop_id` (opcional)
- ✅ Filtra vehículos por `workshop_id` (opcional)
- ✅ Asigna `workshop_id` a nuevas órdenes (opcional)
- ✅ Solo filtra si `workshopId` existe y `!hasMultipleWorkshops`

**CreateWorkOrderModal** (`src/components/dashboard/CreateWorkOrderModal.tsx`):
- ✅ Mismo comportamiento que el anterior

#### Multi-Tenant Helpers

**`src/lib/core/multi-tenant-server.ts`**:
- ✅ `getWorkshopId()` - Obtiene workshop_id del usuario
- ✅ `getWorkshopInfo()` - Obtiene información del workshop
- ✅ `validateWorkshopId()` - Valida formato UUID
- ✅ `createWorkshopFilter()` - Crea filtro para queries

**`src/lib/core/multi-tenant.ts`**:
- ✅ Mismas funciones para cliente

---

### 3. Tablas con `workshop_id`

**Tablas que tienen `workshop_id`** (según código):
- ✅ `users` - Usuario puede pertenecer a un workshop
- ✅ `work_orders` - Orden puede estar asociada a un workshop
- ✅ `customers` - Cliente puede pertenecer a un workshop (opcional)
- ✅ `vehicles` - Vehículo puede pertenecer a un workshop (opcional)
- ✅ `employees` - Empleado puede pertenecer a un workshop (opcional)

**Nota**: `workshop_id` es **opcional** en todas estas tablas (puede ser NULL)

---

## 🏗️ MODELO MULTI-WORKSHOP

### Arquitectura

```
organizations (1)
    ↓ (1:N)
workshops (N)
    ↓ (1:N)
users, work_orders, customers, vehicles, employees
```

### Reglas de Negocio

1. **1 Organización → N Workshops**
   - Una organización puede tener múltiples talleres (workshops)
   - Cada workshop pertenece a una organización

2. **Workshop_id es Opcional**
   - Los datos pueden tener `workshop_id = NULL`
   - Si es NULL, pertenecen a toda la organización
   - Si tiene valor, pertenecen a un workshop específico

3. **Filtrado Inteligente**
   - Si usuario tiene `workshop_id` Y la org tiene 1 solo workshop → Filtrar por `workshop_id`
   - Si usuario tiene `workshop_id` Y la org tiene múltiples workshops → NO filtrar (mostrar todos)
   - Si usuario NO tiene `workshop_id` → NO filtrar (mostrar todos de la org)

4. **Fallback a Organization**
   - Si no hay `workshop_id`, se usa `organization_id` para filtrado
   - Esto asegura que siempre haya aislamiento de datos

---

## 📝 CASOS DE USO

### Caso 1: Organización con 1 Workshop

```
Organización: "Taller ABC"
  └── Workshop: "Sucursal Principal" (único)

Usuario: Juan (workshop_id = "sucursal-principal")
  → Ve solo datos de "Sucursal Principal"
  → Filtra por workshop_id
```

### Caso 2: Organización con Múltiples Workshops

```
Organización: "Taller ABC"
  ├── Workshop: "Sucursal Norte"
  ├── Workshop: "Sucursal Sur"
  └── Workshop: "Sucursal Centro"

Usuario: Juan (workshop_id = "sucursal-norte")
  → Ve datos de TODAS las sucursales
  → NO filtra por workshop_id (hasMultipleWorkshops = true)
```

### Caso 3: Organización sin Workshop Asignado

```
Organización: "Taller ABC"
  └── Workshop: NULL (no hay workshops)

Usuario: Juan (workshop_id = NULL)
  → Ve todos los datos de la organización
  → Filtra solo por organization_id
```

---

## ✅ DECISIÓN: DOCUMENTAR COMO FUNCIONAL

**Razones**:
1. ✅ Tabla `workshops` existe y tiene RLS configurado
2. ✅ Se usa activamente en `SessionContext`
3. ✅ Se usa en componentes de creación de órdenes
4. ✅ Hay helpers específicos para manejar workshops
5. ✅ El código maneja casos de múltiples workshops
6. ✅ Es opcional, no rompe funcionalidad si no se usa

**NO es legacy** - Es una funcionalidad implementada y funcional

---

## 📚 PRÓXIMOS PASOS

1. ✅ Documentar tabla `workshops` en PARTE 6
2. ✅ Agregar sección "MODELO MULTI-WORKSHOP" en PARTE 1
3. ✅ Explicar cuándo filtrar por `workshop_id` vs `organization_id`
4. ✅ Actualizar diagramas de relaciones
5. ✅ Documentar lógica de `hasMultipleWorkshops`

---

## 🔍 QUERIES DE VERIFICACIÓN

### Verificar estructura de workshops

```sql
-- Ver estructura
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'workshops'
ORDER BY ordinal_position;

-- Ver datos
SELECT id, name, organization_id, created_at
FROM workshops
ORDER BY organization_id, name;

-- Contar workshops por organización
SELECT 
    o.name as organization_name,
    COUNT(w.id) as workshop_count
FROM organizations o
LEFT JOIN workshops w ON w.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY workshop_count DESC;
```

### Verificar uso de workshop_id

```sql
-- Ver tablas con workshop_id
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name = 'workshop_id'
  AND table_schema = 'public'
ORDER BY table_name;

-- Ver distribución de workshop_id en work_orders
SELECT 
    CASE 
        WHEN workshop_id IS NULL THEN 'Sin workshop'
        ELSE 'Con workshop'
    END as status,
    COUNT(*) as count
FROM work_orders
GROUP BY status;

-- Ver usuarios con/sin workshop_id
SELECT 
    CASE 
        WHEN workshop_id IS NULL THEN 'Sin workshop'
        ELSE 'Con workshop'
    END as status,
    COUNT(*) as count
FROM users
GROUP BY status;
```

---

## 📊 RESUMEN

| Aspecto | Estado |
|---------|--------|
| **Tabla workshops existe** | ✅ Sí |
| **RLS configurado** | ✅ Sí |
| **Se usa en código** | ✅ Sí (opcional) |
| **SessionContext lo maneja** | ✅ Sí |
| **Componentes lo usan** | ✅ Sí |
| **Es legacy** | ❌ No |
| **Es funcional** | ✅ Sí |
| **Es opcional** | ✅ Sí |

---

## ✅ CONCLUSIÓN FINAL

**`workshop_id` es una funcionalidad ACTIVA y FUNCIONAL** que permite:
- Soporte para organizaciones con múltiples talleres
- Filtrado opcional de datos por workshop
- Flexibilidad para organizaciones con 1 o N workshops

**Debe documentarse** como parte del modelo multi-tenant, no como legacy.

