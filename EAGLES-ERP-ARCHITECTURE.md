# 🦅 EAGLES ERP - Documentación Completa de Arquitectura

> **Sistema de Gestión Integral para Talleres Automotrices**  
> Versión: 0.1.0  
> Última actualización: Diciembre 2024

---

## 📑 Tabla de Contenidos

1. [Arquitectura General](#parte-1-arquitectura-general)
2. [Módulos y Funcionalidades](#parte-2-módulos-y-funcionalidades)
3. [Flujos de Usuario](#parte-3-flujos-de-usuario-paso-a-paso)
4. [APIs y Endpoints](#parte-4-apis-y-endpoints)
5. [Seguridad Multi-Tenant](#parte-5-seguridad-multi-tenant)
6. [Base de Datos](#parte-6-base-de-datos)
7. [Componentes Reutilizables](#parte-7-componentes-reutilizables)

---

# PARTE 1: ARQUITECTURA GENERAL

## 1. STACK TECNOLÓGICO

### Frontend
- **Framework**: Next.js 15.5.7 (App Router)
- **Lenguaje**: TypeScript 5.9.3
- **UI Library**: React 18.3.1
- **Estilos**: Tailwind CSS 3.4.17
- **Componentes UI**: Radix UI (Dialog, Select, Dropdown, etc.)
- **Iconos**: Lucide React
- **Formularios**: React Hook Form + Zod
- **Estado Global**: Zustand + React Context
- **Notificaciones**: Sonner
- **Gráficas**: Recharts
- **Drag & Drop**: @dnd-kit

### Backend
- **API Routes**: Next.js API Routes (Serverless Functions)
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **ORM/Queries**: Supabase Client (PostgREST)
- **Validación**: Zod
- **Logging**: Sistema de logging personalizado

### Integraciones Externas
- **WhatsApp**: WAHA (WhatsApp HTTP API) + Claude AI (Anthropic)
- **Almacenamiento**: Supabase Storage
- **Email**: Supabase Auth (para recuperación de contraseña)

## 2. ESTRUCTURA DE CARPETAS

```
src/
├── app/                    # Next.js App Router (rutas y páginas)
│   ├── (dashboard)/       # Grupo de rutas del dashboard
│   ├── api/               # API Routes (endpoints backend)
│   ├── auth/              # Páginas de autenticación
│   ├── clientes/          # Módulo de clientes
│   ├── vehiculos/         # Módulo de vehículos
│   ├── ordenes/           # Módulo de órdenes de trabajo
│   ├── cotizaciones/      # Módulo de cotizaciones
│   ├── inventarios/       # Módulo de inventario
│   ├── facturacion/       # Módulo de facturación
│   ├── compras/           # Módulo de compras
│   ├── dashboard/         # Dashboard principal
│   └── ...
│
├── components/            # Componentes React reutilizables
│   ├── ui/                # Componentes UI base (Button, Input, etc.)
│   ├── layout/            # Componentes de layout (Sidebar, Header)
│   ├── customers/         # Componentes específicos de clientes
│   ├── vehicles/          # Componentes específicos de vehículos
│   ├── work-orders/       # Componentes de órdenes de trabajo
│   ├── quotations/        # Componentes de cotizaciones
│   ├── inventory/         # Componentes de inventario
│   └── ...
│
├── lib/                   # Utilidades y helpers
│   ├── core/              # Funciones core (multi-tenant, logging)
│   ├── supabase/          # Clientes y queries de Supabase
│   ├── database/          # Queries y schemas de base de datos
│   ├── auth/              # Helpers de autenticación
│   ├── api/               # Utilidades para API calls
│   └── ...
│
├── contexts/              # React Contexts
│   ├── SessionContext.tsx # Contexto de sesión y organización
│   ├── AuthContext.tsx    # Contexto de autenticación
│   └── SidebarContext.tsx # Contexto del sidebar
│
├── hooks/                 # Custom React Hooks
│   ├── useAuth.ts         # Hook de autenticación
│   ├── useCustomers.ts    # Hook de clientes
│   ├── useWorkOrders.ts   # Hook de órdenes de trabajo
│   └── ...
│
├── integrations/          # Integraciones externas
│   └── whatsapp/          # Integración con WhatsApp AI Agent
│
└── types/                 # TypeScript types e interfaces
```

### Convenciones de Nombres
- **Componentes**: PascalCase (ej: `CustomerForm.tsx`)
- **Hooks**: camelCase con prefijo `use` (ej: `useCustomers.ts`)
- **Utilidades**: camelCase (ej: `multi-tenant-server.ts`)
- **Páginas**: `page.tsx` (Next.js App Router)
- **API Routes**: `route.ts` (Next.js API Routes)
- **Tipos**: PascalCase (ej: `WorkOrder`, `Customer`)

## 3. MODELO MULTI-TENANT

### Arquitectura Multi-Tenant
El sistema implementa un modelo **multi-tenant** donde cada organización tiene sus propios datos completamente aislados.

**Estructura:**
- **1 Organization** puede tener **múltiples Workshops** (talleres/sucursales)
- **Cada usuario** pertenece a **1 Organization** y opcionalmente a **1 Workshop**
- **Todos los datos** están aislados por `organization_id`
- **Datos opcionales** pueden estar filtrados por `workshop_id` (si la organización tiene un solo workshop)

### Modelo Multi-Workshop

El sistema soporta organizaciones con **múltiples talleres/sucursales** mediante la tabla `workshops`.

**Relación**:
```
organizations (1)
    ↓ (1:N)
workshops (N)
    ↓ (1:N opcional)
users, work_orders, customers, vehicles, employees
```

**Características**:
- **Workshop_id es opcional**: Los datos pueden tener `workshop_id = NULL`
- **Filtrado inteligente**: 
  - Si org tiene 1 workshop → Se filtra por `workshop_id`
  - Si org tiene múltiples workshops → NO se filtra (se muestran todos)
  - Si no hay `workshop_id` → Se filtra solo por `organization_id`
- **Fallback**: Si no hay `workshop_id`, se usa `organization_id` para aislamiento

**Tabla `workshops`**:
- `id`: UUID único
- `name`: Nombre del taller/sucursal
- `organization_id`: FK a `organizations.id` (obligatorio)
- `email`, `phone`, `address`: Información de contacto
- RLS habilitado: Usuarios solo ven workshops de su organización

**Uso en código**:
- `SessionContext` calcula `workshopId` y `hasMultipleWorkshops`
- Componentes filtran opcionalmente por `workshop_id`
- Helpers en `multi-tenant.ts` y `multi-tenant-server.ts` manejan la lógica

### Aislamiento de Datos
1. **Campo `organization_id`**: Todas las tablas principales tienen este campo
2. **Filtrado automático**: Todas las queries filtran por `organization_id`
3. **Row Level Security (RLS)**: Políticas en Supabase que previenen acceso cruzado
4. **Validación en API**: Cada endpoint valida el `organization_id` del usuario

### Modelo de Usuarios y Empleados

El sistema distingue entre **usuarios del sistema** (`users`) y **empleados del taller** (`employees`). Esta separación permite flexibilidad en la gestión del personal.

#### ¿Qué es la tabla `users`?

**Propósito**: Usuarios con acceso al sistema (tienen login)

**Características**:
- **Tienen cuenta de autenticación**: Vinculados a `auth.users` de Supabase Auth mediante `auth_user_id`
- **Pueden iniciar sesión**: Acceden al sistema con email y contraseña
- **Roles del sistema**: `admin`, `manager`, `user`, `receptionist`
- **Pertenecen a organización**: Tienen `organization_id` obligatorio
- **Pueden NO ser empleados**: Un usuario puede ser solo administrador sin ser mecánico

**Campos principales**:
- `id`: UUID único
- `auth_user_id`: FK a `auth.users.id` (obligatorio)
- `name`: Nombre del usuario
- `email`: Email (usado para login)
- `organization_id`: FK a `organizations.id` (obligatorio)
- `role`: Rol en el sistema (`admin`, `manager`, `user`, etc.)
- `workshop_id`: FK opcional a `workshops.id`

**Casos de uso**:
- Administrador del sistema que no trabaja en el taller
- Gerente que gestiona pero no realiza reparaciones
- Recepcionista que usa el sistema pero no es mecánico

#### ¿Qué es la tabla `employees`?

**Propósito**: Empleados del taller (mecánicos, supervisores, personal operativo)

**Características**:
- **NO requieren cuenta de usuario**: Pueden existir sin tener login al sistema
- **Información laboral**: Especialidades, tarifa por hora, fecha de contratación
- **Roles operativos**: `mechanic`, `supervisor`, `receptionist`, `admin`
- **Pertenecen a organización**: Tienen `organization_id` obligatorio
- **Pueden ser asignados a órdenes**: Campo `work_orders.assigned_to` referencia `employees.id`

**Campos principales**:
- `id`: UUID único
- `organization_id`: FK a `organizations.id` (obligatorio)
- `name`: Nombre del empleado
- `email`: Email (opcional, puede coincidir con usuario)
- `phone`: Teléfono
- `role`: Rol operativo (`mechanic`, `supervisor`, etc.)
- `specialties`: Array de especialidades (ej: `['engine', 'transmission']`)
- `hourly_rate`: Tarifa por hora
- `is_active`: Si está activo
- `hire_date`: Fecha de contratación
- **NO tiene `user_id`**: No hay foreign key directa a `users`

**Casos de uso**:
- Mecánico que trabaja en el taller pero no usa el sistema
- Supervisor que solo gestiona en campo, no en sistema
- Empleado temporal que no necesita acceso

#### Relación entre `users` y `employees`

**IMPORTANTE**: No hay foreign key directa entre estas tablas. La relación es **opcional e indirecta**.

**Cómo se relacionan**:
1. **Por email**: Si un empleado tiene email y un usuario tiene el mismo email, se pueden vincular manualmente
2. **Por nombre**: Búsqueda manual por nombre (no automática)
3. **Sin relación**: Es completamente válido que existan independientemente

**Diagrama de relaciones**:
```
auth.users (Supabase Auth)
    ↓ (1:1)
users (perfiles de usuario con login)
    ↓ (opcional, por email/nombre)
employees (empleados del taller)
    ↓ (1:N)
work_orders.assigned_to → employees.id
```

#### Casos de Uso Comunes

**Caso 1: Usuario admin SIN ser empleado**
```
✅ Es posible y común
- Usuario: admin@taller.com (tiene login, rol: admin)
- Employee: No existe registro en employees
- Uso: Administrador remoto que gestiona pero no trabaja en taller
```

**Caso 2: Mecánico que NO es usuario**
```
✅ Es posible y común
- Employee: Juan Pérez (mecánico, especialidad: transmisiones)
- User: No existe registro en users
- Uso: Mecánico que trabaja pero no usa el sistema
- Asignación: Se puede asignar a órdenes mediante employees.id
```

**Caso 3: Usuario que SÍ es empleado**
```
✅ Es posible
- User: maria@taller.com (tiene login, rol: mechanic)
- Employee: María González (mecánico, email: maria@taller.com)
- Vinculación: Manual por email (no automática)
- Uso: Mecánico que también usa el sistema para ver sus órdenes
```

**Caso 4: Recepcionista que es usuario**
```
✅ Es común
- User: recepcion@taller.com (tiene login, rol: receptionist)
- Employee: Ana López (recepcionista, email: recepcion@taller.com)
- Uso: Recepcionista que crea órdenes y gestiona clientes
```

#### Cuándo Crear `user` vs `employee`

**Crear `user` cuando**:
- La persona necesita iniciar sesión al sistema
- Va a gestionar datos (crear órdenes, ver reportes, etc.)
- Es administrador o gerente
- Necesita acceso al dashboard

**Crear `employee` cuando**:
- La persona trabaja en el taller (mecánico, supervisor)
- Necesita ser asignado a órdenes de trabajo
- Se necesita registrar especialidades y tarifas
- Puede o no tener acceso al sistema

**Crear ambos cuando**:
- La persona es empleado Y necesita usar el sistema
- Ejemplo: Mecánico que también consulta sus órdenes asignadas
- Se crean dos registros independientes (sin FK directa)

## CONTROL DE ACCESO Y PERMISOS

Para una referencia completa de permisos por rol, consultar el documento **`PERMISSIONS_MATRIX.md`**.

### Roles Definidos

El sistema define **4 roles principales**:

1. **`admin`**: Administrador completo del sistema (nivel 4)
2. **`manager`**: Gerente con permisos de gestión limitados (nivel 3)
3. **`employee`**: Empleado con permisos de creación y lectura (nivel 2)
4. **`viewer`**: Solo lectura, sin permisos de modificación (nivel 1)

**Jerarquía**: `admin > manager > employee > viewer`

### Sistema de Permisos

**Archivo**: `src/lib/auth/permissions.ts`

El sistema utiliza un modelo de permisos basado en **recurso + acción**:

- **Recursos**: `customers`, `vehicles`, `quotations`, `work_orders`, `invoices`, `inventory`, `suppliers`, `purchase_orders`, `reports`, `settings`
- **Acciones**: `create`, `read`, `update`, `delete`, `approve`, `pay`, `convert`, `receive`, `cancel`, `adjust`

**Ejemplo de validación**:
```typescript
import { hasPermission } from '@/lib/auth/permissions'

// Verificar si un manager puede aprobar cotizaciones
hasPermission('manager', 'quotations', 'approve') // true

// Verificar si un employee puede eliminar clientes
hasPermission('employee', 'customers', 'delete') // false
```

### Matriz de Permisos Resumida

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
- **C** = Create, **R** = Read, **U** = Update, **D** = Delete
- **A** = Approve, **P** = Pay, **C** = Convert, **+** = Acciones adicionales
- **\*** = Con restricciones (solo asignadas o roles inferiores)

### Validación en el Código

**Patrón 1: Validación en API Routes**
```typescript
import { requireAuth, validateAccess } from '@/lib/auth/validation'

export async function GET(request: NextRequest) {
  const user = await requireAuth(request)
  
  if (!await validateAccess(user.id, 'customers', 'read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // Continuar con lógica...
}
```

**Patrón 2: Middleware Wrapper**
```typescript
import { withRoleValidation } from '@/lib/auth/validation'

export const POST = withRoleValidation(['admin', 'manager'], async (request, user) => {
  // Solo admin y manager pueden acceder
})
```

**Patrón 3: Validación en Componentes**
```typescript
'use client'
import { useSession } from '@/contexts/SessionContext'
import { hasPermission } from '@/lib/auth/permissions'

const canEdit = hasPermission(user.role, 'customers', 'update')
{canEdit && <Button>Editar</Button>}
```

### Casos Especiales

**1. Órdenes Asignadas a Empleados**:
- Los `employee` solo pueden ver/editar órdenes asignadas a ellos
- Implementar filtro adicional: `.eq('assigned_to', employeeId)`

**2. Gestión de Usuarios**:
- Solo `admin` y `manager` pueden gestionar usuarios
- `manager` solo puede gestionar roles inferiores (`employee`, `viewer`)

**3. Multi-Tenant**:
- Todas las queries deben filtrar por `organization_id`
- Los permisos se validan dentro del contexto de la organización

Ver `PERMISSIONS_MATRIX.md` para la matriz completa y ejemplos detallados.

### Flujo de Autenticación y Contexto

```
1. Usuario inicia sesión
   ↓
2. Supabase Auth valida credenciales
   ↓
3. SessionContext carga perfil del usuario
   ↓
4. Se obtiene organization_id del perfil
   ↓
5. Se carga información de la organización
   ↓
6. Se establece contexto de tenant (organizationId, workshopId, userId)
   ↓
7. Todas las queries usan este contexto para filtrar datos
```

### Validación de Tenant en Requests

**En API Routes:**
```typescript
// Ejemplo de validación
const { organizationId } = await getTenantContext(request)
// Todas las queries incluyen: .eq('organization_id', organizationId)
```

**En Componentes:**
```typescript
// Hook useSession proporciona organizationId
const { organizationId } = useSession()
// Se pasa a hooks y funciones que hacen queries
```

### Row Level Security (RLS)
Todas las tablas tienen RLS habilitado con políticas que:
- Filtran automáticamente por `organization_id`
- Previenen INSERT/UPDATE/DELETE de datos de otras organizaciones
- Usan `auth.uid()` para identificar al usuario autenticado

---

# PARTE 2: MÓDULOS Y FUNCIONALIDADES

## MÓDULO: CLIENTES

### ¿Qué hace?
Gestiona la información de los clientes del taller: datos personales, contacto, historial de servicios.

### Flujos Principales
1. **Crear Cliente**: Formulario con validación, se asigna automáticamente `organization_id`
2. **Listar Clientes**: Tabla con búsqueda, filtros y paginación
3. **Editar Cliente**: Modal de edición con validación
4. **Eliminar Cliente**: Confirmación antes de eliminar (soft delete si aplica)
5. **Ver Detalles**: Modal con información completa y historial

### Validaciones de Campos

| Campo | Tipo | Requerido | Validación Frontend | Validación BD | Mensaje de Error |
|-------|------|-----------|---------------------|---------------|------------------|
| `name` | string | ✅ | `min(2)`, `max(100)` | `VARCHAR(255) NOT NULL` | "El nombre debe tener al menos 2 caracteres" / "El nombre no puede exceder 100 caracteres" |
| `email` | string | ❌ | `email()` | `VARCHAR(255)` | "Email inválido" |
| `phone` | string | ❌ | `regex(/^[\+]?[1-9][\d]{0,15}$/)` | `VARCHAR(50)` | "Teléfono inválido" |
| `address` | string | ❌ | `max(200)` | `TEXT` | "La dirección no puede exceder 200 caracteres" |
| `city` | string | ❌ | `max(50)` | `VARCHAR(100)` | "La ciudad no puede exceder 50 caracteres" |
| `state` | string | ❌ | `max(50)` | `VARCHAR(100)` | "El estado no puede exceder 50 caracteres" |
| `zip_code` | string | ❌ | `max(10)` | `VARCHAR(20)` | "El código postal no puede exceder 10 caracteres" |

**Notas**:
- `name` es obligatorio en BD (`NOT NULL`)
- `phone` acepta formato internacional con `+` opcional
- `email` es opcional pero debe ser válido si se proporciona

### Datos que Maneja
- Información personal: nombre, apellido, email, teléfono, dirección
- Relaciones: vehículos asociados, órdenes de trabajo, cotizaciones
- Metadatos: `organization_id`, `created_at`, `updated_at`

### Relaciones
- **customers** → **vehicles** (1:N)
- **customers** → **work_orders** (1:N)
- **customers** → **quotations** (1:N)
- **customers** → **invoices** (1:N)

### Reglas de Negocio
- Email debe ser único por organización
- No se puede eliminar cliente con órdenes activas
- Todos los clientes pertenecen a una organización

## MÓDULO: VEHÍCULOS

### ¿Qué hace?
Gestiona los vehículos de los clientes: marca, modelo, año, placa, VIN, historial de servicios.

### Relación con Clientes
- Cada vehículo pertenece a **un cliente**
- Un cliente puede tener **múltiples vehículos**
- Foreign key: `vehicles.customer_id` → `customers.id`

### Flujos Principales
1. **Crear Vehículo**: Seleccionar cliente, ingresar datos del vehículo
2. **Listar Vehículos**: Filtrado por cliente, búsqueda por placa/VIN
3. **Editar Vehículo**: Actualizar información
4. **Ver Historial**: Órdenes de trabajo asociadas al vehículo

### Datos que Maneja
- Información del vehículo: marca, modelo, año, placa, VIN, color
- Relaciones: cliente, órdenes de trabajo, cotizaciones
- Metadatos: `organization_id`, `customer_id`

### Reglas de Negocio
- Placa debe ser única por organización
- VIN es opcional pero debe ser único si se proporciona
- No se puede eliminar vehículo con órdenes activas

### Validaciones de Campos

| Campo | Tipo | Requerido | Validación Frontend | Validación BD | Mensaje de Error |
|-------|------|-----------|---------------------|---------------|------------------|
| `customer_id` | UUID | ✅ | `uuid()` | `UUID NOT NULL` | "ID de cliente inválido" |
| `make` (marca) | string | ✅ | `min(2)`, `max(50)` | `VARCHAR(50)` | "La marca debe tener al menos 2 caracteres" / "La marca no puede exceder 50 caracteres" |
| `model` (modelo) | string | ✅ | `min(2)`, `max(50)` | `VARCHAR(50)` | "El modelo debe tener al menos 2 caracteres" / "El modelo no puede exceder 50 caracteres" |
| `year` | number | ✅ | `int()`, `min(1900)`, `max(año_actual + 1)` | `INTEGER` | "El año debe ser mayor a 1900" / "El año no puede ser futuro" |
| `vin` | string | ❌ | `regex(/^[A-HJ-NPR-Z0-9]{17}$/)` | `VARCHAR(17)` | "VIN inválido" (debe tener exactamente 17 caracteres) |
| `license_plate` | string | ❌ | `max(20)` | `VARCHAR(20)` | "La placa no puede exceder 20 caracteres" |
| `color` | string | ❌ | `max(30)` | `VARCHAR(30)` | "El color no puede exceder 30 caracteres" |
| `mileage` | number | ❌ | `int()`, `min(0)`, `max(999999)` | `INTEGER` | "El kilometraje no puede ser negativo" / "El kilometraje no puede exceder 999,999" |

**Notas**:
- `vin` debe tener exactamente 17 caracteres (excluye I, O, Q)
- `year` puede ser hasta el año siguiente al actual
- `mileage` no puede ser negativo

## MÓDULO: ÓRDENES DE TRABAJO

### ¿Qué hace?
Core del sistema. Gestiona el ciclo completo de una orden desde recepción hasta entrega.

### Estados de una Orden
El sistema usa un flujo Kanban con los siguientes **11 estados oficiales**:

1. **reception** - Recepción del vehículo
2. **diagnosis** - Diagnóstico del problema
3. **initial_quote** - Cotización inicial
4. **waiting_approval** - Esperando aprobación del cliente
5. **disassembly** - Desmontaje
6. **waiting_parts** - Esperando piezas
7. **assembly** - Reensamblaje
8. **testing** - Pruebas de funcionamiento
9. **ready** - Listo para entrega
10. **completed** - Completada y entregada
11. **cancelled** - Cancelada

**⚠️ IMPORTANTE**: Estos son los únicos estados válidos. Los estados legacy (`pending`, `in_progress`, `diagnosed`, `approved`, `in_repair`, `delivered`) han sido deprecados y se migran automáticamente a los estados oficiales.

### Transiciones de Estado Permitidas

El sistema valida las transiciones de estado para mantener la integridad del flujo:

**Flujo principal**:
```
reception → diagnosis → initial_quote → waiting_approval → 
disassembly → waiting_parts → assembly → testing → ready → completed
```

**Transiciones especiales**:
- Cualquier estado → `cancelled` (se puede cancelar en cualquier momento)
- `waiting_approval` → `cancelled` (si cliente rechaza)
- `waiting_approval` → `disassembly` (si cliente aprueba)
- `waiting_parts` → `assembly` (cuando llegan las piezas)

**Estados que no pueden retroceder**:
- `completed` → No puede cambiar a otro estado
- `cancelled` → No puede cambiar a otro estado

### Flujo Completo de una Orden

```
1. RECEPCIÓN (reception)
   - Cliente llega al taller
   - Se crea orden con estado "reception"
   - Se registra vehículo y cliente
   - Se toma información inicial del problema
   ↓
2. DIAGNÓSTICO (diagnosis)
   - Mecánico evalúa el vehículo
   - Se cambia estado a "diagnosis"
   - Se documentan problemas encontrados
   ↓
3. COTIZACIÓN INICIAL (initial_quote)
   - Mecánico crea cotización desde orden
   - Agrega servicios y repuestos necesarios
   - Calcula totales
   - Estado orden: "initial_quote"
   ↓
4. ESPERANDO APROBACIÓN (waiting_approval)
   - Cotización enviada al cliente
   - Estado orden: "waiting_approval"
   - Cliente aprueba o rechaza
   ↓
5. DESMONTAJE (disassembly) - Si aprobado
   - Estado: "disassembly"
   - Mecánico desmonta componente
   ↓
6. ESPERANDO PIEZAS (waiting_parts) - Si faltan piezas
   - Estado: "waiting_parts"
   - Se crea orden de compra si necesario
   - Se espera llegada de repuestos
   ↓
7. ARMADO (assembly) - Cuando llegan piezas
   - Estado: "assembly"
   - Se reensambla el componente
   ↓
8. PRUEBAS (testing)
   - Estado: "testing"
   - Se prueba funcionamiento
   - Se verifica que todo esté correcto
   ↓
9. LISTO (ready)
   - Estado: "ready"
   - Cliente es notificado
   - Listo para entrega
   ↓
10. COMPLETADA (completed)
    - Cliente recoge vehículo
    - Estado: "completed"
    - Se genera factura automáticamente
    - Cliente paga
    - Se registra pago
    - Orden completada

CANCELACIÓN (cancelled) - Puede ocurrir en cualquier momento
   - Si cliente rechaza cotización
   - Si se cancela por cualquier razón
   - Estado: "cancelled"
   - No puede cambiar a otro estado después
```

### Relaciones
- **work_orders** → **customers** (N:1)
- **work_orders** → **vehicles** (N:1)
- **work_orders** → **employees** (N:1, mecánico asignado)
- **work_orders** → **order_items** (1:N, servicios y repuestos)
- **work_orders** → **quotations** (1:1, cotización asociada)
- **work_orders** → **invoices** (1:1, factura generada)

### Cálculo de Totales
- **Subtotal**: Suma de todos los items (servicios + repuestos)
- **Descuento**: Porcentaje o monto fijo aplicado
- **IVA**: 16% sobre subtotal después de descuento
- **Total**: Subtotal - Descuento + IVA

### Reglas de Negocio
- Solo órdenes en estado "draft" o "reception" pueden editarse libremente
- No se puede eliminar orden con items asociados
- Al completar orden, se genera automáticamente factura
- Los items consumen inventario automáticamente

### Validaciones de Campos

| Campo | Tipo | Requerido | Validación Frontend | Validación BD | Mensaje de Error |
|-------|------|-----------|---------------------|---------------|------------------|
| `customer_id` | UUID | ✅ | `uuid()` | `UUID NOT NULL` | "ID de cliente inválido" |
| `vehicle_id` | UUID | ✅ | `uuid()` | `UUID NOT NULL` | "ID de vehículo inválido" |
| `description` | string | ✅ | `min(10)`, `max(1000)` | `TEXT` | "La descripción debe tener al menos 10 caracteres" / "La descripción no puede exceder 1000 caracteres" |
| `status` | enum | ❌ | `enum([11 estados oficiales])` | `CHECK constraint` | "Estado inválido" |
| `priority` | enum | ❌ | `enum(['low', 'medium', 'high'])` | `VARCHAR(20)` | "La prioridad debe ser low, medium o high" |
| `estimated_hours` | number | ❌ | `min(0.5)`, `max(24)` | `DECIMAL(10,2)` | "Las horas estimadas deben ser al menos 0.5" / "Las horas estimadas no pueden exceder 24" |
| `labor_cost` | number | ❌ | `min(0)`, `max(999999.99)` | `DECIMAL(10,2)` | "El costo de mano de obra no puede ser negativo" / "El costo de mano de obra no puede exceder 999,999.99" |
| `parts_cost` | number | ❌ | `min(0)`, `max(999999.99)` | `DECIMAL(10,2)` | "El costo de partes no puede ser negativo" / "El costo de partes no puede exceder 999,999.99" |
| `total_cost` | number | ❌ | `min(0)`, `max(999999.99)` | `DECIMAL(10,2)` | "El costo total no puede ser negativo" / "El costo total no puede exceder 999,999.99" |

**Notas**:
- `status` tiene 11 estados oficiales según CHECK constraint en BD
- `description` debe tener al menos 10 caracteres para ser descriptiva
- Los costos están limitados a 999,999.99

## MÓDULO: COTIZACIONES

### ¿Qué hace?
Gestiona cotizaciones/presupuestos para clientes antes de iniciar trabajos.

### Estados de Cotización
- **draft** - Borrador (editable)
- **sent** - Enviada al cliente
- **approved** - Aprobada por cliente
- **rejected** - Rechazada por cliente
- **expired** - Vencida (pasó fecha de vigencia)
- **converted** - Convertida a orden de trabajo

### Flujo de Creación y Aprobación

```
1. CREAR COTIZACIÓN
   - Seleccionar cliente y vehículo
   - Agregar items (servicios/productos)
   - Establecer fecha de vigencia
   - Agregar términos y condiciones
   ↓
2. GUARDAR COMO BORRADOR
   - Estado: "draft"
   - Puede editarse libremente
   ↓
3. ENVIAR AL CLIENTE
   - Estado: "sent"
   - Se envía por email/WhatsApp
   - Cliente puede aprobar o rechazar
   ↓
4. APROBACIÓN
   - Si aprobada: Estado "approved"
   - Si rechazada: Estado "rejected"
   ↓
5. CONVERSIÓN
   - Cotización aprobada puede convertirse a orden de trabajo
   - Estado: "converted"
   - Se crea orden con items de la cotización
```

### Conversión a Orden de Trabajo
Cuando una cotización se convierte:
- Se crea nueva orden de trabajo
- Se copian todos los items
- Se mantiene referencia (`work_order_id` en cotización)
- La cotización pasa a estado "converted"

### Cálculo de Totales y Descuentos
- **Subtotal por item**: `quantity × unit_price`
- **Descuento por item**: `subtotal × (discount_percent / 100)`
- **Subtotal después descuento**: `subtotal - discount_amount`
- **IVA por item**: `subtotal_after_discount × 0.16`
- **Total por item**: `subtotal_after_discount + tax_amount`
- **Totales generales**: Suma de todos los items

### Reglas de Negocio
- Solo cotizaciones en estado "draft" pueden editarse
- Fecha de vigencia debe ser >= fecha actual
- Cotización convertida no puede editarse
- Al vencer, estado cambia automáticamente a "expired"

### Validaciones de Campos

| Campo | Tipo | Requerido | Validación Frontend | Validación BD | Mensaje de Error |
|-------|------|-----------|---------------------|---------------|------------------|
| `customer_id` | UUID | ✅ | `uuid()` | `UUID NOT NULL` | "ID de cliente inválido" |
| `vehicle_id` | UUID | ✅ | `uuid()` | `UUID NOT NULL` | "ID de vehículo inválido" |
| `quotation_number` | string | ❌ | - | `VARCHAR(50) UNIQUE` | - (generado automáticamente: `COT-YYYYMM-0001`) |
| `status` | enum | ❌ | `enum(['draft', 'sent', 'accepted', 'rejected', 'expired'])` | `VARCHAR(20)` | "Estado inválido" |
| `valid_until` | date | ✅ | `datetime()` | `DATE` | "Fecha de vencimiento inválida" |
| `subtotal` | number | ✅ | `min(0)`, `max(999999.99)` | `DECIMAL(10,2)` | "El subtotal no puede ser negativo" / "El subtotal no puede exceder 999,999.99" |
| `tax_amount` | number | ✅ | `min(0)`, `max(999999.99)` | `DECIMAL(10,2)` | "El monto de impuestos no puede ser negativo" / "El monto de impuestos no puede exceder 999,999.99" |
| `discount_amount` | number | ✅ | `min(0)`, `max(999999.99)` | `DECIMAL(10,2)` | "El descuento no puede ser negativo" / "El descuento no puede exceder 999,999.99" |
| `total_amount` | number | ✅ | `min(0)`, `max(999999.99)` | `DECIMAL(10,2)` | "El total no puede ser negativo" / "El total no puede exceder 999,999.99" |
| `notes` | string | ❌ | `max(1000)` | `TEXT` | "Las notas no pueden exceder 1000 caracteres" |

**Notas**:
- `quotation_number` se genera automáticamente por trigger: `COT-YYYYMM-0001`
- Los montos están limitados a 999,999.99
- Los items de cotización tienen validaciones adicionales (ver PARTE 6.5: Triggers)

## MÓDULO: INVENTARIO

### ¿Qué hace?
Gestiona productos, repuestos, control de stock, movimientos y alertas.

### Categorías y Productos
- **Categorías**: Organización jerárquica de productos
- **Productos**: Repuestos, materiales, consumibles
- Cada producto tiene: nombre, SKU, precio, costo, stock, nivel mínimo

### Movimientos de Inventario
Tipos de movimientos:
- **ENTRADA**: Compra, ajuste positivo, devolución
- **SALIDA**: Venta, uso en orden, ajuste negativo, daño

### Control de Stock
- **Stock actual**: Cantidad disponible
- **Stock mínimo**: Nivel de alerta
- **Stock máximo**: Capacidad de almacén
- **Costo promedio**: Cálculo automático al ingresar productos

### Alertas de Stock Bajo
- Sistema monitorea productos con `stock_quantity < min_stock_level`
- Genera notificaciones automáticas
- Permite crear orden de compra directamente desde alerta

### Reglas de Negocio
- No se puede vender/usar más stock del disponible
- Movimientos de salida deben tener orden de trabajo asociada
- Costo se actualiza con promedio ponderado
- Productos con stock bajo generan alertas automáticas

### Validaciones de Campos

| Campo | Tipo | Requerido | Validación Frontend | Validación BD | Mensaje de Error |
|-------|------|-----------|---------------------|---------------|------------------|
| `category_id` | UUID | ✅ | `uuid()` | `UUID NOT NULL` | "ID de categoría inválido" |
| `name` | string | ✅ | `min(2)`, `max(100)` | `VARCHAR(255) NOT NULL` | "El nombre debe tener al menos 2 caracteres" / "El nombre no puede exceder 100 caracteres" |
| `description` | string | ❌ | `max(500)` | `TEXT` | "La descripción no puede exceder 500 caracteres" |
| `sku` | string | ❌ | `regex(/^[A-Z0-9-]+$/)`, `max(50)` | `VARCHAR(50) UNIQUE` | "SKU inválido" (solo mayúsculas, números y guiones) |
| `quantity` | number | ✅ | `int()`, `min(0)`, `max(999999)` | `INTEGER NOT NULL` | "La cantidad no puede ser negativa" / "La cantidad no puede exceder 999,999" |
| `minimum_stock` | number | ❌ | `int()`, `min(0)`, `max(999999)` | `INTEGER` | "El stock mínimo no puede ser negativo" / "El stock mínimo no puede exceder 999,999" |
| `unit_price` | number | ✅ | `min(0)`, `max(999999.99)` | `DECIMAL(10,2) NOT NULL` | "El precio no puede ser negativo" / "El precio no puede exceder 999,999.99" |

**Notas**:
- `sku` debe ser único por organización
- `sku` solo acepta mayúsculas, números y guiones

## MÓDULO: EMPLEADOS/MECÁNICOS

### ¿Qué hace?
Gestiona empleados del taller (tabla `employees`): mecánicos, supervisores, recepcionistas. **IMPORTANTE**: Esta tabla es independiente de `users`. Un empleado puede existir sin tener cuenta de usuario.

### Diferencia con `users`

**Tabla `employees`**:
- Personal operativo del taller
- **NO requiere cuenta de usuario** (puede existir sin login)
- Se usa para asignar órdenes de trabajo
- Tiene información laboral (especialidades, tarifa, fecha contratación)

**Tabla `users`**:
- Usuarios con acceso al sistema
- **Requiere cuenta de autenticación** (Supabase Auth)
- Se usa para login y permisos
- Tiene información de sesión y roles del sistema

**Relación**:
- **NO hay foreign key directa** entre `employees` y `users`
- Pueden existir independientemente
- Si un empleado también es usuario, se vinculan por email/nombre (manual)

### Roles Disponibles en `employees`
- **mechanic** - Mecánico (el más común)
- **supervisor** - Supervisor de taller
- **admin** - Administrador operativo
- **receptionist** - Recepcionista

**Nota**: Estos roles son **operativos** (qué hace en el taller), diferentes a los roles de `users` que son **de sistema** (permisos de acceso).

### Asignación a Órdenes
- Cada orden puede tener un empleado asignado
- Se registra en `work_orders.assigned_to` → `employees.id`
- Permite filtrar órdenes por empleado
- Facilita seguimiento de carga de trabajo
- **El empleado asignado NO necesita ser usuario del sistema**

**Ejemplo**:
```
Orden WO-001:
  - assigned_to: employees.id (Juan Pérez, mecánico)
  - Juan puede NO tener cuenta de usuario
  - La orden se le asigna igualmente
```

### Especialidades
- Los empleados pueden tener especialidades (array de strings)
- Ejemplos: `['engine', 'transmission', 'electrical']`
- Se usa para asignación inteligente de órdenes
- Facilita búsqueda de empleado adecuado según tipo de trabajo

### Campos Específicos de `employees`
- **specialties**: Array de especialidades técnicas
- **hourly_rate**: Tarifa por hora del empleado
- **hire_date**: Fecha de contratación
- **is_active**: Si está activo (puede estar inactivo pero mantener historial)

### Reglas de Negocio
- Solo usuarios con rol "admin" pueden crear/editar empleados
- Empleados deben pertenecer a la misma organización (`organization_id`)
- No se puede eliminar empleado con órdenes asignadas (soft delete con `is_active = false`)
- **Un empleado puede existir sin tener registro en `users`**
- **Un usuario puede existir sin tener registro en `employees`**

### Cuándo Crear Empleado

**Crear registro en `employees` cuando**:
1. La persona trabaja físicamente en el taller
2. Necesita ser asignado a órdenes de trabajo
3. Se necesita registrar especialidades o tarifa
4. Es mecánico, supervisor o personal operativo

**NO es necesario crear `user` para crear `employee`**:
- Un mecánico puede trabajar sin tener acceso al sistema
- Se puede asignar a órdenes igualmente
- Solo necesita registro en `employees`

### Validaciones de Campos

| Campo | Tipo | Requerido | Validación Frontend | Validación BD | Mensaje de Error |
|-------|------|-----------|---------------------|---------------|------------------|
| `name` | string | ✅ | `min(2)`, `max(100)` | `TEXT NOT NULL` | "El nombre debe tener al menos 2 caracteres" |
| `email` | string | ❌ | `email()` | `TEXT UNIQUE` | "Email inválido" |
| `phone` | string | ❌ | `regex(/^[\+]?[1-9][\d]{0,15}$/)` | `TEXT` | "Teléfono inválido" |
| `role` | enum | ✅ | `enum(['mechanic', 'supervisor', 'admin', 'receptionist'])` | `CHECK constraint` | "Rol inválido" |
| `specialties` | array | ❌ | - | `TEXT[] DEFAULT '{}'` | - |
| `hourly_rate` | number | ❌ | `min(0)`, `max(999999.99)` | `DECIMAL(10,2) DEFAULT 0.00` | "La tarifa por hora no puede ser negativa" |
| `hire_date` | date | ❌ | `date()` | `DATE DEFAULT CURRENT_DATE` | "Fecha de contratación inválida" |

**Notas**:
- `role` tiene CHECK constraint en BD con valores permitidos
- `specialties` es un array de strings (ej: `['engine', 'transmission', 'electrical']`)

## MÓDULO: FACTURACIÓN (INVOICES)

### ¿Qué hace?
Gestiona facturas, pagos y cobros del taller.

### Relación con Órdenes
- Factura se genera desde orden completada
- Una orden genera una factura
- Factura puede tener múltiples pagos (parciales)

### Estados de Factura
- **pending** - Pendiente de pago
- **partial** - Pago parcial
- **paid** - Pagada completamente
- **overdue** - Vencida
- **cancelled** - Cancelada

### Pagos
- **Métodos**: Efectivo, transferencia, tarjeta, cheque
- **Pagos parciales**: Se permiten múltiples pagos
- **Referencias**: Número de transacción, cheque, etc.
- **Fecha de pago**: Se registra automáticamente

### Reglas de Negocio
- Factura se genera automáticamente al completar orden
- Total de pagos no puede exceder total de factura
- Facturas vencidas generan alertas
- No se puede eliminar factura con pagos registrados

### Validaciones de Campos

| Campo | Tipo | Requerido | Validación Frontend | Validación BD | Mensaje de Error |
|-------|------|-----------|---------------------|---------------|------------------|
| `customer_id` | UUID | ✅ | `uuid()` | `UUID NOT NULL` | "ID de cliente inválido" |
| `invoice_number` | string | ❌ | - | `VARCHAR(50) UNIQUE NOT NULL` | - (generado automáticamente: `FAC-YYYYMM-0001`) |
| `status` | enum | ❌ | `enum(['draft', 'sent', 'paid', 'overdue', 'cancelled'])` | `VARCHAR(50) DEFAULT 'draft'` | "Estado inválido" |
| `issue_date` | date | ✅ | `datetime()` | `DATE NOT NULL` | "Fecha de emisión inválida" |
| `due_date` | date | ✅ | `datetime()` | `DATE NOT NULL` | "Fecha de vencimiento inválida" |
| `subtotal` | number | ✅ | `min(0)`, `max(999999.99)` | `DECIMAL(10,2) DEFAULT 0` | "El subtotal no puede ser negativo" / "El subtotal no puede exceder 999,999.99" |
| `tax_amount` | number | ✅ | `min(0)`, `max(999999.99)` | `DECIMAL(10,2) DEFAULT 0` | "El monto de impuestos no puede ser negativo" / "El monto de impuestos no puede exceder 999,999.99" |
| `total_amount` | number | ✅ | `min(0)`, `max(999999.99)` | `DECIMAL(10,2) DEFAULT 0` | "El total no puede ser negativo" / "El total no puede exceder 999,999.99" |
| `paid_amount` | number | ❌ | `min(0)`, `max(999999.99)` | `DECIMAL(10,2) DEFAULT 0` | "El monto pagado no puede ser negativo" / "El monto pagado no puede exceder 999,999.99" |
| `notes` | string | ❌ | `max(1000)` | `TEXT` | "Las notas no pueden exceder 1000 caracteres" |

**Notas**:
- `invoice_number` se genera automáticamente por trigger: `FAC-YYYYMM-0001`
- `balance` = `total_amount - paid_amount` (calculado)

## MÓDULO: COMPRAS (PURCHASE_ORDERS)

### ¿Qué hace?
Gestiona órdenes de compra a proveedores para repuestos y materiales.

### Flujo de Compra

```
1. CREAR ORDEN DE COMPRA
   - Seleccionar proveedor
   - Agregar productos a comprar
   - Establecer fecha esperada de entrega
   ↓
2. ENVIAR A PROVEEDOR
   - Estado: "sent"
   - Se envía por email
   ↓
3. RECIBIR PRODUCTOS
   - Estado: "received"
   - Se actualiza inventario automáticamente
   - Se registra costo real
   ↓
4. PAGAR
   - Estado: "paid"
   - Se registra pago al proveedor
```

### Proveedores
- Información de contacto
- Términos de pago
- Historial de compras
- Evaluación de desempeño

### Reglas de Negocio
- Al recibir productos, se actualiza inventario automáticamente
- Costo de productos se actualiza con costo de compra
- Orden de compra puede tener múltiples items
- No se puede eliminar orden recibida

### Validaciones de Campos

| Campo | Tipo | Requerido | Validación Frontend | Validación BD | Mensaje de Error |
|-------|------|-----------|---------------------|---------------|------------------|
| `supplier_id` | UUID | ✅ | `uuid()` | `UUID NOT NULL` | "ID de proveedor inválido" |
| `order_number` | string | ❌ | - | `VARCHAR(50) UNIQUE` | - (generado automáticamente: `COMP-YYYYMM-0001`) |
| `status` | enum | ❌ | - | `VARCHAR(50) DEFAULT 'pending'` | - |
| `total_amount` | number | ❌ | `min(0)`, `max(999999.99)` | `DECIMAL(10,2) DEFAULT 0` | "El total no puede ser negativo" / "El total no puede exceder 999,999.99" |

**Notas**:
- `order_number` se genera automáticamente por trigger: `COMP-YYYYMM-0001`

## MÓDULO: WHATSAPP AI AGENT

### ¿Qué hace?
Bot inteligente que atiende clientes por WhatsApp, crea citas, responde consultas y genera órdenes automáticamente.

### Configuración Multi-Tenant (WAHA)
- Cada organización tiene su propia instancia de WAHA
- Configuración almacenada en `ai_agent_config` por organización
- Soporta servidor compartido o instancia propia
- Nombre de sesión único: `eagles_{organizationId_sin_guiones_primeros_20_chars}`

### Vinculación de Número a Organización

**Tabla**: `ai_agent_config`
- **Campo `whatsapp_phone`**: Número de WhatsApp Business vinculado (VARCHAR(20))
- **Campo `whatsapp_session_name`**: Nombre de sesión WAHA (VARCHAR(100))
- **Campo `whatsapp_connected`**: Estado de conexión (BOOLEAN, actualizado automáticamente)

**Proceso de Vinculación**:
1. Usuario completa onboarding en `/dashboard/whatsapp/train-agent`
2. Sistema genera nombre de sesión único: `eagles_{orgId}`
3. Se crea sesión en WAHA con ese nombre
4. Se muestra QR code para escanear con WhatsApp Business
5. Al escanear, WAHA envía evento `session.status` → `WORKING`
6. Webhook actualiza `whatsapp_connected = true` automáticamente
7. Sistema guarda número de teléfono en `whatsapp_phone`

**Validación de Número Único**:
- Cada organización puede tener **un solo número** vinculado
- El número se identifica por `whatsapp_session_name` único
- Si se intenta vincular otro número, se debe desconectar el anterior primero

**Estructura de `ai_agent_config`**:
```sql
CREATE TABLE ai_agent_config (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  whatsapp_phone VARCHAR(20),              -- Número vinculado
  whatsapp_session_name VARCHAR(100),      -- Nombre de sesión WAHA
  whatsapp_connected BOOLEAN DEFAULT false, -- Estado de conexión
  enabled BOOLEAN DEFAULT true,             -- Bot activo/inactivo
  provider VARCHAR(20),                    -- 'openai' o 'anthropic'
  model VARCHAR(50),                       -- 'gpt-4o-mini', 'claude-3-sonnet', etc.
  system_prompt TEXT,                      -- Prompt del sistema
  personality TEXT,                        -- Personalidad del bot
  language VARCHAR(10),                    -- 'es-MX', 'en-US', etc.
  temperature DECIMAL(3,2),                -- 0.0 a 2.0
  max_tokens INTEGER,                      -- Máximo de tokens por respuesta
  auto_schedule_appointments BOOLEAN,      -- Agendar citas automáticamente
  auto_create_orders BOOLEAN,              -- Crear órdenes automáticamente
  require_human_approval BOOLEAN,          -- Requerir aprobación humana
  business_hours_only BOOLEAN,             -- Solo responder en horario
  business_hours JSONB,                    -- Horarios por día
  services JSONB,                          -- Servicios disponibles
  mechanics JSONB,                         -- Mecánicos disponibles
  faqs JSONB,                              -- Preguntas frecuentes
  policies JSONB,                           -- Políticas (payment_methods, cancellation_policy, etc.)
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Manejo de Números No Registrados

**Caso Edge 1: Cliente no registrado escribe por primera vez**

**Flujo**:
1. Webhook recibe mensaje de número desconocido
2. Sistema busca cliente por `phone` en tabla `customers`
3. **Si NO existe**:
   - Se crea automáticamente un cliente con:
     - `name`: "Cliente WhatsApp"
     - `phone`: Número del remitente
     - `organization_id`: De la sesión WAHA
   - Se crea conversación nueva con `is_bot_active = true`
   - Bot responde normalmente
4. **Si existe**:
   - Se busca conversación activa existente
   - Si no hay conversación activa, se crea una nueva
   - Bot responde según configuración

**Código relevante** (`src/app/api/webhooks/whatsapp/route.ts`):
```typescript
// Buscar cliente existente por teléfono
const { data: existingCustomer } = await supabase
  .from('customers')
  .select('id, name')
  .eq('organization_id', organizationId)
  .eq('phone', customerPhone)
  .maybeSingle();

if (!existingCustomer) {
  // Crear nuevo cliente automáticamente
  const { data: newCustomer } = await supabase
    .from('customers')
    .insert({
      organization_id: organizationId,
      name: 'Cliente WhatsApp',
      phone: customerPhone
    })
    .select('id')
    .single();
}
```

**Aprobación Manual**: NO se requiere. El sistema crea clientes automáticamente para facilitar la atención.

**Caso Edge 2: Número bloqueado o spam**

**Actualmente**: No hay sistema de blacklist implementado. **Recomendación**: Agregar tabla `whatsapp_blacklist`:
```sql
CREATE TABLE whatsapp_blacklist (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  phone VARCHAR(20) NOT NULL,
  reason TEXT,
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, phone)
);
```

### Rate Limiting

**Límites Actuales**:
- **No hay límite explícito** en el código actual
- **Recomendación**: Implementar rate limiting por organización

**Límites Recomendados**:
- **Mensajes por minuto**: 20 mensajes/minuto por organización
- **Mensajes por hora**: 500 mensajes/hora por organización
- **Llamadas a Claude API**: 
  - OpenAI: ~3,500 RPM (requests per minute) según plan
  - Anthropic: ~50 RPM (Claude 3 Sonnet), ~5 RPM (Claude 3 Opus)

**Costo por Mensaje**:
- **OpenAI GPT-4o-mini**: ~$0.00015 por mensaje (promedio 500 tokens)
- **Anthropic Claude 3 Sonnet**: ~$0.003 por mensaje (promedio 500 tokens)
- **Anthropic Claude 3 Opus**: ~$0.015 por mensaje (promedio 500 tokens)

**Manejo de Cola si se Excede Límite**:
- **Actual**: No hay cola implementada
- **Recomendación**: Usar Redis o PostgreSQL para cola de mensajes
- Si se excede límite, mensaje se encola y se procesa cuando hay capacidad

**Implementación Sugerida**:
```typescript
// Rate limiting por organización
const rateLimiter = {
  checkLimit: async (organizationId: string) => {
    const key = `whatsapp:rate:${organizationId}:${Date.now() / 60000}`; // Por minuto
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 60);
    return count <= 20; // 20 mensajes por minuto
  }
};
```

### Escalación a Humano

**Cuándo el Bot Escala a Humano**:

1. **Palabras clave de escalación** (configurables en `policies.escalation_rules.keywords_to_escalate`):
   - Ejemplos: "quiero hablar con alguien", "hablar con gerente", "problema", "reclamo"
   - Si el cliente menciona alguna, el bot escala inmediatamente

2. **Límite de mensajes** (configurable en `policies.escalation_rules.max_messages_before_escalate`):
   - Por defecto: 10 mensajes
   - Si después de 10 mensajes el bot no resuelve, sugiere contacto humano

3. **Complejidad de la solicitud**:
   - Si el bot detecta que no puede resolver (respuesta de AI indica necesidad de humano)

**Proceso de Escalación**:

1. **Bot detecta necesidad de escalación**:
   - Responde: "Entiendo tu situación. Permíteme conectarte con uno de nuestros asesores. Te responderá en breve. 👤"
   - Marca conversación: `is_bot_active = false`
   - Asigna a usuario: `assigned_to = null` (pendiente de asignación)

2. **Notificación al Staff**:
   - **Actual**: No hay notificación automática implementada
   - **Recomendación**: Crear notificación en dashboard o email
   - Query sugerida:
   ```sql
   SELECT * FROM whatsapp_conversations 
   WHERE is_bot_active = false 
   AND assigned_to IS NULL 
   AND status = 'active'
   ORDER BY last_message_at DESC;
   ```

3. **Takeover Manual**:
   - Usuario del staff asigna conversación: `assigned_to = user_id`
   - Usuario puede responder manualmente desde dashboard
   - Bot queda desactivado para esa conversación: `is_bot_active = false`

**Tabla `whatsapp_conversations` - Campo `assigned_to`**:
- **Tipo**: UUID (FK a `auth.users(id)`)
- **NULL**: Conversación no asignada (bot activo o pendiente)
- **UUID**: Usuario asignado (bot desactivado, humano responde)

**Reactivar Bot**:
- Usuario puede reactivar bot: `is_bot_active = true`
- Bot retoma la conversación automáticamente

### Contexto de Conversación

**Historial de Mensajes Enviados a Claude**:

- **Por defecto**: Últimos **10 mensajes** (configurable en `getConversationHistory`)
- **Orden**: Cronológico (más antiguo primero)
- **Formato**: Array de `{ role: 'user' | 'assistant', content: string }`

**Código relevante** (`src/integrations/whatsapp/services/context-loader.ts`):
```typescript
export async function getConversationHistory(
  conversationId: string,
  limit: number = 10  // ← Configurable
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const { data } = await supabase
    .from('whatsapp_messages')
    .select('direction, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);
  
  return data.map(msg => ({
    role: msg.direction === 'inbound' ? 'user' : 'assistant',
    content: msg.body
  }));
}
```

**Mantenimiento de Contexto**:
- Contexto se mantiene mientras la conversación esté activa (`status = 'active'`)
- Cada mensaje nuevo se agrega al historial
- Historial se carga dinámicamente en cada llamada a AI

**Timeout de Conversación**:
- **Actual**: NO hay timeout implementado
- **Recomendación**: Implementar timeout de 24 horas de inactividad
- Si no hay mensajes en 24 horas, conversación puede archivarse automáticamente: `status = 'archived'`

**Almacenamiento de Metadata**:
- Campo `metadata` (JSONB) en `whatsapp_conversations`:
  - `last_ai_response_time`: Tiempo de respuesta del AI
  - `total_ai_calls`: Número de llamadas a AI
  - `escalation_reason`: Razón de escalación (si aplica)
  - `customer_sentiment`: Sentimiento detectado (positivo/neutral/negativo)

### Seguridad

**Validación de Webhook**:

**Actual**: NO hay validación de firma implementada
**Recomendación**: Implementar validación HMAC:
```typescript
// Validar firma del webhook
function validateWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  const expectedSignature = hmac.digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

**Prevención de Spam**:

**Actual**: 
- Duplicados bloqueados por constraint `UNIQUE (provider_message_id)` en BD
- Mensajes propios ignorados (`fromMe === true`)
- Estados de WhatsApp ignorados (`status@broadcast`)

**Mejoras Sugeridas**:
1. **Rate limiting por número de teléfono**: Máximo 5 mensajes por minuto por número
2. **Detección de patrones de spam**: Si un número envía >10 mensajes en 1 minuto, bloquear temporalmente
3. **Blacklist de números**: Tabla `whatsapp_blacklist` para números bloqueados

**Encriptación de Mensajes**:
- **Actual**: Mensajes se almacenan en texto plano en BD
- **Recomendación**: Encriptar campo `body` en `whatsapp_messages` para datos sensibles
- Usar `pgcrypto` de PostgreSQL para encriptación AES-256

**Validación de Organización**:
- Webhook valida que el `sessionName` corresponda a una organización válida
- Si no se encuentra organización, mensaje se ignora
- Código: `getOrganizationFromSession(sessionName)` en `waha-sessions.ts`

### Flujo Completo con Casos Edge

```
1. CLIENTE ENVÍA MENSAJE
   ├─ Webhook recibe evento 'message' de WAHA
   ├─ Validar que NO sea mensaje propio (fromMe !== true)
   ├─ Validar que NO sea estado de WhatsApp (status@broadcast)
   ├─ Validar que NO sea grupo (@g.us)
   ├─ Extraer número del remitente
   ├─ Obtener organizationId del sessionName
   │  └─ Si NO se encuentra → IGNORAR mensaje
   ↓
2. DEDUPLICACIÓN
   ├─ Intentar guardar mensaje con provider_message_id único
   ├─ Si error 23505 (duplicado) → RETORNAR 200, IGNORAR
   └─ Si éxito → Continuar
   ↓
3. BUSCAR/CREAR CONVERSACIÓN
   ├─ Buscar conversación activa por (organization_id, customer_phone)
   ├─ Si NO existe:
   │  ├─ Buscar cliente por teléfono
   │  ├─ Si NO existe cliente → CREAR automáticamente
   │  └─ Crear conversación nueva con is_bot_active = true
   └─ Si existe → Usar conversación existente
   ↓
4. GUARDAR MENSAJE EN BD
   ├─ Insertar en whatsapp_messages
   ├─ Actualizar messages_count en conversación (trigger automático)
   ├─ Actualizar last_message y last_message_at
   └─ Si es nueva conversación → Obtener foto de perfil (background)
   ↓
5. VERIFICAR SI BOT ESTÁ ACTIVO
   ├─ Si is_bot_active = false → FIN (no procesar)
   ├─ Si assigned_to IS NOT NULL → FIN (humano asignado)
   └─ Si is_bot_active = true → Continuar
   ↓
6. CARGAR CONFIGURACIÓN AI
   ├─ Buscar ai_agent_config por organization_id
   ├─ Si NO existe → FIN (log error)
   ├─ Si enabled = false → FIN (bot deshabilitado)
   └─ Si enabled = true → Continuar
   ↓
7. PROCESAR CON AI AGENT
   ├─ Cargar contexto (servicios, mecánicos, horarios, FAQs)
   ├─ Cargar historial (últimos 10 mensajes)
   ├─ Construir system prompt
   ├─ Verificar horarios (si business_hours_only = true)
   │  └─ Si fuera de horario → Responder mensaje automático
   ├─ Llamar a Claude/OpenAI con mensaje y contexto
   ├─ Procesar función calls (si hay)
   │  ├─ get_services_info
   │  ├─ check_availability
   │  ├─ create_appointment_request
   │  └─ create_work_order (si auto_create_orders = true)
   └─ Generar respuesta
   ↓
8. VERIFICAR ESCALACIÓN
   ├─ Si mensaje contiene keywords_to_escalate → ESCALAR
   ├─ Si mensajes_count >= max_messages_before_escalate → ESCALAR
   └─ Si NO → Continuar
   ↓
9. ESCALAR A HUMANO (si aplica)
   ├─ is_bot_active = false
   ├─ assigned_to = null (pendiente)
   ├─ status = 'active' (mantener activa)
   ├─ Guardar razón en metadata.escalation_reason
   └─ FIN (no enviar respuesta automática)
   ↓
10. ENVIAR RESPUESTA (si AI generó respuesta)
    ├─ Llamar a sendWhatsAppMessage(WAHA API)
    ├─ Si éxito:
    │  ├─ Guardar mensaje saliente en BD
    │  ├─ Actualizar conversación (messages_count, last_message)
    │  └─ FIN
    └─ Si error:
       ├─ Log error
       └─ FIN (no reintentar automáticamente)
```

### Manejo de Errores y Reintentos

**Errores Comunes y Manejo**:

1. **Error al guardar mensaje (duplicado)**:
   - Código: `23505` (unique_violation)
   - Acción: Retornar 200, ignorar mensaje (ya procesado)

2. **Error al cargar configuración AI**:
   - Acción: Log error, retornar 200 (no procesar mensaje)

3. **Error al llamar Claude/OpenAI**:
   - **Actual**: No hay reintento
   - **Recomendación**: Reintentar 3 veces con backoff exponencial
   - Si falla después de 3 intentos: Log error, no responder

4. **Error al enviar mensaje por WAHA**:
   - **Actual**: Log error, no reintentar
   - **Recomendación**: Reintentar 2 veces, luego encolar para procesar después

5. **Timeout de AI**:
   - **Límite**: 30 segundos por defecto
   - Si timeout: Retornar mensaje genérico: "Disculpa, estoy procesando tu mensaje. Por favor espera un momento."

**Timeouts Configurados**:
- **Webhook timeout**: 30 segundos (Vercel)
- **AI API timeout**: 30 segundos (OpenAI/Anthropic)
- **WAHA API timeout**: 10 segundos

### Integración con Claude API
- **Modelo**: Claude 3 Sonnet (Anthropic) o GPT-4o-mini (OpenAI)
- **Contexto**: Historial de conversación, datos del cliente, órdenes activas
- **Capacidades**: Entender lenguaje natural, generar respuestas coherentes, ejecutar acciones

### Creación Automática de Citas/Órdenes
- Cliente puede solicitar cita por WhatsApp
- Bot crea cita en sistema automáticamente
- Cliente recibe confirmación con detalles
- Si es urgencia, puede crear orden directamente

### Reglas de Negocio
- Bot solo responde a números registrados en sistema
- Cada organización tiene su propio bot
- Conversaciones se almacenan para contexto
- Bot puede consultar pero no modificar datos críticos sin confirmación

---

# PARTE 3: FLUJOS DE USUARIO PASO A PASO

## FLUJO 1: Registro y Onboarding de Nueva Organización

```
1. Usuario accede a /auth/register
   ↓
2. Completa formulario:
   - Email
   - Contraseña
   - Nombre de organización
   - Datos del usuario (nombre, teléfono)
   ↓
3. Sistema crea cuenta en Supabase Auth
   - Se genera usuario en auth.users
   ↓
4. Se crea organización
   - Tabla: organizations
   - Se genera organization_id único
   ↓
5. Se crea perfil de usuario
   - Tabla: `users` (tabla principal de perfiles de usuario)
   - Se vincula con auth.users.id
   - Se asigna organization_id
   ↓
6. Se crea workshop por defecto (opcional)
   - Si la organización tiene múltiples talleres
   - Se crea workshop inicial
   ↓
7. Usuario es redirigido a /onboarding
   - Configuración inicial
   - Datos de la empresa
   - Configuración de WhatsApp (opcional)
   ↓
8. Usuario accede al dashboard
   - /dashboard
   - Sistema carga contexto de organización
   - Muestra datos iniciales
```

## FLUJO 2: Crear una Orden de Trabajo Nueva

```
1. Usuario hace clic en "Nueva Orden"
   - Desde dashboard o página de órdenes
   ↓
2. Modal de creación se abre
   - Formulario con campos requeridos
   ↓
3. Seleccionar Cliente
   - Dropdown con clientes de la organización
   - Opción: "Crear nuevo cliente"
   - Si crea nuevo: modal adicional, luego vuelve
   ↓
4. Seleccionar Vehículo
   - Dropdown con vehículos del cliente seleccionado
   - Opción: "Agregar vehículo"
   - Si agrega nuevo: modal adicional, luego vuelve
   ↓
5. Información de la Orden
   - Descripción del problema
   - Prioridad (normal, urgente)
   - Fecha estimada de entrega
   ↓
6. Agregar Items (Opcional en creación)
   - Servicios: diagnóstico, reparación, etc.
   - Productos: repuestos del inventario
   - Cantidades y precios
   ↓
7. Guardar Orden
   - Estado inicial: "reception"
   - Se genera número de orden (WO-XXX)
   - Se asigna organization_id automáticamente
   ↓
8. Orden creada
   - Aparece en Kanban en columna "Recepción"
   - Se puede editar/agregar items después
```

## FLUJO 3: Cliente Llega al Taller (Flujo Completo)

```
1. RECEPCIÓN
   - Recepcionista crea orden
   - Estado: "reception"
   - Registra vehículo y problema inicial
   ↓
2. INSPECCIÓN INICIAL
   - Recepcionista toma fotos/documentos
   - Registra condición del vehículo
   - Notas preliminares
   ↓
3. DIAGNÓSTICO
   - Mecánico asigna orden a sí mismo
   - Estado: "diagnosis"
   - Evalúa el vehículo
   - Documenta problemas encontrados
   ↓
4. COTIZACIÓN
   - Mecánico crea cotización desde orden
   - Agrega servicios y repuestos necesarios
   - Calcula totales
   - Estado orden: "initial_quote"
   ↓
5. APROBACIÓN
   - Cotización enviada al cliente
   - Estado orden: "waiting_approval"
   - Cliente aprueba o rechaza
   ↓
6. REPARACIÓN (Si aprobado)
   - Estado: "disassembly"
   - Mecánico desmonta componente
   - Si faltan piezas: Estado "waiting_parts"
   - Se crea orden de compra si necesario
   - Al recibir piezas: Estado "assembly"
   - Se reensambla
   ↓
7. PRUEBAS
   - Estado: "testing"
   - Se prueba funcionamiento
   - Se verifica que todo esté correcto
   ↓
8. ENTREGA
   - Estado: "ready"
   - Cliente es notificado
   - Cliente recoge vehículo
   ↓
9. FACTURACIÓN
   - Estado: "completed"
   - Se genera factura automáticamente
   - Cliente paga
   - Se registra pago
   - Orden completada
```

## FLUJO 4: Conversación de WhatsApp con Bot (Completo con Casos Edge)

### Escenario Base
Cliente escribe por WhatsApp → Bot responde automáticamente → Cliente obtiene información o agenda cita

### Flujo Paso a Paso

```
1. CLIENTE ESCRIBE MENSAJE
   ├─ Cliente envía: "Hola, quiero agendar un cambio de aceite"
   ├─ Mensaje llega a WAHA
   ├─ WAHA envía webhook a /api/webhooks/whatsapp
   └─ Webhook procesa evento 'message'
   ↓
2. VALIDACIONES INICIALES
   ├─ ✅ Verificar que NO sea mensaje propio (fromMe !== true)
   ├─ ✅ Verificar que NO sea estado de WhatsApp (status@broadcast)
   ├─ ✅ Verificar que NO sea grupo (@g.us)
   ├─ ✅ Extraer número: 5214491234567
   ├─ ✅ Obtener organizationId del sessionName
   │  └─ Si NO se encuentra → IGNORAR (log error)
   └─ ✅ Validar formato de número (debe tener @c.us o @s.whatsapp.net)
   ↓
3. DEDUPLICACIÓN
   ├─ Intentar guardar mensaje con provider_message_id único
   ├─ Si error 23505 (duplicado) → RETORNAR 200, IGNORAR
   │  └─ Log: "Mensaje duplicado bloqueado por constraint BD"
   └─ Si éxito → Continuar
   ↓
4. BUSCAR/CREAR CONVERSACIÓN
   ├─ Buscar conversación activa: WHERE organization_id = X AND customer_phone = Y AND status = 'active'
   ├─ Si NO existe:
   │  ├─ Buscar cliente: WHERE organization_id = X AND phone = Y
   │  ├─ Si NO existe cliente:
   │  │  ├─ CREAR cliente automáticamente:
   │  │  │  - name: "Cliente WhatsApp"
   │  │  │  - phone: número del remitente
   │  │  │  - organization_id: de la sesión
   │  │  └─ Log: "Cliente creado automáticamente desde WhatsApp"
   │  └─ Crear conversación nueva:
   │     - is_bot_active: true
   │     - status: 'active'
   │     - messages_count: 0
   │  └─ Obtener foto de perfil (background, no bloquea)
   └─ Si existe → Usar conversación existente
   ↓
5. GUARDAR MENSAJE EN BD
   ├─ Insertar en whatsapp_messages:
   │  - direction: 'inbound'
   │  - from_number: número del cliente
   │  - body: texto del mensaje
   │  - provider_message_id: ID único de WAHA
   │  - status: 'delivered'
   ├─ Trigger automático actualiza messages_count
   ├─ Actualizar last_message y last_message_at en conversación
   └─ Si error al guardar → Log error, continuar (no bloquear)
   ↓
6. VERIFICAR SI BOT ESTÁ ACTIVO
   ├─ Leer is_bot_active de conversación
   ├─ Si is_bot_active = false → FIN (humano asignado)
   ├─ Si assigned_to IS NOT NULL → FIN (humano asignado)
   └─ Si is_bot_active = true → Continuar
   ↓
7. CARGAR CONFIGURACIÓN AI
   ├─ Buscar ai_agent_config WHERE organization_id = X
   ├─ Si NO existe → FIN (log error: "AI no configurado")
   ├─ Si enabled = false → FIN (log: "Bot deshabilitado")
   ├─ Validar API key (OPENAI_API_KEY o ANTHROPIC_API_KEY)
   │  └─ Si falta → FIN (log error: "API key no configurada")
   └─ Si enabled = true → Continuar
   ↓
8. PROCESAR CON AI AGENT
   ├─ Cargar contexto:
   │  ├─ Servicios disponibles
   │  ├─ Mecánicos disponibles
   │  ├─ Horarios de negocio
   │  ├─ FAQs
   │  └─ Políticas (pago, cancelación, garantía)
   ├─ Cargar historial: últimos 10 mensajes
   ├─ Construir system prompt dinámico
   ├─ Verificar horarios (si business_hours_only = true):
   │  ├─ Si fuera de horario:
   │  │  └─ Responder: "Gracias por contactarnos. Estamos fuera de horario..."
   │  └─ Si en horario → Continuar
   ├─ Llamar a Claude/OpenAI:
   │  ├─ Timeout: 30 segundos
   │  ├─ Si timeout → Responder mensaje genérico
   │  ├─ Si error de API:
   │  │  ├─ Reintentar 3 veces con backoff exponencial
   │  │  └─ Si falla después de 3 intentos → Log error, FIN
   │  └─ Si éxito → Obtener respuesta
   └─ Procesar función calls (si hay):
      ├─ get_services_info → Obtener precios
      ├─ check_availability → Verificar horarios
      ├─ create_appointment_request → Crear cita
      └─ create_work_order → Crear orden (si auto_create_orders = true)
   ↓
9. VERIFICAR ESCALACIÓN
   ├─ Verificar keywords_to_escalate en mensaje:
   │  ├─ Si contiene palabra clave → ESCALAR
   │  └─ Si NO → Continuar
   ├─ Verificar límite de mensajes:
   │  ├─ Si messages_count >= max_messages_before_escalate → ESCALAR
   │  └─ Si NO → Continuar
   └─ Si NO hay escalación → Continuar
   ↓
10. ESCALAR A HUMANO (si aplica)
    ├─ Actualizar conversación:
    │  ├─ is_bot_active: false
    │  ├─ assigned_to: null (pendiente)
    │  └─ metadata.escalation_reason: razón de escalación
    ├─ Responder: "Entiendo tu situación. Permíteme conectarte con uno de nuestros asesores..."
    ├─ Notificar al staff (si está implementado)
    └─ FIN
    ↓
11. ENVIAR RESPUESTA (si AI generó respuesta)
    ├─ Llamar a sendWhatsAppMessage(WAHA API):
    │  ├─ Timeout: 10 segundos
    │  ├─ Si timeout → Reintentar 2 veces
    │  └─ Si error después de reintentos → Log error, FIN
    ├─ Si éxito:
    │  ├─ Guardar mensaje saliente en BD:
    │  │  - direction: 'outbound'
    │  │  - to_number: número del cliente
    │  │  - body: respuesta del bot
    │  │  - is_from_bot: true
    │  │  - status: 'sent'
    │  ├─ Actualizar conversación:
    │  │  - messages_count (trigger automático)
    │  │  - last_message
    │  │  - last_message_at
    │  └─ FIN (éxito)
    └─ Si error:
       ├─ Log error detallado
       └─ FIN (no reintentar automáticamente)
```

### Casos Edge y Manejo de Errores

**Caso Edge 1: Mensaje Duplicado**
- **Síntoma**: Error 23505 al insertar mensaje
- **Causa**: WAHA reenvía el mismo mensaje
- **Manejo**: Retornar 200 OK, ignorar mensaje (ya procesado)
- **Log**: "Mensaje duplicado bloqueado por constraint BD"

**Caso Edge 2: Cliente No Registrado**
- **Síntoma**: No existe cliente con ese teléfono
- **Manejo**: Crear cliente automáticamente con nombre "Cliente WhatsApp"
- **Log**: "Cliente creado automáticamente desde WhatsApp"

**Caso Edge 3: Conversación Archivada**
- **Síntoma**: Conversación existe pero status = 'archived'
- **Manejo**: Crear nueva conversación activa
- **Log**: "Nueva conversación creada (anterior estaba archivada)"

**Caso Edge 4: Bot Deshabilitado**
- **Síntoma**: `enabled = false` en ai_agent_config
- **Manejo**: No procesar mensaje, FIN
- **Log**: "Bot deshabilitado para esta organización"

**Caso Edge 5: API Key No Configurada**
- **Síntoma**: `OPENAI_API_KEY` o `ANTHROPIC_API_KEY` faltante
- **Manejo**: No procesar mensaje, FIN
- **Log**: "API key no configurada para provider X"

**Caso Edge 6: Timeout de AI**
- **Síntoma**: Llamada a Claude/OpenAI tarda >30 segundos
- **Manejo**: Responder mensaje genérico: "Disculpa, estoy procesando tu mensaje. Por favor espera un momento."
- **Log**: "Timeout en llamada a AI API"

**Caso Edge 7: Error de AI API**
- **Síntoma**: Error 429 (rate limit), 500 (server error), etc.
- **Manejo**: 
  - Reintentar 3 veces con backoff exponencial (1s, 2s, 4s)
  - Si falla después de 3 intentos: Log error, no responder
- **Log**: "Error en AI API después de 3 reintentos: [error]"

**Caso Edge 8: Error al Enviar Mensaje por WAHA**
- **Síntoma**: Error al llamar a WAHA API para enviar mensaje
- **Manejo**: 
  - Reintentar 2 veces
  - Si falla: Log error, mensaje queda en BD pero no se envía
- **Log**: "Error enviando mensaje por WAHA después de 2 reintentos"

**Caso Edge 9: Fuera de Horario**
- **Síntoma**: `business_hours_only = true` y hora actual fuera de horario
- **Manejo**: Responder mensaje automático con horarios
- **Log**: "Mensaje recibido fuera de horario"

**Caso Edge 10: Escalación por Palabras Clave**
- **Síntoma**: Mensaje contiene palabra de `keywords_to_escalate`
- **Manejo**: 
  - Responder mensaje de escalación
  - Marcar `is_bot_active = false`
  - Dejar `assigned_to = null` (pendiente)
- **Log**: "Conversación escalada por palabra clave: [palabra]"

**Caso Edge 11: Límite de Mensajes Alcanzado**
- **Síntoma**: `messages_count >= max_messages_before_escalate`
- **Manejo**: 
  - Responder: "He intentado ayudarte pero parece que necesitas hablar con un humano..."
  - Escalar a humano
- **Log**: "Conversación escalada por límite de mensajes: [count]"

**Caso Edge 12: Mensaje Multimedia (Imagen/Audio/Video)**
- **Síntoma**: Mensaje tiene `hasMedia = true`
- **Manejo**: 
  - Extraer `media_url` y `media_type`
  - Guardar en BD con `media_url` y `media_type`
  - Si es audio sin texto: `body = "[Audio recibido - Transcripción no disponible]"`
  - Si es imagen sin texto: `body = "[Imagen recibida]"`
  - Procesar con AI normalmente (AI puede ver la URL si está configurado)
- **Log**: "Mensaje multimedia recibido: [tipo]"

**Caso Edge 13: Mensaje de Grupo**
- **Síntoma**: `chatId` contiene `@g.us`
- **Manejo**: Ignorar mensaje, FIN
- **Log**: "Mensaje de grupo ignorado"

**Caso Edge 14: Mensaje Propio (Loop)**
- **Síntoma**: `fromMe === true` o número remitente = número sesión
- **Manejo**: Ignorar mensaje, FIN
- **Log**: "Mensaje propio ignorado (loop prevention)"

**Caso Edge 15: Organización No Encontrada**
- **Síntoma**: `getOrganizationFromSession` retorna null
- **Manejo**: Ignorar mensaje, FIN
- **Log**: "Organización no encontrada para sesión: [sessionName]"

### Timeouts y Reintentos

**Timeouts Configurados**:
- **Webhook timeout**: 30 segundos (Vercel)
- **AI API timeout**: 30 segundos (OpenAI/Anthropic)
- **WAHA API timeout**: 10 segundos

**Reintentos**:
- **AI API**: 3 reintentos con backoff exponencial (1s, 2s, 4s)
- **WAHA API**: 2 reintentos con delay fijo (1s)

**Backoff Exponencial**:
```typescript
const delay = baseDelay * Math.pow(2, attempt);
// Intento 1: 1000ms
// Intento 2: 2000ms
// Intento 3: 4000ms
```

### Logging y Monitoreo

**Logs Generados**:
- ✅ Mensaje recibido (con messageId)
- ✅ Duplicado detectado
- ✅ Cliente creado automáticamente
- ✅ Conversación creada/encontrada
- ✅ Configuración AI cargada
- ✅ Historial cargado (cantidad de mensajes)
- ✅ Llamada a AI (provider, modelo, tiempo)
- ✅ Función ejecutada (nombre, resultado)
- ✅ Escalación (razón)
- ✅ Mensaje enviado (éxito/error)
- ❌ Errores (con stack trace)

**Métricas Recomendadas**:
- Tiempo promedio de respuesta del bot
- Tasa de escalación a humano
- Número de mensajes procesados por hora
- Errores por tipo (timeout, API error, etc.)

```
1. Cliente envía mensaje a número de WhatsApp del taller
   ↓
2. WAHA recibe mensaje
   - Webhook activa endpoint /api/webhooks/whatsapp
   ↓
3. Sistema identifica organización
   - Por número de WhatsApp
   - Carga configuración de bot
   ↓
4. Bot procesa mensaje con Claude AI
   - Claude analiza intención
   - Consulta base de datos si necesario
   - Genera respuesta contextualizada
   ↓
5. Bot responde al cliente
   - Respuesta enviada por WAHA
   - Cliente recibe mensaje
   ↓
6. Si cliente solicita cita:
   - Bot pregunta fecha/hora preferida
   - Cliente responde
   - Bot crea cita en sistema
   - Bot confirma cita con detalles
   ↓
7. Si cliente consulta estado de orden:
   - Bot busca orden por número o placa
   - Bot responde estado actual
   - Bot puede enviar foto si está disponible
   ↓
8. Si cliente necesita servicio urgente:
   - Bot crea orden preliminar
   - Bot notifica al taller
   - Recepcionista completa información
```

## FLUJO 5: Gestión de Inventario

```
1. Agregar Producto al Inventario
   - Ir a Inventario → Productos
   - Clic en "Nuevo Producto"
   - Completar: nombre, SKU, categoría, precio, costo, stock inicial
   - Guardar
   ↓
2. Registrar Salida por Orden de Trabajo
   - En orden de trabajo, agregar item de tipo "producto"
   - Seleccionar producto del inventario
   - Indicar cantidad
   - Al guardar orden, se registra movimiento de salida
   - Stock se reduce automáticamente
   ↓
3. Alerta de Stock Bajo
   - Sistema detecta producto con stock < mínimo
   - Genera notificación
   - Aparece alerta en dashboard
   ↓
4. Crear Orden de Compra
   - Desde alerta, clic en "Crear Orden de Compra"
   - O manualmente: Compras → Nueva Orden
   - Seleccionar proveedor
   - Agregar productos a comprar
   - Establecer fecha esperada
   ↓
5. Recibir Producto
   - Orden de compra llega
   - Cambiar estado a "received"
   - Sistema actualiza inventario automáticamente
   - Stock aumenta
   - Costo se actualiza (promedio ponderado)
   ↓
6. Actualizar Inventario
   - Producto ahora tiene stock suficiente
   - Alerta desaparece
   - Producto disponible para órdenes
```

---

# PARTE 4: APIS Y ENDPOINTS

## Endpoints Principales

### /api/customers
- **GET**: Lista clientes de la organización
  - Parámetros: `search`, `page`, `limit`
  - Seguridad: Filtra por `organization_id`
  - Respuesta: Array de clientes
  
- **POST**: Crea nuevo cliente
  - Body: `name`, `email`, `phone`, `address`
  - Seguridad: Asigna `organization_id` automáticamente
  - Respuesta: Cliente creado

### /api/customers/[id]
- **GET**: Obtiene cliente específico
- **PUT**: Actualiza cliente
- **DELETE**: Elimina cliente (soft delete si aplica)

### /api/vehicles
- **GET**: Lista vehículos (filtrado por `customer_id` opcional)
- **POST**: Crea nuevo vehículo

### /api/work-orders
- **GET**: Lista órdenes de trabajo
  - Parámetros: `status`, `customer_id`, `vehicle_id`, `search`
  - Incluye relaciones: customer, vehicle, items
  
- **POST**: Crea nueva orden
  - Body: `customer_id`, `vehicle_id`, `description`, `items[]`
  - Calcula totales automáticamente
  - Estado inicial: "reception"

### /api/work-orders/[id]
- **GET**: Obtiene orden con todos sus datos
- **PUT**: Actualiza orden (solo si estado permite)
- **DELETE**: Elimina orden (solo si no tiene items)

### /api/work-orders/[id]/status
- **PUT**: Cambia estado de orden
  - Body: `status` (debe ser válido según flujo)
  - Valida transiciones de estado

### /api/quotations
- **GET**: Lista cotizaciones
  - Parámetros: `status`, `search`, `customer_id`
  
- **POST**: Crea cotización
  - Body: `customer_id`, `vehicle_id`, `items[]`, `valid_until`
  - Calcula totales automáticamente
  - Estado inicial: "draft"

### /api/quotations/[id]
- **GET**: Obtiene cotización con items
- **PUT**: Actualiza cotización (solo "draft")
- **DELETE**: Elimina cotización (solo "draft")

### /api/quotations/[id]/convert
- **POST**: Convierte cotización a orden de trabajo
  - Crea orden con items de cotización
  - Cambia estado a "converted"

### /api/inventory
- **GET**: Lista productos
  - Parámetros: `category`, `low_stock`, `search`
  
- **POST**: Crea producto
  - Body: `name`, `sku`, `category`, `price`, `cost`, `stock_quantity`

### /api/inventory/movements
- **GET**: Lista movimientos de inventario
- **POST**: Registra movimiento (entrada/salida)

### /api/invoices
- **GET**: Lista facturas
- **POST**: Crea factura desde orden

### /api/payments
- **GET**: Lista pagos
- **POST**: Registra pago
  - Body: `invoice_id`, `amount`, `payment_method`, `reference`

### /api/whatsapp/config
- **GET**: Obtiene configuración de WhatsApp
- **POST**: Actualiza configuración

### /api/whatsapp/session
- **GET**: Estado de sesión de WhatsApp
- **POST**: Inicia/conecta sesión

### /api/webhooks/whatsapp
- **POST**: Webhook para recibir mensajes de WAHA
  - Procesa mensaje con Claude AI
  - Genera respuesta
  - Ejecuta acciones si es necesario

## Validaciones de Seguridad

Todos los endpoints:
1. Validan autenticación (usuario debe estar logueado)
2. Obtienen `organization_id` con `getTenantContext()`
3. Filtran todas las queries por `organization_id`
4. Validan que recursos pertenezcan a la organización
5. Usan RLS de Supabase como capa adicional

---

# PARTE 5: SEGURIDAD MULTI-TENANT

## Capa 1: Validación en Endpoints

**Función clave**: `getTenantContext(request)`

```typescript
// En cada API route:
const { organizationId, workshopId, userId } = await getTenantContext(request)

// Todas las queries incluyen:
.eq('organization_id', organizationId)
```

**Qué hace**:
- Obtiene usuario autenticado de Supabase Auth
- Busca perfil en tabla `users`
- Extrae `organization_id` del perfil
- Calcula `workshopId` dinámicamente (del perfil o si org tiene 1 workshop)
- Retorna contexto completo (organizationId, workshopId, userId)

## Capa 2: Filtros en Queries

**Todas las queries de Supabase incluyen**:
```typescript
.eq('organization_id', organizationId)
// Opcionalmente, si workshopId existe y !hasMultipleWorkshops:
if (workshopId && !hasMultipleWorkshops) {
  query = query.eq('workshop_id', workshopId)
}
```

**Ejemplos**:
- Listar clientes: Solo de la organización (opcionalmente filtrado por workshop)
- Buscar órdenes: Solo de la organización (opcionalmente filtrado por workshop)
- Consultar inventario: Solo productos de la organización

**Lógica de filtrado por workshop**:
- Si `workshopId` existe Y `hasMultipleWorkshops = false` → Filtrar por `workshop_id`
- Si `workshopId` existe Y `hasMultipleWorkshops = true` → NO filtrar (mostrar todos)
- Si `workshopId = null` → NO filtrar (mostrar todos de la org)

## Capa 3: Row Level Security (RLS)

**Políticas RLS en Supabase**:

Cada tabla tiene políticas que:
- **SELECT**: Solo muestra filas donde `organization_id` coincide
- **INSERT**: Solo permite insertar con `organization_id` del usuario
- **UPDATE**: Solo permite actualizar filas de la organización
- **DELETE**: Solo permite eliminar filas de la organización

**Ejemplo de política**:
```sql
CREATE POLICY "users_org_policy" ON customers
  FOR ALL USING (organization_id = auth.organization_id()::UUID)
  WITH CHECK (organization_id = auth.organization_id()::UUID);
```

## Prevención de Fugas de Datos

**Mejores prácticas implementadas**:
1. **Nunca confiar en `organization_id` del cliente**: Siempre obtener del contexto
2. **Validar pertenencia**: Antes de actualizar/eliminar, verificar que el recurso pertenece a la organización
3. **RLS como última línea**: Aunque el código falle, RLS previene acceso
4. **Logging**: Se registran intentos de acceso no autorizado
5. **Validación en múltiples capas**: Código + RLS + Validación de relaciones

---

# PARTE 6: BASE DE DATOS

## ESTRATEGIA DE ELIMINACIÓN DE REGISTROS

Para una referencia completa de la estrategia de eliminación (soft delete vs hard delete), consultar el documento **`DELETION_STRATEGY.md`**.

### Resumen Ejecutivo

**Estado Actual**:
- ✅ **Soft Delete Implementado**: `products`, `users`, `employees` (usan `is_active = false`)
- ❌ **Hard Delete Implementado**: `customers`, `vehicles`, `work_orders`, `quotations`, `payments`, `invoices`
- ⚠️ **Inconsistencia**: `customers` y `suppliers` tienen campo `is_active` pero NO se usa en DELETE

**Recomendación**: Implementar soft delete consistente usando `deleted_at` para todas las tablas que requieren mantener historial.

### Estrategia por Tabla

| Tabla | Estrategia Actual | Campo Usado | Razón | Recomendación |
|-------|-------------------|-------------|-------|---------------|
| `customers` | HARD DELETE | `.delete()` | Validación: No eliminar si tiene órdenes | **CAMBIAR A SOFT DELETE** |
| `vehicles` | HARD DELETE | `.delete()` | Validación: No eliminar si tiene órdenes | **CAMBIAR A SOFT DELETE** |
| `work_orders` | HARD DELETE | `.delete()` | Solo borradores (draft) | **MANTENER HARD DELETE** (solo draft) |
| `quotations` | HARD DELETE | `.delete()` | Validación: Solo draft/cancelled | **CAMBIAR A SOFT DELETE** |
| `products` | SOFT DELETE ✅ | `is_active = false` | Mantener historial de movimientos | **MANTENER** |
| `users` | SOFT DELETE ✅ | `is_active = false` | Mantener historial de acciones | **MANTENER** |
| `employees` | SOFT DELETE ✅ | `is_active = false` | Mantener historial de asignaciones | **MANTENER** |
| `invoices` | HARD DELETE | `.delete()` | Integridad financiera | **NUNCA ELIMINAR** |
| `payments` | HARD DELETE | `.delete()` | Integridad financiera | **NUNCA ELIMINAR** |
| `inventory_movements` | NUNCA | - | Auditoría histórica | **NUNCA ELIMINAR** |

### Implementación Actual

**Soft Delete (is_active)**:
- `products`: `is_active = false` → Filtrado en queries con `.eq('is_active', true)`
- `users`: `is_active = false` → Función `deactivateUser()`, recuperación con `activateUser()`
- `employees`: `is_active = false` → Filtrado en queries con `.eq('is_active', true)`

**Hard Delete**:
- `customers`: `.delete()` con validación de órdenes asociadas
- `vehicles`: `.delete()` con validación de órdenes asociadas
- `work_orders`: `.delete()` directo (solo borradores)
- `quotations`: `.delete()` con validación de estado (solo draft/cancelled)

### Plan de Implementación Recomendado

**Fase 1**: Agregar campo `deleted_at` a tablas críticas:
```sql
ALTER TABLE customers ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE vehicles ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE quotations ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE suppliers ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
```

**Fase 2**: Crear función helper `softDelete(table, id, organizationId)`

**Fase 3**: Actualizar queries para filtrar `deleted_at IS NULL`

**Fase 4**: Actualizar endpoints DELETE para usar soft delete

**Fase 5**: Agregar endpoints de restauración (`POST /api/[resource]/[id]/restore`)

Ver `DELETION_STRATEGY.md` para detalles completos y código de ejemplo.

---

> **⚠️ IMPORTANTE**: Los nombres de tablas en esta sección han sido verificados contra el código fuente y las migraciones de Supabase.  
> **📅 Última verificación**: Diciembre 2024

## Tablas Principales

### organizations
- **Propósito**: Tabla raíz para multi-tenancy
- **Campos principales**: `id`, `name`, `email`, `phone`, `address`
- **Relaciones**: 
  - `workshops.organization_id` → `organizations.id` (1:N)
- **Multi-tenant**: No (cada organización es un tenant)
- **RLS**: Sí, usuarios solo ven su organización

### users
- **Propósito**: Perfiles de usuarios autenticados (personas con login al sistema)
- **Campos principales**: `id`, `auth_user_id` (o `user_id`), `name`, `email`, `organization_id`, `role`, `workshop_id`
- **Relaciones**: 
  - `auth_user_id` → `auth.users.id` (1:1, obligatorio)
  - `organization_id` → `organizations.id` (obligatorio)
  - `workshop_id` → `workshops.id` (opcional)
  - **NO tiene relación directa con `employees`**: Son tablas independientes
- **Multi-tenant**: Sí, tiene `organization_id`
- **RLS**: Sí, usuarios solo ven su perfil y de su organización
- **Nota**: También existe `user_profiles` en algunas partes del código, pero `users` es la tabla principal utilizada
- **Diferencia con `employees`**: 
  - `users` = Personas con acceso al sistema (login requerido)
  - `employees` = Trabajadores del taller (pueden o no tener login)
  - **No hay foreign key entre ellas**: Son tablas independientes
- **Workshop_id**: 
  - Opcional: Puede ser NULL
  - Si existe: Usuario pertenece a un workshop específico
  - Si es NULL: Usuario pertenece a toda la organización
  - Se calcula dinámicamente: Si org tiene 1 workshop, se asigna automáticamente

### user_profiles (Opcional/Alternativa)
- **Propósito**: Tabla alternativa de perfiles (puede coexistir con `users`)
- **Uso**: Algunos módulos usan esta tabla, otros usan `users`
- **Nota**: Verificar en código específico cuál se usa en cada contexto

### workshops
- **Propósito**: Talleres/sucursales de una organización (soporte multi-workshop)
- **Campos principales**: `id`, `name`, `email`, `phone`, `address`, `organization_id`
- **Relaciones**: 
  - `organization_id` → `organizations.id` (N:1, obligatorio)
  - `users.workshop_id` → `workshops.id` (1:N opcional)
  - `work_orders.workshop_id` → `workshops.id` (1:N opcional)
  - `customers.workshop_id` → `workshops.id` (1:N opcional)
  - `vehicles.workshop_id` → `workshops.id` (1:N opcional)
  - `employees.workshop_id` → `workshops.id` (1:N opcional)
- **Multi-tenant**: Sí, tiene `organization_id`
- **RLS**: Sí, usuarios solo ven workshops de su organización
- **Nota**: 
  - `workshop_id` es **opcional** en todas las tablas relacionadas
  - Permite organizaciones con múltiples talleres/sucursales
  - El filtrado por `workshop_id` es inteligente (solo si org tiene 1 workshop)

### customers
- **Propósito**: Clientes del taller
- **Campos principales**: `id`, `first_name`, `last_name`, `email`, `phone`, `address`, `workshop_id`, `organization_id`
- **Relaciones**: 
  - `organization_id` → `organizations.id` (obligatorio)
  - `workshop_id` → `workshops.id` (opcional, para soporte multi-workshop)
- **Multi-tenant**: Sí
- **RLS**: Sí
- **Índices**: `organization_id`, `workshop_id`, `email` (único por org)
- **Nota**: `workshop_id` es opcional, permite asociar clientes a talleres específicos

### vehicles
- **Propósito**: Vehículos de los clientes
- **Campos principales**: `id`, `customer_id`, `brand`, `model`, `year`, `license_plate`, `vin`, `workshop_id`, `organization_id`
- **Relaciones**: 
  - `customer_id` → `customers.id`
  - `organization_id` → `organizations.id` (obligatorio)
  - `workshop_id` → `workshops.id` (opcional, para soporte multi-workshop)
- **Multi-tenant**: Sí
- **RLS**: Sí
- **Índices**: `customer_id`, `organization_id`, `workshop_id`, `license_plate`
- **Nota**: `workshop_id` es opcional, permite asociar vehículos a talleres específicos

### work_orders
- **Propósito**: Órdenes de trabajo (core del sistema)
- **Campos principales**: `id`, `order_number`, `customer_id`, `vehicle_id`, `status`, `total_amount`, `assigned_to`, `workshop_id`, `organization_id`, `created_by`
- **Estados válidos** (CHECK constraint): 
  - `reception`, `diagnosis`, `initial_quote`, `waiting_approval`, `disassembly`, `waiting_parts`, `assembly`, `testing`, `ready`, `completed`, `cancelled`
  - **Total: 11 estados oficiales**
  - Estados legacy (`pending`, `in_progress`, `diagnosed`, `approved`, `in_repair`, `delivered`) han sido deprecados
- **Relaciones**: 
  - `customer_id` → `customers.id`
  - `vehicle_id` → `vehicles.id`
  - `assigned_to` → `employees.id` (opcional, empleado asignado para realizar el trabajo)
  - `workshop_id` → `workshops.id` (opcional, taller/sucursal donde se realiza)
  - `created_by` → `auth.users.id` (opcional, usuario que creó la orden)
  - `organization_id` → `organizations.id` (obligatorio)
- **Multi-tenant**: Sí
- **RLS**: Sí
- **Índices**: `organization_id`, `customer_id`, `status`, `order_number`, `assigned_to`, `workshop_id`
- **Nota crítica**: 
  - `assigned_to` referencia `employees.id`, NO `users.id`
  - Un empleado puede ser asignado sin tener cuenta de usuario
  - `created_by` referencia `auth.users.id` (quien creó), diferente de `assigned_to` (quien trabaja)
  - `workshop_id` es opcional: Permite filtrar por taller/sucursal si la org tiene múltiples
  - Estados finales (`completed`, `cancelled`) no pueden cambiar a otro estado

### order_items
- **Propósito**: Items (servicios/productos) de una orden
- **Campos principales**: `id`, `work_order_id`, `item_type`, `description`, `quantity`, `unit_price`, `total`, `organization_id`
- **Relaciones**: `work_order_id` → `work_orders.id`, `organization_id` → `organizations.id`
- **Multi-tenant**: Sí
- **RLS**: Sí

### quotations
- **Propósito**: Cotizaciones/presupuestos
- **Campos principales**: `id`, `quotation_number`, `customer_id`, `vehicle_id`, `status`, `subtotal`, `tax_amount`, `total_amount`, `valid_until`, `organization_id`
- **Relaciones**: `customer_id` → `customers.id`, `vehicle_id` → `vehicles.id`, `organization_id` → `organizations.id`
- **Multi-tenant**: Sí
- **RLS**: Sí

### quotation_items
- **Propósito**: Items de una cotización
- **Campos principales**: `id`, `quotation_id`, `item_type`, `description`, `quantity`, `unit_price`, `total`, `organization_id`
- **Relaciones**: `quotation_id` → `quotations.id`, `organization_id` → `organizations.id`
- **Multi-tenant**: Sí (auto-asignado por trigger `trg_quotation_items_org`)
- **RLS**: Sí
- **Triggers**: 
  - `trg_quotation_items_org` - Asigna `organization_id` automáticamente desde JWT si es NULL
  - `trg_quotation_items_updated` - Actualiza `updated_at` en UPDATE
  - `trg_quotation_items_totals` - Calcula totales (subtotal, tax_amount, total) automáticamente

### products
- **Propósito**: Productos/repuestos en inventario (tabla principal)
- **Campos principales**: `id`, `name`, `sku`, `category_id`, `price`, `cost`, `stock_quantity`, `min_stock_level`, `organization_id`
- **Relaciones**: `category_id` → `inventory_categories.id` (si existe), `organization_id` → `organizations.id`
- **Multi-tenant**: Sí
- **RLS**: Sí
- **Nota**: El código usa `products`, no `inventory_products`. También puede existir `inventory` o `inventory_items` como tablas alternativas.

### inventory_movements
- **Propósito**: Movimientos de inventario (entradas/salidas)
- **Campos principales**: `id`, `product_id`, `movement_type`, `quantity`, `reference_id`, `organization_id`
- **Relaciones**: `product_id` → `products.id`, `organization_id` → `organizations.id`
- **Multi-tenant**: Sí
- **RLS**: Sí
- **Nota**: La relación `product_id` apunta a `products`, no a `inventory_products`

### invoices
- **Propósito**: Facturas
- **Campos principales**: `id`, `invoice_number`, `customer_id`, `work_order_id`, `subtotal`, `tax_amount`, `total_amount`, `status`, `organization_id`
- **Relaciones**: `customer_id` → `customers.id`, `work_order_id` → `work_orders.id`, `organization_id` → `organizations.id`
- **Multi-tenant**: Sí
- **RLS**: Sí

### payments
- **Propósito**: Pagos recibidos
- **Campos principales**: `id`, `invoice_id`, `amount`, `payment_method`, `payment_date`, `organization_id`
- **Relaciones**: `invoice_id` → `invoices.id`, `organization_id` → `organizations.id`
- **Multi-tenant**: Sí
- **RLS**: Sí

### employees
- **Propósito**: Empleados del taller (personal operativo: mecánicos, supervisores)
- **Campos principales**: `id`, `organization_id`, `workshop_id`, `name`, `email`, `phone`, `role`, `specialties[]`, `hourly_rate`, `is_active`, `hire_date`
- **Relaciones**: 
  - `organization_id` → `organizations.id` (obligatorio)
  - `workshop_id` → `workshops.id` (opcional, para soporte multi-workshop)
  - **NO tiene `user_id`**: No hay foreign key directa a `users`
  - `work_orders.assigned_to` → `employees.id` (1:N)
- **Multi-tenant**: Sí
- **RLS**: Sí
- **Nota crítica**: 
  - Un empleado puede existir sin tener registro en `users`. Son tablas independientes.
  - `workshop_id` es opcional, permite asociar empleados a talleres específicos

### suppliers
- **Propósito**: Proveedores
- **Campos principales**: `id`, `name`, `contact_person`, `email`, `phone`, `organization_id`
- **Relaciones**: `organization_id` → `organizations.id`
- **Multi-tenant**: Sí
- **RLS**: Sí

### purchase_orders
- **Propósito**: Órdenes de compra
- **Campos principales**: `id`, `order_number`, `supplier_id`, `status`, `total_amount`, `organization_id`
- **Relaciones**: `supplier_id` → `suppliers.id`, `organization_id` → `organizations.id`
- **Multi-tenant**: Sí
- **RLS**: Sí

---

# PARTE 6.5: TRIGGERS Y AUTOMATIZACIONES

## Resumen

El sistema utiliza **triggers de PostgreSQL** para automatizar tareas comunes y mantener la integridad de los datos. Los triggers se ejecutan automáticamente antes o después de operaciones INSERT, UPDATE o DELETE.

---

## 1. TRIGGERS DE AUDITORÍA (updated_at)

### Propósito
Actualizar automáticamente el campo `updated_at` cuando se modifica un registro.

### Función Base
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Tablas con Trigger `updated_at`

| Tabla | Trigger | Evento | Función |
|-------|---------|-------|---------|
| `organizations` | `update_organizations_updated_at` | BEFORE UPDATE | `update_updated_at_column()` |
| `users` | `update_users_updated_at` | BEFORE UPDATE | `update_updated_at_column()` |
| `customers` | `update_customers_updated_at` | BEFORE UPDATE | `update_updated_at_column()` |
| `suppliers` | `update_suppliers_updated_at` | BEFORE UPDATE | `update_updated_at_column()` |
| `products` | `update_products_updated_at` | BEFORE UPDATE | `update_updated_at_column()` |
| `employees` | `trg_employees_updated` | BEFORE UPDATE | `update_updated_at_column()` |
| `services` | `trg_services_updated` | BEFORE UPDATE | `update_updated_at_column()` |
| `work_orders` | (implícito) | BEFORE UPDATE | `update_updated_at_column()` |
| `order_items` | `trg_order_items_updated` | BEFORE UPDATE | `update_updated_at_column()` |
| `quotations` | `trg_quotations_updated` | BEFORE UPDATE | `update_updated_at_column()` |
| `quotation_items` | `trg_quotation_items_updated` | BEFORE UPDATE | `update_updated_at_column()` |
| `invoices` | `update_invoices_updated_at` | BEFORE UPDATE | `update_updated_at_column()` |
| `invoice_items` | `update_invoice_items_updated_at` | BEFORE UPDATE | `update_updated_at_column()` |
| `purchase_orders` | `update_purchase_orders_updated_at` | BEFORE UPDATE | `update_updated_at_column()` |
| `purchase_order_items` | `update_purchase_order_items_updated_at` | BEFORE UPDATE | `update_updated_at_column()` |
| `payments` | `update_payments_updated_at` | BEFORE UPDATE | `update_updated_at_column()` |
| `collections` | `update_collections_updated_at` | BEFORE UPDATE | `update_updated_at_column()` |
| `inventory_movements` | `update_inventory_movements_updated_at` | BEFORE UPDATE | `update_updated_at_column()` |
| `whatsapp_messages` | `trigger_update_whatsapp_messages_updated_at` | BEFORE UPDATE | `update_whatsapp_messages_updated_at()` |
| `whatsapp_conversations` | `trigger_update_whatsapp_conversations_updated_at` | BEFORE UPDATE | `update_whatsapp_conversations_updated_at()` |
| `user_profiles` | `trigger_update_user_profiles_updated_at` | BEFORE UPDATE | `update_user_profiles_updated_at()` |

### Ejemplo de Uso
```sql
-- Al actualizar un cliente, updated_at se actualiza automáticamente
UPDATE customers SET name = 'Nuevo Nombre' WHERE id = '...';
-- updated_at se actualiza a NOW() automáticamente
```

---

## 2. TRIGGERS DE CÁLCULO (Totales y Subtotal)

### Propósito
Calcular automáticamente subtotales, descuentos, impuestos y totales en items de órdenes y cotizaciones.

### Función Base
```sql
CREATE OR REPLACE FUNCTION calculate_item_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular subtotal
    NEW.subtotal = NEW.quantity * NEW.unit_price;
    
    -- Calcular descuento
    NEW.discount_amount = NEW.subtotal * (NEW.discount_percent / 100);
    
    -- Calcular base imponible
    DECLARE
        taxable_amount DECIMAL(10,2);
    BEGIN
        taxable_amount := NEW.subtotal - NEW.discount_amount;
        NEW.tax_amount := taxable_amount * (NEW.tax_percent / 100);
        NEW.total := taxable_amount + NEW.tax_amount;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Tablas con Trigger de Cálculo

| Tabla | Trigger | Evento | Función | Campos Calculados |
|-------|---------|-------|---------|-------------------|
| `order_items` | `trg_order_items_totals` | BEFORE INSERT OR UPDATE | `calculate_item_totals()` | `subtotal`, `discount_amount`, `tax_amount`, `total` |
| `quotation_items` | `trg_quotation_items_totals` | BEFORE INSERT OR UPDATE | `calculate_item_totals()` | `subtotal`, `discount_amount`, `tax_amount`, `total` |

### Ejemplo de Uso
```sql
-- Al insertar o actualizar un item, se calculan automáticamente los totales
INSERT INTO order_items (order_id, quantity, unit_price, discount_percent, tax_percent, ...)
VALUES ('...', 2, 100.00, 10, 16, ...);
-- Se calculan automáticamente:
-- subtotal = 2 * 100.00 = 200.00
-- discount_amount = 200.00 * 0.10 = 20.00
-- tax_amount = (200.00 - 20.00) * 0.16 = 28.80
-- total = (200.00 - 20.00) + 28.80 = 208.80
```

---

## 3. TRIGGERS DE VALIDACIÓN Y ASIGNACIÓN (organization_id)

### Propósito
Asignar automáticamente `organization_id` a nuevos registros si falta, obteniéndolo del JWT del usuario autenticado.

### Función Base
```sql
CREATE OR REPLACE FUNCTION assign_organization_id()
RETURNS TRIGGER AS $$
DECLARE
    jwt_claims JSONB;
    org_id TEXT;
BEGIN
    BEGIN
        jwt_claims := CURRENT_SETTING('request.jwt.claims', true)::jsonb;
        org_id := jwt_claims->>'organization_id';
    EXCEPTION WHEN OTHERS THEN
        org_id := '';
    END;

    IF org_id = '' THEN
        RAISE EXCEPTION 'Missing organization_id in JWT claims';
    END IF;

    NEW.organization_id := org_id::UUID;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Función Alternativa (Más Segura)
```sql
CREATE OR REPLACE FUNCTION ensure_organization_id_on_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_user_org_id UUID;
BEGIN
    -- Si ya tiene organization_id, no hacer nada
    IF NEW.organization_id IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    -- Obtener organization_id del usuario
    v_user_org_id := get_user_organization_id();
    
    -- Asignar organization_id
    NEW.organization_id := v_user_org_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Tablas con Trigger de Asignación `organization_id`

| Tabla | Trigger | Evento | Función | Condición |
|-------|---------|-------|---------|-----------|
| `employees` | `trg_employees_org` | BEFORE INSERT | `assign_organization_id()` | `WHEN (NEW.organization_id IS NULL)` |
| `services` | `trg_services_org` | BEFORE INSERT | `assign_organization_id()` | `WHEN (NEW.organization_id IS NULL)` |
| `order_items` | `trg_order_items_org` | BEFORE INSERT | `assign_organization_id()` | `WHEN (NEW.organization_id IS NULL)` |
| `quotations` | `trg_quotations_org` | BEFORE INSERT | `assign_organization_id()` | `WHEN (NEW.organization_id IS NULL)` |
| `quotation_items` | `trg_quotation_items_org` | BEFORE INSERT | `assign_organization_id()` | `WHEN (NEW.organization_id IS NULL)` |
| `customers` | `ensure_org_id_customers_insert` | BEFORE INSERT | `ensure_organization_id_on_insert()` | `WHEN (NEW.organization_id IS NULL)` |
| `work_orders` | `ensure_org_id_work_orders_insert` | BEFORE INSERT | `ensure_organization_id_on_insert()` | `WHEN (NEW.organization_id IS NULL)` |
| `products` | `ensure_org_id_products_insert` | BEFORE INSERT | `ensure_organization_id_on_insert()` | `WHEN (NEW.organization_id IS NULL)` |
| `quotations` | `ensure_org_id_quotations_insert` | BEFORE INSERT | `ensure_organization_id_on_insert()` | `WHEN (NEW.organization_id IS NULL)` |
| `suppliers` | `ensure_org_id_suppliers_insert` | BEFORE INSERT | `ensure_organization_id_on_insert()` | `WHEN (NEW.organization_id IS NULL)` |
| `appointments` | `set_appointments_organization_id` | BEFORE INSERT | `set_org_from_jwt()` | - |
| `leads` | `set_leads_organization_id` | BEFORE INSERT | `set_org_from_jwt()` | - |
| `campaigns` | `set_campaigns_organization_id` | BEFORE INSERT | `set_org_from_jwt()` | - |
| `invoices` | `set_invoices_organization_id` | BEFORE INSERT | `set_org_from_jwt()` | - |

### Ejemplo de Uso
```sql
-- Al insertar un cliente sin organization_id, se asigna automáticamente
INSERT INTO customers (name, email, ...) VALUES ('Cliente', 'cliente@email.com', ...);
-- organization_id se asigna automáticamente desde el JWT del usuario autenticado
```

---

## 4. TRIGGERS DE PREVENCIÓN (Protección organization_id)

### Propósito
Prevenir cambios no autorizados de `organization_id` en registros existentes.

### Función Base
```sql
CREATE OR REPLACE FUNCTION prevent_organization_id_change()
RETURNS TRIGGER AS $$
DECLARE
    v_user_org_id UUID;
BEGIN
    -- Si organization_id no cambió, permitir
    IF OLD.organization_id = NEW.organization_id THEN
        RETURN NEW;
    END IF;

    -- Obtener organization_id del usuario actual
    v_user_org_id := get_user_organization_id();

    -- Solo permitir cambiar organization_id si el usuario pertenece a alguna de las organizaciones
    IF OLD.organization_id != v_user_org_id AND NEW.organization_id != v_user_org_id THEN
        RAISE EXCEPTION 'No se puede cambiar organization_id de % a %. El usuario no pertenece a ninguna de estas organizaciones.', 
            OLD.organization_id, NEW.organization_id;
    END IF;

    -- Verificar que la organización destino existe
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = NEW.organization_id) THEN
        RAISE EXCEPTION 'La organización destino % no existe', NEW.organization_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Tablas con Trigger de Prevención

| Tabla | Trigger | Evento | Función | Condición |
|-------|---------|-------|---------|-----------|
| `customers` | `prevent_org_change_customers` | BEFORE UPDATE | `prevent_organization_id_change()` | `WHEN (OLD.organization_id IS DISTINCT FROM NEW.organization_id)` |
| `work_orders` | `prevent_org_change_work_orders` | BEFORE UPDATE | `prevent_organization_id_change()` | `WHEN (OLD.organization_id IS DISTINCT FROM NEW.organization_id)` |

### Ejemplo de Uso
```sql
-- Intento de cambiar organization_id (será bloqueado si el usuario no pertenece a ambas organizaciones)
UPDATE customers SET organization_id = 'otra-org-id' WHERE id = '...';
-- Error: "No se puede cambiar organization_id de ... a ..."
```

---

## 5. TRIGGERS DE AUDITORÍA DE CAMBIOS (organization_audit_log)

### Propósito
Registrar todos los cambios de `organization_id` en una tabla de auditoría para trazabilidad.

### Función Base
```sql
CREATE OR REPLACE FUNCTION log_organization_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.organization_id IS DISTINCT FROM NEW.organization_id THEN
        INSERT INTO organization_audit_log (
            table_name,
            record_id,
            old_organization_id,
            new_organization_id,
            changed_by
        ) VALUES (
            TG_TABLE_NAME,
            NEW.id,
            OLD.organization_id,
            NEW.organization_id,
            auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Tabla de Auditoría
```sql
CREATE TABLE organization_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    old_organization_id UUID,
    new_organization_id UUID NOT NULL,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT
);
```

### Tablas con Trigger de Auditoría

| Tabla | Trigger | Evento | Función | Condición |
|-------|---------|-------|---------|-----------|
| `customers` | `audit_org_change_customers` | AFTER UPDATE | `log_organization_change()` | `WHEN (OLD.organization_id IS DISTINCT FROM NEW.organization_id)` |

### Ejemplo de Uso
```sql
-- Al cambiar organization_id de un cliente, se registra en organization_audit_log
UPDATE customers SET organization_id = 'nueva-org-id' WHERE id = '...';
-- Se inserta automáticamente un registro en organization_audit_log con:
-- - table_name: 'customers'
-- - record_id: id del cliente
-- - old_organization_id: organización anterior
-- - new_organization_id: organización nueva
-- - changed_by: usuario que hizo el cambio
-- - changed_at: timestamp del cambio
```

---

## 6. TRIGGERS DE GENERACIÓN (Números de Documento)

### Propósito
Generar automáticamente números únicos y secuenciales para documentos (cotizaciones, facturas, órdenes de compra).

### 6.1 Generación de Número de Cotización

**Función**:
```sql
CREATE OR REPLACE FUNCTION generate_quotation_number()
RETURNS TRIGGER AS $$
DECLARE
    year_month TEXT;
    sequence_num INTEGER;
    quotation_num TEXT;
BEGIN
    -- Formato: COT-YYYYMM-0001
    year_month := TO_CHAR(NOW(), 'YYYYMM');
    
    -- Obtener siguiente número de secuencia para el mes
    SELECT COALESCE(MAX(CAST(SUBSTRING(quotation_number FROM 9) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM public.quotations
    WHERE organization_id = NEW.organization_id
    AND quotation_number LIKE 'COT-' || year_month || '-%';
    
    -- Formatear número con ceros a la izquierda
    quotation_num := 'COT-' || year_month || '-' || LPAD(sequence_num::TEXT, 4, '0');
    NEW.quotation_number := quotation_num;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Trigger**:
- Tabla: `quotations`
- Nombre: `trg_quotations_number`
- Evento: `BEFORE INSERT`
- Formato: `COT-YYYYMM-0001` (ej: `COT-202412-0001`)

### 6.2 Generación de Número de Factura

**Función**:
```sql
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
    year_month TEXT;
    sequence_num INTEGER;
    invoice_num TEXT;
BEGIN
    -- Formato: FAC-YYYYMM-0001
    year_month := TO_CHAR(NOW(), 'YYYYMM');
    
    -- Obtener el siguiente número de secuencia para este mes
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 10 FOR 4) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM invoices 
    WHERE organization_id = NEW.organization_id
    AND invoice_number LIKE 'FAC-' || year_month || '-%';
    
    -- Generar número de factura
    invoice_num := 'FAC-' || year_month || '-' || LPAD(sequence_num::TEXT, 4, '0');
    
    NEW.invoice_number := invoice_num;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Trigger**:
- Tabla: `invoices`
- Nombre: `generate_invoice_number_trigger`
- Evento: `BEFORE INSERT`
- Formato: `FAC-YYYYMM-0001` (ej: `FAC-202412-0001`)

### 6.3 Generación de Número de Orden de Compra

**Función**:
```sql
CREATE OR REPLACE FUNCTION generate_purchase_order_number()
RETURNS TRIGGER AS $$
DECLARE
    year_month TEXT;
    sequence_num INTEGER;
    order_num TEXT;
BEGIN
    -- Formato: COMP-YYYYMM-0001
    year_month := TO_CHAR(NOW(), 'YYYYMM');
    
    -- Obtener siguiente número de secuencia para el mes
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 10 FOR 4) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM purchase_orders
    WHERE organization_id = NEW.organization_id
    AND order_number LIKE 'COMP-' || year_month || '-%';
    
    -- Formatear número
    order_num := 'COMP-' || year_month || '-' || LPAD(sequence_num::TEXT, 4, '0');
    
    NEW.order_number := order_num;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Trigger**:
- Tabla: `purchase_orders`
- Nombre: `generate_purchase_order_number_trigger`
- Evento: `BEFORE INSERT`
- Formato: `COMP-YYYYMM-0001` (ej: `COMP-202412-0001`)

### Resumen de Triggers de Generación

| Tabla | Trigger | Evento | Formato | Ejemplo |
|-------|---------|-------|---------|---------|
| `quotations` | `trg_quotations_number` | BEFORE INSERT | `COT-YYYYMM-0001` | `COT-202412-0001` |
| `invoices` | `generate_invoice_number_trigger` | BEFORE INSERT | `FAC-YYYYMM-0001` | `FAC-202412-0001` |
| `purchase_orders` | `generate_purchase_order_number_trigger` | BEFORE INSERT | `COMP-YYYYMM-0001` | `COMP-202412-0001` |

### Ejemplo de Uso
```sql
-- Al insertar una cotización sin quotation_number, se genera automáticamente
INSERT INTO quotations (customer_id, vehicle_id, organization_id, ...)
VALUES ('...', '...', '...', ...);
-- quotation_number se genera automáticamente: COT-202412-0001 (si es la primera del mes)
```

---

## 7. TRIGGERS DE WHATSAPP

### 7.1 Actualización de Contador de Mensajes

**Propósito**: Actualizar automáticamente el contador de mensajes en una conversación cuando se inserta un nuevo mensaje.

**Función**:
```sql
CREATE OR REPLACE FUNCTION update_conversation_messages_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE whatsapp_conversations
    SET messages_count = (
        SELECT COUNT(*) 
        FROM whatsapp_messages 
        WHERE conversation_id = NEW.conversation_id
    ),
    last_message_at = NEW.timestamp,
    updated_at = NOW()
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Trigger**:
- Tabla: `whatsapp_messages`
- Nombre: `trigger_update_conversation_messages_count`
- Evento: `AFTER INSERT`
- Función: `update_conversation_messages_count()`

### Ejemplo de Uso
```sql
-- Al insertar un mensaje, se actualiza automáticamente el contador de la conversación
INSERT INTO whatsapp_messages (conversation_id, content, ...)
VALUES ('...', 'Mensaje', ...);
-- whatsapp_conversations.messages_count se incrementa automáticamente
-- whatsapp_conversations.last_message_at se actualiza al timestamp del mensaje
```

---

## 8. TRIGGERS DE CREACIÓN AUTOMÁTICA DE PERFILES

### Propósito
Crear automáticamente un perfil en `user_profiles` cuando se crea un usuario en `auth.users`.

### Función Base
```sql
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Crear perfil automáticamente cuando se crea un usuario en auth.users
    INSERT INTO public.user_profiles (
        id,
        organization_id,
        role,
        full_name,
        email_verified,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        COALESCE(
            (NEW.raw_user_meta_data->>'organization_id')::UUID,
            '00000000-0000-0000-0000-000000000000'::UUID  -- Default org
        ),
        COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email_confirmed_at IS NOT NULL,
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Trigger
- Tabla: `auth.users`
- Nombre: `on_auth_user_created`
- Evento: `AFTER INSERT`
- Función: `handle_new_user_profile()`

### Ejemplo de Uso
```sql
-- Al crear un usuario en auth.users (Supabase Auth), se crea automáticamente un perfil
-- Esto se ejecuta automáticamente cuando Supabase Auth crea un usuario
```

---

## RESUMEN DE TRIGGERS POR CATEGORÍA

### Triggers de Auditoría (updated_at)
- **Total**: ~20 tablas
- **Propósito**: Mantener `updated_at` actualizado automáticamente
- **Evento**: BEFORE UPDATE

### Triggers de Cálculo
- **Total**: 2 tablas (`order_items`, `quotation_items`)
- **Propósito**: Calcular totales automáticamente
- **Evento**: BEFORE INSERT OR UPDATE

### Triggers de Validación (organization_id)
- **Total**: ~14 tablas
- **Propósito**: Asignar `organization_id` automáticamente
- **Evento**: BEFORE INSERT

### Triggers de Prevención
- **Total**: 2 tablas (`customers`, `work_orders`)
- **Propósito**: Prevenir cambios no autorizados de `organization_id`
- **Evento**: BEFORE UPDATE

### Triggers de Auditoría de Cambios
- **Total**: 1 tabla (`customers`)
- **Propósito**: Registrar cambios de `organization_id` en log
- **Evento**: AFTER UPDATE

### Triggers de Generación
- **Total**: 3 tablas (`quotations`, `invoices`, `purchase_orders`)
- **Propósito**: Generar números únicos de documentos
- **Evento**: BEFORE INSERT

### Triggers de WhatsApp
- **Total**: 1 trigger (`whatsapp_messages`)
- **Propósito**: Actualizar contador de mensajes en conversaciones
- **Evento**: AFTER INSERT

### Triggers de Creación Automática
- **Total**: 1 trigger (`auth.users`)
- **Propósito**: Crear perfil automáticamente al crear usuario
- **Evento**: AFTER INSERT

---

## QUERIES DE VERIFICACIÓN

### Listar todos los triggers
```sql
SELECT 
  t.tgname as trigger_name,
  c.relname as table_name,
  p.proname as function_name,
  CASE 
    WHEN t.tgtype & 2 = 2 THEN 'BEFORE'
    ELSE 'AFTER'
  END as timing,
  CASE 
    WHEN t.tgtype & 4 = 4 THEN 'INSERT'
    WHEN t.tgtype & 8 = 8 THEN 'DELETE'
    WHEN t.tgtype & 16 = 16 THEN 'UPDATE'
  END as event
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgisinternal = false
  AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY c.relname, t.tgname;
```

### Listar funciones de triggers
```sql
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname LIKE '%trigger%'
   OR proname LIKE '%auto%'
   OR proname LIKE '%update%'
   OR proname LIKE '%calculate%'
   OR proname LIKE '%generate%'
ORDER BY proname;
```

---

## NOTAS IMPORTANTES

1. **Todos los triggers son automáticos**: No requieren intervención manual
2. **Los triggers de `organization_id` son críticos**: Aseguran multi-tenancy
3. **Los triggers de cálculo son transaccionales**: Se ejecutan dentro de la misma transacción
4. **Los triggers de generación son únicos por organización**: Cada organización tiene su propia secuencia
5. **Los triggers de auditoría son no bloqueantes**: No afectan el rendimiento de las operaciones principales

---

# PARTE 2.5: VALIDACIONES DE CAMPOS COMPLETAS

Para una referencia completa de todas las validaciones de campos en el sistema, consultar el documento **`FIELD_VALIDATIONS.md`** que incluye:

- ✅ Validaciones por módulo (Clientes, Vehículos, Órdenes, Cotizaciones, Inventario, Facturas, Pagos, Usuarios, etc.)
- ✅ Validaciones Frontend (Zod schemas en `src/lib/validations/schemas.ts`)
- ✅ Validaciones Base de Datos (constraints, tipos, longitudes)
- ✅ Mensajes de error específicos
- ✅ Patrones regex utilizados
- ✅ Constantes de validación (`src/lib/constants/index.ts`)
- ✅ Queries de verificación en BD

**Resumen rápido de validaciones comunes**:
- **Email**: Formato válido (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
- **Teléfono**: Internacional (`/^[\+]?[1-9][\d]{0,15}$/`)
- **VIN**: 17 caracteres alfanuméricos (`/^[A-HJ-NPR-Z0-9]{17}$/`)
- **SKU**: Solo mayúsculas, números y guiones (`/^[A-Z0-9-]+$/`)
- **Nombres**: Mínimo 2 caracteres, máximo 100
- **Descripciones**: Mínimo 10 caracteres, máximo 1000
- **Montos**: Mínimo 0, máximo 999,999.99
- **Años**: 1900 a año actual + 1
- **UUIDs**: Todos los IDs de relación deben ser UUIDs válidos
- **Contraseñas**: Mínimo 8 caracteres, máximo 128

**Archivos de validación**:
- `src/lib/validations/schemas.ts` - Schemas de Zod
- `src/lib/constants/index.ts` - Constantes de validación
- `FIELD_VALIDATIONS.md` - Documentación completa

---

# PARTE 7: COMPONENTES REUTILIZABLES

## Componentes UI Base (/src/components/ui)

### Button
- **Qué hace**: Botón reutilizable con variantes
- **Props**: `variant`, `size`, `disabled`, `onClick`
- **Uso**: Botones en todo el sistema

### Input
- **Qué hace**: Campo de entrada de texto
- **Props**: `type`, `placeholder`, `value`, `onChange`, `error`
- **Uso**: Formularios en todo el sistema

### Select
- **Qué hace**: Dropdown de selección
- **Props**: `value`, `onValueChange`, `options`
- **Uso**: Selección de cliente, vehículo, estado, etc.

### Dialog
- **Qué hace**: Modal/diálogo
- **Props**: `open`, `onOpenChange`, `children`
- **Uso**: Modales de creación/edición

### Table
- **Qué hace**: Tabla de datos
- **Props**: `data`, `columns`, `onRowClick`
- **Uso**: Listados de clientes, órdenes, productos

### Badge
- **Qué hace**: Badge/etiqueta
- **Props**: `variant`, `children`
- **Uso**: Estados, categorías

## Componentes de Layout (/src/components/layout)

### AppLayout
- **Qué hace**: Layout principal con sidebar y header
- **Props**: `title`, `breadcrumbs`, `children`
- **Uso**: Envolver todas las páginas principales

### Sidebar
- **Qué hace**: Menú lateral de navegación
- **Props**: Ninguno (usa contexto)
- **Uso**: Navegación principal

### TopBar
- **Qué hace**: Barra superior con búsqueda y notificaciones
- **Props**: `title`
- **Uso**: Header de cada página

## Componentes Específicos

### CustomerForm
- **Qué hace**: Formulario de crear/editar cliente
- **Props**: `customer`, `onSubmit`, `onCancel`
- **Uso**: Modal de cliente

### WorkOrderDetailsModal
- **Qué hace**: Modal con detalles completos de orden
- **Props**: `order`, `open`, `onOpenChange`
- **Uso**: Ver/editar orden

### CreateQuotationModal
- **Qué hace**: Modal de crear/editar cotización
- **Props**: `quotation`, `open`, `onOpenChange`, `onSuccess`
- **Uso**: Crear cotización

### KanbanBoard
- **Qué hace**: Tablero Kanban de órdenes
- **Props**: `orders`, `onStatusChange`
- **Uso**: Vista Kanban de órdenes

---

## 📝 NOTAS FINALES

Esta documentación cubre la arquitectura completa del sistema Eagles ERP. Para actualizaciones o preguntas, consultar el código fuente o contactar al equipo de desarrollo.

**Última actualización**: Diciembre 2024

