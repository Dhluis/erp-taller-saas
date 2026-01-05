# 📋 Tabla de Archivos: Sistema de Órdenes

## 📅 Fecha: 3 de Diciembre 2025

---

## 🎯 Componentes Frontend

| Archivo | Líneas | Propósito | Estado | Acción |
|---------|--------|-----------|--------|--------|
| `src/components/ordenes/CreateWorkOrderModal.tsx` | ~1,900 | Modal de creación principal | ⚠️ Monolítico | Refactorizar |
| `src/components/dashboard/CreateWorkOrderModal.tsx` | ~800 | Modal alternativo | ❌ Duplicado | Consolidar |
| `src/components/ordenes/WorkOrderDetailsModal.tsx` | ~600 | Detalles de orden | ✅ OK | Mantener |
| `src/components/ordenes/WorkOrderTable.tsx` | ~400 | Tabla de órdenes | ✅ OK | Mantener |

---

## 🛣️ APIs Backend

| Endpoint | Archivo | Métodos | Estado | Notas |
|----------|---------|---------|--------|-------|
| `/api/orders` | `src/app/api/orders/route.ts` | GET, POST | ✅ OK | API principal |
| `/api/orders/[id]` | `src/app/api/orders/[id]/route.ts` | GET, PUT, DELETE | ✅ OK | CRUD individual |
| `/api/orders/[id]/items` | `src/app/api/orders/[id]/items/route.ts` | GET, POST | ✅ OK | Items de orden |
| `/api/orders/[id]/items/[itemId]` | `src/app/api/orders/[id]/items/[itemId]/route.ts` | PUT, DELETE | ✅ OK | Item individual |
| `/api/orders/[id]/totals` | `src/app/api/orders/[id]/totals/route.ts` | GET | ✅ OK | Cálculo de totales |
| `/api/orders/stats` | `src/app/api/orders/stats/route.ts` | GET | ✅ OK | Estadísticas |

---

## 📊 Queries de Base de Datos

| Archivo | Funciones | Propósito | Estado |
|---------|-----------|-----------|--------|
| `src/lib/database/queries/work-orders.ts` | 15+ | CRUD de órdenes | ✅ OK |
| `src/lib/database/queries/work-order-notes.ts` | 8+ | Notas de orden | ✅ OK |
| `src/lib/supabase/work-orders.ts` | 12+ | Cliente Supabase | ✅ OK |
| `src/lib/supabase/work-order-documents.ts` | 6+ | Documentos | ✅ OK |
| `src/lib/supabase/work-order-storage.ts` | 4+ | Storage | ✅ OK |

---

## 🪝 Hooks Personalizados

| Hook | Archivo | Propósito | Estado |
|------|---------|-----------|--------|
| `useWorkOrders` | `src/hooks/useWorkOrders.ts` | Gestión de órdenes | ✅ OK |
| `useCustomers` | `src/hooks/useCustomers.ts` | Gestión de clientes | ✅ OK |
| `useVehicles` | `src/hooks/useVehicles.ts` | Gestión de vehículos | ✅ OK |

---

## 📝 Tipos TypeScript

| Archivo | Contenido | Estado |
|---------|-----------|--------|
| `src/lib/types/work-orders.ts` | Interfaces y tipos | ✅ OK |
| `src/types/supabase-simple.ts` | Tipos de Supabase | ✅ OK |

---

## 📚 Documentación

| Documento | Contenido | Para Quién |
|-----------|-----------|------------|
| `RESUMEN_SISTEMA_ORDENES.md` | Vista general y guía rápida | Todos |
| `ARQUITECTURA_NUEVA_ORDEN.md` | Arquitectura completa y problemas | Desarrolladores |
| `PLAN_OPTIMIZACION_NUEVA_ORDEN.md` | Plan de mejora con código | Implementadores |
| `FIX_AUTOCOMPLETAR_CLIENTES_ORDEN.md` | Dropdown de clientes | Referencia técnica |
| `MEJORA_DROPDOWN_CLIENTES_UX.md` | UX del dropdown | Referencia técnica |
| `DEBUG_DROPDOWN_CLIENTES.md` | Guía de debugging | Troubleshooting |

---

## 🗄️ Base de Datos (Supabase)

### Tablas Principales

| Tabla | Columnas | Relaciones | RLS |
|-------|----------|------------|-----|
| `work_orders` | 20+ | customers, vehicles | ✅ |
| `customers` | 12+ | work_orders | ✅ |
| `vehicles` | 15+ | customers, work_orders | ✅ |
| `vehicle_inspections` | 25+ | work_orders | ✅ |
| `work_order_items` | 8+ | work_orders | ✅ |
| `work_order_notes` | 6+ | work_orders | ✅ |

### Vistas

| Vista | Propósito |
|-------|-----------|
| `work_orders_with_details` | Órdenes con joins |
| `order_stats_by_organization` | Estadísticas |

### Funciones

| Función | Propósito |
|---------|-----------|
| `generate_order_number()` | Generar número de orden |
| `calculate_order_totals()` | Calcular totales |

---

## 🔧 Configuración

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `.env.local` | Variables de entorno | ✅ OK |
| `src/lib/supabase/client.ts` | Cliente Supabase | ✅ OK |
| `src/lib/supabase/server.ts` | Servidor Supabase | ✅ OK |

---

## 📦 Dependencias Clave

### Actuales

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "@supabase/supabase-js": "^2.39.0",
    "react": "^19.0.0",
    "react-hook-form": "^7.49.0",
    "sonner": "^1.3.0",
    "lucide-react": "^0.344.0"
  }
}
```

### Recomendadas (Para Optimización)

```json
{
  "dependencies": {
    "zod": "^3.22.4",
    "@hookform/resolvers": "^3.3.4",
    "@tanstack/react-query": "^5.17.0",
    "@radix-ui/react-progress": "^1.0.3",
    "lodash-es": "^4.17.21",
    "date-fns": "^3.0.0"
  }
}
```

---

## 🎯 Métricas por Archivo

### CreateWorkOrderModal.tsx (Principal)

| Métrica | Valor | Estado |
|---------|-------|--------|
| **Líneas de código** | ~1,900 | ❌ Muy alto |
| **Complejidad ciclomática** | ~85 | ❌ Muy alta |
| **Dependencias** | 15+ | ⚠️ Alta |
| **Funciones** | 30+ | ⚠️ Alta |
| **Estado local** | 20+ variables | ❌ Muy alto |
| **useEffect** | 8+ | ⚠️ Alto |

**Recomendación:** Refactorizar URGENTE

---

### Archivos de Queries

| Archivo | LOC | Funciones | Estado |
|---------|-----|-----------|--------|
| `work-orders.ts` | ~800 | 15 | ✅ Bien |
| `work-order-notes.ts` | ~300 | 8 | ✅ Bien |

**Recomendación:** Mantener

---

## 🚨 Áreas de Riesgo

### Alta Prioridad

| Área | Riesgo | Impacto | Probabilidad |
|------|--------|---------|--------------|
| Modal monolítico | Bugs difíciles de encontrar | Alto | Alta |
| Sin transacciones | Datos inconsistentes | Crítico | Media |
| Validación manual | Errores de validación | Alto | Alta |

### Media Prioridad

| Área | Riesgo | Impacto | Probabilidad |
|------|--------|---------|--------------|
| Dropdown no escalable | Performance con muchos clientes | Medio | Alta |
| Sin autoguardado | Pérdida de datos | Medio | Baja |
| Feedback genérico | Confusión de usuario | Bajo | Alta |

---

## 🔄 Estado de Migraciones

| Migración | Estado | Fecha |
|-----------|--------|-------|
| Autocompletado de clientes | ✅ Completado | 03/12/2025 |
| UX del dropdown | ✅ Completado | 03/12/2025 |
| Debugging logs | ✅ Completado | 03/12/2025 |
| Validación con Zod | ⏳ Pendiente | - |
| Wizard de pasos | ⏳ Pendiente | - |
| Autoguardado | ⏳ Pendiente | - |
| Refactoring completo | ⏳ Pendiente | - |

---

## 📈 Plan de Mejora por Archivo

### CreateWorkOrderModal.tsx

**Acción:** Dividir en 6 archivos
```
CreateWorkOrderModal.tsx (orquestador)     200 líneas
CustomerStep.tsx                           150 líneas
VehicleStep.tsx                            150 líneas
InspectionStep.tsx                         100 líneas
SummaryStep.tsx                            100 líneas
ProgressBar.tsx                             50 líneas
useCreateOrderForm.ts (hook)              100 líneas
useCreateOrderMutation.ts (hook)           80 líneas
orderSchema.ts (validación)                60 líneas
```

**Total:** ~990 líneas (vs 1,900 actuales) = **-47% de código**

---

### APIs

**Acción:** Agregar middleware de validación

```typescript
// src/middleware/validateOrder.ts
export const validateOrderMiddleware = (schema: ZodSchema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({ errors: result.error.errors })
    }
    next()
  }
}
```

---

### Queries

**Acción:** Agregar transacciones

```typescript
// En work-orders.ts
export async function createWorkOrder(data: CreateWorkOrderData) {
  const supabase = createServiceClient()
  
  // ✅ Usar transacciones
  const { data: order, error } = await supabase.rpc('create_work_order_with_dependencies', {
    customer_data: data.customer,
    vehicle_data: data.vehicle,
    order_data: data.order,
    inspection_data: data.inspection
  })
  
  // Rollback automático si falla
}
```

---

## 🎓 Guía de Lectura Recomendada

### Para Desarrolladores Nuevos

1. Empieza con: `RESUMEN_SISTEMA_ORDENES.md`
2. Luego lee: `ARQUITECTURA_NUEVA_ORDEN.md`
3. Revisa: Los archivos en `src/components/ordenes/`

### Para Implementar Mejoras

1. Lee: `PLAN_OPTIMIZACION_NUEVA_ORDEN.md`
2. Revisa: Código de ejemplo en el plan
3. Consulta: Documentos de features implementadas

### Para Debugging

1. Consulta: `DEBUG_DROPDOWN_CLIENTES.md`
2. Revisa: Logs en consola
3. Busca: Errores en Supabase dashboard

---

## 🔗 Links Útiles

### Repositorio
- GitHub: `https://github.com/tu-repo/erp-taller-saas`
- Issues: `https://github.com/tu-repo/erp-taller-saas/issues`

### Supabase
- Dashboard: `https://supabase.com/dashboard`
- Logs: `https://supabase.com/dashboard/project/[project-id]/logs`

### Deploy
- Vercel: `https://vercel.com/dashboard`
- Producción: `https://erp-taller-saas.vercel.app`

---

## 📞 Soporte

### Documentación
- `docs/RESUMEN_SISTEMA_ORDENES.md` - Vista general
- `docs/ARQUITECTURA_NUEVA_ORDEN.md` - Arquitectura técnica
- `docs/PLAN_OPTIMIZACION_NUEVA_ORDEN.md` - Plan de mejora

### Contacto
- Team Lead: [Tu nombre]
- Tech Lead: [Nombre]
- Product Owner: [Nombre]

---

**Última actualización:** 3 de Diciembre 2025  
**Versión:** 1.0  
**Estado:** 📋 Completo y Actualizado















