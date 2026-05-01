# 📊 ESQUEMA COMPLETO DE BASE DE DATOS

> **Última actualización:** Abril 2026
> Este documento refleja el estado actual de la base de datos en Supabase.
> Para actualizar: exportar schema desde Supabase SQL Editor y sincronizar.

---

## 📋 ÍNDICE

- [Tablas Principales](#tablas-principales)
- [Tablas de Configuración](#tablas-de-configuración)
- [Tablas de Relaciones](#tablas-de-relaciones)
- [Tablas de Metadata](#tablas-de-metadata)
- [Relaciones y Foreign Keys](#relaciones-y-foreign-keys)
- [Índices y Constraints](#índices-y-constraints)

---

## 📊 TABLAS PRINCIPALES

### 🏢 `organizations`
Tabla raíz para multi-tenancy. Todas las entidades pertenecen a una organización.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary Key |
| `name` | text | NO | - | Nombre de la organización |
| `address` | text | SÍ | NULL | Dirección |
| `phone` | text | SÍ | NULL | Teléfono |
| `email` | text | SÍ | NULL | Email |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |
| `updated_at` | timestamptz | NO | `now()` | Última actualización |

**Constraints:**
- PRIMARY KEY: `id`

---

### 🏭 `workshops`
Talleres/establecimientos dentro de una organización.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary Key |
| `name` | text | NO | - | Nombre del taller |
| `email` | text | SÍ | NULL | Email |
| `phone` | text | SÍ | NULL | Teléfono |
| `address` | text | SÍ | NULL | Dirección |
| `organization_id` | uuid | NO | - | FK → organizations.id |
| `created_at` | timestamptz | SÍ | `now()` | Fecha de creación |
| `updated_at` | timestamptz | SÍ | `now()` | Última actualización |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `organization_id` → `organizations(id)`

---

### 👤 `users`
Usuarios del sistema vinculados a auth.users de Supabase.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | - | Primary Key (FK → auth.users.id) |
| `workshop_id` | uuid | SÍ | NULL | FK → workshops.id |
| `organization_id` | uuid | SÍ | NULL | FK → organizations.id |
| `role` | user_role | NO | `'ASESOR'` | Rol del usuario |
| `full_name` | text | NO | - | Nombre completo |
| `email` | text | NO | - | Email |
| `phone` | text | SÍ | NULL | Teléfono |
| `is_active` | boolean | SÍ | `true` | Usuario activo |
| `auth_user_id` | uuid | SÍ | NULL | FK → auth.users.id |
| `specialties` | ARRAY | SÍ | NULL | Especialidades |
| `created_at` | timestamptz | SÍ | `now()` | Fecha de creación |
| `updated_at` | timestamptz | SÍ | `now()` | Última actualización |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `id` → `auth.users(id)`
- FOREIGN KEY: `auth_user_id` → `auth.users(id)`
- FOREIGN KEY: `workshop_id` → `workshops(id)`
- FOREIGN KEY: `organization_id` → `organizations(id)`

---

### 👥 `customers`
Clientes de la organización.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary Key |
| `organization_id` | uuid | NO | - | FK → organizations.id |
| `workshop_id` | uuid | SÍ | NULL | FK → workshops.id |
| `name` | text | NO | - | Nombre del cliente |
| `email` | text | SÍ | NULL | Email |
| `phone` | text | SÍ | NULL | Teléfono |
| `address` | text | SÍ | NULL | Dirección |
| `notes` | text | SÍ | NULL | Notas |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |
| `updated_at` | timestamptz | NO | `now()` | Última actualización |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `organization_id` → `organizations(id)`
- FOREIGN KEY: `workshop_id` → `workshops(id)`

---

### 🚗 `vehicles`
Vehículos de los clientes.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary Key |
| `customer_id` | uuid | NO | - | FK → customers.id |
| `workshop_id` | uuid | SÍ | NULL | FK → workshops.id |
| `brand` | text | NO | - | Marca |
| `model` | text | NO | - | Modelo |
| `year` | integer | SÍ | NULL | Año |
| `license_plate` | text | SÍ | NULL | Placa |
| `vin` | text | SÍ | NULL | VIN |
| `color` | text | SÍ | NULL | Color |
| `mileage` | integer | SÍ | NULL | Kilometraje |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |
| `updated_at` | timestamptz | NO | `now()` | Última actualización |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `customer_id` → `customers(id)`
- FOREIGN KEY: `workshop_id` → `workshops(id)`

---

### 🔧 `work_orders`
Órdenes de trabajo (core business).

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary Key |
| `organization_id` | uuid | NO | - | FK → organizations.id |
| `customer_id` | uuid | NO | - | FK → customers.id |
| `vehicle_id` | uuid | NO | - | FK → vehicles.id |
| `workshop_id` | uuid | SÍ | NULL | FK → workshops.id |
| `assigned_to` | uuid | SÍ | NULL | FK → employees.id |
| `order_number` | varchar | SÍ | NULL | Número de orden |
| `status` | text | NO | `'pending'` | Estado (ver estados válidos) |
| `description` | text | SÍ | NULL | Descripción |
| `estimated_cost` | numeric | SÍ | `0.00` | Costo estimado |
| `final_cost` | numeric | SÍ | `0.00` | Costo final |
| `entry_date` | timestamptz | NO | `now()` | Fecha de entrada |
| `estimated_completion` | timestamptz | SÍ | NULL | Fecha estimada de finalización |
| `completed_at` | timestamptz | SÍ | NULL | Fecha de finalización |
| `subtotal` | numeric | SÍ | `0.00` | Subtotal |
| `tax_amount` | numeric | SÍ | `0.00` | Impuestos |
| `discount_amount` | numeric | SÍ | `0.00` | Descuento |
| `total_amount` | numeric | SÍ | `0.00` | Total |
| `images` | jsonb | SÍ | `[]` | Imágenes (JSON) |
| `notes` | jsonb | SÍ | `[]` | Notas (JSON) |
| `documents` | jsonb | SÍ | `[]` | Documentos (JSON) |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |
| `updated_at` | timestamptz | NO | `now()` | Última actualización |

**Estados válidos:**
- `reception`, `diagnosis`, `initial_quote`, `waiting_approval`, `disassembly`, `waiting_parts`, `assembly`, `testing`, `ready`, `completed`, `cancelled`, `pending`, `in_progress`

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `organization_id` → `organizations(id)`
- FOREIGN KEY: `customer_id` → `customers(id)`
- FOREIGN KEY: `vehicle_id` → `vehicles(id)`
- FOREIGN KEY: `workshop_id` → `workshops(id)`
- FOREIGN KEY: `assigned_to` → `employees(id)`
- CHECK: `status` en valores válidos

---

### 📋 `order_items`
Items (servicios/productos) de una orden de trabajo.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary Key |
| `order_id` | uuid | NO | - | FK → work_orders.id |
| `workshop_id` | uuid | SÍ | NULL | FK → workshops.id |
| `service_id` | uuid | SÍ | NULL | FK → services.id |
| `inventory_id` | uuid | SÍ | NULL | FK → products.id |
| `item_type` | text | NO | - | Tipo: `'service'` o `'product'` |
| `description` | text | NO | - | Descripción |
| `quantity` | numeric | NO | `1.00` | Cantidad |
| `unit_price` | numeric | NO | `0.00` | Precio unitario |
| `discount_percent` | numeric | SÍ | `0.00` | Porcentaje de descuento |
| `discount_amount` | numeric | SÍ | `0.00` | Monto de descuento |
| `tax_percent` | numeric | SÍ | `16.00` | Porcentaje de impuesto |
| `subtotal` | numeric | NO | `0.00` | Subtotal |
| `tax_amount` | numeric | NO | `0.00` | Impuestos |
| `total` | numeric | NO | `0.00` | Total |
| `mechanic_id` | uuid | SÍ | NULL | FK → employees.id |
| `status` | text | SÍ | `'pending'` | Estado |
| `notes` | text | SÍ | NULL | Notas |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |
| `updated_at` | timestamptz | NO | `now()` | Última actualización |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `order_id` → `work_orders(id)`
- FOREIGN KEY: `service_id` → `services(id)`
- FOREIGN KEY: `inventory_id` → `products(id)`
- FOREIGN KEY: `mechanic_id` → `employees(id)`
- FOREIGN KEY: `workshop_id` → `workshops(id)`
- CHECK: `item_type` en `['service', 'product']`
- CHECK: `status` en `['pending', 'in_progress', 'completed']`

---

### 💰 `invoices`
Facturas/Notas de venta.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary Key |
| `organization_id` | uuid | NO | - | FK → organizations.id |
| `customer_id` | uuid | NO | - | FK → customers.id |
| `vehicle_id` | uuid | NO | - | FK → vehicles.id |
| `workshop_id` | uuid | SÍ | NULL | FK → workshops.id |
| `created_by` | uuid | SÍ | NULL | Usuario creador |
| `updated_by` | uuid | SÍ | NULL | Usuario actualizador |
| `invoice_number` | text | NO | - | Número de factura |
| `status` | text | NO | `'draft'` | Estado |
| `due_date` | date | NO | - | Fecha de vencimiento |
| `paid_date` | date | SÍ | NULL | Fecha de pago |
| `payment_method` | text | SÍ | NULL | Método de pago |
| `payment_reference` | varchar | SÍ | NULL | Referencia de pago |
| `payment_notes` | text | SÍ | NULL | Notas de pago |
| `notes` | text | SÍ | NULL | Notas generales |
| `subtotal` | numeric | SÍ | `0.00` | Subtotal |
| `tax_amount` | numeric | SÍ | `0.00` | Impuestos |
| `discount_amount` | numeric | SÍ | `0.00` | Descuento |
| `total` | numeric | SÍ | `0.00` | Total |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |
| `updated_at` | timestamptz | NO | `now()` | Última actualización |

**Estados válidos:**
- `draft`, `sent`, `paid`, `overdue`, `cancelled`

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `organization_id` → `organizations(id)`
- FOREIGN KEY: `customer_id` → `customers(id)`
- FOREIGN KEY: `vehicle_id` → `vehicles(id)`
- FOREIGN KEY: `workshop_id` → `workshops(id)`
- CHECK: `status` en valores válidos

---

### 📄 `invoice_items`
Items de una factura.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary Key |
| `organization_id` | uuid | NO | - | FK → organizations.id |
| `invoice_id` | uuid | NO | - | FK → invoices.id |
| `workshop_id` | uuid | SÍ | NULL | FK → workshops.id |
| `description` | text | NO | - | Descripción |
| `quantity` | integer | NO | - | Cantidad |
| `unit_price` | numeric | NO | - | Precio unitario |
| `discount_percent` | numeric | NO | `0.00` | Descuento % |
| `subtotal` | numeric | NO | `0.00` | Subtotal |
| `tax_amount` | numeric | NO | `0.00` | Impuestos |
| `total` | numeric | NO | `0.00` | Total |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |
| `updated_at` | timestamptz | NO | `now()` | Última actualización |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `invoice_id` → `invoices(id)`
- FOREIGN KEY: `workshop_id` → `workshops(id)`

---

### 📝 `quotations`
Cotizaciones.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary Key |
| `organization_id` | uuid | NO | - | FK → organizations.id |
| `customer_id` | uuid | NO | - | FK → customers.id |
| `vehicle_id` | uuid | NO | - | FK → vehicles.id |
| `workshop_id` | uuid | SÍ | NULL | FK → workshops.id |
| `created_by` | uuid | SÍ | NULL | Usuario creador |
| `updated_by` | uuid | SÍ | NULL | Usuario actualizador |
| `quotation_number` | text | NO | - | Número de cotización |
| `status` | text | NO | `'draft'` | Estado |
| `valid_until` | date | NO | - | Válida hasta |
| `terms_and_conditions` | text | SÍ | NULL | Términos y condiciones |
| `notes` | text | SÍ | NULL | Notas |
| `subtotal` | numeric | SÍ | `0.00` | Subtotal |
| `tax_amount` | numeric | SÍ | `0.00` | Impuestos |
| `discount_amount` | numeric | SÍ | `0.00` | Descuento |
| `total_amount` | numeric | SÍ | `0.00` | Total |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |
| `updated_at` | timestamptz | NO | `now()` | Última actualización |

**Estados válidos:**
- `draft`, `sent`, `approved`, `rejected`, `expired`, `converted`

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `organization_id` → `organizations(id)`
- FOREIGN KEY: `customer_id` → `customers(id)`
- FOREIGN KEY: `vehicle_id` → `vehicles(id)`
- FOREIGN KEY: `workshop_id` → `workshops(id)`
- CHECK: `status` en valores válidos

---

### 📋 `quotation_items`
Items de una cotización.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary Key |
| `quotation_id` | uuid | NO | - | FK → quotations.id |
| `workshop_id` | uuid | SÍ | NULL | FK → workshops.id |
| `service_id` | uuid | SÍ | NULL | FK → services.id |
| `inventory_id` | uuid | SÍ | NULL | FK → products.id |
| `item_type` | text | NO | - | Tipo: `'service'` o `'product'` |
| `description` | text | NO | - | Descripción |
| `quantity` | numeric | NO | `1.00` | Cantidad |
| `unit_price` | numeric | NO | `0.00` | Precio unitario |
| `discount_percent` | numeric | SÍ | `0.00` | Descuento % |
| `discount_amount` | numeric | SÍ | `0.00` | Descuento monto |
| `tax_percent` | numeric | SÍ | `16.00` | Impuesto % |
| `subtotal` | numeric | NO | `0.00` | Subtotal |
| `tax_amount` | numeric | NO | `0.00` | Impuestos |
| `total` | numeric | NO | `0.00` | Total |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |
| `updated_at` | timestamptz | NO | `now()` | Última actualización |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `quotation_id` → `quotations(id)`
- FOREIGN KEY: `service_id` → `services(id)`
- FOREIGN KEY: `inventory_id` → `products(id)`
- FOREIGN KEY: `workshop_id` → `workshops(id)`
- CHECK: `item_type` en `['service', 'product']`

---

### 📅 `appointments`
Citas/Agendamiento de servicios.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary Key |
| `organization_id` | uuid | NO | - | FK → organizations.id |
| `customer_id` | uuid | NO | - | FK → customers.id |
| `vehicle_id` | uuid | NO | - | FK → vehicles.id |
| `workshop_id` | uuid | SÍ | NULL | FK → workshops.id |
| `service_type` | text | NO | - | Tipo de servicio |
| `appointment_date` | timestamptz | NO | - | Fecha y hora |
| `duration` | integer | SÍ | `60` | Duración (minutos) |
| `status` | text | NO | `'scheduled'` | Estado |
| `notes` | text | SÍ | NULL | Notas |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |
| `updated_at` | timestamptz | NO | `now()` | Última actualización |

**Estados válidos:**
- `scheduled`, `confirmed`, `in_progress`, `completed`, `cancelled`, `no_show`

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `organization_id` → `organizations(id)`
- FOREIGN KEY: `customer_id` → `customers(id)`
- FOREIGN KEY: `vehicle_id` → `vehicles(id)`
- FOREIGN KEY: `workshop_id` → `workshops(id)`
- CHECK: `status` en valores válidos

---

### 📦 `products`
Productos/Servicios del catálogo.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary Key |
| `organization_id` | uuid | NO | - | FK → organizations.id |
| `workshop_id` | uuid | SÍ | NULL | FK → workshops.id |
| `created_by` | uuid | SÍ | NULL | Usuario creador |
| `updated_by` | uuid | SÍ | NULL | Usuario actualizador |
| `code` | text | SÍ | NULL | Código |
| `name` | text | NO | - | Nombre |
| `description` | text | SÍ | NULL | Descripción |
| `category` | text | SÍ | NULL | Categoría |
| `type` | text | NO | `'product'` | Tipo: `'product'` o `'service'` |
| `unit` | text | NO | `'piece'` | Unidad |
| `price` | numeric | NO | `0.00` | Precio |
| `cost` | numeric | NO | `0.00` | Costo |
| `tax_rate` | numeric | SÍ | `16.00` | Tasa de impuesto |
| `stock_quantity` | integer | SÍ | `0` | Stock |
| `min_stock` | integer | SÍ | `0` | Stock mínimo |
| `max_stock` | integer | SÍ | `1000` | Stock máximo |
| `is_active` | boolean | SÍ | `true` | Activo |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |
| `updated_at` | timestamptz | NO | `now()` | Última actualización |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `organization_id` → `organizations(id)`
- FOREIGN KEY: `workshop_id` → `workshops(id)`
- CHECK: `type` en `['product', 'service']`

---

### 🔧 `services`
Servicios especializados.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary Key |
| `organization_id` | uuid | NO | - | FK → organizations.id |
| `workshop_id` | uuid | SÍ | NULL | FK → workshops.id |
| `code` | text | SÍ | NULL | Código |
| `name` | text | NO | - | Nombre |
| `description` | text | SÍ | NULL | Descripción |
| `category` | text | SÍ | NULL | Categoría |
| `base_price` | numeric | NO | `0.00` | Precio base |
| `estimated_hours` | numeric | SÍ | `1.00` | Horas estimadas |
| `is_active` | boolean | SÍ | `true` | Activo |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |
| `updated_at` | timestamptz | NO | `now()` | Última actualización |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `organization_id` → `organizations(id)`
- FOREIGN KEY: `workshop_id` → `workshops(id)`

---

### 👷 `employees`
Empleados/Mecánicos.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary Key |
| `organization_id` | uuid | NO | - | FK → organizations.id |
| `workshop_id` | uuid | SÍ | NULL | FK → workshops.id |
| `name` | text | NO | - | Nombre |
| `email` | text | SÍ | NULL | Email |
| `phone` | text | SÍ | NULL | Teléfono |
| `role` | text | NO | `'mechanic'` | Rol |
| `specialties` | ARRAY | SÍ | NULL | Especialidades |
| `is_active` | boolean | SÍ | `true` | Activo |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |
| `updated_at` | timestamptz | NO | `now()` | Última actualización |

**Roles válidos:**
- `mechanic`, `supervisor`, `receptionist`, `manager`

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `organization_id` → `organizations(id)`
- FOREIGN KEY: `workshop_id` → `workshops(id)`
- CHECK: `role` en valores válidos

---

### 📦 `inventory`
Inventario de productos.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary Key |
| `organization_id` | uuid | SÍ | NULL | FK → organizations.id |
| `workshop_id` | uuid | SÍ | NULL | FK → workshops.id |
| `category_id` | uuid | SÍ | NULL | FK → inventory_categories.id |
| `code` | text | SÍ | UNIQUE | Código único |
| `sku` | text | SÍ | NULL | SKU |
| `barcode` | text | SÍ | NULL | Código de barras |
| `name` | text | NO | - | Nombre |
| `description` | text | SÍ | NULL | Descripción |
| `category` | text | SÍ | NULL | Categoría (legacy) |
| `quantity` | integer | SÍ | `0` | Cantidad (legacy) |
| `min_quantity` | integer | SÍ | `1` | Cantidad mínima (legacy) |
| `unit_price` | numeric | SÍ | NULL | Precio unitario |
| `current_stock` | integer | SÍ | `0` | Stock actual |
| `min_stock` | integer | SÍ | `0` | Stock mínimo |
| `max_stock` | integer | SÍ | `0` | Stock máximo |
| `unit` | text | SÍ | `'pcs'` | Unidad |
| `status` | text | SÍ | `'active'` | Estado |
| `created_at` | timestamptz | SÍ | `now()` | Fecha de creación |
| `updated_at` | timestamptz | SÍ | `now()` | Última actualización |

**Constraints:**
- PRIMARY KEY: `id`
- UNIQUE: `code`
- FOREIGN KEY: `category_id` → `inventory_categories(id)`
- FOREIGN KEY: `workshop_id` → `workshops(id)`
- CHECK: `status` en `['active', 'inactive']`

---

### 📁 `inventory_categories`
Categorías de inventario.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary Key |
| `organization_id` | uuid | NO | `'00000000-0000-0000-0000-000000000000'` | FK → organizations.id |
| `workshop_id` | uuid | SÍ | NULL | FK → workshops.id |
| `parent_id` | uuid | SÍ | NULL | FK → inventory_categories.id (auto-referencia) |
| `name` | text | NO | - | Nombre |
| `description` | text | SÍ | NULL | Descripción |
| `status` | text | SÍ | `'active'` | Estado |
| `created_at` | timestamptz | SÍ | `now()` | Fecha de creación |
| `updated_at` | timestamptz | SÍ | `now()` | Última actualización |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `parent_id` → `inventory_categories(id)`
- FOREIGN KEY: `workshop_id` → `workshops(id)`
- CHECK: `status` en `['active', 'inactive']`

---

### 📊 `inventory_movements`
Movimientos de inventario (entradas/salidas/ajustes).

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary Key |
| `organization_id` | uuid | SÍ | NULL | FK → organizations.id |
| `workshop_id` | uuid | SÍ | NULL | FK → workshops.id |
| `product_id` | uuid | NO | - | FK → products.id |
| `created_by` | uuid | SÍ | NULL | Usuario creador |
| `movement_type` | text | NO | - | Tipo de movimiento |
| `quantity` | integer | NO | - | Cantidad |
| `previous_stock` | integer | SÍ | `0` | Stock anterior |
| `new_stock` | integer | SÍ | `0` | Stock nuevo |
| `unit_cost` | numeric | SÍ | NULL | Costo unitario |
| `total_cost` | numeric | SÍ | NULL | Costo total |
| `reference_type` | text | SÍ | NULL | Tipo de referencia |
| `reference_id` | uuid | SÍ | NULL | ID de referencia |
| `notes` | text | SÍ | NULL | Notas |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |
| `updated_at` | timestamptz | SÍ | `now()` | Última actualización |

**Tipos de movimiento:**
- `entry`, `exit`, `adjustment`, `transfer`

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `product_id` → `products(id)`
- FOREIGN KEY: `organization_id` → `organizations(id)`
- FOREIGN KEY: `workshop_id` → `workshops(id)`
- CHECK: `movement_type` en valores válidos

---

### 💳 `payments`
Pagos a proveedores.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary Key |
| `organization_id` | uuid | NO | - | FK → organizations.id |
| `workshop_id` | uuid | SÍ | NULL | FK → workshops.id |
| `supplier_id` | uuid | NO | - | FK → suppliers.id |
| `invoice_number` | text | NO | - | Número de factura |
| `amount` | numeric | NO | `0.00` | Monto |
| `payment_date` | date | NO | - | Fecha de pago |
| `payment_method` | text | NO | - | Método de pago |
| `reference` | text | SÍ | NULL | Referencia |
| `status` | text | NO | `'pending'` | Estado |
| `notes` | text | SÍ | NULL | Notas |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |
| `updated_at` | timestamptz | NO | `now()` | Última actualización |

**Métodos de pago:**
- `cash`, `transfer`, `check`, `card`

**Estados:**
- `pending`, `completed`, `cancelled`

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `organization_id` → `organizations(id)`
- FOREIGN KEY: `supplier_id` → `suppliers(id)`
- FOREIGN KEY: `workshop_id` → `workshops(id)`
- CHECK: `payment_method` en valores válidos
- CHECK: `status` en valores válidos

---

### 🏭 `suppliers`
Proveedores.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary Key |
| `organization_id` | uuid | NO | - | FK → organizations.id |
| `workshop_id` | uuid | SÍ | NULL | FK → workshops.id |
| `created_by` | uuid | SÍ | NULL | Usuario creador |
| `updated_by` | uuid | SÍ | NULL | Usuario actualizador |
| `name` | text | NO | - | Nombre |
| `contact_person` | text | SÍ | NULL | Persona de contacto |
| `email` | text | SÍ | NULL | Email |
| `phone` | text | SÍ | NULL | Teléfono |
| `address` | text | SÍ | NULL | Dirección |
| `city` | text | SÍ | NULL | Ciudad |
| `state` | text | SÍ | NULL | Estado |
| `zip_code` | text | SÍ | NULL | Código postal |
| `country` | text | SÍ | `'México'` | País |
| `tax_id` | text | SÍ | NULL | RFC/ID fiscal |
| `payment_terms` | text | SÍ | NULL | Términos de pago |
| `notes` | text | SÍ | NULL | Notas |
| `is_active` | boolean | SÍ | `true` | Activo |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |
| `updated_at` | timestamptz | NO | `now()` | Última actualización |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `organization_id` → `organizations(id)`
- FOREIGN KEY: `workshop_id` → `workshops(id)`

---

### 📦 `purchase_orders`
Órdenes de compra.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary Key |
| `organization_id` | uuid | NO | `'00000000-0000-0000-0000-000000000000'` | FK → organizations.id |
| `workshop_id` | uuid | SÍ | NULL | FK → workshops.id |
| `supplier_id` | uuid | NO | - | FK → suppliers.id |
| `order_number` | text | NO | UNIQUE | Número de orden (único) |
| `order_date` | date | NO | `CURRENT_DATE` | Fecha de orden |
| `expected_delivery_date` | date | SÍ | NULL | Fecha esperada de entrega |
| `status` | text | NO | `'pending'` | Estado |
| `subtotal` | numeric | NO | `0.00` | Subtotal |
| `tax_amount` | numeric | NO | `0.00` | Impuestos |
| `total` | numeric | NO | `0.00` | Total |
| `notes` | text | SÍ | NULL | Notas |
| `created_at` | timestamptz | SÍ | `now()` | Fecha de creación |
| `updated_at` | timestamptz | SÍ | `now()` | Última actualización |

**Estados:**
- `pending`, `confirmed`, `shipped`, `delivered`, `cancelled`

**Constraints:**
- PRIMARY KEY: `id`
- UNIQUE: `order_number`
- FOREIGN KEY: `supplier_id` → `suppliers(id)`
- FOREIGN KEY: `workshop_id` → `workshops(id)`
- CHECK: `status` en valores válidos

---

### 📈 `leads`
Leads/Clientes potenciales.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary Key |
| `organization_id` | uuid | NO | - | FK → organizations.id |
| `workshop_id` | uuid | SÍ | NULL | FK → workshops.id |
| `name` | text | NO | - | Nombre |
| `email` | text | SÍ | NULL | Email |
| `phone` | text | SÍ | NULL | Teléfono |
| `source` | text | SÍ | NULL | Fuente |
| `status` | text | SÍ | `'new'` | Estado |
| `notes` | text | SÍ | NULL | Notas |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |
| `updated_at` | timestamptz | NO | `now()` | Última actualización |

**Estados:**
- `new`, `contacted`, `qualified`, `converted`, `lost`

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `organization_id` → `organizations(id)`
- FOREIGN KEY: `workshop_id` → `workshops(id)`
- CHECK: `status` en valores válidos

---

### 📢 `campaigns`
Campañas de marketing.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary Key |
| `organization_id` | uuid | NO | - | FK → organizations.id |
| `workshop_id` | uuid | SÍ | NULL | FK → workshops.id |
| `name` | text | NO | - | Nombre |
| `type` | text | NO | - | Tipo |
| `status` | text | SÍ | `'active'` | Estado |
| `leads_generated` | integer | SÍ | `0` | Leads generados |
| `conversion_rate` | numeric | SÍ | `0` | Tasa de conversión |
| `budget` | numeric | SÍ | `0` | Presupuesto |
| `spent` | numeric | SÍ | `0` | Gastado |
| `start_date` | date | NO | - | Fecha de inicio |
| `end_date` | date | SÍ | NULL | Fecha de fin |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |
| `updated_at` | timestamptz | NO | `now()` | Última actualización |

**Tipos:**
- `email`, `phone`, `social`, `event`

**Estados:**
- `active`, `paused`, `completed`

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `organization_id` → `organizations(id)`
- FOREIGN KEY: `workshop_id` → `workshops(id)`
- CHECK: `type` en valores válidos
- CHECK: `status` en valores válidos

---

### 🔔 `notifications`
Notificaciones del sistema.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary Key |
| `organization_id` | uuid | NO | - | FK → organizations.id |
| `workshop_id` | uuid | SÍ | NULL | FK → workshops.id |
| `user_id` | uuid | SÍ | NULL | FK → auth.users.id |
| `type` | notification_type | NO | - | Tipo de notificación |
| `title` | text | NO | - | Título |
| `message` | text | NO | - | Mensaje |
| `read` | boolean | NO | `false` | Leída |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |
| `updated_at` | timestamptz | NO | `now()` | Última actualización |

**Tipos de notificación:**
- `info`, `warning`, `success`, `error`, `stock_low`, `order_completed`, `quotation_created`

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `organization_id` → `organizations(id)`
- FOREIGN KEY: `workshop_id` → `workshops(id)`
- FOREIGN KEY: `user_id` → `auth.users(id)`
- CHECK: `type` en valores válidos

---

### ⚙️ `company_settings`
Configuración de la empresa.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary Key |
| `organization_id` | uuid | NO | - | FK → organizations.id |
| `company_name` | text | NO | - | Nombre de la empresa |
| `tax_id` | text | SÍ | NULL | RFC/ID fiscal |
| `address` | text | SÍ | NULL | Dirección |
| `phone` | text | SÍ | NULL | Teléfono |
| `email` | text | SÍ | NULL | Email |
| `logo_url` | text | SÍ | NULL | URL del logo |
| `currency` | text | SÍ | `'MXN'` | Moneda |
| `tax_rate` | numeric | SÍ | `16.00` | Tasa de impuesto |
| `working_hours` | jsonb | SÍ | `{}` | Horarios de trabajo |
| `invoice_terms` | text | SÍ | NULL | Términos de facturación |
| `appointment_defaults` | jsonb | SÍ | `{}` | Valores por defecto de citas |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |
| `updated_at` | timestamptz | NO | `now()` | Última actualización |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `organization_id` → `organizations(id)`

---

## 🤖 TABLAS DE CONFIGURACIÓN

### 🧠 `ai_agent_config`
Configuración del agente de IA para WhatsApp.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary Key |
| `organization_id` | uuid | NO | UNIQUE | FK → organizations.id |
| `enabled` | boolean | SÍ | `true` | Bot activo |
| `provider` | varchar | NO | `'anthropic'` | Proveedor de IA |
| `model` | varchar | NO | `'claude-3-5-sonnet-20241022'` | Modelo |
| `system_prompt` | text | NO | - | Prompt del sistema |
| `personality` | jsonb | SÍ | NULL | Personalidad (JSON) |
| `language` | varchar | SÍ | `'es-MX'` | Idioma |
| `temperature` | numeric | SÍ | `0.7` | Temperatura (0-2) |
| `max_tokens` | integer | SÍ | `1024` | Tokens máximos |
| `auto_schedule_appointments` | boolean | SÍ | `true` | Agendar automáticamente |
| `auto_create_orders` | boolean | SÍ | `false` | Crear órdenes automáticamente |
| `require_human_approval` | boolean | SÍ | `false` | Requerir aprobación humana |
| `business_hours_only` | boolean | SÍ | `true` | Solo horarios laborales |
| `business_hours` | jsonb | SÍ | `{}` | Horarios de negocio |
| `services` | jsonb | SÍ | `[]` | Servicios disponibles |
| `mechanics` | jsonb | SÍ | `[]` | Mecánicos disponibles |
| `faqs` | jsonb | SÍ | `[]` | FAQs |
| `policies` | jsonb | SÍ | `{}` | Políticas (incluye WAHA credentials) |
| `business_info` | jsonb | SÍ | `{}` | Información del negocio |
| `faq` | jsonb | SÍ | `[]` | FAQs (alias) |
| `custom_instructions` | text | SÍ | NULL | Instrucciones personalizadas |
| `escalation_rules` | jsonb | SÍ | `{}` | Reglas de escalación |
| `whatsapp_session_name` | varchar | SÍ | NULL | Nombre de sesión WAHA |
| `whatsapp_connected` | boolean | SÍ | `false` | WhatsApp conectado |
| `whatsapp_phone` | text | SÍ | NULL | Teléfono de WhatsApp |
| `waha_api_url` | text | SÍ | NULL | URL de API WAHA |
| `waha_api_key` | text | SÍ | NULL | API Key de WAHA |
| `waha_config_type` | text | SÍ | `'shared'` | Tipo: `'shared'` o `'custom'` |
| `created_at` | timestamptz | SÍ | `now()` | Fecha de creación |
| `updated_at` | timestamptz | SÍ | `now()` | Última actualización |

**Constraints:**
- PRIMARY KEY: `id`
- UNIQUE: `organization_id`
- FOREIGN KEY: `organization_id` → `organizations(id)`
- CHECK: `provider` en `['openai', 'anthropic']`
- CHECK: `temperature` entre 0 y 2
- CHECK: `max_tokens > 0`

---

### 📱 `whatsapp_config`
Configuración de WhatsApp Business API.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary Key |
| `organization_id` | uuid | NO | - | FK → organizations.id |
| `provider` | varchar | NO | - | Proveedor |
| `phone_number` | varchar | NO | - | Número de teléfono |
| `business_account_id` | varchar | SÍ | NULL | ID de cuenta de negocio |
| `webhook_url` | text | SÍ | NULL | URL del webhook |
| `is_active` | boolean | SÍ | `true` | Activo |
| `verified_at` | timestamptz | SÍ | NULL | Fecha de verificación |
| `settings` | jsonb | SÍ | `{}` | Configuraciones adicionales |
| `created_at` | timestamptz | SÍ | `now()` | Fecha de creación |
| `updated_at` | timestamptz | SÍ | `now()` | Última actualización |

**Proveedores:**
- `twilio`, `evolution`, `meta-cloud`

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `organization_id` → `organizations(id)`
- CHECK: `provider` en valores válidos

---

## 💬 TABLAS DE WHATSAPP

### 💬 `whatsapp_conversations`
Conversaciones de WhatsApp.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary Key |
| `organization_id` | uuid | NO | - | FK → organizations.id |
| `customer_id` | uuid | SÍ | NULL | FK → customers.id |
| `customer_phone` | varchar | NO | - | Teléfono del cliente |
| `customer_name` | varchar | SÍ | NULL | Nombre del cliente |
| `status` | varchar | SÍ | `'active'` | Estado |
| `last_message_at` | timestamptz | SÍ | `now()` | Último mensaje |
| `messages_count` | integer | SÍ | `0` | Contador de mensajes |
| `is_bot_active` | boolean | SÍ | `true` | Bot activo |
| `assigned_to_user_id` | uuid | SÍ | NULL | FK → system_users.id |
| `escalated_at` | timestamptz | SÍ | NULL | Fecha de escalación |
| `escalation_reason` | text | SÍ | NULL | Razón de escalación |
| `related_order_id` | uuid | SÍ | NULL | FK → work_orders.id |
| `related_appointment_id` | uuid | SÍ | NULL | FK → appointments.id |
| `metadata` | jsonb | SÍ | `{}` | Metadata adicional |
| `started_at` | timestamptz | SÍ | `now()` | Fecha de inicio |
| `closed_at` | timestamptz | SÍ | NULL | Fecha de cierre |
| `profile_picture_url` | text | SÍ | NULL | URL de foto de perfil |
| `last_message` | text | SÍ | NULL | Último mensaje (preview) |
| `created_at` | timestamptz | SÍ | `now()` | Fecha de creación |
| `updated_at` | timestamptz | SÍ | `now()` | Última actualización |

**Estados:**
- `active`, `closed`, `archived`

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `organization_id` → `organizations(id)`
- FOREIGN KEY: `customer_id` → `customers(id)`
- FOREIGN KEY: `assigned_to_user_id` → `system_users(id)`
- FOREIGN KEY: `related_order_id` → `work_orders(id)`
- FOREIGN KEY: `related_appointment_id` → `appointments(id)`
- CHECK: `status` en valores válidos

---

### 📨 `whatsapp_messages`
Mensajes individuales de WhatsApp.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary Key |
| `conversation_id` | uuid | NO | - | FK → whatsapp_conversations.id |
| `organization_id` | uuid | NO | - | FK → organizations.id |
| `from_number` | varchar | NO | - | Número origen |
| `to_number` | varchar | NO | - | Número destino |
| `direction` | varchar | NO | - | Dirección |
| `body` | text | NO | - | Contenido |
| `message_type` | varchar | SÍ | `'text'` | Tipo de mensaje |
| `media_url` | text | SÍ | NULL | URL de multimedia |
| `media_type` | text | SÍ | NULL | Tipo de multimedia |
| `status` | varchar | SÍ | `'sent'` | Estado |
| `provider_message_id` | varchar | SÍ | NULL | ID del proveedor |
| `provider` | text | SÍ | `'waha'` | Proveedor |
| `metadata` | jsonb | SÍ | `{}` | Metadata |
| `sent_at` | timestamptz | SÍ | `now()` | Fecha de envío |
| `delivered_at` | timestamptz | SÍ | NULL | Fecha de entrega |
| `read_at` | timestamptz | SÍ | NULL | Fecha de lectura |
| `created_at` | timestamptz | SÍ | `now()` | Fecha de creación |

**Direcciones:**
- `inbound`, `outbound`

**Tipos de mensaje:**
- `text`, `image`, `document`, `audio`, `video`, `location`

**Estados:**
- `queued`, `sent`, `delivered`, `read`, `failed`

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `conversation_id` → `whatsapp_conversations(id)`
- FOREIGN KEY: `organization_id` → `organizations(id)`
- CHECK: `direction` en valores válidos
- CHECK: `message_type` en valores válidos
- CHECK: `status` en valores válidos

---

### 📅 `appointment_requests`
Solicitudes de citas desde WhatsApp.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary Key |
| `organization_id` | uuid | NO | - | FK → organizations.id |
| `conversation_id` | uuid | SÍ | NULL | FK → whatsapp_conversations.id |
| `customer_phone` | varchar | NO | - | Teléfono del cliente |
| `customer_name` | varchar | SÍ | NULL | Nombre del cliente |
| `vehicle_description` | text | SÍ | NULL | Descripción del vehículo |
| `service_type` | text | NO | - | Tipo de servicio |
| `preferred_date` | date | SÍ | NULL | Fecha preferida |
| `preferred_time` | time | SÍ | NULL | Hora preferida |
| `preferred_datetime` | timestamptz | SÍ | NULL | Fecha/hora preferida |
| `flexibility` | text | SÍ | NULL | Flexibilidad |
| `estimated_price` | numeric | SÍ | NULL | Precio estimado |
| `notes` | text | SÍ | NULL | Notas |
| `status` | varchar | SÍ | `'pending'` | Estado |
| `appointment_id` | uuid | SÍ | NULL | FK → appointments.id |
| `processed_by` | uuid | SÍ | NULL | FK → users.id |
| `processed_at` | timestamptz | SÍ | NULL | Fecha de procesamiento |
| `rejection_reason` | text | SÍ | NULL | Razón de rechazo |
| `created_at` | timestamptz | SÍ | `now()` | Fecha de creación |
| `updated_at` | timestamptz | SÍ | `now()` | Última actualización |

**Estados:**
- `pending`, `approved`, `rejected`, `converted`

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `conversation_id` → `whatsapp_conversations(id)`
- FOREIGN KEY: `appointment_id` → `appointments(id)`
- FOREIGN KEY: `processed_by` → `users(id)`
- CHECK: `status` en valores válidos

---

## 📊 TABLAS DE METADATA

### 🔗 `whatsapp_order_metadata`
Metadata de órdenes creadas desde WhatsApp.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary Key |
| `order_id` | uuid | NO | UNIQUE | FK → work_orders.id |
| `organization_id` | uuid | NO | - | FK → organizations.id |
| `source` | varchar | SÍ | `'whatsapp_bot'` | Fuente |
| `customer_phone` | varchar | NO | - | Teléfono del cliente |
| `appointment_id` | uuid | SÍ | NULL | FK → appointments.id |
| `service_name` | varchar | SÍ | NULL | Nombre del servicio |
| `created_at` | timestamptz | SÍ | `now()` | Fecha de creación |

**Constraints:**
- PRIMARY KEY: `id`
- UNIQUE: `order_id`
- FOREIGN KEY: `order_id` → `work_orders(id)`
- FOREIGN KEY: `organization_id` → `organizations(id)`
- FOREIGN KEY: `appointment_id` → `appointments(id)`

---

### 📅 `whatsapp_appointment_metadata`
Metadata de citas creadas desde WhatsApp.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary Key |
| `appointment_id` | uuid | NO | UNIQUE | FK → appointments.id |
| `organization_id` | uuid | NO | - | FK → organizations.id |
| `source` | varchar | SÍ | `'whatsapp_bot'` | Fuente |
| `customer_phone` | varchar | NO | - | Teléfono del cliente |
| `scheduled_via` | varchar | SÍ | `'bot_conversation'` | Agendado vía |
| `created_at` | timestamptz | SÍ | `now()` | Fecha de creación |

**Constraints:**
- PRIMARY KEY: `id`
- UNIQUE: `appointment_id`
- FOREIGN KEY: `appointment_id` → `appointments(id)`
- FOREIGN KEY: `organization_id` → `organizations(id)`

---

### 👤 `whatsapp_customer_metadata`
Metadata de clientes creados desde WhatsApp.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary Key |
| `customer_id` | uuid | NO | UNIQUE | FK → customers.id |
| `organization_id` | uuid | NO | - | FK → organizations.id |
| `source` | varchar | SÍ | `'whatsapp_bot'` | Fuente |
| `first_contact_phone` | varchar | NO | - | Teléfono de primer contacto |
| `created_at` | timestamptz | SÍ | `now()` | Fecha de creación |

**Constraints:**
- PRIMARY KEY: `id`
- UNIQUE: `customer_id`
- FOREIGN KEY: `customer_id` → `customers(id)`
- FOREIGN KEY: `organization_id` → `organizations(id)`

---

## 🔍 TABLAS ADICIONALES

### 🔍 `vehicle_inspections`
Inspecciones de vehículos.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary Key |
| `order_id` | uuid | NO | - | FK → work_orders.id |
| `organization_id` | uuid | NO | - | FK → organizations.id |
| `workshop_id` | uuid | SÍ | NULL | FK → workshops.id |
| `fluids_check` | jsonb | SÍ | `{}` | Verificación de fluidos |
| `fuel_level` | varchar | SÍ | NULL | Nivel de combustible |
| `valuable_items` | text | SÍ | NULL | Objetos de valor |
| `fluids_adequate` | boolean | SÍ | `true` | Fluidos adecuados |
| `will_diagnose` | boolean | SÍ | `false` | Se diagnosticará |
| `linked_quote_id` | uuid | SÍ | NULL | Cotización vinculada |
| `entry_reason` | text | SÍ | NULL | Razón de entrada |
| `procedures` | text | SÍ | NULL | Procedimientos |
| `is_warranty` | boolean | SÍ | `false` | Es garantía |
| `authorize_test_drive` | boolean | SÍ | `false` | Autorizar prueba de manejo |
| `created_at` | timestamptz | SÍ | `now()` | Fecha de creación |
| `updated_at` | timestamptz | SÍ | `now()` | Última actualización |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `order_id` → `work_orders(id)`
- FOREIGN KEY: `organization_id` → `organizations(id)`
- FOREIGN KEY: `workshop_id` → `workshops(id)`

---

### 👥 `system_users`
Usuarios del sistema (alternativa a users).

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary Key |
| `organization_id` | uuid | NO | - | FK → organizations.id |
| `email` | text | NO | - | Email |
| `first_name` | text | NO | - | Nombre |
| `last_name` | text | NO | - | Apellido |
| `role` | text | NO | `'employee'` | Rol |
| `is_active` | boolean | SÍ | `true` | Activo |
| `last_login` | timestamptz | SÍ | NULL | Último login |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |
| `updated_at` | timestamptz | NO | `now()` | Última actualización |

**Roles:**
- `admin`, `manager`, `employee`, `viewer`

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `organization_id` → `organizations(id)`
- CHECK: `role` en valores válidos

---

### 📋 `quotation_tracking`
Tracking de acciones en cotizaciones.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary Key |
| `quotation_id` | uuid | NO | - | FK → quotations.id |
| `workshop_id` | uuid | SÍ | NULL | FK → workshops.id |
| `action` | varchar | NO | - | Acción realizada |
| `description` | text | SÍ | NULL | Descripción |
| `ip_address` | inet | SÍ | NULL | Dirección IP |
| `user_agent` | text | SÍ | NULL | User Agent |
| `created_by` | uuid | SÍ | NULL | Usuario creador |
| `created_at` | timestamptz | SÍ | `now()` | Fecha de creación |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `quotation_id` → `quotations(id)`
- FOREIGN KEY: `workshop_id` → `workshops(id)`

---

### 📚 `quotation_versions`
Versiones históricas de cotizaciones.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary Key |
| `quotation_id` | uuid | NO | - | FK → quotations.id |
| `workshop_id` | uuid | SÍ | NULL | FK → workshops.id |
| `version_number` | integer | NO | - | Número de versión |
| `data` | jsonb | NO | - | Datos de la versión |
| `created_by` | uuid | SÍ | NULL | Usuario creador |
| `created_at` | timestamptz | SÍ | `now()` | Fecha de creación |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `quotation_id` → `quotations(id)`
- FOREIGN KEY: `workshop_id` → `workshops(id)`

---

### 💰 `price_history`
Historial de precios de productos/servicios.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary Key |
| `workshop_id` | uuid | SÍ | NULL | FK → workshops.id |
| `item_type` | varchar | NO | - | Tipo de item |
| `item_id` | uuid | NO | - | ID del item |
| `old_price` | numeric | SÍ | NULL | Precio anterior |
| `new_price` | numeric | NO | - | Precio nuevo |
| `changed_by` | uuid | SÍ | NULL | Usuario que cambió |
| `reason` | text | SÍ | NULL | Razón del cambio |
| `created_at` | timestamptz | SÍ | `now()` | Fecha de creación |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `workshop_id` → `workshops(id)`
- CHECK: `item_type` en `['service', 'product']`

---

### 📧 `invitations`
Invitaciones de usuarios a la organización.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary Key |
| `organization_id` | uuid | NO | - | FK → organizations.id |
| `email` | varchar | NO | - | Email invitado |
| `role` | varchar | SÍ | `'ASESOR'` | Rol asignado |
| `invited_by` | uuid | SÍ | NULL | FK → users.id |
| `status` | varchar | SÍ | `'pending'` | Estado |
| `expires_at` | timestamptz | SÍ | `now() + 7 days` | Fecha de expiración |
| `accepted_at` | timestamptz | SÍ | NULL | Fecha de aceptación |
| `created_at` | timestamptz | SÍ | `now()` | Fecha de creación |

**Estados:**
- `pending`, `accepted`, `expired`, `cancelled`

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `organization_id` → `organizations(id)`
- FOREIGN KEY: `invited_by` → `users(id)`
- CHECK: `status` en valores válidos

---

### 📊 `organization_audit_log`
Log de auditoría de cambios de organización.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary Key |
| `table_name` | text | NO | - | Nombre de tabla |
| `record_id` | uuid | NO | - | ID del registro |
| `old_organization_id` | uuid | SÍ | NULL | Organization ID anterior |
| `new_organization_id` | uuid | NO | - | Organization ID nuevo |
| `changed_by` | uuid | SÍ | NULL | FK → users.id |
| `changed_at` | timestamptz | SÍ | `now()` | Fecha de cambio |
| `reason` | text | SÍ | NULL | Razón del cambio |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `changed_by` → `users(id)`

---

## 🔗 RELACIONES PRINCIPALES

### Jerarquía Multi-Tenant:
```
organizations (raíz)
  ├── workshops
  ├── users
  ├── customers
  │   └── vehicles
  ├── work_orders
  │   ├── order_items
  │   └── vehicle_inspections
  ├── appointments
  ├── invoices
  │   └── invoice_items
  ├── quotations
  │   ├── quotation_items
  │   ├── quotation_tracking
  │   └── quotation_versions
  ├── products
  ├── services
  ├── inventory
  │   ├── inventory_categories
  │   └── inventory_movements
  ├── suppliers
  │   └── purchase_orders
  ├── employees
  ├── leads
  ├── campaigns
  ├── notifications
  ├── company_settings
  ├── invitations
  ├── whatsapp_config
  ├── whatsapp_conversations
  │   └── whatsapp_messages
  ├── whatsapp_order_metadata
  ├── whatsapp_appointment_metadata
  ├── whatsapp_customer_metadata
  └── ai_agent_config
```

---

## 🔒 SEGURIDAD Y MULTI-TENANCY

### Principios de Aislamiento:

1. **Todas las tablas principales tienen `organization_id`**
   - Filtro obligatorio en todas las consultas
   - RLS (Row Level Security) activo en Supabase

2. **Validación en Backend:**
   - Siempre obtener `organizationId` del contexto de sesión
   - NUNCA confiar en `organization_id` del cliente
   - Validar que `organizationId` coincida antes de operaciones

3. **Validación en Frontend:**
   - Usar `useSession().organizationId` del contexto
   - Pasar `organizationId` a todas las funciones de queries

---

## 📝 NOTAS IMPORTANTES

### ⚠️ Campos Legacy:
- Algunas tablas tienen campos duplicados (ej: `inventory.quantity` y `inventory.current_stock`)
- Usar los campos más recientes cuando sea posible

### 🔄 Valores por Defecto de Organization:
- Algunas tablas usan `'00000000-0000-0000-0000-000000000000'` como default
- Esto indica configuración global/compartida
- Ejemplo: `ai_agent_config` para WAHA compartido

### 📅 Timestamps:
- Todas las tablas tienen `created_at` y `updated_at`
- Triggers automáticos actualizan `updated_at` en cambios

### 🗑️ Soft Deletes:
- Algunas tablas usan `is_active` para soft deletes
- Verificar este campo antes de mostrar datos

---

## 🔄 ACTUALIZACIONES FUTURAS

Este documento debe actualizarse cuando:
- Se agreguen nuevas tablas
- Se modifiquen columnas existentes
- Se cambien relaciones o constraints
- Se agreguen nuevos índices

---

---

## Tablas Financieras (agregadas 2026)

### `financial_transactions`
Libro de movimientos unificado. Fuente de verdad para ingresos y gastos.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | PK |
| `organization_id` | uuid | FK → organizations |
| `transaction_type` | text | `'income'` o `'expense'` |
| `category` | text | Categoría del movimiento |
| `description` | text | Descripción |
| `amount` | numeric | Monto |
| `transaction_date` | date | Fecha del movimiento |
| `reference_type` | text | Tipo de referencia (ej. `invoice_payment`) |
| `reference_id` | uuid | ID del registro origen |
| `account_id` | uuid | FK → cash_accounts (opcional) |
| `created_by` | uuid | FK → users |
| `created_at` | timestamptz | Fecha de creación |

### `cash_accounts`
Cuentas de efectivo, banco y tarjeta por organización.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | PK |
| `organization_id` | uuid | FK → organizations |
| `name` | text | Nombre de la cuenta |
| `account_type` | text | `'cash'`, `'bank'` o `'card'` |
| `balance` | numeric | Saldo actual |
| `currency` | text | Moneda (ej. `'USD'`) |
| `created_at` | timestamptz | Fecha de creación |

### `cash_account_movements`
Movimientos individuales de una cuenta de efectivo.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | PK |
| `cash_account_id` | uuid | FK → cash_accounts |
| `organization_id` | uuid | FK → organizations |
| `movement_type` | text | `'deposit'` o `'withdrawal'` |
| `amount` | numeric | Monto |
| `notes` | text | Descripción |
| `reference_type` | text | Tipo de referencia |
| `reference_id` | uuid | ID del registro origen |
| `created_by` | uuid | FK → users |
| `created_at` | timestamptz | Fecha |

### `invoice_payments`
Pagos registrados contra una factura/nota de venta.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | PK |
| `organization_id` | uuid | FK → organizations |
| `invoice_id` | uuid | FK → invoices |
| `amount` | numeric | Monto pagado |
| `payment_method` | text | `'cash'`, `'card'`, `'transfer'`, etc. |
| `payment_date` | date | Fecha del pago |
| `reference` | text | Referencia opcional |
| `notes` | text | Notas |
| `created_at` | timestamptz | Fecha de creación |

### `collections`
Cobros a clientes.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | PK |
| `organization_id` | uuid | FK → organizations |
| `customer_id` | text | ID del cliente |
| `amount` | numeric | Monto |
| `currency` | text | Moneda |
| `due_date` | date | Fecha de vencimiento |
| `status` | text | `'pending'`, `'paid'`, `'overdue'`, `'cancelled'` |
| `payment_method` | text | Método de pago |
| `paid_date` | date | Fecha de pago (si aplica) |
| `notes` | text | Notas |
| `created_at` | timestamptz | Fecha de creación |

### `payments` (supplier_payments)
Pagos a proveedores.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | PK |
| `organization_id` | uuid | FK → organizations |
| `supplier_id` | uuid | FK → suppliers |
| `amount` | numeric | Monto |
| `payment_date` | date | Fecha del pago |
| `payment_method` | text | Método de pago |
| `reference` | text | Referencia |
| `status` | text | `'pending'` o `'completed'` |
| `created_at` | timestamptz | Fecha de creación |

### `push_subscriptions`
Suscripciones Web Push por organización.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | PK |
| `organization_id` | uuid | FK → organizations |
| `endpoint` | text | URL del endpoint push |
| `p256dh` | text | Clave pública del cliente |
| `auth` | text | Token de autenticación |
| `created_at` | timestamptz | Fecha de suscripción |

---

**Última actualización:** Abril 2026
**Mantenido por:** Equipo de Desarrollo
















