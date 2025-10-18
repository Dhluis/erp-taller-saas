# 📚 Sistema de Versionado y Tracking de Cotizaciones

## 🎯 **RESUMEN**

Sistema completo de auditoría y versionado para cotizaciones que registra cada cambio, guarda versiones históricas y permite trazabilidad completa de todas las operaciones.

## 🏗️ **ARQUITECTURA**

### **Tablas Implementadas:**

#### **1. `quotation_versions`**
Almacena snapshots completos de cada versión de una cotización.

```sql
CREATE TABLE quotation_versions (
    id UUID PRIMARY KEY,
    quotation_id UUID REFERENCES quotations(id),
    version_number INTEGER,
    data JSONB,              -- Snapshot completo
    created_at TIMESTAMPTZ,
    created_by UUID
);
```

#### **2. `quotation_tracking`**
Registra todas las acciones realizadas en cotizaciones.

```sql
CREATE TABLE quotation_tracking (
    id UUID PRIMARY KEY,
    quotation_id UUID REFERENCES quotations(id),
    action VARCHAR(50),      -- Tipo de acción
    details JSONB,           -- Detalles específicos
    user_id UUID,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ
);
```

#### **3. Campos Agregados a `quotations`**
```sql
ALTER TABLE quotations ADD COLUMN:
- version INTEGER DEFAULT 1
- cancelled_at TIMESTAMPTZ
- converted_at TIMESTAMPTZ
- vehicle_id UUID (si no existía)
```

---

## 🔄 **FLUJO DE VERSIONADO**

### **1. Al Actualizar Cotización:**

```typescript
// Automático en updateQuotation()
1. Guardar snapshot de versión actual
2. Incrementar número de versión
3. Actualizar datos
4. Registrar cambio en tracking
```

### **2. Al Cancelar Cotización:**

```typescript
// Automático en deleteQuotation()
1. Guardar snapshot antes de cancelar
2. Cambiar status a 'cancelled'
3. Registrar fecha de cancelación
4. Registrar en tracking con razón
```

---

## 📊 **TIPOS DE ACCIONES RASTREADAS**

### **Acciones del Sistema:**
- `created` - Cotización creada
- `updated` - Cotización actualizada
- `cancelled` - Cotización cancelada
- `converted` - Convertida a orden de trabajo
- `duplicated` - Cotización duplicada
- `status_changed` - Cambio de estado
- `sent` - Enviada al cliente
- `approved` - Aprobada por cliente
- `rejected` - Rechazada por cliente
- `item_added` - Item agregado
- `item_updated` - Item actualizado
- `item_deleted` - Item eliminado

---

## 🔧 **FUNCIONES IMPLEMENTADAS**

### **`saveQuotationVersion(quotationId, quotationData)`**

Guarda un snapshot de la cotización actual.

```typescript
await saveQuotationVersion(quotationId, currentQuotation)

// Crea registro en quotation_versions:
{
  quotation_id: "uuid",
  version_number: 2,
  data: {
    description: "...",
    notes: "...",
    subtotal: 1000.00,
    tax_amount: 160.00,
    total_amount: 1160.00
  }
}
```

### **`trackQuotationChange(quotationId, action, details)`**

Registra una acción en el tracking.

```typescript
await trackQuotationChange(quotationId, 'updated', {
  changes: ['description', 'notes'],
  new_values: { description: 'Nueva descripción' }
})

// Crea registro en quotation_tracking:
{
  quotation_id: "uuid",
  action: "updated",
  details: {
    changes: ['description', 'notes'],
    new_values: { ... }
  },
  created_at: "2024-01-01T12:00:00Z"
}
```

### **`updateQuotation(id, data, saveVersion)`**

Actualiza cotización con versionado automático.

```typescript
// saveVersion = true (por defecto)
await updateQuotation(quotationId, {
  description: 'Nueva descripción',
  notes: 'Actualización importante'
}, true)

// Ejecuta automáticamente:
// 1. saveQuotationVersion()
// 2. UPDATE quotations SET version = version + 1
// 3. trackQuotationChange('updated')
```

### **`deleteQuotation(id)`**

Cancela cotización (soft delete) con versionado.

```typescript
await deleteQuotation(quotationId)

// Ejecuta automáticamente:
// 1. saveQuotationVersion()
// 2. UPDATE status = 'cancelled', cancelled_at = NOW()
// 3. trackQuotationChange('cancelled')
```

---

## 💡 **EJEMPLOS DE USO**

### **Ejemplo 1: Actualizar Cotización**

```typescript
// GET - Obtener cotización actual
const response1 = await fetch('/api/quotations/123')
const { data: quotation } = await response1.json()

// PUT - Actualizar (guarda versión automáticamente)
const response2 = await fetch('/api/quotations/123', {
  method: 'PUT',
  body: JSON.stringify({
    description: 'Descripción actualizada',
    notes: 'Cambio importante',
    status: 'sent'
  })
})

// Resultado:
// - Version actual guardada en quotation_versions
// - version incrementada de 1 a 2
// - Registro en quotation_tracking con action='updated'
```

### **Ejemplo 2: Ver Historial de Versiones**

```sql
-- Obtener todas las versiones de una cotización
SELECT 
  version_number,
  data->>'description' as description,
  data->>'status' as status,
  data->>'total_amount' as total,
  created_at
FROM quotation_versions
WHERE quotation_id = 'uuid-123'
ORDER BY version_number DESC;

-- Resultado:
version | description           | status | total    | created_at
--------|----------------------|--------|----------|--------------------
3       | Versión actualizada  | sent   | 1160.00  | 2024-01-15 14:30
2       | Segunda versión      | draft  | 1000.00  | 2024-01-10 10:00
1       | Versión inicial      | draft  | 800.00   | 2024-01-01 09:00
```

### **Ejemplo 3: Ver Tracking Completo**

```sql
-- Ver todas las acciones en una cotización
SELECT 
  action,
  details,
  created_at
FROM quotation_tracking
WHERE quotation_id = 'uuid-123'
ORDER BY created_at DESC;

-- Resultado:
action          | details                              | created_at
----------------|--------------------------------------|--------------------
updated         | {"changes": ["description"]}         | 2024-01-15 14:30
status_changed  | {"old": "draft", "new": "sent"}      | 2024-01-10 10:00
item_added      | {"item_id": "uuid-456"}              | 2024-01-05 11:00
created         | {"customer_id": "uuid-789"}          | 2024-01-01 09:00
```

### **Ejemplo 4: Cancelar Cotización**

```typescript
// DELETE - Cancelar cotización
const response = await fetch('/api/quotations/123', {
  method: 'DELETE'
})
const { data } = await response.json()

console.log(data)
// {
//   success: true,
//   message: 'Cotización cancelada exitosamente',
//   quotation: {
//     id: "uuid-123",
//     quotation_number: "Q-2024-0001",
//     status: "cancelled",
//     cancelled_at: "2024-01-20T15:00:00Z"
//   }
// }

// Automáticamente:
// - Guardó versión antes de cancelar
// - Cambió status a 'cancelled'
// - Registró cancelled_at
// - Tracking con action='cancelled'
```

---

## 🔍 **CONSULTAS ÚTILES**

### **Ver Historial Completo de una Cotización**

```sql
SELECT 
  qt.action,
  qt.details,
  qt.created_at,
  u.email as user_email,
  qv.version_number
FROM quotation_tracking qt
LEFT JOIN auth.users u ON qt.user_id = u.id
LEFT JOIN quotation_versions qv 
  ON qv.quotation_id = qt.quotation_id 
  AND qv.created_at = qt.created_at
WHERE qt.quotation_id = 'uuid-123'
ORDER BY qt.created_at DESC;
```

### **Comparar Dos Versiones**

```sql
-- Obtener versión 1 y versión 2 para comparar
WITH v1 AS (
  SELECT data FROM quotation_versions 
  WHERE quotation_id = 'uuid-123' AND version_number = 1
),
v2 AS (
  SELECT data FROM quotation_versions 
  WHERE quotation_id = 'uuid-123' AND version_number = 2
)
SELECT 
  v1.data->>'total_amount' as total_v1,
  v2.data->>'total_amount' as total_v2,
  (v2.data->>'total_amount')::numeric - (v1.data->>'total_amount')::numeric as difference
FROM v1, v2;
```

### **Cotizaciones Más Editadas**

```sql
SELECT 
  q.quotation_number,
  q.version,
  COUNT(qt.id) as total_changes,
  MAX(qt.created_at) as last_change
FROM quotations q
LEFT JOIN quotation_tracking qt ON q.id = qt.quotation_id
GROUP BY q.id, q.quotation_number, q.version
ORDER BY total_changes DESC
LIMIT 10;
```

### **Actividad Reciente**

```sql
SELECT 
  q.quotation_number,
  c.name as customer_name,
  qt.action,
  qt.created_at
FROM quotation_tracking qt
JOIN quotations q ON qt.quotation_id = q.id
JOIN customers c ON q.customer_id = c.id
WHERE qt.created_at >= NOW() - INTERVAL '7 days'
ORDER BY qt.created_at DESC;
```

---

## 🛠️ **MANTENIMIENTO**

### **Limpiar Versiones Antiguas**

```sql
-- Mantener solo las últimas 10 versiones por cotización
SELECT clean_old_quotation_versions(10);

-- Resultado: número de versiones eliminadas
```

### **Ver Espacio Usado**

```sql
SELECT 
  pg_size_pretty(pg_total_relation_size('quotation_versions')) as versions_size,
  pg_size_pretty(pg_total_relation_size('quotation_tracking')) as tracking_size,
  (SELECT COUNT(*) FROM quotation_versions) as versions_count,
  (SELECT COUNT(*) FROM quotation_tracking) as tracking_count;
```

---

## 🔒 **SEGURIDAD Y RLS**

### **Políticas Implementadas:**

```sql
-- Solo ver versiones de cotizaciones de su organización
CREATE POLICY "view_own_org_versions" 
ON quotation_versions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM quotations q
    WHERE q.id = quotation_versions.quotation_id
    AND q.organization_id = auth.jwt()->>'organization_id'
  )
);

-- Solo insertar versiones en cotizaciones de su organización
CREATE POLICY "insert_own_org_versions" 
ON quotation_versions FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM quotations q
    WHERE q.id = quotation_versions.quotation_id
    AND q.organization_id = auth.jwt()->>'organization_id'
  )
);
```

---

## 📈 **VENTAJAS DEL SISTEMA**

1. **Trazabilidad Completa**: Cada cambio está registrado
2. **Auditoría**: Cumple con requisitos de auditoría
3. **Recuperación**: Posibilidad de ver/restaurar versiones anteriores
4. **Análisis**: Métricas sobre uso y cambios
5. **Transparencia**: Cliente puede ver historial de cambios
6. **Debugging**: Fácil identificar cuándo y qué cambió

---

## 🚀 **PRÓXIMAS MEJORAS**

### **Funcionalidades Futuras:**

1. **Restaurar Versión**: Endpoint para volver a versión anterior
2. **Comparar Versiones**: UI para comparar dos versiones
3. **Notificaciones**: Alertas cuando cambia status
4. **Reportes**: Dashboard de actividad
5. **Export**: Exportar historial a PDF
6. **Comentarios**: Agregar notas a cada cambio

### **Ejemplo de Restaurar Versión:**

```typescript
// Futuro endpoint
POST /api/quotations/{id}/restore
{
  "version_number": 2
}

// Restaura cotización a la versión especificada
```

---

## 📚 **REFERENCIAS**

- **Queries**: `src/lib/database/queries/quotations.ts`
- **API Routes**: `src/app/api/quotations/[id]/route.ts`
- **SQL Script**: `create_quotation_tracking_tables.sql`
- **Documentación API**: `QUOTATIONS_API_DOCUMENTATION.md`

---

**✅ Sistema de Versionado Implementado**
**📅 Última actualización: 2024**
**👨‍💻 Mantenido por: Equipo de Desarrollo**


