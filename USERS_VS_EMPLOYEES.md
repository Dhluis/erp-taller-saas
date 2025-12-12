# 📋 DOCUMENTACIÓN: Diferencia entre `users` y `employees`

**Fecha**: Diciembre 2024  
**Objetivo**: Clarificar la diferencia y relación entre las tablas `users` y `employees`

---

## 🔍 RESUMEN EJECUTIVO

| Aspecto | `users` | `employees` |
|---------|---------|-------------|
| **Propósito** | Usuarios con login al sistema | Empleados del taller (operativos) |
| **Requiere autenticación** | ✅ Sí (Supabase Auth) | ❌ No |
| **Puede existir sin la otra tabla** | ✅ Sí | ✅ Sí |
| **Foreign key directa** | ❌ No hay | ❌ No hay |
| **Se usa para** | Login, permisos, acceso al sistema | Asignación a órdenes, información laboral |
| **Relación con órdenes** | `work_orders.created_by` → `auth.users.id` | `work_orders.assigned_to` → `employees.id` |

---

## 📊 ESTRUCTURA DE TABLAS

### Tabla `users`

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    auth_user_id UUID NOT NULL REFERENCES auth.users(id),  -- ✅ Obligatorio
    name TEXT,
    email TEXT,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    role TEXT,  -- 'admin', 'manager', 'user', 'receptionist'
    workshop_id UUID REFERENCES workshops(id),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

**Características**:
- ✅ **Requiere autenticación**: Debe tener `auth_user_id` vinculado a Supabase Auth
- ✅ **Puede iniciar sesión**: Accede al sistema con email y contraseña
- ✅ **Roles del sistema**: Permisos de acceso (`admin`, `manager`, etc.)
- ❌ **NO tiene `employee_id`**: No hay foreign key a `employees`

### Tabla `employees`

```sql
CREATE TABLE employees (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name TEXT NOT NULL,
    email TEXT,  -- Opcional
    phone TEXT,
    role TEXT,  -- 'mechanic', 'supervisor', 'receptionist', 'admin'
    specialties TEXT[],  -- Array de especialidades
    hourly_rate DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    hire_date DATE,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

**Características**:
- ❌ **NO requiere autenticación**: Puede existir sin tener cuenta de usuario
- ❌ **NO puede iniciar sesión**: No tiene vinculación con Supabase Auth
- ✅ **Roles operativos**: Qué hace en el taller (`mechanic`, `supervisor`, etc.)
- ❌ **NO tiene `user_id`**: No hay foreign key a `users`

---

## 🔗 RELACIÓN ENTRE TABLAS

### No hay Foreign Key Directa

**IMPORTANTE**: Las tablas `users` y `employees` son **independientes**. No hay foreign key entre ellas.

### Cómo se Relacionan (Opcional)

Si un empleado también es usuario del sistema, la relación es **manual e indirecta**:

1. **Por email**: Si ambos tienen el mismo email, se pueden vincular manualmente
2. **Por nombre**: Búsqueda manual por nombre (no automática)
3. **Sin relación**: Es completamente válido que existan independientemente

### Diagrama de Relaciones

```
auth.users (Supabase Auth)
    ↓ (1:1 obligatorio)
users (perfiles con login)
    ↓ (opcional, manual)
employees (empleados del taller)
    ↓ (1:N)
work_orders.assigned_to → employees.id
```

---

## 💼 CASOS DE USO

### Caso 1: Usuario admin SIN ser empleado

**Escenario**: Administrador remoto que gestiona pero no trabaja en el taller

```
✅ users:
  - id: uuid-1
  - auth_user_id: auth-uuid-1
  - email: admin@taller.com
  - role: 'admin'
  - organization_id: org-1

❌ employees: No existe registro
```

**Uso**: Administrador puede acceder al sistema, ver reportes, gestionar configuración, pero no aparece en lista de empleados ni puede ser asignado a órdenes.

---

### Caso 2: Mecánico que NO es usuario

**Escenario**: Mecánico que trabaja pero no usa el sistema

```
❌ users: No existe registro

✅ employees:
  - id: uuid-2
  - name: 'Juan Pérez'
  - role: 'mechanic'
  - specialties: ['engine', 'transmission']
  - organization_id: org-1
```

**Uso**: Mecánico puede ser asignado a órdenes (`work_orders.assigned_to = uuid-2`), pero no puede iniciar sesión al sistema.

---

### Caso 3: Usuario que SÍ es empleado

**Escenario**: Mecánico que también usa el sistema

```
✅ users:
  - id: uuid-3
  - auth_user_id: auth-uuid-3
  - email: maria@taller.com
  - role: 'user'
  - organization_id: org-1

✅ employees:
  - id: uuid-4
  - name: 'María González'
  - email: maria@taller.com  -- Mismo email (vinculación manual)
  - role: 'mechanic'
  - organization_id: org-1
```

**Uso**: 
- Puede iniciar sesión al sistema (como `users`)
- Puede ser asignado a órdenes (como `employees`)
- La vinculación es por email (manual, no automática)

---

### Caso 4: Recepcionista que es usuario

**Escenario**: Recepcionista que crea órdenes y gestiona clientes

```
✅ users:
  - id: uuid-5
  - auth_user_id: auth-uuid-5
  - email: recepcion@taller.com
  - role: 'receptionist'
  - organization_id: org-1

✅ employees:
  - id: uuid-6
  - name: 'Ana López'
  - email: recepcion@taller.com
  - role: 'receptionist'
  - organization_id: org-1
```

**Uso**: Recepcionista puede crear órdenes (como usuario) y también aparece en lista de empleados.

---

## 🎯 CUÁNDO CREAR CADA UNA

### Crear `user` cuando:

- ✅ La persona necesita iniciar sesión al sistema
- ✅ Va a gestionar datos (crear órdenes, ver reportes, etc.)
- ✅ Es administrador o gerente
- ✅ Necesita acceso al dashboard
- ✅ Requiere permisos específicos del sistema

### Crear `employee` cuando:

- ✅ La persona trabaja en el taller (mecánico, supervisor)
- ✅ Necesita ser asignado a órdenes de trabajo
- ✅ Se necesita registrar especialidades y tarifas
- ✅ Puede o no tener acceso al sistema
- ✅ Es personal operativo del taller

### Crear ambas cuando:

- ✅ La persona es empleado Y necesita usar el sistema
- ✅ Ejemplo: Mecánico que también consulta sus órdenes asignadas
- ✅ Se crean dos registros independientes (sin FK directa)
- ✅ La vinculación es manual (por email/nombre)

---

## 📝 REGLAS DE NEGOCIO

1. **Un empleado puede existir sin tener registro en `users`**
   - ✅ Válido: Mecánico que trabaja pero no usa el sistema
   - ✅ Puede ser asignado a órdenes igualmente

2. **Un usuario puede existir sin tener registro en `employees`**
   - ✅ Válido: Administrador remoto que gestiona pero no trabaja en taller
   - ✅ Puede acceder al sistema pero no aparece en lista de empleados

3. **No hay foreign key entre `users` y `employees`**
   - ✅ Son tablas independientes
   - ✅ La relación es opcional y manual

4. **`work_orders.assigned_to` referencia `employees.id`, NO `users.id`**
   - ✅ Se asigna empleado, no usuario
   - ✅ El empleado puede no tener cuenta de usuario

5. **`work_orders.created_by` referencia `auth.users.id`, NO `employees.id`**
   - ✅ Se registra quién creó la orden (usuario del sistema)
   - ✅ Diferente de quién trabaja en ella (`assigned_to`)

---

## 🔍 QUERIES ÚTILES

### Buscar empleados que también son usuarios

```sql
SELECT 
    e.id as employee_id,
    e.name as employee_name,
    e.email as employee_email,
    u.id as user_id,
    u.email as user_email
FROM employees e
LEFT JOIN users u ON e.email = u.email
WHERE e.organization_id = 'org-id'
  AND u.id IS NOT NULL;  -- Solo los que tienen usuario
```

### Buscar empleados sin usuario

```sql
SELECT e.*
FROM employees e
LEFT JOIN users u ON e.email = u.email
WHERE e.organization_id = 'org-id'
  AND u.id IS NULL;  -- Solo los que NO tienen usuario
```

### Buscar usuarios sin empleado

```sql
SELECT u.*
FROM users u
LEFT JOIN employees e ON u.email = e.email
WHERE u.organization_id = 'org-id'
  AND e.id IS NULL;  -- Solo los que NO tienen empleado
```

---

## ✅ CONCLUSIÓN

- **`users`** = Personas con acceso al sistema (login requerido)
- **`employees`** = Trabajadores del taller (pueden o no tener login)
- **No hay foreign key directa** entre ellas
- **Son tablas independientes** que pueden existir por separado
- **La relación es opcional y manual** (por email/nombre)

