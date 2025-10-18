# 📊 Sistema de KPIs y Métricas del ERP

## 🎯 Descripción

Sistema completo de KPIs (Key Performance Indicators) y métricas para el dashboard del ERP Taller SaaS, proporcionando análisis en tiempo real del rendimiento del taller.

## 🚀 Características

- ✅ **KPIs principales**: Órdenes, ingresos, clientes activos, stock bajo
- ✅ **Gráficos de ventas**: Análisis por día de los últimos 30 días
- ✅ **Análisis de órdenes**: Distribución por estado
- ✅ **Top clientes**: Ranking por gasto total
- ✅ **Top productos**: Ranking por ingresos
- ✅ **Inventario crítico**: Productos con stock bajo
- ✅ **Métricas de rendimiento**: Tiempo de completado, tasas de éxito
- ✅ **Autenticación**: Protegido con Supabase Auth
- ✅ **Documentación**: Swagger/OpenAPI completa

## 📁 Estructura de Archivos

```
src/
├── lib/database/queries/
│   └── kpis.ts                    # Funciones de consulta de KPIs
└── app/api/kpis/
    ├── dashboard/route.ts         # KPIs principales
    ├── sales-chart/route.ts       # Gráfico de ventas
    ├── orders-status/route.ts     # Órdenes por estado
    ├── top-customers/route.ts     # Top clientes
    ├── top-products/route.ts      # Top productos
    ├── low-stock/route.ts         # Productos con stock bajo
    ├── performance/route.ts       # Métricas de rendimiento
    └── info/route.ts              # Información del sistema
```

## 🔧 Funciones Disponibles

### 1. KPIs Principales del Dashboard
```typescript
// src/lib/database/queries/kpis.ts
export async function getDashboardKPIs(organizationId: string)
```

**Métricas incluidas:**
- **Órdenes**: Mes actual vs anterior con cambio porcentual
- **Ingresos**: Mes actual vs anterior con cambio porcentual
- **Clientes activos**: Número de clientes con órdenes este mes
- **Stock bajo**: Productos con cantidad menor al mínimo

### 2. Gráfico de Ventas
```typescript
export async function getSalesChart(organizationId: string, days: number = 30)
```

**Datos por día:**
- **Total**: Ventas totales del día
- **Completadas**: Ventas de órdenes completadas
- **Pendientes**: Ventas de órdenes pendientes

### 3. Órdenes por Estado
```typescript
export async function getOrdersByStatus(organizationId: string)
```

**Estados disponibles:**
- `pending`: Pendiente
- `in_progress`: En Progreso
- `completed`: Completado
- `cancelled`: Cancelado

### 4. Top Clientes
```typescript
export async function getTopCustomers(organizationId: string, limit: number = 10)
```

**Métricas por cliente:**
- **Total gastado**: Suma de todas las órdenes
- **Número de órdenes**: Cantidad de órdenes realizadas
- **Información del cliente**: Nombre, email, etc.

### 5. Top Productos
```typescript
export async function getTopProducts(organizationId: string, limit: number = 10)
```

**Métricas por producto:**
- **Ingresos totales**: Suma de ingresos generados
- **Número de órdenes**: Cantidad de órdenes que incluyen el producto
- **Información del producto**: Nombre, categoría, etc.

### 6. Inventario Crítico
```typescript
export async function getLowStockItems(organizationId: string)
```

**Información de stock:**
- **Cantidad actual**: Stock disponible
- **Stock mínimo**: Límite mínimo configurado
- **Déficit**: Cantidad faltante
- **Estado**: `low_stock` o `out_of_stock`

### 7. Métricas de Rendimiento
```typescript
export async function getPerformanceMetrics(organizationId: string)
```

**Indicadores de rendimiento:**
- **Tiempo promedio de completado**: En días
- **Tasa de completado**: Porcentaje de órdenes completadas
- **Órdenes pendientes**: Cantidad actual
- **Órdenes completadas**: Cantidad del mes
- **Total de órdenes**: Cantidad total del mes

## 🌐 Endpoints de API

### 1. KPIs Principales
```
GET /api/kpis/dashboard
```
**Parámetros:**
- `organization_id` (opcional): ID de la organización

**Respuesta:**
```json
{
  "data": {
    "orders": {
      "current": 25,
      "previous": 20,
      "percentageChange": 25.0
    },
    "revenue": {
      "current": 50000.00,
      "previous": 40000.00,
      "percentageChange": 25.0
    },
    "activeCustomers": 15,
    "lowStockItems": 3
  },
  "error": null
}
```

### 2. Gráfico de Ventas
```
GET /api/kpis/sales-chart?days=30
```
**Parámetros:**
- `organization_id` (opcional): ID de la organización
- `days` (opcional): Número de días (default: 30)

**Respuesta:**
```json
{
  "data": [
    {
      "date": "2024-01-15",
      "total": 1500.00,
      "completed": 1200.00,
      "pending": 300.00
    }
  ],
  "error": null
}
```

### 3. Órdenes por Estado
```
GET /api/kpis/orders-status
```
**Respuesta:**
```json
{
  "data": [
    {
      "status": "completed",
      "count": 45,
      "label": "Completado"
    },
    {
      "status": "in_progress",
      "count": 12,
      "label": "En Progreso"
    }
  ],
  "error": null
}
```

### 4. Top Clientes
```
GET /api/kpis/top-customers?limit=10
```
**Parámetros:**
- `organization_id` (opcional): ID de la organización
- `limit` (opcional): Número máximo de clientes (default: 10)

**Respuesta:**
```json
{
  "data": [
    {
      "customer": {
        "id": "uuid",
        "name": "Juan Pérez",
        "email": "juan@example.com"
      },
      "totalSpent": 5000.00,
      "ordersCount": 5
    }
  ],
  "error": null
}
```

### 5. Top Productos
```
GET /api/kpis/top-products?limit=10
```
**Respuesta:**
```json
{
  "data": [
    {
      "product": {
        "id": "uuid",
        "name": "Aceite Motor 5W-30",
        "category": "Lubricantes"
      },
      "totalRevenue": 2500.00,
      "ordersCount": 15
    }
  ],
  "error": null
}
```

### 6. Productos con Stock Bajo
```
GET /api/kpis/low-stock
```
**Respuesta:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Filtro de Aire",
      "code": "FIL-001",
      "stock_quantity": 2,
      "min_stock": 10,
      "deficit": 8,
      "status": "low_stock"
    }
  ],
  "error": null
}
```

### 7. Métricas de Rendimiento
```
GET /api/kpis/performance
```
**Respuesta:**
```json
{
  "data": {
    "avgCompletionTime": 3.5,
    "completionRate": 85.0,
    "pendingOrders": 8,
    "completedOrders": 45,
    "totalOrders": 53
  },
  "error": null
}
```

### 8. Información del Sistema
```
GET /api/kpis/info
```
**Respuesta:** Información completa del sistema de KPIs

## 🔐 Autenticación

Todos los endpoints (excepto `/api/kpis/info`) requieren autenticación:

```bash
# Ejemplo de uso con curl
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/kpis/dashboard
```

## 📊 Fuentes de Datos

### Tablas Principales
- **`work_orders`**: Órdenes de trabajo
- **`customers`**: Clientes
- **`products`**: Productos e inventario
- **`invoices`**: Facturas
- **`quotations`**: Cotizaciones

### Métodos de Agregación
- **COUNT**: Para conteos (órdenes, clientes, productos)
- **SUM**: Para totales (ingresos, gastos)
- **AVG**: Para promedios (tiempo de completado)
- **GROUP BY**: Para agrupaciones (por estado, por día)
- **DATE_TRUNC**: Para agrupación temporal

## 🛠️ Configuración

### Variables de Entorno
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Dependencias
```json
{
  "date-fns": "^2.30.0",
  "@supabase/ssr": "^0.0.10"
}
```

## 📈 Casos de Uso

### 1. Dashboard Principal
```typescript
// Obtener KPIs para el dashboard
const kpis = await getDashboardKPIs(organizationId)
console.log(`Órdenes este mes: ${kpis.orders.current}`)
console.log(`Ingresos: $${kpis.revenue.current}`)
console.log(`Clientes activos: ${kpis.activeCustomers}`)
```

### 2. Análisis de Ventas
```typescript
// Obtener gráfico de ventas de los últimos 30 días
const salesChart = await getSalesChart(organizationId, 30)
salesChart.forEach(day => {
  console.log(`${day.date}: $${day.total} (${day.completed} completadas)`)
})
```

### 3. Gestión de Inventario
```typescript
// Obtener productos con stock bajo
const lowStockItems = await getLowStockItems(organizationId)
lowStockItems.forEach(item => {
  if (item.status === 'out_of_stock') {
    console.log(`⚠️ ${item.name} está agotado`)
  } else {
    console.log(`⚠️ ${item.name} tiene stock bajo (${item.stock_quantity}/${item.min_stock})`)
  }
})
```

### 4. Análisis de Clientes
```typescript
// Obtener top clientes
const topCustomers = await getTopCustomers(organizationId, 5)
topCustomers.forEach((customer, index) => {
  console.log(`${index + 1}. ${customer.customer.name}: $${customer.totalSpent}`)
})
```

## 🚀 Ventajas del Sistema

### ✅ Para el Negocio
- **Visibilidad completa**: Métricas en tiempo real
- **Toma de decisiones**: Datos para decisiones informadas
- **Identificación de problemas**: Alertas automáticas
- **Análisis de tendencias**: Patrones de comportamiento

### ✅ Para el Desarrollo
- **API RESTful**: Endpoints estándar
- **Autenticación**: Seguridad integrada
- **Documentación**: Swagger/OpenAPI completa
- **Escalabilidad**: Fácil agregar nuevas métricas

### ✅ Para el Usuario Final
- **Dashboard intuitivo**: Métricas visuales
- **Alertas automáticas**: Notificaciones de stock bajo
- **Análisis detallado**: Información granular
- **Reportes automáticos**: Sin intervención manual

## 🔧 Personalización

### Agregar Nuevas Métricas
1. Crear función en `src/lib/database/queries/kpis.ts`
2. Crear endpoint en `src/app/api/kpis/[nueva-metrica]/route.ts`
3. Agregar documentación Swagger
4. Actualizar información del sistema

### Modificar Cálculos
1. Editar funciones en `kpis.ts`
2. Ajustar agregaciones SQL
3. Actualizar documentación
4. Probar endpoints

## 📝 Próximos Pasos

1. **Dashboard Frontend**: Crear interfaz visual
2. **Alertas automáticas**: Notificaciones de stock bajo
3. **Reportes programados**: Envío automático de métricas
4. **Análisis predictivo**: Machine learning para predicciones
5. **Integración con BI**: Herramientas de business intelligence

## 🎯 Conclusión

El sistema de KPIs está completamente implementado y funcionando, proporcionando:

- ✅ **7 tipos de métricas** diferentes
- ✅ **8 endpoints** de API documentados
- ✅ **Autenticación** y autorización
- ✅ **Documentación** completa con Swagger
- ✅ **Escalabilidad** para futuras métricas
- ✅ **Rendimiento** optimizado con consultas eficientes

**El ERP ahora tiene un sistema completo de análisis y métricas para el dashboard.** 🚀

