# 🔍 Diagnóstico de Inconsistencias de Clientes

**Fecha:** 2025-12-05  
**Problema:** Clientes aparecen en diferentes lugares con inconsistencias

---

## 📋 CLIENTES A VERIFICAR

### Captura 1: Lista Principal (5 clientes)
1. Mario Pérez Serás - `mariopserz@gmail.com` - `+52 444 77 2020`
2. Chano Prado - `chano@gmail.com` - `4491799910`
3. Domingo López - `domingo@gmail.com` - `521141111122`
4. Orbelin Pineda - `dhkshcsh322222@gmail.com` - `4848131323`
5. Raul Jimenez - `dhkshcsh123@gmail.com` - `4545445555`

### Captura 2: Buscador (búsqueda "po") (2 clientes)
1. Chopon Chopon - `8866555222`
2. PONCHIS - `44655464646`

---

## 🔍 SCRIPT DE VERIFICACIÓN

Ejecutar en **Supabase SQL Editor**:

```sql
-- Archivo: scripts/check-specific-customers-org.sql
```

Este script mostrará:
- ✅ En qué organización está cada cliente
- ✅ Si tienen `organization_id` asignado
- ✅ Si están en la misma organización o diferentes
- ✅ Resumen de organizaciones encontradas

---

## 🎯 POSIBLES CAUSAS DE INCONSISTENCIAS

### 1. Clientes en Diferentes Organizaciones

**Síntoma:** Clientes de la lista principal están en una organización, pero los del buscador están en otra.

**Causa:** 
- Los clientes fueron creados por usuarios de diferentes organizaciones
- No se filtró correctamente por `organization_id` al crearlos

**Solución:**
- Verificar `organization_id` de cada cliente
- Mover clientes a la organización correcta si es necesario
- Ejecutar `fix_legacy_organization_id()` si hay datos legacy

### 2. Clientes sin `organization_id`

**Síntoma:** Algunos clientes tienen `organization_id` NULL.

**Causa:**
- Datos legacy creados antes de implementar multi-tenancy
- Triggers no funcionaron correctamente al crear

**Solución:**
- Ejecutar `fix_legacy_organization_id()` para asignar `organization_id`
- Verificar que los triggers estén activos

### 3. Usuario Actual en Diferente Organización

**Síntoma:** El usuario actual está en una organización, pero ve clientes de otra.

**Causa:**
- El usuario tiene `organization_id` diferente al esperado
- El usuario tiene `workshop_id` que apunta a otra organización

**Solución:**
- Verificar `organization_id` del usuario actual
- Corregir si es necesario

### 4. Búsqueda Global No Filtra Correctamente

**Síntoma:** El buscador muestra clientes de otras organizaciones.

**Causa:**
- La API de búsqueda no está filtrando por `organization_id` (ya corregido)
- Cache del navegador mostrando resultados antiguos

**Solución:**
- Limpiar cache del navegador
- Verificar que la API `/api/search/global` esté usando el filtro correcto

---

## 📊 PASOS PARA DIAGNOSTICAR

### Paso 1: Ejecutar Script de Verificación

```sql
-- Ejecutar: scripts/check-specific-customers-org.sql
```

### Paso 2: Analizar Resultados

**Si todos los clientes están en la misma organización:**
- ✅ El problema es que el usuario actual está en una organización diferente
- Verificar `organization_id` del usuario actual

**Si los clientes están en diferentes organizaciones:**
- ⚠️ Hay datos mezclados entre organizaciones
- Necesita corrección manual o migración

**Si algunos clientes no tienen `organization_id`:**
- ⚠️ Hay datos legacy sin organización
- Ejecutar `fix_legacy_organization_id()`

### Paso 3: Verificar Organización del Usuario Actual

```sql
SELECT 
    u.email,
    u.organization_id as user_org_id,
    u.workshop_id,
    w.organization_id as workshop_org_id,
    COALESCE(u.organization_id, w.organization_id) as org_final
FROM users u
LEFT JOIN workshops w ON w.id = u.workshop_id
WHERE u.email = 'TU_EMAIL_AQUI';
```

### Paso 4: Corregir Según Resultados

- **Si clientes están en org incorrecta:** Mover a la organización correcta
- **Si clientes no tienen org:** Ejecutar `fix_legacy_organization_id()`
- **Si usuario está en org incorrecta:** Corregir `organization_id` del usuario

---

## 🔧 SCRIPTS DISPONIBLES

1. **`scripts/check-specific-customers-org.sql`**
   - Verifica organización de clientes específicos
   - Compara lista vs buscador

2. **`scripts/verify-customers-organization.sql`**
   - Verificación detallada de todos los clientes
   - Incluye información del usuario creador

3. **`scripts/analyze-organization-inconsistencies.sql`**
   - Análisis completo de inconsistencias
   - Detecta duplicados y problemas

4. **`scripts/fix-legacy-data.sql`**
   - Corrige datos legacy sin `organization_id`

---

## ⚠️ ACCIONES INMEDIATAS

1. **Ejecutar verificación:**
   ```sql
   -- En Supabase SQL Editor
   -- Archivo: scripts/check-specific-customers-org.sql
   ```

2. **Revisar resultados** y determinar:
   - ¿En qué organización están los clientes de la lista?
   - ¿En qué organización están los clientes del buscador?
   - ¿Son la misma organización o diferentes?

3. **Corregir según diagnóstico:**
   - Si hay datos legacy: ejecutar `fix_legacy_organization_id()`
   - Si están en org incorrecta: mover manualmente
   - Si usuario está en org incorrecta: corregir usuario

---

**Ejecuta el script y comparte los resultados para poder corregir las inconsistencias específicas.**

