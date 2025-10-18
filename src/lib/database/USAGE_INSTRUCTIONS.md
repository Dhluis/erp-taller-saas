# 📋 INSTRUCCIONES DE USO - SCHEMA.json

## 🎯 Propósito Principal

**SIEMPRE consulta `SCHEMA.json` antes de escribir cualquier query o manipular datos de la base de datos.**

## 🚀 Uso Inmediato

### 1. **Verificar campos antes de usarlos:**
```typescript
import schema from '@/lib/database/SCHEMA.json';

// ✅ CORRECTO - Verificar que el campo existe
if (schema.tables.vehicles.columns.brand) {
  const query = 'SELECT brand FROM vehicles';
}

// ❌ INCORRECTO - Asumir nombres de campos
const query = 'SELECT make FROM vehicles'; // 'make' no existe
```

### 2. **Validar tipos de datos:**
```typescript
// Verificar tipo de campo
const statusField = schema.tables.work_orders.columns.status;
console.log(`Tipo: ${statusField.type}`); // "text"
console.log(`Valores válidos: ${statusField.values}`); // ["pending", "in_progress", ...]
```

### 3. **Verificar foreign keys:**
```typescript
// Verificar relaciones
const customerFKs = schema.tables.customers.foreign_keys;
// [{ "column": "organization_id", "references": "organizations.id" }]
```

## ❌ Errores Críticos a Evitar

### 1. **Usar 'make' en lugar de 'brand'**
```sql
-- ❌ INCORRECTO
SELECT make FROM vehicles;

-- ✅ CORRECTO
SELECT brand FROM vehicles;
```

### 2. **Usar strings como IDs**
```typescript
// ❌ INCORRECTO
const orderId = 'WO001';

// ✅ CORRECTO
const orderId = '123e4567-e89b-12d3-a456-426614174000';
```

### 3. **Usar campos deprecated**
```sql
-- ❌ INCORRECTO
SELECT quantity FROM inventory;

-- ✅ CORRECTO
SELECT current_stock FROM inventory;
```

### 4. **Olvidar organization_id**
```sql
-- ❌ INCORRECTO (falta multi-tenancy)
SELECT * FROM customers;

-- ✅ CORRECTO
SELECT * FROM customers WHERE organization_id = $1;
```

## 🔍 Casos de Uso Específicos

### **Crear Work Order:**
```typescript
// Verificar campos requeridos
const workOrderFields = schema.tables.work_orders.columns;
const requiredFields = ['organization_id', 'customer_id', 'vehicle_id'];

// Validar que todos los campos requeridos estén presentes
const isValid = requiredFields.every(field => 
  workOrderFields[field] && !workOrderFields[field].nullable
);
```

### **Consultar Vehicles:**
```typescript
// Usar campos correctos
const vehicleQuery = `
  SELECT 
    id,
    customer_id,
    brand,  -- NO 'make'
    model,
    year,
    license_plate
  FROM vehicles 
  WHERE organization_id = $1
`;
```

### **Gestionar Inventory:**
```typescript
// Usar campos actualizados
const inventoryQuery = `
  SELECT 
    id,
    name,
    current_stock,  -- NO 'quantity'
    min_stock,      -- NO 'min_quantity'
    category_id     -- NO 'category' (texto)
  FROM inventory
`;
```

### **Filtrar System Users:**
```typescript
// Usar campo correcto para estado
const usersQuery = `
  SELECT 
    id,
    email,
    first_name,
    last_name,
    is_active  -- NO 'status'
  FROM system_users 
  WHERE is_active = true
`;
```

## 📊 Validación Automática

### **Script de Validación:**
```bash
# Ejecutar para validar el esquema
node scripts/validate-schema.js
```

### **Resultado Esperado:**
```
✅ SCHEMA.JSON VÁLIDO - Sin errores ni advertencias
📈 ESTADÍSTICAS:
   Total de tablas: 12
   Total de campos: 159
   Total de foreign keys: 22
```

## 🔄 Flujo de Trabajo Recomendado

### **1. Antes de escribir código:**
```typescript
// 1. Importar el esquema
import schema from '@/lib/database/SCHEMA.json';

// 2. Verificar que la tabla existe
if (!schema.tables.my_table) {
  throw new Error('Tabla no encontrada en el esquema');
}

// 3. Verificar campos específicos
const tableColumns = schema.tables.my_table.columns;
if (!tableColumns.my_field) {
  throw new Error('Campo no encontrado en el esquema');
}
```

### **2. Durante el desarrollo:**
```typescript
// Validar tipos de datos
const fieldType = tableColumns.my_field.type;
if (fieldType !== 'uuid' && typeof myValue !== 'string') {
  throw new Error('Tipo de dato incorrecto');
}

// Validar valores permitidos
if (tableColumns.status.values && !tableColumns.status.values.includes(myStatus)) {
  throw new Error('Valor de estado no válido');
}
```

### **3. Antes de desplegar:**
```bash
# Ejecutar validación completa
node scripts/validate-schema.js

# Verificar que no hay errores
if [ $? -ne 0 ]; then
  echo "❌ Schema inválido - No desplegar"
  exit 1
fi
```

## 📝 Mantenimiento

### **Actualizar cuando cambie la BD:**
1. **Modificar SCHEMA.json** con los nuevos campos
2. **Ejecutar validador** para verificar estructura
3. **Actualizar código** que use campos modificados
4. **Documentar cambios** en el equipo

### **Versionado:**
- **Incrementar versión** en `_meta.version`
- **Actualizar fecha** en `_meta.last_updated`
- **Documentar cambios** en `_meta.changelog`

## 🚨 Alertas Importantes

### **Campos Críticos:**
- **vehicles.brand** (NO make)
- **work_orders.id** (UUID, NO order_number)
- **system_users.is_active** (NO status)
- **inventory.current_stock** (NO quantity)

### **Multi-tenancy Obligatorio:**
- **Todas las consultas** deben filtrar por `organization_id`
- **No olvidar** este campo en INSERT/UPDATE
- **Verificar permisos** antes de operaciones

### **Foreign Keys:**
- **Verificar relaciones** antes de usar
- **No asumir nombres** de tablas referenciadas
- **Validar integridad** referencial

## 📞 Soporte

- **Para dudas:** Consultar SCHEMA.json primero
- **Para cambios:** Actualizar esquema y validar
- **Para errores:** Revisar common_errors en el archivo

---

**🎯 Recuerda: Este archivo es tu fuente de verdad para el esquema de la base de datos. Úsalo siempre.**
