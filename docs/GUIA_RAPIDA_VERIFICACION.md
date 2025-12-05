# 🚀 Guía Rápida: Verificación y Corrección

**Fecha:** 2025-12-05  
**Objetivo:** Verificar y corregir inconsistencias de `organization_id` en clientes

---

## 📋 PASO 1: VERIFICAR CLIENTES ESPECÍFICOS

### Ejecutar en Supabase SQL Editor:

1. **Abrir Supabase Dashboard** → SQL Editor
2. **Copiar y pegar** el contenido de: `scripts/check-specific-customers-org.sql`
3. **Ejecutar** el script
4. **Revisar resultados:**
   - ¿En qué organización están los 5 clientes de la lista principal?
   - ¿En qué organización están los 2 clientes del buscador?
   - ¿Son la misma organización o diferentes?

---

## 🔍 INTERPRETACIÓN DE RESULTADOS

### Escenario A: Todos en la misma organización
✅ **Bueno:** Los clientes están correctamente agrupados
⚠️ **Problema:** El usuario actual está en una organización diferente
🔧 **Solución:** Verificar `organization_id` del usuario actual

### Escenario B: Clientes en diferentes organizaciones
⚠️ **Problema:** Hay datos mezclados entre organizaciones
🔧 **Solución:** Mover clientes a la organización correcta o ejecutar corrección

### Escenario C: Algunos sin organización (NULL)
❌ **Problema crítico:** Hay datos legacy sin `organization_id`
🔧 **Solución:** Ejecutar `fix_legacy_organization_id()`

---

## 🔧 PASO 2: VERIFICAR ORGANIZACIÓN DEL USUARIO ACTUAL

### Ejecutar en Supabase SQL Editor:

```sql
-- Reemplazar 'TU_EMAIL@ejemplo.com' con tu email real
SELECT 
    u.email,
    u.organization_id as user_org_id,
    u.workshop_id,
    w.organization_id as workshop_org_id,
    COALESCE(u.organization_id, w.organization_id) as org_final,
    o.name as nombre_organizacion
FROM users u
LEFT JOIN workshops w ON w.id = u.workshop_id
LEFT JOIN organizations o ON o.id = COALESCE(u.organization_id, w.organization_id)
WHERE u.email = 'TU_EMAIL@ejemplo.com';
```

**Preguntas clave:**
- ¿El usuario tiene `organization_id` asignado?
- ¿O tiene `workshop_id` con `organization_id`?
- ¿Cuál es el `org_final`?

---

## 🛠️ PASO 3: CORREGIR SEGÚN RESULTADOS

### Si hay datos legacy (organization_id NULL):

```sql
-- 1. Verificar cuántos hay
SELECT * FROM verify_legacy_data();

-- 2. Corregir (reemplazar 'ORG_ID_AQUI' con el ID correcto)
SELECT * FROM fix_legacy_organization_id('ORG_ID_AQUI'::UUID);

-- 3. Verificar que se corrigieron
SELECT * FROM verify_legacy_data();
```

### Si los clientes están en organización incorrecta:

```sql
-- Mover clientes a la organización correcta
-- ⚠️ CUIDADO: Solo hacer esto si estás seguro
UPDATE customers
SET organization_id = 'ORG_ID_CORRECTO'::UUID
WHERE id IN (
    SELECT id FROM customers
    WHERE name IN ('Cliente1', 'Cliente2', ...)
    AND organization_id != 'ORG_ID_CORRECTO'::UUID
);
```

---

## ✅ PASO 4: EJECUTAR MIGRACIONES (CRÍTICO)

### Migración 018: Verificación y Corrección
1. **Abrir:** `supabase/migrations/018_verify_and_fix_legacy_organization_id.sql`
2. **Copiar todo el contenido**
3. **Pegar en Supabase SQL Editor**
4. **Ejecutar**
5. **Verificar** que no hay errores

### Migración 019: Protección Integral
1. **Abrir:** `supabase/migrations/019_comprehensive_organization_protection.sql`
2. **Copiar todo el contenido**
3. **Pegar en Supabase SQL Editor**
4. **Ejecutar**
5. **Verificar** que no hay errores

⚠️ **IMPORTANTE:** Estas migraciones aplican constraints NOT NULL, lo que puede fallar si hay datos con `organization_id` NULL. Si falla, primero ejecuta `fix_legacy_organization_id()`.

---

## 🧪 PASO 5: VERIFICAR QUE FUNCIONA

### Prueba 1: Crear Cliente Nuevo
1. En la aplicación, crear un cliente nuevo
2. Verificar en BD que tiene `organization_id` asignado
3. Verificar que el `organization_id` es el correcto

### Prueba 2: Búsqueda Global
1. En la aplicación, buscar un cliente
2. Verificar que solo muestra clientes de tu organización
3. Verificar que no muestra clientes de otras organizaciones

### Prueba 3: Lista de Clientes
1. En la aplicación, ver lista de clientes
2. Verificar que solo muestra clientes de tu organización
3. Comparar con los resultados del script de verificación

---

## 📊 PASO 6: MONITOREO CONTINUO

### Verificación Diaria (Primera Semana):
```sql
SELECT * FROM verify_legacy_data();
```

### Revisar Auditoría (Semanal):
```sql
SELECT * FROM organization_audit_log
ORDER BY changed_at DESC
LIMIT 20;
```

---

## 🆘 TROUBLESHOOTING

### Error: "column organization_id cannot be null"
**Causa:** Intentaste aplicar constraints NOT NULL pero hay datos con NULL  
**Solución:** Ejecutar `fix_legacy_organization_id()` primero

### Error: "permission denied"
**Causa:** RLS policies están bloqueando acceso  
**Solución:** Verificar que el usuario tiene `organization_id` asignado

### Clientes no aparecen en la lista
**Causa:** Los clientes están en otra organización  
**Solución:** Verificar `organization_id` de los clientes y del usuario

---

## 📝 CHECKLIST RÁPIDO

- [ ] Ejecutar `scripts/check-specific-customers-org.sql`
- [ ] Verificar organización del usuario actual
- [ ] Si hay datos legacy, ejecutar `fix_legacy_organization_id()`
- [ ] Ejecutar migración 018
- [ ] Ejecutar migración 019
- [ ] Probar crear cliente nuevo
- [ ] Probar búsqueda global
- [ ] Verificar lista de clientes
- [ ] Configurar monitoreo diario

---

**¡Listo! Sigue estos pasos en orden y comparte los resultados si necesitas ayuda.**
