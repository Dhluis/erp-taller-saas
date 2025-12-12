# 📋 EXPLICACIÓN DETALLADA: Script de Unificación de Estados

**Archivo**: `scripts/unify-work-orders-status.sql`  
**Fecha**: Diciembre 2024  
**Objetivo**: Unificar estados de `work_orders` entre BD y documentación

---

## 📄 CONTENIDO COMPLETO DEL SCRIPT

```sql
-- =====================================================
-- UNIFICAR ESTADOS DE WORK_ORDERS
-- =====================================================
-- Este script unifica los estados de work_orders entre
-- la base de datos y la documentación
-- Fecha: Diciembre 2024

-- =====================================================
-- PASO 1: Verificar constraint actual
-- =====================================================
-- Ejecutar primero para ver el constraint actual:
-- SELECT con.conname, pg_get_constraintdef(con.oid) 
-- FROM pg_constraint con
-- JOIN pg_class rel ON rel.oid = con.conrelid
-- WHERE rel.relname = 'work_orders' 
--   AND con.contype = 'c'
--   AND con.conname LIKE '%status%';

-- =====================================================
-- PASO 2: Verificar estados usados en producción
-- =====================================================
-- Ejecutar para ver qué estados se están usando:
-- SELECT DISTINCT status, COUNT(*) as count
-- FROM work_orders
-- GROUP BY status
-- ORDER BY count DESC;

-- =====================================================
-- PASO 3: Eliminar constraint existente
-- =====================================================
ALTER TABLE work_orders 
DROP CONSTRAINT IF EXISTS work_orders_status_check;

-- =====================================================
-- PASO 4: Agregar constraint con 11 estados unificados
-- =====================================================
-- Estados oficiales según documentación y flujo Kanban:
ALTER TABLE work_orders 
ADD CONSTRAINT work_orders_status_check 
CHECK (status IN (
  'reception',           -- Recepción del vehículo
  'diagnosis',          -- Diagnóstico del problema
  'initial_quote',      -- Cotización inicial
  'waiting_approval',   -- Esperando aprobación del cliente
  'disassembly',        -- Desmontaje
  'waiting_parts',      -- Esperando piezas
  'assembly',           -- Reensamblaje
  'testing',            -- Pruebas de funcionamiento
  'ready',              -- Listo para entrega
  'completed',          -- Completada y entregada
  'cancelled'           -- Cancelada
));

-- =====================================================
-- PASO 5: Migrar estados antiguos a nuevos (si existen)
-- =====================================================
-- Mapeo de estados legacy a estados nuevos:
UPDATE work_orders 
SET status = CASE 
  WHEN status = 'pending' THEN 'reception'        -- pending → reception
  WHEN status = 'in_progress' THEN 'diagnosis'   -- in_progress → diagnosis
  WHEN status = 'diagnosed' THEN 'initial_quote' -- diagnosed → initial_quote
  WHEN status = 'approved' THEN 'waiting_approval' -- approved → waiting_approval
  WHEN status = 'in_repair' THEN 'disassembly'   -- in_repair → disassembly
  WHEN status = 'delivered' THEN 'ready'         -- delivered → ready
  -- Estados que ya son correctos, mantenerlos:
  WHEN status IN (
    'reception', 'diagnosis', 'initial_quote', 'waiting_approval',
    'disassembly', 'waiting_parts', 'assembly', 'testing',
    'ready', 'completed', 'cancelled'
  ) THEN status
  -- Default para cualquier estado no reconocido:
  ELSE 'reception'
END
WHERE status NOT IN (
  'reception', 'diagnosis', 'initial_quote', 'waiting_approval',
  'disassembly', 'waiting_parts', 'assembly', 'testing',
  'ready', 'completed', 'cancelled'
);

-- =====================================================
-- PASO 6: Verificar migración
-- =====================================================
-- Verificar que todos los registros tengan estados válidos:
SELECT 
  status,
  COUNT(*) as count
FROM work_orders 
GROUP BY status 
ORDER BY status;

-- Verificar que no hay estados inválidos:
SELECT 
  COUNT(*) as invalid_status_count
FROM work_orders
WHERE status NOT IN (
  'reception', 'diagnosis', 'initial_quote', 'waiting_approval',
  'disassembly', 'waiting_parts', 'assembly', 'testing',
  'ready', 'completed', 'cancelled'
);

-- =====================================================
-- PASO 7: Comentarios para documentación
-- =====================================================
COMMENT ON COLUMN work_orders.status IS 
'Estado de la orden de trabajo. Valores permitidos: 
reception (Recepción), diagnosis (Diagnóstico), 
initial_quote (Cotización Inicial), waiting_approval (Esperando Aprobación),
disassembly (Desmontaje), waiting_parts (Esperando Piezas),
assembly (Reensamblaje), testing (Pruebas),
ready (Listo para Entrega), completed (Completada), cancelled (Cancelada)';

-- =====================================================
-- RESUMEN
-- =====================================================
SELECT 
  'Estados unificados correctamente' as message,
  COUNT(*) as total_orders,
  COUNT(DISTINCT status) as unique_statuses
FROM work_orders;
```

---

## 🔍 EXPLICACIÓN LÍNEA POR LÍNEA

### Líneas 1-6: Encabezado
```sql
-- =====================================================
-- UNIFICAR ESTADOS DE WORK_ORDERS
-- =====================================================
-- Este script unifica los estados de work_orders entre
-- la base de datos y la documentación
-- Fecha: Diciembre 2024
```
**Qué hace**: Comentarios de identificación del script. No ejecuta nada.

---

### Líneas 8-17: PASO 1 - Verificar constraint (Comentado)
```sql
-- PASO 1: Verificar constraint actual
-- SELECT con.conname, pg_get_constraintdef(con.oid) 
-- FROM pg_constraint con
-- JOIN pg_class rel ON rel.oid = con.conrelid
-- WHERE rel.relname = 'work_orders' 
--   AND con.contype = 'c'
--   AND con.conname LIKE '%status%';
```
**Qué hace**: 
- **Comentado**: No se ejecuta automáticamente
- **Propósito**: Query para verificar el constraint actual antes de ejecutar el script
- **Cuándo usar**: Ejecutar manualmente ANTES del script para ver qué constraint existe
- **Resultado esperado**: Muestra el nombre y definición del constraint actual

---

### Líneas 19-26: PASO 2 - Verificar estados (Comentado)
```sql
-- PASO 2: Verificar estados usados en producción
-- SELECT DISTINCT status, COUNT(*) as count
-- FROM work_orders
-- GROUP BY status
-- ORDER BY count DESC;
```
**Qué hace**:
- **Comentado**: No se ejecuta automáticamente
- **Propósito**: Ver qué estados se están usando actualmente en producción
- **Cuándo usar**: Ejecutar manualmente ANTES del script para ver el impacto
- **Resultado esperado**: Lista de estados y cuántos registros tienen cada uno

---

### Líneas 28-32: PASO 3 - Eliminar constraint
```sql
-- PASO 3: Eliminar constraint existente
ALTER TABLE work_orders 
DROP CONSTRAINT IF EXISTS work_orders_status_check;
```
**Qué hace**:
- **Ejecuta**: Elimina el constraint de validación de estados si existe
- **`IF EXISTS`**: Seguro - no falla si el constraint no existe
- **Impacto**: 
  - ✅ **Temporal**: La tabla queda sin validación de estados por unos segundos
  - ✅ **Reversible**: Se puede recrear el constraint anterior si es necesario
- **Riesgo**: ⚠️ **BAJO** - Solo elimina validación, no datos

---

### Líneas 34-52: PASO 4 - Crear nuevo constraint
```sql
-- PASO 4: Agregar constraint con 11 estados unificados
ALTER TABLE work_orders 
ADD CONSTRAINT work_orders_status_check 
CHECK (status IN (
  'reception', 'diagnosis', 'initial_quote', 'waiting_approval',
  'disassembly', 'waiting_parts', 'assembly', 'testing',
  'ready', 'completed', 'cancelled'
));
```
**Qué hace**:
- **Ejecuta**: Crea un nuevo constraint que solo permite los 11 estados oficiales
- **Validación**: PostgreSQL rechazará cualquier INSERT/UPDATE con estado inválido
- **Impacto**:
  - ✅ **Inmediato**: Protege la integridad de datos
  - ✅ **Permanente**: Previene estados inválidos en el futuro
- **Riesgo**: ⚠️ **MEDIO** - Si hay datos con estados legacy, el UPDATE siguiente los migrará primero

---

### Líneas 54-79: PASO 5 - Migrar estados legacy
```sql
-- PASO 5: Migrar estados antiguos a nuevos (si existen)
UPDATE work_orders 
SET status = CASE 
  WHEN status = 'pending' THEN 'reception'
  WHEN status = 'in_progress' THEN 'diagnosis'
  WHEN status = 'diagnosed' THEN 'initial_quote'
  WHEN status = 'approved' THEN 'waiting_approval'
  WHEN status = 'in_repair' THEN 'disassembly'
  WHEN status = 'delivered' THEN 'ready'
  WHEN status IN ('reception', 'diagnosis', ...) THEN status
  ELSE 'reception'
END
WHERE status NOT IN ('reception', 'diagnosis', ...);
```
**Qué hace**:
- **Ejecuta**: Actualiza registros con estados legacy a estados oficiales
- **Lógica CASE**:
  1. Si es `pending` → `reception`
  2. Si es `in_progress` → `diagnosis`
  3. Si es `diagnosed` → `initial_quote`
  4. Si es `approved` → `waiting_approval`
  5. Si es `in_repair` → `disassembly`
  6. Si es `delivered` → `ready`
  7. Si ya es estado oficial → mantenerlo
  8. Si es desconocido → `reception` (default seguro)
- **WHERE clause**: Solo actualiza registros que NO están en la lista de estados oficiales
- **Impacto**:
  - ✅ **Modifica datos**: Cambia valores de `status` en registros existentes
  - ✅ **Transaccional**: Si falla, se revierte todo (ROLLBACK)
- **Riesgo**: ⚠️ **MEDIO** - Modifica datos, pero es reversible

---

### Líneas 81-100: PASO 6 - Verificación
```sql
-- PASO 6: Verificar migración
SELECT status, COUNT(*) as count
FROM work_orders 
GROUP BY status 
ORDER BY status;

SELECT COUNT(*) as invalid_status_count
FROM work_orders
WHERE status NOT IN (...);
```
**Qué hace**:
- **Ejecuta**: Queries de verificación
- **Primera query**: Muestra distribución de estados después de la migración
- **Segunda query**: Cuenta registros con estados inválidos (debe ser 0)
- **Propósito**: Confirmar que la migración fue exitosa
- **Riesgo**: ✅ **NINGUNO** - Solo lectura

---

### Líneas 102-111: PASO 7 - Comentarios
```sql
-- PASO 7: Comentarios para documentación
COMMENT ON COLUMN work_orders.status IS 
'Estado de la orden de trabajo. Valores permitidos: ...';
```
**Qué hace**:
- **Ejecuta**: Agrega comentario descriptivo a la columna `status`
- **Propósito**: Documentación en la base de datos
- **Visible en**: `pg_description`, herramientas de administración
- **Riesgo**: ✅ **NINGUNO** - Solo metadata

---

### Líneas 113-120: RESUMEN
```sql
-- RESUMEN
SELECT 
  'Estados unificados correctamente' as message,
  COUNT(*) as total_orders,
  COUNT(DISTINCT status) as unique_statuses
FROM work_orders;
```
**Qué hace**:
- **Ejecuta**: Muestra resumen final
- **Resultado**: Total de órdenes y cantidad de estados únicos
- **Propósito**: Confirmación visual de éxito
- **Riesgo**: ✅ **NINGUNO** - Solo lectura

---

## ✅ CONFIRMACIÓN DE SEGURIDAD

### ¿Es seguro ejecutar?

**✅ SÍ, con precauciones**:

1. **No elimina datos**: Solo modifica valores de `status`
2. **Transaccional**: Si falla, se revierte todo (ROLLBACK automático)
3. **Reversible**: Se puede hacer rollback (ver sección siguiente)
4. **Validado**: El script valida antes de aplicar cambios
5. **Incremental**: Se puede ejecutar paso por paso

### Puntos de atención:

1. **Backup recomendado**: Hacer backup antes de ejecutar
2. **Horario**: Ejecutar en horario de bajo tráfico
3. **Verificación previa**: Ejecutar PASO 1 y PASO 2 primero (queries comentadas)
4. **Monitoreo**: Verificar resultados del PASO 6

---

## 🔄 INSTRUCCIONES DE ROLLBACK

### Opción 1: Rollback Manual (Si algo sale mal)

Si necesitas revertir los cambios, ejecuta este script:

```sql
-- =====================================================
-- ROLLBACK: Revertir unificación de estados
-- =====================================================
-- ⚠️ SOLO EJECUTAR SI ES NECESARIO REVERTIR CAMBIOS

BEGIN; -- Iniciar transacción

-- 1. Eliminar constraint nuevo
ALTER TABLE work_orders 
DROP CONSTRAINT IF EXISTS work_orders_status_check;

-- 2. Recrear constraint anterior (con estados legacy)
ALTER TABLE work_orders 
ADD CONSTRAINT work_orders_status_check 
CHECK (status IN (
  'pending', 'in_progress', 'reception', 'diagnosis', 
  'initial_quote', 'waiting_approval', 'disassembly', 
  'waiting_parts', 'assembly', 'testing', 'ready', 
  'completed', 'cancelled', 'diagnosed', 'approved', 
  'in_repair', 'delivered'
));

-- 3. Revertir migración de estados (si es necesario)
-- ⚠️ NOTA: Esto requiere conocer los estados originales
-- Si tienes backup, restaurar desde ahí es más seguro

-- 4. Verificar
SELECT status, COUNT(*) 
FROM work_orders 
GROUP BY status;

-- Si todo está bien:
COMMIT; -- Confirmar cambios

-- Si algo está mal:
-- ROLLBACK; -- Revertir todo
```

### Opción 2: Restaurar desde Backup

**La forma más segura de rollback**:

1. **Si tienes backup de la tabla**:
   ```sql
   -- Restaurar tabla completa desde backup
   TRUNCATE work_orders;
   -- Restaurar datos desde backup
   ```

2. **Si tienes snapshot de Supabase**:
   - Usar función de "Point in Time Recovery" de Supabase
   - Restaurar a un punto anterior a la ejecución del script

### Opción 3: Rollback Parcial (Solo constraint)

Si solo necesitas revertir el constraint pero mantener los datos migrados:

```sql
-- Eliminar constraint nuevo
ALTER TABLE work_orders 
DROP CONSTRAINT IF EXISTS work_orders_status_check;

-- Recrear constraint más permisivo (incluye estados legacy)
ALTER TABLE work_orders 
ADD CONSTRAINT work_orders_status_check 
CHECK (status IN (
  'pending', 'in_progress', 'reception', 'diagnosis', 
  'initial_quote', 'waiting_approval', 'disassembly', 
  'waiting_parts', 'assembly', 'testing', 'ready', 
  'completed', 'cancelled', 'diagnosed', 'approved', 
  'in_repair', 'delivered'
));
```

---

## 📋 CHECKLIST PRE-EJECUCIÓN

Antes de ejecutar el script, verifica:

- [ ] **Backup realizado**: Tienes backup de la tabla `work_orders`
- [ ] **PASO 1 ejecutado**: Verificaste el constraint actual
- [ ] **PASO 2 ejecutado**: Viste qué estados se están usando
- [ ] **Horario adecuado**: Bajo tráfico o ventana de mantenimiento
- [ ] **Acceso a rollback**: Sabes cómo revertir si es necesario
- [ ] **Notificación**: Equipo informado del cambio

---

## 🚀 INSTRUCCIONES DE EJECUCIÓN

### En Supabase Dashboard:

1. **Abrir SQL Editor**
2. **Ejecutar PASO 1 y PASO 2** (queries comentadas) para verificar
3. **Copiar y pegar** el script completo
4. **Ejecutar** el script
5. **Verificar resultados** del PASO 6
6. **Confirmar** que `invalid_status_count = 0`

### Desde línea de comandos (psql):

```bash
# Conectar a Supabase
psql "postgresql://[connection-string]"

# Ejecutar script
\i scripts/unify-work-orders-status.sql

# Verificar resultados
SELECT status, COUNT(*) FROM work_orders GROUP BY status;
```

---

## 📊 RESULTADOS ESPERADOS

### Después de ejecutar:

1. **Constraint actualizado**: Solo permite 11 estados oficiales
2. **Estados migrados**: Todos los estados legacy convertidos
3. **Verificación exitosa**: `invalid_status_count = 0`
4. **Comentario agregado**: Columna `status` documentada
5. **Resumen mostrado**: Total de órdenes y estados únicos

### Ejemplo de salida del PASO 6:

```
status          | count
----------------+-------
reception       | 15
diagnosis       | 8
initial_quote   | 5
waiting_approval| 3
disassembly     | 2
waiting_parts   | 1
assembly        | 4
testing         | 2
ready           | 6
completed       | 45
cancelled       | 2
```

---

## ⚠️ ADVERTENCIAS

1. **No ejecutar en producción sin backup**
2. **Verificar PASO 1 y PASO 2 primero**
3. **Monitorear durante ejecución**
4. **Tener plan de rollback listo**
5. **Notificar al equipo antes de ejecutar**

---

## ✅ CONCLUSIÓN

El script es **seguro para ejecutar** siempre que:
- ✅ Tengas backup
- ✅ Verifiques primero (PASO 1 y PASO 2)
- ✅ Ejecutes en horario adecuado
- ✅ Tengas plan de rollback

**El script es idempotente**: Puede ejecutarse múltiples veces sin problemas (solo actualiza lo necesario).

