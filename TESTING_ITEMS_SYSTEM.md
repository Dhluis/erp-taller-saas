# 🧪 GUÍA DE TESTING - SISTEMA DE ITEMS EN ÓRDENES

## 📋 **OBJETIVO**
Verificar que el sistema de servicios y productos en órdenes de trabajo funciona correctamente.

---

## ✅ **PASO 1: PREPARAR LA BASE DE DATOS**

### 1.1. Verificar que existan las tablas necesarias

Ejecuta en Supabase SQL Editor:

```sql
-- Verificar tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('services', 'order_items', 'employees');
```

**Resultado esperado:** Deberías ver las 3 tablas.

### 1.2. Insertar servicios de ejemplo

Ejecuta el archivo `seed-services.sql` en Supabase SQL Editor.

**Resultado esperado:** Mensaje "Servicios insertados correctamente".

### 1.3. Verificar que existan productos en el inventario

```sql
SELECT id, name, price, stock_quantity 
FROM products 
WHERE is_active = true 
LIMIT 5;
```

**Resultado esperado:** Al menos 1 producto disponible.

### 1.4. Insertar un empleado mecánico (si no existe)

```sql
-- Obtener tu organization_id
SELECT id FROM organizations LIMIT 1;

-- Insertar mecánico de prueba (reemplaza el organization_id)
INSERT INTO employees (
  organization_id, 
  name, 
  email, 
  role, 
  is_active
)
VALUES (
  'TU_ORGANIZATION_ID_AQUI',
  'Juan Pérez',
  'juan.perez@example.com',
  'mechanic',
  true
)
ON CONFLICT DO NOTHING;
```

---

## ✅ **PASO 2: TESTING EN LA INTERFAZ**

### 2.1. Crear o abrir una orden de trabajo

1. Ve a **Órdenes** (`/ordenes`)
2. Haz clic en cualquier orden existente (o crea una nueva)
3. Se abrirá el modal de detalles

### 2.2. Navegar al Tab "Items"

1. Haz clic en el tab **Items** (ícono de recibo 📄)
2. Deberías ver el mensaje "No hay servicios o productos agregados"

### 2.3. Agregar un Servicio

1. Haz clic en **"Agregar Item"**
2. Selecciona:
   - **Tipo:** Servicio
   - **Servicio:** Cambio de Aceite
   - La descripción y precio se llenarán automáticamente
3. Modifica:
   - **Cantidad:** 1
   - **Descuento (%):** 10 (opcional)
   - **Mecánico:** Juan Pérez
   - **Estado:** Pendiente
4. Revisa el **preview de totales** en la parte inferior
5. Haz clic en **"Agregar"**

**Resultado esperado:**
- ✅ El item aparece en la lista
- ✅ Se muestra el ícono de servicio (🔧)
- ✅ El total se calcula correctamente
- ✅ Toast de éxito: "Item agregado"

### 2.4. Agregar un Producto

1. Haz clic en **"Agregar Item"** de nuevo
2. Selecciona:
   - **Tipo:** Producto
   - **Producto:** (Elige cualquier producto del inventario)
   - La descripción y precio se llenarán automáticamente
3. Modifica:
   - **Cantidad:** 2
   - **Estado:** Pendiente
4. Haz clic en **"Agregar"**

**Resultado esperado:**
- ✅ El item aparece en la lista
- ✅ Se muestra el ícono de producto (📦)
- ✅ El total general se actualiza sumando ambos items
- ✅ El resumen de totales muestra subtotal, IVA y total

### 2.5. Editar un Item

1. Haz clic en el botón **Editar** (✏️) de cualquier item
2. Cambia la cantidad a **2**
3. Agrega una nota: "Cliente solicitó doble"
4. Haz clic en **"Actualizar"**

**Resultado esperado:**
- ✅ El item se actualiza
- ✅ El total se recalcula automáticamente
- ✅ La nota aparece debajo del item
- ✅ Toast de éxito: "Item actualizado"

### 2.6. Cambiar el Estado de un Item

1. Edita cualquier item
2. Cambia el **Estado** a "En Proceso"
3. Guarda

**Resultado esperado:**
- ✅ El badge del estado cambia de color (gris → azul)
- ✅ El texto cambia a "En Proceso"

### 2.7. Eliminar un Item

1. Haz clic en el botón **Eliminar** (🗑️) de un item
2. Confirma la eliminación en el dialog

**Resultado esperado:**
- ✅ El item desaparece de la lista
- ✅ El total general se actualiza restando el item eliminado
- ✅ Toast de éxito: "Item eliminado"

---

## ✅ **PASO 3: VERIFICAR TOTALES EN LA BASE DE DATOS**

Después de agregar items, ejecuta:

```sql
SELECT 
  id,
  subtotal,
  tax_amount,
  discount_amount,
  total_amount
FROM work_orders
WHERE id = 'ID_DE_TU_ORDEN';
```

**Resultado esperado:**
- Los totales en la BD coinciden con los mostrados en la interfaz

---

## ✅ **PASO 4: VERIFICAR ITEMS EN LA BASE DE DATOS**

```sql
SELECT 
  item_type,
  description,
  quantity,
  unit_price,
  discount_percent,
  total,
  status
FROM order_items
WHERE order_id = 'ID_DE_TU_ORDEN'
ORDER BY created_at;
```

**Resultado esperado:**
- Todos los items agregados aparecen en la BD
- Los cálculos son correctos

---

## ✅ **PASO 5: TESTING DE CASOS EDGE**

### 5.1. Validación de Campos Obligatorios

1. Intenta agregar un item sin descripción
2. **Resultado esperado:** Toast de error "La descripción es obligatoria"

### 5.2. Cantidad Cero

1. Intenta poner cantidad = 0
2. **Resultado esperado:** Toast de error "La cantidad debe ser mayor a cero"

### 5.3. Orden Completada/Cancelada

1. Cambia el estado de la orden a "completed" en la BD:
   ```sql
   UPDATE work_orders SET status = 'completed' WHERE id = 'ID_ORDEN';
   ```
2. Intenta agregar un item
3. **Resultado esperado:** El botón "Agregar Item" está deshabilitado

### 5.4. Sin Servicios Disponibles

1. Desactiva todos los servicios:
   ```sql
   UPDATE services SET is_active = false;
   ```
2. Intenta agregar un servicio
3. **Resultado esperado:** El selector de servicios está vacío

---

## ✅ **PASO 6: TESTING DE CÁLCULOS**

### Test Case 1: Sin Descuento, Sin IVA
- **Cantidad:** 1
- **Precio Unitario:** 1000.00
- **Descuento:** 0%
- **IVA:** 0%
- **Total Esperado:** $1,000.00

### Test Case 2: Con IVA (16%)
- **Cantidad:** 1
- **Precio Unitario:** 1000.00
- **Descuento:** 0%
- **IVA:** 16%
- **Total Esperado:** $1,160.00

### Test Case 3: Con Descuento (10%) y IVA (16%)
- **Cantidad:** 1
- **Precio Unitario:** 1000.00
- **Descuento:** 10%
- **IVA:** 16%
- **Cálculo:**
  - Subtotal: 1000.00
  - Descuento: 100.00
  - Subtotal después descuento: 900.00
  - IVA (16% de 900): 144.00
  - **Total Esperado:** $1,044.00

### Test Case 4: Múltiples Cantidades
- **Cantidad:** 3
- **Precio Unitario:** 500.00
- **Descuento:** 5%
- **IVA:** 16%
- **Cálculo:**
  - Subtotal: 1500.00
  - Descuento: 75.00
  - Subtotal después descuento: 1425.00
  - IVA (16% de 1425): 228.00
  - **Total Esperado:** $1,653.00

---

## ✅ **PASO 7: TESTING DE INTEGRACIÓN**

### 7.1. Verificar que el Tab "General" muestra el total correcto

1. Agrega varios items
2. Ve al tab **General**
3. El campo "Total" debe coincidir con el total del tab "Items"

### 7.2. Verificar que onUpdate() se llama

1. Agrega un item
2. Verifica en la consola del navegador (F12):
   - Debe aparecer: `💰 Total actualizado: XXXX`

---

## 🐛 **PROBLEMAS COMUNES Y SOLUCIONES**

### ❌ Error: "No se puede cargar servicios"
**Solución:** Ejecuta `seed-services.sql` para insertar servicios.

### ❌ Error: "No se puede cargar productos"
**Solución:** Ve a Inventario y agrega al menos 1 producto.

### ❌ Error: "No se puede cargar empleados"
**Solución:** Inserta un mecánico (ver paso 1.4).

### ❌ Los totales no se actualizan
**Solución:** Verifica que la función `updateOrderTotals()` en la API se esté ejecutando correctamente.

### ❌ El tab Items está vacío
**Solución:** Recarga la página con Ctrl+Shift+R.

---

## ✅ **CHECKLIST FINAL**

- [ ] Puedo agregar un servicio
- [ ] Puedo agregar un producto
- [ ] Los totales se calculan correctamente (subtotal, descuento, IVA, total)
- [ ] Puedo editar un item
- [ ] Puedo eliminar un item
- [ ] Puedo asignar un mecánico
- [ ] Puedo cambiar el estado de un item
- [ ] El resumen de totales es correcto
- [ ] Los totales en la BD coinciden con la interfaz
- [ ] No puedo agregar items a órdenes completadas/canceladas
- [ ] Las validaciones funcionan (campos obligatorios, cantidad > 0)

---

## 📊 **RESULTADO ESPERADO**

Si todos los tests pasan:

✅ **SISTEMA DE ITEMS COMPLETAMENTE FUNCIONAL**

Ahora puedes:
- Agregar servicios y productos a las órdenes
- Calcular automáticamente los totales
- Asignar mecánicos a los trabajos
- Dar seguimiento al estado de cada item

---

**¿Encontraste algún problema? Copia el mensaje de error y el paso donde ocurrió.**




