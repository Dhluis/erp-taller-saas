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

**Última actualización**: Diciembre 2024

