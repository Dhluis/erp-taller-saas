# 📋 UNIFICACIÓN DE ESTADOS DE WORK_ORDERS

**Fecha**: Diciembre 2024  
**Objetivo**: Unificar estados entre base de datos y documentación

---

## 🔍 PROBLEMA IDENTIFICADO

**Inconsistencia encontrada**:
- Documentación mostraba: 11 estados
- Base de datos tenía: 13 estados (11 oficiales + 2 legacy: `pending`, `in_progress`)
- Código TypeScript tenía: Múltiples definiciones inconsistentes

---

## ✅ SOLUCIÓN APLICADA

### Estados Oficiales (11 estados)

Estos son los únicos estados válidos según el flujo Kanban:

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

### Estados Legacy (Deprecados)

Estos estados han sido deprecados y se migran automáticamente:

| Estado Legacy | Migrado a | Razón |
|---------------|-----------|-------|
| `pending` | `reception` | Estado inicial ahora es "reception" |
| `in_progress` | `diagnosis` | Estado genérico reemplazado por "diagnosis" |
| `diagnosed` | `initial_quote` | Diagnóstico completado → cotización |
| `approved` | `waiting_approval` | Aprobación es parte del flujo de espera |
| `in_repair` | `disassembly` | Reparación genérica → desmontaje específico |
| `delivered` | `ready` | Entregado → listo para entrega |

---

## 🔄 FLUJO DE TRANSICIONES

### Flujo Principal

```
reception → diagnosis → initial_quote → waiting_approval → 
disassembly → waiting_parts → assembly → testing → ready → completed
```

### Transiciones Especiales

- **Cualquier estado → `cancelled`**: Se puede cancelar en cualquier momento
- **`waiting_approval` → `cancelled`**: Si cliente rechaza
- **`waiting_approval` → `disassembly`**: Si cliente aprueba
- **`waiting_parts` → `assembly`**: Cuando llegan las piezas

### Restricciones

- **`completed` → No puede cambiar**: Estado final
- **`cancelled` → No puede cambiar**: Estado final
- **Estados intermedios**: Pueden avanzar o retroceder según el flujo

---

## 📝 CAMBIOS EN BASE DE DATOS

### Script SQL Creado

Archivo: `scripts/unify-work-orders-status.sql`

**Acciones**:
1. Elimina constraint existente
2. Crea nuevo constraint con 11 estados oficiales
3. Migra estados legacy a estados oficiales
4. Verifica integridad de datos
5. Agrega comentarios de documentación

### Ejecutar en Supabase

```sql
-- Ejecutar el script completo
\i scripts/unify-work-orders-status.sql

-- O ejecutar manualmente cada paso
```

---

## 📚 CAMBIOS EN DOCUMENTACIÓN

### Archivos Actualizados

1. **EAGLES-ERP-ARCHITECTURE.md**:
   - ✅ PARTE 2: MÓDULO ÓRDENES → Estados actualizados
   - ✅ PARTE 2: MÓDULO ÓRDENES → Transiciones documentadas
   - ✅ PARTE 3: FLUJO 3 → Flujo completo actualizado
   - ✅ PARTE 6: BASE DE DATOS → Tabla work_orders actualizada

### Cambios Específicos

1. **Sección "Estados de una Orden"**:
   - Agregada nota sobre estados legacy deprecados
   - Documentadas transiciones permitidas

2. **Sección "Flujo Completo"**:
   - Actualizado con nombres de estados en cada paso
   - Agregada sección de cancelación

3. **Sección "Reglas de Negocio"**:
   - Actualizada para reflejar estados finales
   - Agregada validación de transiciones

4. **Sección "Tabla work_orders"**:
   - Lista completa de estados válidos
   - Nota sobre estados legacy

---

## 🔧 CAMBIOS EN CÓDIGO

### Archivos a Actualizar

1. **src/types/orders.ts**:
   ```typescript
   export type OrderStatus = 
     | 'reception'
     | 'diagnosis'
     | 'initial_quote'
     | 'waiting_approval'
     | 'disassembly'
     | 'waiting_parts'
     | 'assembly'
     | 'testing'
     | 'ready'
     | 'completed'
     | 'cancelled';
     // ❌ Remover: 'pending', 'in_progress'
   ```

2. **src/lib/database/queries/work-orders.ts**:
   ```typescript
   export type WorkOrderStatus =
     | 'reception'
     | 'diagnosis'
     | 'initial_quote'
     | 'waiting_approval'
     | 'disassembly'
     | 'waiting_parts'
     | 'assembly'
     | 'testing'
     | 'ready'
     | 'completed'
     | 'cancelled';
     // ❌ Remover estados legacy
   ```

3. **src/hooks/useWorkOrders.ts**:
   - ✅ Ya tiene los 11 estados correctos

---

## ✅ VERIFICACIÓN

### Queries de Verificación

```sql
-- 1. Verificar constraint
SELECT con.conname, pg_get_constraintdef(con.oid) 
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'work_orders' 
  AND con.contype = 'c'
  AND con.conname LIKE '%status%';

-- 2. Verificar estados en uso
SELECT DISTINCT status, COUNT(*) as count
FROM work_orders
GROUP BY status
ORDER BY count DESC;

-- 3. Verificar que no hay estados inválidos
SELECT COUNT(*) as invalid_count
FROM work_orders
WHERE status NOT IN (
  'reception', 'diagnosis', 'initial_quote', 'waiting_approval',
  'disassembly', 'waiting_parts', 'assembly', 'testing',
  'ready', 'completed', 'cancelled'
);
```

---

## 📊 RESUMEN

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Estados en BD** | 13 (11 + 2 legacy) | 11 oficiales |
| **Estados en Doc** | 11 | 11 (unificados) |
| **Estados en Código** | Inconsistentes | Por actualizar |
| **Constraint BD** | Incluía legacy | Solo oficiales |
| **Migración** | Manual | Automática |

---

## 🚀 PRÓXIMOS PASOS

1. ✅ Script SQL creado
2. ✅ Documentación actualizada
3. ⏳ Ejecutar script en Supabase
4. ⏳ Actualizar tipos TypeScript
5. ⏳ Verificar que no hay código usando estados legacy
6. ⏳ Actualizar componentes que usan estados

---

## 📝 NOTAS

- Los estados legacy se migran automáticamente al ejecutar el script
- No se pierden datos, solo se renombran estados
- El constraint previene insertar estados inválidos
- La documentación ahora refleja exactamente la base de datos

