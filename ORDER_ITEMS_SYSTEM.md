# 🔧 Sistema de Servicios/Items en Órdenes de Trabajo

## 🎯 **RESUMEN DEL SISTEMA**

Se ha implementado un sistema completo para gestionar servicios y productos dentro de las órdenes de trabajo, con cálculo automático de totales, descuentos e impuestos.

## 🗄️ **COMPONENTES IMPLEMENTADOS**

### **1. OrderItemsManager** (`src/components/orders/order-items-manager.tsx`)
- **Función**: Componente principal para gestionar items en una orden
- **Características**:
  - Tabla completa de items con todas las columnas necesarias
  - Botón "Agregar Item" que abre modal
  - Resumen de totales al final (subtotal, descuentos, IVA, total general)
  - Acciones de editar/eliminar items
  - Cálculo automático de totales

### **2. AddItemModal** (`src/components/orders/add-item-modal.tsx`)
- **Función**: Modal para agregar/editar items
- **Características**:
  - Toggle para tipo: Servicio o Producto
  - Auto-llenado de precios desde catálogos
  - Validación de stock para productos
  - Vista previa del cálculo en tiempo real
  - Selección de mecánico responsable

### **3. Página de Detalle de Orden** (`src/app/ordenes/[id]/page.tsx`)
- **Función**: Página completa de detalles de orden
- **Características**:
  - Información completa de la orden
  - Datos del cliente y vehículo
  - Sección de servicios y productos
  - Resumen de costos con comparación
  - Navegación de vuelta

## 🔌 **API ROUTES IMPLEMENTADAS**

### **1. CRUD de Order Items**
- **`/api/orders/[id]/items`** - GET (listar) y POST (crear)
- **`/api/orders/[id]/items/[itemId]`** - PUT (actualizar) y DELETE (eliminar)

### **2. APIs Auxiliares**
- **`/api/services`** - Listar servicios disponibles
- **`/api/inventory`** - Listar inventario disponible
- **`/api/employees`** - Listar mecánicos disponibles
- **`/api/orders/[id]`** - Obtener/actualizar detalles de orden

## 📊 **FUNCIONES DE BASE DE DATOS**

### **Archivo**: `src/lib/supabase/order-items.ts`
- **`getOrderItems()`** - Obtener items de una orden
- **`createOrderItem()`** - Crear nuevo item
- **`updateOrderItem()`** - Actualizar item existente
- **`deleteOrderItem()`** - Eliminar item
- **`calculateOrderTotals()`** - Calcular totales
- **`updateOrderTotal()`** - Actualizar total de orden
- **`getAvailableServices()`** - Servicios disponibles
- **`getAvailableInventory()`** - Inventario disponible
- **`getAvailableMechanics()`** - Mecánicos disponibles

## 🧮 **CÁLCULOS AUTOMÁTICOS**

### **Fórmulas Implementadas**:
```typescript
// Cálculo de totales por item
subtotal = quantity × unit_price
discount_amount = subtotal × (discount_percent / 100)
taxable_amount = subtotal - discount_amount
tax_amount = taxable_amount × (tax_percent / 100)
total = taxable_amount + tax_amount

// Total general de la orden
grandTotal = sum(all_items.total)
```

### **Validaciones**:
- ✅ Verificación de stock para productos
- ✅ Actualización automática de inventario
- ✅ Cálculo de totales en tiempo real
- ✅ Validación de datos requeridos

## 🎨 **INTERFAZ DE USUARIO**

### **Tabla de Items**:
| Columna | Descripción |
|---------|-------------|
| Tipo | Icono y badge (Servicio/Producto) |
| Descripción | Nombre del servicio/producto |
| Mecánico | Empleado asignado |
| Cantidad | Cantidad solicitada |
| Precio Unit. | Precio por unidad |
| Descuento | Porcentaje de descuento |
| Subtotal | Cantidad × Precio |
| IVA | Impuesto calculado |
| Total | Subtotal - Descuento + IVA |
| Estado | Pendiente/En Proceso/Completado |
| Acciones | Editar/Eliminar |

### **Modal de Agregar/Editar**:
- **Toggle de Tipo**: Servicio vs Producto
- **Selección Inteligente**: Auto-llenado de precios
- **Validación de Stock**: Para productos
- **Vista Previa**: Cálculos en tiempo real
- **Notas**: Campo de observaciones

## 🔄 **FLUJO DE TRABAJO**

### **1. Agregar Item a Orden**:
1. Usuario hace clic en "Agregar Item"
2. Selecciona tipo (Servicio/Producto)
3. Elige del catálogo correspondiente
4. Ajusta cantidad, precio y descuentos
5. Asigna mecánico responsable
6. Ve vista previa del cálculo
7. Guarda el item

### **2. Gestión de Stock**:
- **Productos**: Se valida stock disponible
- **Actualización**: Stock se reduce al agregar
- **Restauración**: Stock se restaura al eliminar
- **Validación**: No permite exceder stock

### **3. Cálculo de Totales**:
- **Automático**: Se calcula al guardar
- **Tiempo Real**: Vista previa en modal
- **Actualización**: Total de orden se actualiza
- **Persistencia**: Se guarda en base de datos

## 🚀 **CÓMO USAR EL SISTEMA**

### **1. Desde la Lista de Órdenes**:
1. Ve a **Órdenes** en el menú
2. Haz clic en **"Ver Detalles"** en cualquier orden
3. Se abre la página de detalles de la orden

### **2. En la Página de Detalles**:
1. Ve la sección **"Servicios y Productos"**
2. Haz clic en **"Agregar Item"**
3. Completa el formulario
4. Guarda el item
5. Ve el resumen de totales

### **3. Gestión de Items**:
- **Editar**: Haz clic en el ícono de editar
- **Eliminar**: Haz clic en el ícono de eliminar
- **Ver Totales**: Revisa el resumen al final

## 📱 **NAVEGACIÓN MEJORADA**

### **Enlaces Agregados**:
- **"Ver Detalles"** en cada tarjeta de orden
- **Navegación de vuelta** en página de detalles
- **Enlaces directos** a órdenes específicas

### **URLs**:
- **Lista**: `/ordenes`
- **Detalle**: `/ordenes/[id]`
- **API**: `/api/orders/[id]/items`

## 🔧 **CONFIGURACIÓN NECESARIA**

### **1. Base de Datos**:
- Ejecutar migración SQL de `002_add_new_features.sql`
- Verificar que las tablas existan
- Confirmar que RLS esté configurado

### **2. Variables de Entorno**:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **3. Dependencias**:
- Todas las dependencias ya están instaladas
- No se requieren instalaciones adicionales

## 🐛 **TROUBLESHOOTING**

### **Error: "Module not found: use-toast"**
```bash
# Reiniciar servidor de desarrollo
npm run dev
```

### **Error: "Table not found"**
```sql
-- Verificar que las tablas existan
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('order_items', 'services', 'employees');
```

### **Error: "Stock insuficiente"**
- Verificar que el producto tenga stock disponible
- Revisar la tabla `inventory`
- Confirmar que la cantidad no exceda el stock

## 🎯 **PRÓXIMOS PASOS**

1. **Probar el sistema** con datos reales
2. **Configurar servicios** en la base de datos
3. **Agregar inventario** de productos
4. **Asignar mecánicos** a la organización
5. **Crear órdenes de prueba** con items

---

**¡El sistema de servicios/items está completamente implementado y listo para usar!** 🎉

