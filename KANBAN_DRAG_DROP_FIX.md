# 🔧 FIX DRAG & DROP EN KANBAN

## 📋 **Problema Reportado**
El drag and drop no funciona en el tablero Kanban de órdenes.

## ✅ **Cambios Realizados**

### 1. **OrderCard.tsx** - Mejorado el componente arrastr able

#### **Cambio 1: Configuración mejorada de useSortable**
```typescript
// ANTES
const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
  id: order.id 
});

// DESPUÉS
const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
  id: order.id,
  data: {
    type: 'order',
    order
  }
});
```

#### **Cambio 2: Estilo mejorado con cursor dinámico**
```typescript
// ANTES
const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.5 : 1,
};

// DESPUÉS
const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.5 : 1,
  cursor: isDragging ? 'grabbing' : 'grab',
};
```

#### **Cambio 3: Zona de arrastre mejorada**
```typescript
// Header - SOLO DRAGGABLE
<div
  {...attributes}
  {...listeners}
  className="flex items-center justify-between px-4 py-2 bg-slate-900/30 border-b border-slate-700/50 cursor-grab active:cursor-grabbing hover:bg-slate-800/50 transition-colors touch-none select-none"
  style={{ touchAction: 'none' }}
>
  <span className="text-xs text-slate-500 font-medium pointer-events-none">
    {formatDate(order.entry_date || order.created_at)}
  </span>
  <GripVertical className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors pointer-events-none" />
</div>
```

**Mejoras Aplicadas:**
- ✅ `touch-none` y `select-none` para evitar conflictos
- ✅ `touchAction: 'none'` para dispositivos táctiles
- ✅ `pointer-events-none` en elementos internos para evitar interferencias
- ✅ Visual feedback mejorado al arrastrar (ring y shadow)

### 2. **KanbanBoard.tsx** - Sensibilidad del sensor mejorada

#### **Cambio: Configuración del PointerSensor**
```typescript
// ANTES
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  })
);

// DESPUÉS
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5, // Reducido para mayor sensibilidad
      delay: 0,
      tolerance: 5,
    },
  })
);
```

**Mejoras Aplicadas:**
- ✅ Distancia reducida de 8px a 5px
- ✅ Sin delay para respuesta inmediata
- ✅ Tolerancia configurada para mejor precisión

#### **Cambio: Logs de debug mejorados**
```typescript
function handleDragStart(event: DragStartEvent) {
  const { active } = event;
  console.log('🎯 [handleDragStart] Iniciando drag:', active.id);
  
  const order = columns
    .flatMap(col => col.orders)
    .find(order => order.id === active.id);
  
  if (order) {
    console.log('✅ [handleDragStart] Orden encontrada:', order.customer?.name);
    setActiveOrder(order);
  } else {
    console.warn('⚠️ [handleDragStart] Orden no encontrada');
    setActiveOrder(null);
  }
}
```

## 🧪 **Cómo Probar**

### 1. **Verificar que el servidor esté corriendo**
```bash
npm run dev
```

### 2. **Navegar a la página de órdenes**
```
http://localhost:3000/ordenes
```

### 3. **Probar el drag and drop**

**Paso 1:** Busca una tarjeta de orden en el Kanban  
**Paso 2:** Haz clic y mantén presionado en el **header** de la tarjeta (donde está la fecha y el ícono de agarre)  
**Paso 3:** Arrastra la tarjeta hacia otra columna  
**Paso 4:** Suelta en la zona resaltada (se verá en color cyan cuando estés sobre ella)  

**Indicadores Visuales:**
- 🎯 **Cursor cambia** a "grab" cuando pasas sobre el header
- ✋ **Cursor cambia** a "grabbing" cuando estás arrastrando
- 💫 **Tarjeta se vuelve semi-transparente** (50% opacity) mientras arrastras
- 🎨 **Zona de drop se ilumina** en cyan cuando arrastras sobre ella
- ✨ **Overlay animado** muestra la tarjeta rotada y con sombra

### 4. **Revisar la consola del navegador**

Deberías ver logs como estos:
```
🎯 [handleDragStart] Iniciando drag: <order-id>
✅ [handleDragStart] Orden encontrada: Juan Pérez
🔄 [handleDragEnd] Debug info:
🔄 [handleDragEnd] active.id: <order-id>
🔄 [handleDragEnd] over.id: diagnosis
🔄 [handleDragEnd] Llamando updateOrderStatus con: { orderId, newStatus }
✅ Orden movida exitosamente
```

## ⚠️ **Problemas Comunes**

### **Problema 1: El drag no se activa**
**Causa:** Estás haciendo clic en el contenido de la tarjeta en lugar del header  
**Solución:** Haz clic específicamente en la zona superior con el icono de agarre (GripVertical)

### **Problema 2: La tarjeta se mueve pero no cambia de estado**
**Causa:** Error en la actualización de la base de datos o RLS policies  
**Solución:** Revisar la consola para mensajes de error y verificar políticas RLS de `work_orders`

### **Problema 3: El drop no funciona en ciertas columnas**
**Causa:** Las columnas no están registradas correctamente como droppable  
**Solución:** Verificar que `KanbanColumn` use `useDroppable` con el ID correcto

## 🔍 **Debugging Adicional**

Si el drag and drop sigue sin funcionar:

1. **Abrir DevTools (F12)**
2. **Ir a la pestaña Console**
3. **Intentar arrastrar una tarjeta**
4. **Buscar los logs con emoji 🎯 y 🔄**
5. **Verificar si hay errores en rojo**

### **Verificar que @dnd-kit esté instalado**
```bash
npm list @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Deberías ver:
```
@dnd-kit/core@6.3.1
@dnd-kit/sortable@10.0.0
@dnd-kit/utilities@3.2.2
```

## 📊 **Arquitectura del Drag & Drop**

```
DndContext (KanbanBoard)
  ├── sensors (PointerSensor con activationConstraint)
  ├── onDragStart → setActiveOrder
  └── onDragEnd → updateOrderStatus
      │
      ├── KanbanColumn (useDroppable)
      │   ├── SortableContext
      │   └── OrderCard (useSortable)
      │       ├── Header (draggable) → {...attributes} {...listeners}
      │       └── Content (clickable) → onClick
      │
      └── DragOverlay
          └── Active OrderCard (visual feedback)
```

## 🎯 **Resultados Esperados**

Después de estos cambios:

✅ **Drag and drop funciona** correctamente  
✅ **Feedback visual claro** durante el arrastre  
✅ **Estado se actualiza** en la BD inmediatamente  
✅ **UI se actualiza** optimistamente sin recargar  
✅ **Logs de debug** ayudan a identificar problemas  
✅ **Click en contenido** abre el modal (no interfiere con drag)  
✅ **Zona de arrastre clara** (solo el header)  

## 📝 **Notas Técnicas**

- **@dnd-kit** usa una arquitectura de contexto para gestionar el drag & drop
- **PointerSensor** detecta eventos de mouse/touch
- **activationConstraint** evita drags accidentales
- **useSortable** hace que un elemento sea draggable dentro de un contenedor
- **useDroppable** define zonas donde se pueden soltar elementos
- **DragOverlay** muestra una copia del elemento mientras se arrastra

## 🚀 **Próximos Pasos (Opcional)**

Si quieres mejorar aún más la experiencia:

1. **Agregar animaciones** al soltar
2. **Implementar drag multi-selección**
3. **Agregar confirmación** antes de ciertos movimientos
4. **Guardar posición** dentro de la misma columna
5. **Agregar undo/redo** para movimientos

---

**Fecha de Fix:** 2025-10-11  
**Versión:** 1.0  
**Archivos Modificados:**
- `src/components/ordenes/OrderCard.tsx`
- `src/components/ordenes/KanbanBoard.tsx`


