# 🔧 Solución: Error "function verify_legacy_data() does not exist"

**Problema:** La función `verify_legacy_data()` no existe después de ejecutar la migración.

---

## 🎯 SOLUCIÓN RÁPIDA

### Opción 1: Crear solo la función (Rápido)

Ejecuta este script primero:

**Archivo:** `scripts/CREAR_FUNCION_VERIFY_LEGACY.sql`

1. Abre Supabase → SQL Editor
2. Copia el contenido de `scripts/CREAR_FUNCION_VERIFY_LEGACY.sql`
3. Ejecuta (Run)

Esto creará la función `verify_legacy_data()` y podrás usarla inmediatamente.

### Opción 2: Ejecutar migración completa (Recomendado)

Si la migración 020 no se ejecutó completamente:

1. Ejecuta primero: `scripts/CREAR_FUNCION_VERIFY_LEGACY.sql` (para tener la función)
2. Luego ejecuta: `supabase/migrations/020_COMPLETE_ORGANIZATION_PROTECTION.sql` (migración completa)

---

## 🔍 VERIFICAR QUÉ FALTA

Ejecuta este script para ver qué partes de la migración se ejecutaron:

**Archivo:** `scripts/VERIFICAR_MIGRACION.sql`

Esto mostrará:
- ✅ Qué funciones existen
- ✅ Qué triggers están activos
- ✅ Si RLS está habilitado
- ✅ Si los constraints están aplicados

---

## 📋 PASOS RECOMENDADOS

### Paso 1: Crear función verify_legacy_data()
```sql
-- Ejecutar: scripts/CREAR_FUNCION_VERIFY_LEGACY.sql
```

### Paso 2: Verificar qué falta
```sql
-- Ejecutar: scripts/VERIFICAR_MIGRACION.sql
```

### Paso 3: Ejecutar migración completa
```sql
-- Ejecutar: supabase/migrations/020_COMPLETE_ORGANIZATION_PROTECTION.sql
```

### Paso 4: Verificar que todo funciona
```sql
-- Probar la función
SELECT * FROM verify_legacy_data();
```

---

## ⚠️ IMPORTANTE

Si la migración 020 falló parcialmente:
- Las funciones que ya se crearon no se duplicarán (usa `CREATE OR REPLACE`)
- Los triggers que ya existen se recrearán (usa `DROP TRIGGER IF EXISTS`)
- Es seguro ejecutar la migración completa nuevamente

---

**Ejecuta primero `scripts/CREAR_FUNCION_VERIFY_LEGACY.sql` para tener la función disponible inmediatamente.**
