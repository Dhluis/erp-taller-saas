# 📋 REPORTE DE CORRECCIONES: Nombres de Tablas

**Fecha**: Diciembre 2024  
**Objetivo**: Unificar nombres de tablas entre documentación y código real

---

## 🔍 TABLA DE CORRECCIONES

| Nombre en Documentación | Nombre Real en Código | Acción Realizada | Notas |
|-------------------------|----------------------|------------------|-------|
| `user_profiles` | `users` | ✅ ACTUALIZADO | `users` es la tabla principal. `user_profiles` también existe pero se usa menos frecuentemente |
| `inventory_products` | `products` | ✅ ACTUALIZADO | El código usa `products` directamente, no `inventory_products` |
| `inventory_products` (en relación) | `products` | ✅ ACTUALIZADO | `inventory_movements.product_id` → `products.id` |

---

## 📊 VERIFICACIÓN DE TABLAS

### Tablas Verificadas en Código

**Tablas confirmadas en uso:**
- ✅ `organizations` - Confirmada
- ✅ `users` - Confirmada (tabla principal de perfiles)
- ✅ `user_profiles` - Existe pero uso limitado
- ✅ `customers` - Confirmada
- ✅ `vehicles` - Confirmada
- ✅ `work_orders` - Confirmada
- ✅ `order_items` - Confirmada
- ✅ `quotations` - Confirmada
- ✅ `quotation_items` - Confirmada
- ✅ `products` - Confirmada (no `inventory_products`)
- ✅ `inventory_movements` - Confirmada
- ✅ `invoices` - Confirmada
- ✅ `payments` - Confirmada
- ✅ `employees` - Confirmada
- ✅ `suppliers` - Confirmada
- ✅ `purchase_orders` - Confirmada

### Tablas con Nombres Alternativos

**Tablas que pueden tener múltiples nombres:**
- `users` / `user_profiles` - Ambas existen, `users` es más común
- `products` / `inventory` / `inventory_items` - `products` es la principal en código

---

## ✅ CAMBIOS APLICADOS

1. **PARTE 6: BASE DE DATOS**
   - Actualizado `users (user_profiles)` → `users` como tabla principal
   - Agregada nota sobre `user_profiles` como alternativa
   - Actualizado `inventory_products` → `products`
   - Corregida relación en `inventory_movements`: `product_id` → `products.id`

2. **PARTE 2: MÓDULOS**
   - Actualizada referencia a tabla de usuarios

3. **Nota de Verificación**
   - Agregada nota al inicio de PARTE 6 indicando que nombres fueron verificados

---

## ⚠️ RECOMENDACIONES

1. **Unificar tablas de usuarios**: Considerar consolidar `users` y `user_profiles` en una sola tabla
2. **Unificar tablas de inventario**: Verificar si `products`, `inventory`, e `inventory_items` son la misma tabla o diferentes
3. **Documentar alias**: Si existen vistas o alias, documentarlos claramente
4. **Actualizar código**: Considerar estandarizar nombres en código para evitar confusión

---

## 📝 NOTAS ADICIONALES

- El código muestra uso de `system_users` en algunos lugares (componentes de órdenes)
- Puede haber migraciones que crearon múltiples tablas similares
- Se recomienda ejecutar query SQL para listar todas las tablas reales en Supabase

