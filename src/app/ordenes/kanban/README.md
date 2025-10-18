# 📋 Kanban de Órdenes de Trabajo

## 🎯 Propósito

Sistema de gestión visual de órdenes de trabajo especializado en transmisiones automáticas. Permite visualizar y gestionar el flujo de trabajo desde la recepción hasta la entrega.

## 🏗️ Arquitectura

### Componentes Principales

1. **`page.tsx`** - Página principal del Kanban
2. **`KanbanColumn.tsx`** - Componente de columna con drag & drop
3. **`OrderCard.tsx`** - Tarjeta de orden arrastrable

### Hook Personalizado

- **`useWorkOrders.ts`** - Hook actualizado con funciones para Kanban

## 📊 Estados del Kanban

### Flujo de Trabajo para Transmisiones Automáticas

1. **🔄 Reception** - Orden recibida y registrada
2. **🔍 Diagnosis** - Evaluación inicial del problema
3. **💰 Initial Quote** - Estimación de costos y tiempo
4. **⏳ Waiting Approval** - Esperando aprobación del cliente
5. **🔧 Disassembly** - Desmontaje de la transmisión
6. **📦 Waiting Parts** - Esperando piezas de repuesto
7. **⚙️ Assembly** - Reensamblaje de la transmisión
8. **🧪 Testing** - Pruebas de funcionamiento
9. **✅ Ready** - Listo para entrega

### Estados Adicionales

- **✅ Completed** - Orden completada y entregada
- **❌ Cancelled** - Orden cancelada

## 🎨 Características de Diseño

### Colores por Estado

- **Reception**: Gris - Neutral, inicio del proceso
- **Diagnosis**: Azul - Análisis y evaluación
- **Initial Quote**: Morado - Estimación financiera
- **Waiting Approval**: Amarillo - Espera del cliente
- **Disassembly**: Naranja - Trabajo manual intensivo
- **Waiting Parts**: Rojo - Bloqueo por falta de piezas
- **Assembly**: Índigo - Reensamblaje técnico
- **Testing**: Cian - Verificación y pruebas
- **Ready**: Verde - Listo para entrega

### Funcionalidades

- **Drag & Drop** - Arrastrar órdenes entre columnas
- **Scroll Horizontal** - Navegación entre columnas
- **Scroll Vertical** - Navegación dentro de cada columna
- **Contador de Órdenes** - Badge con número de órdenes por estado
- **Días en Estado** - Indicador de tiempo transcurrido
- **Información Completa** - Cliente, vehículo, descripción, costo

## 🔧 Implementación Técnica

### Tecnologías Utilizadas

- **@dnd-kit/core** - Drag and drop principal
- **@dnd-kit/sortable** - Ordenamiento de elementos
- **@dnd-kit/modifiers** - Restricciones de movimiento
- **React Hooks** - Gestión de estado
- **TypeScript** - Tipado estático

### Configuración de Drag & Drop

```typescript
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // Requiere 8px de movimiento para activar
    },
  })
);
```

### Timeout de Peticiones

- **30 segundos** para todas las peticiones HTTP
- **AbortSignal** para cancelar peticiones lentas
- **Manejo de errores** con toast notifications

## 📱 Responsive Design

### Breakpoints

- **Mobile**: Scroll horizontal completo
- **Tablet**: 2-3 columnas visibles
- **Desktop**: 4-5 columnas visibles
- **Large**: Todas las columnas visibles

### Altura de Columnas

- **Altura fija**: `calc(100vh - 300px)`
- **Scroll vertical**: Para órdenes que excedan la altura
- **Overflow**: Manejo correcto del contenido

## 🔄 Flujo de Datos

### Carga Inicial

1. **Cargar órdenes** desde `/api/work-orders`
2. **Cargar clientes** desde `/api/customers`
3. **Cargar vehículos** desde `/api/vehicles`
4. **Agrupar por estado** para mostrar en columnas

### Actualización de Estado

1. **Detectar cambio** en drag & drop
2. **Validar nuevo estado** antes de enviar
3. **Actualizar en Supabase** via PUT `/api/work-orders/:id`
4. **Recargar datos** para sincronizar estado
5. **Mostrar notificación** de éxito/error

## 🛡️ Validaciones

### Cliente

- **Campos requeridos**: `customer_id`, `vehicle_id`
- **Tipos de datos**: UUIDs válidos
- **Estados válidos**: Solo los definidos en el Kanban

### Servidor

- **Constraint de BD**: Verificar estados en Supabase
- **Timeout**: 30 segundos máximo por petición
- **Rollback**: Revertir cambios en caso de error

## 📊 Métricas y Monitoreo

### Indicadores Visuales

- **Días en estado**: Color según tiempo transcurrido
  - Verde: ≤ 3 días
  - Amarillo: 4-7 días
  - Rojo: > 7 días

- **Contador de órdenes**: Badge en cada columna
- **Estado de carga**: Spinner durante operaciones
- **Notificaciones**: Toast para feedback del usuario

## 🔧 Mantenimiento

### Actualización de Estados

Para agregar nuevos estados:

1. **Actualizar `KANBAN_COLUMNS`** en `page.tsx`
2. **Actualizar constraint** en Supabase
3. **Actualizar tipos** en `useWorkOrders.ts`
4. **Probar drag & drop** entre nuevas columnas

### Script de Migración

```sql
-- Ejecutar en Supabase para actualizar estados
\i scripts/update-work-orders-status.sql
```

## 🚀 Uso

### Acceso

- **URL**: `/ordenes/kanban`
- **Navegación**: Órdenes > Kanban
- **Permisos**: Requiere autenticación

### Operaciones

- **Crear orden**: Botón "Nueva Orden" → `/ordenes`
- **Mover orden**: Arrastrar entre columnas
- **Refrescar**: Botón "Actualizar"
- **Ver detalles**: Click en tarjeta (futuro)

## 🔮 Futuras Mejoras

### Funcionalidades Planificadas

- **Filtros**: Por cliente, vehículo, fecha
- **Búsqueda**: Texto libre en órdenes
- **Vista detalle**: Modal con información completa
- **Historial**: Cambios de estado
- **Notificaciones**: Alertas por tiempo excedido
- **Exportación**: PDF/Excel del estado actual

### Optimizaciones

- **Virtualización**: Para muchas órdenes
- **Caché**: Reducir peticiones al servidor
- **Real-time**: WebSockets para actualizaciones
- **Offline**: Funcionalidad básica sin conexión
