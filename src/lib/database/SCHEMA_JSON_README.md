# 📊 SCHEMA.json - Esquema Completo de Supabase

## 🎯 Propósito

Este archivo contiene el esquema **EXACTO** de la base de datos Supabase. **SIEMPRE** consulta este archivo antes de escribir queries para evitar errores.

## ⚠️ IMPORTANTE

- **NO asumas nombres de campos** - usa solo los que aparecen en este esquema
- **NO uses campos que no existan** - verifica cada campo antes de usarlo
- **TODOS los IDs son UUIDs** - nunca uses strings como 'WO001'
- **Multi-tenancy obligatorio** - la mayoría de tablas requieren `organization_id`

## 📋 Tablas Incluidas

### 🏢 **organizations**
- Tabla principal para multi-tenancy
- Campos: `id`, `name`, `address`, `phone`, `email`, `created_at`, `updated_at`

### 👥 **customers** 
- Clientes del taller
- **FK:** `organization_id` → `organizations.id`
- Campos: `id`, `organization_id`, `name`, `email`, `phone`, `address`, `notes`, `created_at`, `updated_at`

### 🚗 **vehicles**
- Vehículos de los clientes
- **FK:** `customer_id` → `customers.id`
- **IMPORTANTE:** Usar `brand` (NO `make`)
- Campos: `id`, `customer_id`, `brand`, `model`, `year`, `license_plate`, `vin`, `color`, `mileage`, `created_at`, `updated_at`

### 🔧 **work_orders**
- Órdenes de trabajo/reparación (CORE BUSINESS)
- **FKs:** `organization_id` → `organizations.id`, `customer_id` → `customers.id`, `vehicle_id` → `vehicles.id`
- **CRÍTICO:** ID es UUID, NO existe `order_number`
- Estados válidos: `pending`, `in_progress`, `completed`, `cancelled`
- Campos: `id`, `organization_id`, `customer_id`, `vehicle_id`, `status`, `description`, `estimated_cost`, `final_cost`, `entry_date`, `estimated_completion`, `completed_at`, `notes`, `subtotal`, `tax_amount`, `discount_amount`, `total_amount`, `created_at`, `updated_at`

### 📦 **order_items**
- Items/servicios dentro de una orden de trabajo
- **FKs:** `order_id` → `work_orders.id`, `service_id` → `services.id`, `inventory_id` → `products.id`, `mechanic_id` → `employees.id`
- Tipos válidos: `service`, `product`
- Campos: `id`, `order_id`, `service_id`, `inventory_id`, `item_type`, `description`, `quantity`, `unit_price`, `discount_percent`, `discount_amount`, `tax_percent`, `subtotal`, `tax_amount`, `total`, `mechanic_id`, `status`, `notes`, `created_at`, `updated_at`

### 📦 **inventory**
- Inventario de productos/piezas
- **FK:** `category_id` → `inventory_categories.id`
- **IMPORTANTE:** Usar `current_stock` (NO `quantity`), `min_stock` (NO `min_quantity`)
- Campos: `id`, `organization_id`, `code`, `name`, `description`, `quantity` (deprecated), `min_quantity` (deprecated), `unit_price`, `category` (deprecated), `category_id`, `sku`, `barcode`, `current_stock`, `min_stock`, `max_stock`, `unit`, `status`, `created_at`, `updated_at`

### 📂 **inventory_categories**
- Categorías de inventario
- **FK:** `parent_id` → `inventory_categories.id` (self-reference)
- Campos: `id`, `organization_id`, `name`, `description`, `parent_id`, `status`, `created_at`, `updated_at`

### 📊 **inventory_movements**
- Movimientos de inventario (entradas/salidas)
- **FKs:** `product_id` → `products.id`, `organization_id` → `organizations.id`
- Tipos válidos: `entry`, `exit`, `adjustment`
- Campos: `id`, `product_id`, `organization_id`, `movement_type`, `quantity`, `previous_stock`, `new_stock`, `unit_cost`, `total_cost`, `reference_type`, `reference_id`, `notes`, `created_by`, `created_at`, `updated_at`

### 👤 **system_users**
- Usuarios del sistema
- **FK:** `organization_id` → `organizations.id`
- **IMPORTANTE:** Usar `is_active` (boolean), NO `status`
- Campos: `id`, `organization_id`, `email`, `first_name`, `last_name`, `role`, `is_active`, `last_login`, `created_at`, `updated_at`

### 💰 **payments**
- Pagos a proveedores
- **FKs:** `organization_id` → `organizations.id`, `supplier_id` → `suppliers.id`
- Campos: `id`, `organization_id`, `supplier_id`, `invoice_number`, `amount`, `payment_date`, `payment_method`, `reference`, `status`, `notes`, `created_at`, `updated_at`

### 🧾 **invoices**
- Facturas a clientes
- **FKs:** `organization_id` → `organizations.id`, `customer_id` → `customers.id`, `vehicle_id` → `vehicles.id`
- Campos: `id`, `organization_id`, `customer_id`, `vehicle_id`, `invoice_number`, `status`, `due_date`, `paid_date`, `payment_method`, `payment_reference`, `payment_notes`, `notes`, `subtotal`, `tax_amount`, `discount_amount`, `total`, `created_by`, `updated_by`, `created_at`, `updated_at`

### 📅 **appointments**
- Citas programadas
- **FKs:** `organization_id` → `organizations.id`, `customer_id` → `customers.id`, `vehicle_id` → `vehicles.id`
- Campos: `id`, `organization_id`, `customer_id`, `vehicle_id`, `service_type`, `appointment_date`, `duration`, `status`, `notes`, `created_at`, `updated_at`

## ❌ Errores Comunes

### 1. **Usar 'make' en lugar de 'brand'**
```sql
-- ❌ INCORRECTO
SELECT make FROM vehicles;

-- ✅ CORRECTO
SELECT brand FROM vehicles;
```

### 2. **Usar order_number como ID**
```sql
-- ❌ INCORRECTO
WHERE id = 'WO001';

-- ✅ CORRECTO
WHERE id = '123e4567-e89b-12d3-a456-426614174000';
```

### 3. **Pasar strings como IDs**
```typescript
// ❌ INCORRECTO
const orderId = 'WO001';

// ✅ CORRECTO
const orderId = '123e4567-e89b-12d3-a456-426614174000';
```

### 4. **Usar system_users.status**
```sql
-- ❌ INCORRECTO
SELECT status FROM system_users;

-- ✅ CORRECTO
SELECT is_active FROM system_users;
```

### 5. **Usar inventory.quantity**
```sql
-- ❌ INCORRECTO
SELECT quantity FROM inventory;

-- ✅ CORRECTO
SELECT current_stock FROM inventory;
```

### 6. **Olvidar organization_id**
```sql
-- ❌ INCORRECTO (falta multi-tenancy)
SELECT * FROM customers;

-- ✅ CORRECTO
SELECT * FROM customers WHERE organization_id = $1;
```

## 🔍 Cómo Usar Este Archivo

### 1. **Antes de escribir queries:**
```typescript
import schema from '@/lib/database/SCHEMA.json';

// Verificar que el campo existe
if (schema.tables.vehicles.columns.brand) {
  // Usar vehicles.brand
}
```

### 2. **Validar tipos de datos:**
```typescript
// Verificar tipo de campo
const fieldType = schema.tables.work_orders.columns.status.type; // "text"
const allowedValues = schema.tables.work_orders.columns.status.values; // ["pending", "in_progress", ...]
```

### 3. **Verificar foreign keys:**
```typescript
// Verificar relaciones
const foreignKeys = schema.tables.customers.foreign_keys;
// [{ "column": "organization_id", "references": "organizations.id" }]
```

### 4. **Evitar campos deprecated:**
```typescript
// Verificar si un campo está deprecated
const quantityField = schema.tables.inventory.columns.quantity;
if (quantityField.deprecated) {
  // Usar el campo recomendado
  console.log(`Use ${quantityField.use_instead} instead`);
}
```

## 🔄 Mantenimiento

- **Actualizar cuando cambie el esquema** de Supabase
- **Verificar foreign keys** después de cambios
- **Documentar nuevos campos** con descripciones claras
- **Marcar campos deprecated** cuando se reemplacen

## 📞 Contacto

Para actualizaciones o correcciones del esquema, contactar al equipo de desarrollo.

---

**Última actualización:** 2025-10-06  
**Versión:** 1.0.0  
**Fuente:** Supabase Production Database
