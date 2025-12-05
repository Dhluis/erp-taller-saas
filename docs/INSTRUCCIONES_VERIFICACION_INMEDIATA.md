# 📋 Instrucciones: Verificación Inmediata de Clientes

**Objetivo:** Verificar en qué organización están los clientes específicos de tus capturas

---

## 🚀 PASO 1: Abrir Supabase SQL Editor

1. Ve a tu proyecto en Supabase
2. Navega a **SQL Editor** (en el menú lateral)
3. Haz clic en **New Query**

---

## 📝 PASO 2: Ejecutar Script de Verificación

### Opción A: Script Completo (Recomendado)
Copia y pega el contenido completo de:
```
scripts/EJECUTAR_VERIFICACION_CLIENTES.sql
```

### Opción B: Script Rápido
Copia y pega el contenido de:
```
scripts/check-specific-customers-org.sql
```

---

## ▶️ PASO 3: Ejecutar

1. Pega el script en el editor SQL
2. Haz clic en **Run** (o presiona `Ctrl+Enter` / `Cmd+Enter`)
3. Revisa los resultados

---

## 📊 QUÉ VERÁS EN LOS RESULTADOS

### Resultado 1: Clientes de la Lista Principal
- Muestra los 5 clientes de la captura 1
- Indica su `organization_id` y nombre de organización
- Muestra si tienen problema (sin organización)

### Resultado 2: Clientes del Buscador
- Muestra los 2 clientes de la captura 2 (búsqueda "po")
- Indica su `organization_id` y nombre de organización
- Muestra si tienen problema (sin organización)

### Resultado 3: Comparación
- Compara ambos grupos lado a lado
- Muestra si están en la misma organización o diferentes

### Resultado 4: Resumen
- Cuenta cuántas organizaciones diferentes hay
- Lista qué clientes están en cada organización

### Resultado 5: Usuario Actual
- Muestra tu organización actual
- Indica qué organización deberías ver

---

## 🔍 INTERPRETACIÓN DE RESULTADOS

### ✅ Si todos los clientes están en la misma organización:
- **Problema:** El usuario actual está en una organización diferente
- **Solución:** Verificar `organization_id` del usuario actual

### ⚠️ Si los clientes están en diferentes organizaciones:
- **Problema:** Hay datos mezclados entre organizaciones
- **Solución:** Necesita corrección manual o migración

### ❌ Si algunos clientes no tienen `organization_id`:
- **Problema:** Hay datos legacy sin organización
- **Solución:** Ejecutar `fix_legacy_organization_id()`

---

## 📸 COMPARTIR RESULTADOS

Después de ejecutar el script:

1. **Toma capturas de pantalla** de los resultados
2. **O copia los resultados** en texto
3. **Compártelos** para poder analizar y corregir

---

## ⚡ SIGUIENTE PASO

Una vez que tengas los resultados:

- **Si hay datos legacy:** Ejecutaremos `fix_legacy_organization_id()`
- **Si están en org incorrecta:** Los moveremos a la organización correcta
- **Si el usuario está en org incorrecta:** Corregiremos el usuario

---

**¡Ejecuta el script y comparte los resultados!**

