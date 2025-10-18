# 📊 DOCUMENTACIÓN DE BASE DE DATOS

Este directorio contiene toda la documentación y herramientas para mantener el esquema de la base de datos actualizado.

## 📁 Archivos Incluidos

### 📄 `SCHEMA.md`
Documentación completa del esquema de la base de datos con todas las tablas, columnas, tipos de datos, relaciones e índices.

### 🔍 `get-schema.sql`
Consultas SQL para obtener el esquema real de Supabase. Ejecutar en Supabase SQL Editor.

### ✅ `schema-validator.ts`
Validador de esquema que compara la documentación con la base de datos real.

## 🚀 Instrucciones de Uso

### PASO 1: Obtener Esquema Real

1. **Abrir Supabase SQL Editor**
2. **Ejecutar consultas de `get-schema.sql`:**

```sql
-- Consulta principal
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

3. **Copiar resultados** y actualizar `SCHEMA.md`

### PASO 2: Validar Esquema

1. **Ejecutar funciones RPC en Supabase:**
```sql
-- Función para obtener columnas
CREATE OR REPLACE FUNCTION get_columns_info()
RETURNS TABLE (
  table_name text,
  column_name text,
  data_type text,
  is_nullable text,
  column_default text
) AS $$
-- ... código de la función
```

2. **Usar validador en código:**
```typescript
import { SchemaValidator } from '@/lib/database/schema-validator';

const validator = new SchemaValidator();
const report = await validator.generateReport();
console.log(report);
```

### PASO 3: Actualizar Documentación

1. **Comparar esquema real con documentación**
2. **Actualizar `SCHEMA.md` con cambios**
3. **Verificar relaciones y índices**
4. **Actualizar fecha de última modificación**

## 📋 Checklist de Validación

### ✅ Tablas Esenciales
- [ ] `work_orders` - Órdenes de trabajo
- [ ] `customers` - Clientes
- [ ] `vehicles` - Vehículos
- [ ] `organizations` - Organizaciones
- [ ] `user_profiles` - Perfiles de usuario
- [ ] `inventory_items` - Productos de inventario
- [ ] `invoices` - Facturas
- [ ] `payments` - Pagos
- [ ] `quotations` - Cotizaciones
- [ ] `notifications` - Notificaciones
- [ ] `suppliers` - Proveedores
- [ ] `purchase_orders` - Órdenes de compra

### ✅ Columnas Esenciales
- [ ] `id` (UUID) en todas las tablas
- [ ] `organization_id` (UUID) para multi-tenancy
- [ ] `created_at` y `updated_at` timestamps
- [ ] Foreign keys correctas

### ✅ Relaciones
- [ ] `customers.organization_id → organizations.id`
- [ ] `vehicles.customer_id → customers.id`
- [ ] `work_orders.customer_id → customers.id`
- [ ] `work_orders.vehicle_id → vehicles.id`
- [ ] `invoices.customer_id → customers.id`
- [ ] `payments.invoice_id → invoices.id`

### ✅ Índices
- [ ] Primary keys en todas las tablas
- [ ] Índices en `organization_id`
- [ ] Índices en foreign keys
- [ ] Índices en campos de búsqueda frecuente

## 🔧 Herramientas de Desarrollo

### 📊 Generar Reporte de Validación
```typescript
import { SchemaValidator } from '@/lib/database/schema-validator';

const validator = new SchemaValidator();
const validation = await validator.validateSchema();

if (!validation.isValid) {
  console.error('❌ Esquema inválido:', validation.errors);
} else {
  console.log('✅ Esquema válido');
}

// Generar reporte completo
const report = await validator.generateReport();
console.log(report);
```

### 🔍 Verificar Tabla Específica
```typescript
const columns = await validator.getColumns();
const workOrdersColumns = columns.filter(col => col.table_name === 'work_orders');
console.log('Work Orders columns:', workOrdersColumns);
```

## 📝 Convenciones de Documentación

### 🏷️ Formato de Tablas
```markdown
### 🔧 Tabla: work_orders
| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| order_number | text | SÍ | NULL | Número legible |
```

### 🔗 Formato de Relaciones
```markdown
**Relaciones:**
- customer_id → customers.id
- vehicle_id → vehicles.id
- organization_id → organizations.id
```

### 📊 Formato de Índices
```markdown
**Índices:**
- PRIMARY KEY (id)
- INDEX (organization_id)
- INDEX (customer_id)
```

## ⚠️ Consideraciones Importantes

### 🔒 Seguridad
- Todas las consultas deben filtrar por `organization_id`
- Usar RLS (Row Level Security) en Supabase
- Validar permisos de usuario antes de operaciones

### 🚀 Performance
- Crear índices en campos de búsqueda frecuente
- Optimizar consultas con JOINs
- Monitorear tamaño de tablas

### 🔄 Mantenimiento
- Actualizar documentación cuando se modifique el esquema
- Ejecutar validación periódicamente
- Revisar foreign keys y relaciones

## 📞 Soporte

Para actualizaciones o correcciones del esquema:
1. **Crear issue** con detalles del cambio
2. **Actualizar documentación** correspondiente
3. **Ejecutar validación** para verificar cambios
4. **Actualizar fecha** de última modificación

---

**Última actualización:** $(date)
**Versión del esquema:** 1.0.0
