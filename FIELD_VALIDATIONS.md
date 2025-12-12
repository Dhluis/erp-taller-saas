# VALIDACIONES DE CAMPOS - ERP TALLER SAAS

**Última actualización**: Diciembre 2024

Este documento contiene todas las validaciones de campos aplicadas en formularios, APIs y base de datos.

---

## VALIDACIONES - MÓDULO CLIENTES

| Campo | Tipo | Requerido | Validación Frontend (Zod) | Validación BD | Mensaje de Error |
|-------|------|-----------|---------------------------|---------------|------------------|
| `name` | string | ✅ | `min(2)`, `max(100)` | `VARCHAR(255) NOT NULL` | "El nombre debe tener al menos 2 caracteres" / "El nombre no puede exceder 100 caracteres" |
| `email` | string | ❌ | `email()` | `VARCHAR(255)` | "Email inválido" |
| `phone` | string | ❌ | `regex(/^[\+]?[1-9][\d]{0,15}$/)` | `VARCHAR(50)` | "Teléfono inválido" |
| `address` | string | ❌ | `max(200)` | `TEXT` | "La dirección no puede exceder 200 caracteres" |
| `city` | string | ❌ | `max(50)` | `VARCHAR(100)` | "La ciudad no puede exceder 50 caracteres" |
| `state` | string | ❌ | `max(50)` | `VARCHAR(100)` | "El estado no puede exceder 50 caracteres" |
| `zip_code` | string | ❌ | `max(10)` | `VARCHAR(20)` | "El código postal no puede exceder 10 caracteres" |
| `code` | string | ❌ | - | `VARCHAR(50)` | - |
| `company` | string | ❌ | - | `VARCHAR(255)` | - |
| `tax_id` | string | ❌ | - | `VARCHAR(50)` | - |
| `notes` | string | ❌ | - | `TEXT` | - |
| `organization_id` | UUID | ✅ | `uuid()` | `UUID NOT NULL` | "ID de organización inválido" |

**Notas**:
- `name` es obligatorio en BD (`NOT NULL`)
- `phone` acepta formato internacional con `+` opcional
- `email` es opcional pero debe ser válido si se proporciona

---

## VALIDACIONES - MÓDULO VEHÍCULOS

| Campo | Tipo | Requerido | Validación Frontend (Zod) | Validación BD | Mensaje de Error |
|-------|------|-----------|---------------------------|---------------|------------------|
| `customer_id` | UUID | ✅ | `uuid()` | `UUID NOT NULL` | "ID de cliente inválido" |
| `make` (marca) | string | ✅ | `min(2)`, `max(50)` | `VARCHAR(50)` | "La marca debe tener al menos 2 caracteres" / "La marca no puede exceder 50 caracteres" |
| `model` (modelo) | string | ✅ | `min(2)`, `max(50)` | `VARCHAR(50)` | "El modelo debe tener al menos 2 caracteres" / "El modelo no puede exceder 50 caracteres" |
| `year` | number | ✅ | `int()`, `min(1900)`, `max(año_actual + 1)` | `INTEGER` | "El año debe ser mayor a 1900" / "El año no puede ser futuro" |
| `vin` | string | ❌ | `regex(/^[A-HJ-NPR-Z0-9]{17}$/)` | `VARCHAR(17)` | "VIN inválido" (debe tener exactamente 17 caracteres alfanuméricos) |
| `license_plate` | string | ❌ | `max(20)` | `VARCHAR(20)` | "La placa no puede exceder 20 caracteres" |
| `color` | string | ❌ | `max(30)` | `VARCHAR(30)` | "El color no puede exceder 30 caracteres" |
| `mileage` | number | ❌ | `int()`, `min(0)`, `max(999999)` | `INTEGER` | "El kilometraje no puede ser negativo" / "El kilometraje no puede exceder 999,999" |
| `organization_id` | UUID | ✅ | `uuid()` | `UUID NOT NULL` | "ID de organización inválido" |

**Notas**:
- `vin` debe tener exactamente 17 caracteres (excluye I, O, Q)
- `year` puede ser hasta el año siguiente al actual (para vehículos próximos a salir)
- `mileage` no puede ser negativo

---

## VALIDACIONES - MÓDULO ÓRDENES DE TRABAJO

| Campo | Tipo | Requerido | Validación Frontend (Zod) | Validación BD | Mensaje de Error |
|-------|------|-----------|---------------------------|---------------|------------------|
| `customer_id` | UUID | ✅ | `uuid()` | `UUID NOT NULL` | "ID de cliente inválido" |
| `vehicle_id` | UUID | ✅ | `uuid()` | `UUID NOT NULL` | "ID de vehículo inválido" |
| `description` | string | ✅ | `min(10)`, `max(1000)` | `TEXT` | "La descripción debe tener al menos 10 caracteres" / "La descripción no puede exceder 1000 caracteres" |
| `status` | enum | ❌ | `enum(['reception', 'diagnosis', 'initial_quote', 'waiting_approval', 'disassembly', 'waiting_parts', 'assembly', 'testing', 'ready', 'completed', 'cancelled'])` | `CHECK constraint` (11 estados) | "Estado inválido" |
| `priority` | enum | ❌ | `enum(['low', 'medium', 'high'])` | `VARCHAR(20)` | "La prioridad debe ser low, medium o high" |
| `estimated_hours` | number | ❌ | `min(0.5)`, `max(24)` | `DECIMAL(10,2)` | "Las horas estimadas deben ser al menos 0.5" / "Las horas estimadas no pueden exceder 24" |
| `actual_hours` | number | ❌ | `min(0)`, `max(24)` | `DECIMAL(10,2)` | "Las horas reales no pueden ser negativas" / "Las horas reales no pueden exceder 24" |
| `labor_cost` | number | ❌ | `min(0)`, `max(999999.99)` | `DECIMAL(10,2)` | "El costo de mano de obra no puede ser negativo" / "El costo de mano de obra no puede exceder 999,999.99" |
| `parts_cost` | number | ❌ | `min(0)`, `max(999999.99)` | `DECIMAL(10,2)` | "El costo de partes no puede ser negativo" / "El costo de partes no puede exceder 999,999.99" |
| `total_cost` | number | ❌ | `min(0)`, `max(999999.99)` | `DECIMAL(10,2)` | "El costo total no puede ser negativo" / "El costo total no puede exceder 999,999.99" |
| `assigned_to` | UUID | ❌ | `uuid()` | `UUID` (FK a `employees.id`) | "ID de empleado inválido" |
| `organization_id` | UUID | ✅ | `uuid()` | `UUID NOT NULL` | "ID de organización inválido" |

**Notas**:
- `status` tiene 11 estados oficiales según CHECK constraint en BD
- `description` debe tener al menos 10 caracteres para ser descriptiva
- Los costos están limitados a 999,999.99

---

## VALIDACIONES - MÓDULO COTIZACIONES

| Campo | Tipo | Requerido | Validación Frontend (Zod) | Validación BD | Mensaje de Error |
|-------|------|-----------|---------------------------|---------------|------------------|
| `customer_id` | UUID | ✅ | `uuid()` | `UUID NOT NULL` | "ID de cliente inválido" |
| `vehicle_id` | UUID | ✅ | `uuid()` | `UUID NOT NULL` | "ID de vehículo inválido" |
| `quotation_number` | string | ❌ | - | `VARCHAR(50) UNIQUE` | - (generado automáticamente por trigger) |
| `status` | enum | ❌ | `enum(['draft', 'sent', 'accepted', 'rejected', 'expired'])` | `VARCHAR(20)` | "Estado inválido" |
| `issue_date` | datetime | ✅ | `datetime()` | `TIMESTAMP` | "Fecha de emisión inválida" |
| `expiry_date` / `valid_until` | datetime | ✅ | `datetime()` | `DATE` | "Fecha de vencimiento inválida" |
| `subtotal` | number | ✅ | `min(0)`, `max(999999.99)` | `DECIMAL(10,2)` | "El subtotal no puede ser negativo" / "El subtotal no puede exceder 999,999.99" |
| `tax_rate` | number | ✅ | `min(0)`, `max(100)` | `DECIMAL(5,2)` | "La tasa de impuestos no puede ser negativa" / "La tasa de impuestos no puede exceder 100%" |
| `tax_amount` | number | ✅ | `min(0)`, `max(999999.99)` | `DECIMAL(10,2)` | "El monto de impuestos no puede ser negativo" / "El monto de impuestos no puede exceder 999,999.99" |
| `discount_amount` | number | ✅ | `min(0)`, `max(999999.99)` | `DECIMAL(10,2)` | "El descuento no puede ser negativo" / "El descuento no puede exceder 999,999.99" |
| `total_amount` | number | ✅ | `min(0)`, `max(999999.99)` | `DECIMAL(10,2)` | "El total no puede ser negativo" / "El total no puede exceder 999,999.99" |
| `notes` | string | ❌ | `max(1000)` | `TEXT` | "Las notas no pueden exceder 1000 caracteres" |
| `terms_and_conditions` | string | ❌ | - | `TEXT` | - |
| `organization_id` | UUID | ✅ | `uuid()` | `UUID NOT NULL` | "ID de organización inválido" |

**Notas**:
- `quotation_number` se genera automáticamente por trigger: `COT-YYYYMM-0001`
- `tax_rate` es un porcentaje (0-100)
- Los montos están limitados a 999,999.99

---

## VALIDACIONES - MÓDULO ITEMS DE COTIZACIÓN

| Campo | Tipo | Requerido | Validación Frontend | Validación BD | Mensaje de Error |
|-------|------|-----------|---------------------|---------------|------------------|
| `quotation_id` | UUID | ✅ | `uuid()` | `UUID NOT NULL` | "ID de cotización inválido" |
| `item_type` | enum | ✅ | `enum(['service', 'product'])` | `VARCHAR(20)` | "El tipo de ítem debe ser service o product" |
| `description` | string | ✅ | `min(1)` | `TEXT NOT NULL` | "La descripción es requerida" |
| `quantity` | number | ✅ | `min(0.01)`, `int()` | `INTEGER NOT NULL` | "La cantidad debe ser mayor a 0" |
| `unit_price` | number | ✅ | `min(0.01)` | `DECIMAL(10,2) NOT NULL` | "El precio unitario debe ser mayor a 0" |
| `discount_percent` | number | ❌ | `min(0)`, `max(100)` | `DECIMAL(5,2) DEFAULT 0` | "El descuento debe estar entre 0 y 100%" |
| `discount_amount` | number | ❌ | - | `DECIMAL(10,2)` | - (calculado por trigger) |
| `tax_percent` | number | ❌ | `min(0)`, `max(100)` | `DECIMAL(5,2) DEFAULT 16` | "El impuesto debe estar entre 0 y 100%" |
| `tax_amount` | number | ❌ | - | `DECIMAL(10,2)` | - (calculado por trigger) |
| `subtotal` | number | ❌ | - | `DECIMAL(10,2)` | - (calculado por trigger: `quantity * unit_price`) |
| `total` | number | ❌ | - | `DECIMAL(10,2)` | - (calculado por trigger: `subtotal - discount + tax`) |
| `service_id` | UUID | ❌ | `uuid()` | `UUID` | "ID de servicio inválido" |
| `inventory_id` | UUID | ❌ | `uuid()` | `UUID` | "ID de inventario inválido" |
| `organization_id` | UUID | ✅ | `uuid()` | `UUID NOT NULL` | "ID de organización inválido" (auto-asignado por trigger) |

**Notas**:
- Los campos `subtotal`, `discount_amount`, `tax_amount`, `total` se calculan automáticamente por trigger `trg_quotation_items_totals`
- `organization_id` se asigna automáticamente por trigger `trg_quotation_items_org`

---

## VALIDACIONES - MÓDULO INVENTARIO

| Campo | Tipo | Requerido | Validación Frontend (Zod) | Validación BD | Mensaje de Error |
|-------|------|-----------|---------------------------|---------------|------------------|
| `category_id` | UUID | ✅ | `uuid()` | `UUID NOT NULL` | "ID de categoría inválido" |
| `name` | string | ✅ | `min(2)`, `max(100)` | `VARCHAR(255) NOT NULL` | "El nombre debe tener al menos 2 caracteres" / "El nombre no puede exceder 100 caracteres" |
| `description` | string | ❌ | `max(500)` | `TEXT` | "La descripción no puede exceder 500 caracteres" |
| `sku` | string | ❌ | `regex(/^[A-Z0-9-]+$/)`, `max(50)` | `VARCHAR(50) UNIQUE` | "SKU inválido" (solo mayúsculas, números y guiones) |
| `quantity` | number | ✅ | `int()`, `min(0)`, `max(999999)` | `INTEGER NOT NULL` | "La cantidad no puede ser negativa" / "La cantidad no puede exceder 999,999" |
| `minimum_stock` | number | ❌ | `int()`, `min(0)`, `max(999999)` | `INTEGER` | "El stock mínimo no puede ser negativo" / "El stock mínimo no puede exceder 999,999" |
| `unit_price` | number | ✅ | `min(0)`, `max(999999.99)` | `DECIMAL(10,2) NOT NULL` | "El precio no puede ser negativo" / "El precio no puede exceder 999,999.99" |
| `organization_id` | UUID | ✅ | `uuid()` | `UUID NOT NULL` | "ID de organización inválido" |

**Notas**:
- `sku` debe ser único por organización
- `sku` solo acepta mayúsculas, números y guiones

---

## VALIDACIONES - MÓDULO FACTURAS

| Campo | Tipo | Requerido | Validación Frontend (Zod) | Validación BD | Mensaje de Error |
|-------|------|-----------|---------------------------|---------------|------------------|
| `customer_id` | UUID | ✅ | `uuid()` | `UUID NOT NULL` | "ID de cliente inválido" |
| `invoice_number` | string | ❌ | - | `VARCHAR(50) UNIQUE NOT NULL` | - (generado automáticamente por trigger: `FAC-YYYYMM-0001`) |
| `status` | enum | ❌ | `enum(['draft', 'sent', 'paid', 'overdue', 'cancelled'])` | `VARCHAR(50) DEFAULT 'draft'` | "Estado inválido" |
| `issue_date` | date | ✅ | `datetime()` | `DATE NOT NULL` | "Fecha de emisión inválida" |
| `due_date` | date | ✅ | `datetime()` | `DATE NOT NULL` | "Fecha de vencimiento inválida" |
| `paid_date` | date | ❌ | `datetime()` | `DATE` | "Fecha de pago inválida" |
| `subtotal` | number | ✅ | `min(0)`, `max(999999.99)` | `DECIMAL(10,2) DEFAULT 0` | "El subtotal no puede ser negativo" / "El subtotal no puede exceder 999,999.99" |
| `tax_amount` | number | ✅ | `min(0)`, `max(999999.99)` | `DECIMAL(10,2) DEFAULT 0` | "El monto de impuestos no puede ser negativo" / "El monto de impuestos no puede exceder 999,999.99" |
| `total_amount` | number | ✅ | `min(0)`, `max(999999.99)` | `DECIMAL(10,2) DEFAULT 0` | "El total no puede ser negativo" / "El total no puede exceder 999,999.99" |
| `paid_amount` | number | ❌ | `min(0)`, `max(999999.99)` | `DECIMAL(10,2) DEFAULT 0` | "El monto pagado no puede ser negativo" / "El monto pagado no puede exceder 999,999.99" |
| `balance` | number | ❌ | `min(0)`, `max(999999.99)` | `DECIMAL(10,2)` | "El saldo no puede ser negativo" / "El saldo no puede exceder 999,999.99" |
| `notes` | string | ❌ | `max(1000)` | `TEXT` | "Las notas no pueden exceder 1000 caracteres" |
| `organization_id` | UUID | ✅ | `uuid()` | `UUID NOT NULL` | "ID de organización inválido" |

**Notas**:
- `invoice_number` se genera automáticamente por trigger: `FAC-YYYYMM-0001`
- `balance` = `total_amount - paid_amount`

---

## VALIDACIONES - MÓDULO PAGOS

| Campo | Tipo | Requerido | Validación Frontend (Zod) | Validación BD | Mensaje de Error |
|-------|------|-----------|---------------------------|---------------|------------------|
| `invoice_id` | UUID | ✅ | `uuid()` | `UUID NOT NULL` | "ID de factura inválido" |
| `amount` | number | ✅ | `min(0.01)`, `max(999999.99)` | `DECIMAL(10,2) NOT NULL` | "El monto debe ser mayor a 0" / "El monto no puede exceder 999,999.99" |
| `payment_method` | enum | ✅ | `enum(['cash', 'card', 'transfer', 'check'])` | `VARCHAR(20)` | "El método de pago debe ser cash, card, transfer o check" |
| `payment_date` | datetime | ✅ | `datetime()` | `TIMESTAMP NOT NULL` | "Fecha de pago inválida" |
| `reference` | string | ❌ | `max(100)` | `VARCHAR(100)` | "La referencia no puede exceder 100 caracteres" |
| `notes` | string | ❌ | `max(500)` | `TEXT` | "Las notas no pueden exceder 500 caracteres" |
| `organization_id` | UUID | ✅ | `uuid()` | `UUID NOT NULL` | "ID de organización inválido" |

**Notas**:
- `amount` debe ser al menos 0.01 (no puede ser 0)

---

## VALIDACIONES - MÓDULO USUARIOS

| Campo | Tipo | Requerido | Validación Frontend (Zod) | Validación BD | Mensaje de Error |
|-------|------|-----------|---------------------------|---------------|------------------|
| `email` | string | ✅ | `email()` | `VARCHAR(255) UNIQUE NOT NULL` | "Email inválido" |
| `first_name` | string | ✅ | `min(2)`, `max(50)` | `VARCHAR(100)` | "El nombre debe tener al menos 2 caracteres" / "El nombre no puede exceder 50 caracteres" |
| `last_name` | string | ✅ | `min(2)`, `max(50)` | `VARCHAR(100)` | "El apellido debe tener al menos 2 caracteres" / "El apellido no puede exceder 50 caracteres" |
| `phone` | string | ❌ | `regex(/^[\+]?[1-9][\d]{0,15}$/)` | `VARCHAR(50)` | "Teléfono inválido" |
| `employee_number` | string | ❌ | `max(20)` | `VARCHAR(20)` | "El número de empleado no puede exceder 20 caracteres" |
| `position` | string | ❌ | `max(100)` | `VARCHAR(100)` | "El puesto no puede exceder 100 caracteres" |
| `department` | string | ❌ | `max(100)` | `VARCHAR(100)` | "El departamento no puede exceder 100 caracteres" |
| `hire_date` | datetime | ❌ | `datetime()` | `DATE` | "Fecha de contratación inválida" |
| `avatar_url` | string | ❌ | `url()` | `TEXT` | "URL de avatar inválida" |
| `role` | enum | ❌ | - | `VARCHAR(50) DEFAULT 'user'` | - |
| `is_active` | boolean | ❌ | `boolean()` | `BOOLEAN DEFAULT true` | - |
| `is_verified` | boolean | ❌ | `boolean()` | `BOOLEAN DEFAULT false` | - |

**Notas**:
- `email` debe ser único en el sistema
- `email` se usa para autenticación

---

## VALIDACIONES - MÓDULO AUTENTICACIÓN

| Campo | Tipo | Requerido | Validación Frontend (Zod) | Validación BD | Mensaje de Error |
|-------|------|-----------|---------------------------|---------------|------------------|
| `email` | string | ✅ | `email()` | `VARCHAR(255) UNIQUE NOT NULL` | "Email inválido" |
| `password` | string | ✅ | `min(8)`, `max(128)` | `TEXT` (hash) | "La contraseña debe tener al menos 8 caracteres" / "La contraseña no puede exceder 128 caracteres" |
| `first_name` | string | ✅ (registro) | `min(2)`, `max(50)` | - | "El nombre debe tener al menos 2 caracteres" / "El nombre no puede exceder 50 caracteres" |
| `last_name` | string | ✅ (registro) | `min(2)`, `max(50)` | - | "El apellido debe tener al menos 2 caracteres" / "El apellido no puede exceder 50 caracteres" |

**Notas**:
- `password` se almacena como hash (no se valida formato en BD)
- Mínimo 8 caracteres para seguridad

---

## VALIDACIONES - MÓDULO CONFIGURACIÓN DEL SISTEMA

| Campo | Tipo | Requerido | Validación Frontend (Zod) | Validación BD | Mensaje de Error |
|-------|------|-----------|---------------------------|---------------|------------------|
| `business_name` | string | ✅ | `min(2)`, `max(100)` | `VARCHAR(255)` | "El nombre del negocio debe tener al menos 2 caracteres" / "El nombre del negocio no puede exceder 100 caracteres" |
| `business_email` | string | ✅ | `email()` | `VARCHAR(255)` | "Email del negocio inválido" |
| `business_phone` | string | ✅ | `regex(/^[\+]?[1-9][\d]{0,15}$/)` | `VARCHAR(50)` | "Teléfono del negocio inválido" |
| `business_address` | string | ✅ | `max(200)` | `TEXT` | "La dirección no puede exceder 200 caracteres" |
| `business_city` | string | ✅ | `max(50)` | `VARCHAR(100)` | "La ciudad no puede exceder 50 caracteres" |
| `business_state` | string | ✅ | `max(50)` | `VARCHAR(100)` | "El estado no puede exceder 50 caracteres" |
| `business_zip` | string | ✅ | `max(10)` | `VARCHAR(20)` | "El código postal no puede exceder 10 caracteres" |
| `business_country` | string | ✅ | `max(50)` | `VARCHAR(100)` | "El país no puede exceder 50 caracteres" |
| `tax_id` | string | ❌ | `max(20)` | `VARCHAR(50)` | "El ID fiscal no puede exceder 20 caracteres" |
| `currency` | string | ✅ | `length(3)` | `VARCHAR(3) DEFAULT 'USD'` | "La moneda debe tener 3 caracteres" (ej: USD, MXN) |
| `timezone` | string | ✅ | `max(50)` | `VARCHAR(50) DEFAULT 'UTC'` | "La zona horaria no puede exceder 50 caracteres" |
| `language` | string | ✅ | `length(2)` | `VARCHAR(5) DEFAULT 'en'` | "El idioma debe tener 2 caracteres" (ej: es, en) |
| `logo_url` | string | ❌ | `url()` | `TEXT` | "URL del logo inválida" |

**Notas**:
- `currency` debe ser código ISO de 3 letras (USD, MXN, EUR, etc.)
- `language` debe ser código ISO de 2 letras (es, en, fr, etc.)

---

## VALIDACIONES - MÓDULO GARANTÍAS

| Campo | Tipo | Requerido | Validación Frontend (Zod) | Validación BD | Mensaje de Error |
|-------|------|-----------|---------------------------|---------------|------------------|
| `work_order_id` | UUID | ✅ | `uuid()` | `UUID NOT NULL` | "ID de orden inválido" |
| `customer_id` | UUID | ✅ | `uuid()` | `UUID NOT NULL` | "ID de cliente inválido" |
| `vehicle_id` | UUID | ✅ | `uuid()` | `UUID NOT NULL` | "ID de vehículo inválido" |
| `item_type` | enum | ✅ | `enum(['service', 'part'])` | `VARCHAR(20)` | "El tipo de ítem debe ser service o part" |
| `item_description` | string | ✅ | `min(10)`, `max(500)` | `TEXT NOT NULL` | "La descripción debe tener al menos 10 caracteres" / "La descripción no puede exceder 500 caracteres" |
| `start_date` | datetime | ✅ | `datetime()` | `DATE NOT NULL` | "Fecha de inicio inválida" |
| `end_date` | datetime | ✅ | `datetime()` | `DATE NOT NULL` | "Fecha de fin inválida" |
| `terms` | string | ✅ | `min(10)`, `max(1000)` | `TEXT NOT NULL` | "Los términos deben tener al menos 10 caracteres" / "Los términos no pueden exceder 1000 caracteres" |
| `conditions` | string | ✅ | `min(10)`, `max(1000)` | `TEXT NOT NULL` | "Las condiciones deben tener al menos 10 caracteres" / "Las condiciones no pueden exceder 1000 caracteres" |
| `coverage_details` | string | ✅ | `min(10)`, `max(1000)` | `TEXT NOT NULL` | "Los detalles de cobertura deben tener al menos 10 caracteres" / "Los detalles de cobertura no pueden exceder 1000 caracteres" |
| `original_amount` | number | ✅ | `min(0)`, `max(999999.99)` | `DECIMAL(10,2) NOT NULL` | "El monto original no puede ser negativo" / "El monto original no puede exceder 999,999.99" |
| `status` | enum | ❌ | `enum(['active', 'expired', 'claimed', 'void'])` | `VARCHAR(20)` | "Estado inválido" |

**Notas**:
- `end_date` debe ser posterior a `start_date`
- Los campos de texto deben tener al menos 10 caracteres para ser descriptivos

---

## VALIDACIONES - MÓDULO ROLES

| Campo | Tipo | Requerido | Validación Frontend (Zod) | Validación BD | Mensaje de Error |
|-------|------|-----------|---------------------------|---------------|------------------|
| `role_name` | string | ✅ | `min(2)`, `max(50)` | `VARCHAR(50) NOT NULL` | "El nombre del rol debe tener al menos 2 caracteres" / "El nombre del rol no puede exceder 50 caracteres" |
| `role_code` | string | ✅ | `min(2)`, `max(20)` | `VARCHAR(20) UNIQUE` | "El código del rol debe tener al menos 2 caracteres" / "El código del rol no puede exceder 20 caracteres" |
| `description` | string | ❌ | `max(200)` | `TEXT` | "La descripción no puede exceder 200 caracteres" |
| `access_level` | number | ✅ | `int()`, `min(1)`, `max(6)` | `INTEGER NOT NULL` | "El nivel de acceso debe ser al menos 1" / "El nivel de acceso no puede exceder 6" |
| `is_system_role` | boolean | ❌ | `boolean()` | `BOOLEAN DEFAULT false` | - |
| `is_active` | boolean | ❌ | `boolean()` | `BOOLEAN DEFAULT true` | - |

**Notas**:
- `role_code` debe ser único
- `access_level` va de 1 (más bajo) a 6 (más alto)

---

## VALIDACIONES - MÓDULO PAGINACIÓN Y FILTROS

| Campo | Tipo | Requerido | Validación Frontend (Zod) | Validación BD | Mensaje de Error |
|-------|------|-----------|---------------------------|---------------|------------------|
| `page` | number | ❌ | `int()`, `min(1)`, `max(1000)` | - | "La página debe ser al menos 1" / "La página no puede exceder 1000" |
| `limit` | number | ❌ | `int()`, `min(1)`, `max(100)` | - | "El límite debe ser al menos 1" / "El límite no puede exceder 100" |
| `search` | string | ❌ | `max(100)` | - | "La búsqueda no puede exceder 100 caracteres" |
| `sort_by` | string | ❌ | `max(50)` | - | "El campo de ordenamiento no puede exceder 50 caracteres" |
| `sort_order` | enum | ❌ | `enum(['asc', 'desc'])` | - | "El orden debe ser asc o desc" |
| `status` | string | ❌ | `max(50)` | - | "El estado no puede exceder 50 caracteres" |
| `category` | UUID | ❌ | `uuid()` | - | "ID de categoría inválido" |
| `date_from` | datetime | ❌ | `datetime()` | - | "Fecha de inicio inválida" |
| `date_to` | datetime | ❌ | `datetime()` | - | "Fecha de fin inválida" |
| `customer_id` | UUID | ❌ | `uuid()` | - | "ID de cliente inválido" |
| `vehicle_id` | UUID | ❌ | `uuid()` | - | "ID de vehículo inválido" |

**Notas**:
- `limit` máximo es 100 para evitar sobrecarga
- `page` máximo es 1000 para evitar consultas muy grandes

---

## PATRONES REGEX UTILIZADOS

| Patrón | Descripción | Ejemplo |
|--------|-------------|---------|
| `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | Email válido | `usuario@dominio.com` |
| `/^[\+]?[1-9][\d]{0,15}$/` | Teléfono internacional | `+521234567890`, `1234567890` |
| `/^[A-HJ-NPR-Z0-9]{17}$/` | VIN (Vehicle Identification Number) | `1HGBH41JXMN109186` (excluye I, O, Q) |
| `/^[A-Z0-9-]+$/` | SKU (solo mayúsculas, números y guiones) | `PROD-001`, `ABC123` |
| `/^\d+$/` | Solo números | `123456` |
| `/^[\p{L}\s'-]+$/u` | Solo letras, espacios, guiones y apóstrofes (Unicode) | `José María`, `O'Brien` |

---

## CONSTANTES DE VALIDACIÓN

Definidas en `src/lib/constants/index.ts`:

```typescript
export const VALIDATION_CONSTANTS = {
  // Longitudes
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MIN_DESCRIPTION_LENGTH: 10,
  MAX_DESCRIPTION_LENGTH: 500,
  
  // Patrones
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_PATTERN: /^[\+]?[1-9][\d]{0,15}$/,
  VIN_PATTERN: /^[A-HJ-NPR-Z0-9]{17}$/,
  SKU_PATTERN: /^[A-Z0-9-]+$/,
  
  // Rangos
  MIN_YEAR: 1900,
  MAX_YEAR: new Date().getFullYear() + 1,
  MIN_MILEAGE: 0,
  MAX_MILEAGE: 999999,
  MIN_PRICE: 0,
  MAX_PRICE: 999999.99
} as const;
```

---

## VALIDACIONES EN COMPONENTES DE FORMULARIO

### CreateWorkOrderModal

Validaciones adicionales en tiempo real:

| Campo | Validación Específica | Mensaje |
|-------|----------------------|---------|
| `customerName` | `min(3)`, solo letras | "Mínimo 3 caracteres" / "Solo letras permitidas" |
| `customerPhone` | `length(10)`, solo números | "Debe tener 10 dígitos" / "Solo números permitidos" |
| `customerEmail` | formato email | "Email inválido" |
| `vehicleYear` | `1900` a `año_actual + 1` | "Año debe estar entre 1900 y [año]" |
| `vehiclePlate` | `min(5)` | "Placa muy corta" |
| `vehicleMileage` | solo números | "Solo números permitidos" |
| `description` | `min(10)` | "La descripción es requerida" / "Mínimo 10 caracteres" |

---

## QUERIES DE VERIFICACIÓN EN BD

### Ver estructura de columnas

```sql
SELECT 
  table_name,
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('customers', 'vehicles', 'work_orders', 'quotations', 'quotation_items', 'products', 'invoices', 'payments', 'users')
ORDER BY table_name, ordinal_position;
```

### Ver CHECK constraints

```sql
SELECT 
  tc.table_name,
  cc.check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.table_constraints tc
  ON cc.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name;
```

---

## NOTAS IMPORTANTES

1. **Validaciones en cascada**: Frontend → API → Base de Datos
2. **Mensajes de error**: Deben ser claros y específicos
3. **Validación en tiempo real**: Algunos formularios validan mientras el usuario escribe
4. **Triggers de BD**: Algunos campos se calculan automáticamente (ver PARTE 6.5)
5. **UUIDs**: Todos los IDs de relación deben ser UUIDs válidos
6. **Multi-tenancy**: Todos los registros requieren `organization_id` válido

---

**Última actualización**: Diciembre 2024

