# 📊 ESQUEMA DE BASE DE DATOS - SUPABASE

> **⚠️ IMPORTANTE:** Este documento debe mantenerse actualizado con los cambios en la base de datos.
> 
> **📅 Última actualización:** $(date)
> 
> **🔧 Para actualizar:** Ejecutar la consulta SQL en Supabase SQL Editor y actualizar este archivo.

## 📋 CONSULTA SQL PARA OBTENER ESQUEMA

```sql
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

## 📊 TABLAS DE LA BASE DE DATOS

### 🔧 Tabla: work_orders
| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| order_number | text | SÍ | NULL | Número legible (WO001, WO002) |
| customer_id | uuid | NO | - | FK a customers |
| vehicle_id | uuid | NO | - | FK a vehicles |
| status | text | NO | 'pending' | Estado de la orden |
| total_amount | numeric | SÍ | 0 | Total de la orden |
| created_at | timestamptz | NO | now() | Fecha de creación |
| updated_at | timestamptz | NO | now() | Última actualización |
| organization_id | uuid | NO | - | FK a organizations |

**Relaciones:**
- customer_id → customers.id
- vehicle_id → vehicles.id
- organization_id → organizations.id

**Índices:**
- PRIMARY KEY (id)
- INDEX (organization_id)
- INDEX (customer_id)

---

### 👥 Tabla: customers
| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| first_name | text | NO | - | Nombre del cliente |
| last_name | text | NO | - | Apellido del cliente |
| email | text | SÍ | NULL | Email del cliente |
| phone | text | SÍ | NULL | Teléfono del cliente |
| address | text | SÍ | NULL | Dirección del cliente |
| organization_id | uuid | NO | - | FK a organizations |
| created_at | timestamptz | NO | now() | Fecha de creación |
| updated_at | timestamptz | NO | now() | Última actualización |

**Relaciones:**
- organization_id → organizations.id

**Índices:**
- PRIMARY KEY (id)
- INDEX (organization_id)

---

### 🚗 Tabla: vehicles
| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| customer_id | uuid | NO | - | FK a customers |
| make | text | NO | - | Marca del vehículo |
| model | text | NO | - | Modelo del vehículo |
| year | integer | SÍ | NULL | Año del vehículo |
| license_plate | text | SÍ | NULL | Placa del vehículo |
| vin | text | SÍ | NULL | VIN del vehículo |
| organization_id | uuid | NO | - | FK a organizations |
| created_at | timestamptz | NO | now() | Fecha de creación |
| updated_at | timestamptz | NO | now() | Última actualización |

**Relaciones:**
- customer_id → customers.id
- organization_id → organizations.id

**Índices:**
- PRIMARY KEY (id)
- INDEX (customer_id)
- INDEX (organization_id)

---

### 🏢 Tabla: organizations
| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Nombre de la organización |
| email | text | SÍ | NULL | Email de la organización |
| phone | text | SÍ | NULL | Teléfono de la organización |
| address | text | SÍ | NULL | Dirección de la organización |
| created_at | timestamptz | NO | now() | Fecha de creación |
| updated_at | timestamptz | NO | now() | Última actualización |

**Relaciones:**
- Ninguna (tabla principal)

**Índices:**
- PRIMARY KEY (id)

---

### 👤 Tabla: user_profiles
| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | NO | - | FK a auth.users |
| full_name | text | SÍ | NULL | Nombre completo del usuario |
| email | text | SÍ | NULL | Email del usuario |
| phone | text | SÍ | NULL | Teléfono del usuario |
| address | text | SÍ | NULL | Dirección del usuario |
| avatar_url | text | SÍ | NULL | URL del avatar |
| role | text | NO | 'user' | Rol del usuario |
| organization_id | uuid | SÍ | NULL | FK a organizations |
| created_at | timestamptz | NO | now() | Fecha de creación |
| updated_at | timestamptz | NO | now() | Última actualización |

**Relaciones:**
- user_id → auth.users.id
- organization_id → organizations.id

**Índices:**
- PRIMARY KEY (id)
- UNIQUE (user_id)
- INDEX (organization_id)

---

### 📦 Tabla: inventory_items
| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Nombre del producto |
| description | text | SÍ | NULL | Descripción del producto |
| category | text | SÍ | NULL | Categoría del producto |
| sku | text | SÍ | NULL | SKU del producto |
| price | numeric | SÍ | 0 | Precio del producto |
| cost | numeric | SÍ | 0 | Costo del producto |
| stock_quantity | integer | NO | 0 | Cantidad en stock |
| min_stock_level | integer | NO | 0 | Nivel mínimo de stock |
| organization_id | uuid | NO | - | FK a organizations |
| created_at | timestamptz | NO | now() | Fecha de creación |
| updated_at | timestamptz | NO | now() | Última actualización |

**Relaciones:**
- organization_id → organizations.id

**Índices:**
- PRIMARY KEY (id)
- INDEX (organization_id)
- INDEX (category)

---

### 💰 Tabla: invoices
| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| invoice_number | text | NO | - | Número de factura |
| customer_id | uuid | NO | - | FK a customers |
| work_order_id | uuid | SÍ | NULL | FK a work_orders |
| subtotal | numeric | NO | 0 | Subtotal |
| tax_amount | numeric | NO | 0 | Monto de impuestos |
| total_amount | numeric | NO | 0 | Total |
| status | text | NO | 'pending' | Estado de la factura |
| due_date | date | SÍ | NULL | Fecha de vencimiento |
| paid_at | timestamptz | SÍ | NULL | Fecha de pago |
| organization_id | uuid | NO | - | FK a organizations |
| created_at | timestamptz | NO | now() | Fecha de creación |
| updated_at | timestamptz | NO | now() | Última actualización |

**Relaciones:**
- customer_id → customers.id
- work_order_id → work_orders.id
- organization_id → organizations.id

**Índices:**
- PRIMARY KEY (id)
- INDEX (customer_id)
- INDEX (work_order_id)
- INDEX (organization_id)

---

### 💳 Tabla: payments
| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| invoice_id | uuid | NO | - | FK a invoices |
| amount | numeric | NO | - | Monto del pago |
| payment_method | text | NO | - | Método de pago |
| payment_date | timestamptz | NO | now() | Fecha del pago |
| reference | text | SÍ | NULL | Referencia del pago |
| status | text | NO | 'pending' | Estado del pago |
| organization_id | uuid | NO | - | FK a organizations |
| created_at | timestamptz | NO | now() | Fecha de creación |
| updated_at | timestamptz | NO | now() | Última actualización |

**Relaciones:**
- invoice_id → invoices.id
- organization_id → organizations.id

**Índices:**
- PRIMARY KEY (id)
- INDEX (invoice_id)
- INDEX (organization_id)

---

### 📋 Tabla: quotations
| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| quotation_number | text | NO | - | Número de cotización |
| customer_id | uuid | NO | - | FK a customers |
| vehicle_id | uuid | NO | - | FK a vehicles |
| work_order_id | uuid | SÍ | NULL | FK a work_orders |
| subtotal | numeric | NO | 0 | Subtotal |
| tax_amount | numeric | NO | 0 | Monto de impuestos |
| total_amount | numeric | NO | 0 | Total |
| status | text | NO | 'pending' | Estado de la cotización |
| valid_until | date | SÍ | NULL | Válida hasta |
| organization_id | uuid | NO | - | FK a organizations |
| created_at | timestamptz | NO | now() | Fecha de creación |
| updated_at | timestamptz | NO | now() | Última actualización |

**Relaciones:**
- customer_id → customers.id
- vehicle_id → vehicles.id
- work_order_id → work_orders.id
- organization_id → organizations.id

**Índices:**
- PRIMARY KEY (id)
- INDEX (customer_id)
- INDEX (vehicle_id)
- INDEX (work_order_id)
- INDEX (organization_id)

---

### 🔔 Tabla: notifications
| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | NO | - | FK a auth.users |
| title | text | NO | - | Título de la notificación |
| message | text | NO | - | Mensaje de la notificación |
| type | text | NO | 'info' | Tipo de notificación |
| read | boolean | NO | false | Si fue leída |
| organization_id | uuid | SÍ | NULL | FK a organizations |
| created_at | timestamptz | NO | now() | Fecha de creación |
| updated_at | timestamptz | NO | now() | Última actualización |

**Relaciones:**
- user_id → auth.users.id
- organization_id → organizations.id

**Índices:**
- PRIMARY KEY (id)
- INDEX (user_id)
- INDEX (organization_id)
- INDEX (read)

---

### 🏭 Tabla: suppliers
| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Nombre del proveedor |
| contact_person | text | SÍ | NULL | Persona de contacto |
| email | text | SÍ | NULL | Email del proveedor |
| phone | text | SÍ | NULL | Teléfono del proveedor |
| address | text | SÍ | NULL | Dirección del proveedor |
| status | text | NO | 'active' | Estado del proveedor |
| organization_id | uuid | NO | - | FK a organizations |
| created_at | timestamptz | NO | now() | Fecha de creación |
| updated_at | timestamptz | NO | now() | Última actualización |

**Relaciones:**
- organization_id → organizations.id

**Índices:**
- PRIMARY KEY (id)
- INDEX (organization_id)

---

### 📦 Tabla: purchase_orders
| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| order_number | text | NO | - | Número de orden de compra |
| supplier_id | uuid | NO | - | FK a suppliers |
| order_date | timestamptz | NO | now() | Fecha de la orden |
| expected_delivery | timestamptz | SÍ | NULL | Fecha esperada de entrega |
| status | text | NO | 'pending' | Estado de la orden |
| subtotal | numeric | NO | 0 | Subtotal |
| tax_amount | numeric | NO | 0 | Monto de impuestos |
| total_amount | numeric | NO | 0 | Total |
| notes | text | SÍ | NULL | Notas adicionales |
| organization_id | uuid | NO | - | FK a organizations |
| created_by | text | SÍ | NULL | Creado por |
| updated_by | text | SÍ | NULL | Actualizado por |
| created_at | timestamptz | NO | now() | Fecha de creación |
| updated_at | timestamptz | NO | now() | Última actualización |

**Relaciones:**
- supplier_id → suppliers.id
- organization_id → organizations.id

**Índices:**
- PRIMARY KEY (id)
- INDEX (supplier_id)
- INDEX (organization_id)

---

## 🔍 NOTAS IMPORTANTES

### 📝 Convenciones de Naming
- **Primary Keys:** Siempre `id` (uuid)
- **Foreign Keys:** `{table_name}_id`
- **Timestamps:** `created_at`, `updated_at`
- **Organization:** Todas las tablas tienen `organization_id` para multi-tenancy

### 🔗 Relaciones Principales
- **organizations** → Tabla principal para multi-tenancy
- **user_profiles** → Perfiles de usuarios autenticados
- **customers** → Clientes de la organización
- **vehicles** → Vehículos de los clientes
- **work_orders** → Órdenes de trabajo (core business)

### ⚠️ Consideraciones de Seguridad
- Todas las consultas deben filtrar por `organization_id`
- Usar RLS (Row Level Security) en Supabase
- Validar permisos de usuario antes de operaciones

### 🔄 Estados Comunes
- **work_orders.status:** pending, in_progress, completed, cancelled
- **invoices.status:** pending, paid, overdue, cancelled
- **quotations.status:** pending, approved, rejected, expired
- **suppliers.status:** active, inactive

---

## 📞 CONTACTO
Para actualizaciones o correcciones del esquema, contactar al equipo de desarrollo.

**Última actualización:** $(date)
