# 🔧 Guía de Migración de Datos Legacy sin organization_id

**Fecha:** 2025-12-05  
**Objetivo:** Documentar el proceso para identificar y corregir datos legacy sin `organization_id`

---

## 🚨 PROBLEMA

Si hay datos creados antes de implementar multi-tenancy, pueden no tener `organization_id` asignado, causando:

- ❌ No aparecen en búsquedas
- ❌ No aparecen en listas
- ❌ Errores al intentar acceder a ellos
- ❌ Inconsistencias entre diferentes partes del sistema

---

## ✅ SOLUCIÓN IMPLEMENTADA

### 1. Scripts de Verificación

#### `scripts/check-legacy-data.sql`
- **Función:** Verifica cuántos registros tienen `organization_id` NULL
- **Uso:** Ejecutar en Supabase SQL Editor para diagnosticar
- **Resultado:** Reporte de tablas afectadas y cantidad de registros

### 2. Scripts de Corrección

#### `scripts/fix-legacy-data.sql`
- **Función:** Asigna `organization_id` a datos legacy
- **Estrategia:** 
  1. Intenta obtener `organization_id` del usuario creador
  2. Si no tiene, intenta obtenerlo del workshop del usuario
  3. Si no tiene, usa la organización por defecto
- **Uso:** Ejecutar después de verificar datos

### 3. Migración Automática

#### `supabase/migrations/018_verify_and_fix_legacy_organization_id.sql`
- **Función:** Crea funciones y triggers para prevenir y corregir
- **Incluye:**
  - `verify_legacy_data()`: Función para verificar datos legacy
  - `fix_legacy_organization_id()`: Función para corregir datos
  - Triggers que aseguran `organization_id` en nuevos registros

---

## 📋 PROCESO PASO A PASO

### Paso 1: Ejecutar Migración

```sql
-- Ejecutar en Supabase SQL Editor
-- Archivo: supabase/migrations/018_verify_and_fix_legacy_organization_id.sql
```

Esto crea las funciones y triggers necesarios.

### Paso 2: Verificar Datos Legacy

```sql
-- Ejecutar en Supabase SQL Editor
-- Archivo: scripts/check-legacy-data.sql

-- Ver resumen
SELECT * FROM verify_legacy_data();
```

**Interpretación del resultado:**
- `records_without_org`: Cantidad de registros sin `organization_id`
- `total_records`: Total de registros en la tabla
- `percentage_missing`: Porcentaje de registros sin `organization_id`

**Si `records_without_org > 0`:** Hay datos legacy que necesitan corrección.

### Paso 3: Verificar Organización por Defecto

```sql
SELECT id, name FROM organizations 
WHERE id = '00000000-0000-0000-0000-000000000001';
```

**Si no existe:**
```sql
INSERT INTO organizations (id, name, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Organización por Defecto',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;
```

### Paso 4: Corregir Datos Legacy

```sql
-- ⚠️ IMPORTANTE: Revisar resultados del Paso 2 antes de ejecutar
SELECT * FROM fix_legacy_organization_id('00000000-0000-0000-0000-000000000001'::UUID);
```

**Resultado esperado:**
```
table_name    | records_fixed
--------------|---------------
customers     | 5
work_orders   | 3
products      | 2
```

### Paso 5: Verificar Corrección

```sql
-- Debe retornar 0 registros sin organization_id
SELECT * FROM verify_legacy_data();
```

**Si aún hay registros sin `organization_id`:**
1. Revisar manualmente los registros específicos
2. Asignar `organization_id` manualmente si es necesario
3. Verificar que el usuario creador tenga `organization_id` asignado

---

## 🔒 PREVENCIÓN FUTURA

### Triggers Automáticos

Los triggers creados en la migración aseguran que:

1. **Al insertar nuevos registros:**
   - Si no tienen `organization_id`, se asigna automáticamente
   - Se obtiene del usuario actual o de su workshop
   - Si no se puede obtener, usa la organización por defecto

2. **Tablas protegidas:**
   - `customers`
   - `work_orders`
   - `products`
   - `sales_invoices`
   - `quotations`
   - `suppliers`

### Validaciones en Código

Además de los triggers, el código de la aplicación:

1. **API Routes:**
   - Obtienen `organization_id` del usuario autenticado
   - Filtran todos los queries por `organization_id`
   - Validan que el usuario tenga organización antes de crear datos

2. **Hooks y Componentes:**
   - `useCustomers()` filtra por `organization_id`
   - `useWorkOrders()` filtra por `organization_id`
   - Todos los componentes esperan datos con `organization_id`

---

## ⚠️ CASOS ESPECIALES

### 1. Datos Creados por Usuarios sin Organización

**Problema:** Si un usuario no tiene `organization_id` ni `workshop_id`, los datos que cree no tendrán `organization_id`.

**Solución:**
1. Asignar `organization_id` o `workshop_id` al usuario
2. Ejecutar `fix_legacy_organization_id()` para corregir datos existentes

### 2. Datos Importados desde Otro Sistema

**Problema:** Datos importados pueden no tener `organization_id`.

**Solución:**
1. Ejecutar `fix_legacy_organization_id()` después de importar
2. O asignar `organization_id` durante la importación

### 3. Datos de Prueba/Desarrollo

**Problema:** Datos de prueba pueden no tener `organization_id` válido.

**Solución:**
1. Usar siempre la organización de prueba: `00000000-0000-0000-0000-000000000001`
2. Ejecutar `fix_legacy_organization_id()` periódicamente en desarrollo

---

## 📊 MONITOREO

### Verificación Periódica

Ejecutar mensualmente (o después de importaciones masivas):

```sql
SELECT * FROM verify_legacy_data();
```

**Si hay registros sin `organization_id`:**
1. Investigar la causa
2. Corregir con `fix_legacy_organization_id()`
3. Verificar que los triggers estén activos

### Alertas

Configurar alertas si:
- `records_without_org > 0` en cualquier tabla
- Se crean nuevos registros sin `organization_id` (los triggers deberían prevenirlo)

---

## 🎯 CHECKLIST DE MIGRACIÓN

- [ ] Ejecutar migración `018_verify_and_fix_legacy_organization_id.sql`
- [ ] Ejecutar `scripts/check-legacy-data.sql` para verificar
- [ ] Verificar que existe organización por defecto
- [ ] Si hay datos legacy, ejecutar `scripts/fix-legacy-data.sql`
- [ ] Verificar que todos los datos tienen `organization_id`
- [ ] Verificar que los triggers están activos
- [ ] Documentar cualquier caso especial encontrado

---

## 🔧 TROUBLESHOOTING

### Error: "La organización por defecto no existe"

**Solución:**
```sql
INSERT INTO organizations (id, name, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Organización por Defecto',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;
```

### Error: "No se puede obtener organization_id del usuario"

**Causa:** El usuario creador no tiene `organization_id` ni `workshop_id`.

**Solución:**
1. Asignar `organization_id` o `workshop_id` al usuario
2. Re-ejecutar `fix_legacy_organization_id()`

### Datos aún sin organization_id después de corregir

**Causa:** Puede haber casos edge no cubiertos por la función.

**Solución:**
1. Revisar manualmente los registros específicos
2. Asignar `organization_id` manualmente
3. Actualizar la función `fix_legacy_organization_id()` si es necesario

---

## 📝 NOTAS IMPORTANTES

1. **Backup antes de migrar:** Siempre hacer backup antes de ejecutar correcciones masivas
2. **Revisar resultados:** Verificar que los datos se corrigieron correctamente
3. **Triggers activos:** Asegurar que los triggers estén activos para prevenir futuros problemas
4. **Monitoreo continuo:** Ejecutar verificaciones periódicas

---

**FIN DEL DOCUMENTO**

