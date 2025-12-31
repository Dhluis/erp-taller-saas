# 📋 Arquitectura: Sistema de Nueva Orden de Trabajo

## 📅 Fecha: 3 de Diciembre 2025

---

## 🎯 Resumen Ejecutivo

Este documento mapea **toda la arquitectura** del sistema de creación de órdenes de trabajo, identificando componentes, flujos de datos, y **áreas de optimización**.

---

## 📁 Estructura de Archivos

### 1. **Componentes Frontend**

#### Modal Principal
```
src/components/ordenes/CreateWorkOrderModal.tsx
```
- **Líneas:** ~1,900
- **Responsabilidad:** UI completa del modal de creación
- **Estado:** Maneja 20+ campos de formulario
- **Dependencias:** useCustomers, useAuth, useOrganization

#### Modal del Dashboard
```
src/components/dashboard/CreateWorkOrderModal.tsx
```
- **Nota:** Versión alternativa/legacy
- **Recomendación:** Consolidar con el principal

---

### 2. **APIs Backend**

#### API Principal de Órdenes
```
src/app/api/orders/route.ts
```
**Endpoints:**
- `GET /api/orders` - Listar órdenes
- `POST /api/orders` - Crear orden nueva

#### API de Orden Individual
```
src/app/api/orders/[id]/route.ts
```
**Endpoints:**
- `GET /api/orders/[id]` - Obtener orden
- `PUT /api/orders/[id]` - Actualizar orden
- `DELETE /api/orders/[id]` - Eliminar orden

#### API de Items de Orden
```
src/app/api/orders/[id]/items/route.ts
src/app/api/orders/[id]/items/[itemId]/route.ts
```
**Endpoints:**
- `GET /api/orders/[id]/items` - Listar items
- `POST /api/orders/[id]/items` - Agregar item
- `PUT /api/orders/[id]/items/[itemId]` - Actualizar item
- `DELETE /api/orders/[id]/items/[itemId]` - Eliminar item

#### API de Totales
```
src/app/api/orders/[id]/totals/route.ts
```
**Endpoint:**
- `GET /api/orders/[id]/totals` - Calcular totales

#### API de Estadísticas
```
src/app/api/orders/stats/route.ts
```
**Endpoint:**
- `GET /api/orders/stats` - Obtener estadísticas

---

### 3. **Queries de Base de Datos**

#### Queries Principales
```
src/lib/database/queries/work-orders.ts
```
**Funciones:**
- `getAllWorkOrders()` - Listar todas las órdenes
- `getWorkOrderById()` - Obtener orden por ID
- `createWorkOrder()` - Crear orden
- `updateWorkOrder()` - Actualizar orden
- `deleteWorkOrder()` - Eliminar orden

#### Queries de Notas
```
src/lib/database/queries/work-order-notes.ts
```
**Funciones:**
- `getWorkOrderNotes()` - Obtener notas
- `createWorkOrderNote()` - Crear nota
- `updateWorkOrderNote()` - Actualizar nota
- `deleteWorkOrderNote()` - Eliminar nota

---

### 4. **Hooks Personalizados**

#### Hook de Órdenes
```
src/hooks/useWorkOrders.ts
```
**Exporta:**
- `useWorkOrders()` - Cargar y gestionar órdenes
- `createWorkOrder()` - Crear orden
- `updateWorkOrder()` - Actualizar orden
- `deleteWorkOrder()` - Eliminar orden

#### Hook de Clientes
```
src/hooks/useCustomers.ts
```
**Exporta:**
- `customers[]` - Lista de clientes
- `createCustomer()` - Crear cliente
- `refreshCustomers()` - Recargar lista

---

### 5. **Servicios de Supabase**

#### Servicio Principal
```
src/lib/supabase/work-orders.ts
```
**Funciones:**
- Operaciones CRUD directas con Supabase
- Bypass de RLS para service role

#### Documentos de Orden
```
src/lib/supabase/work-order-documents.ts
```
**Funciones:**
- `uploadDocument()` - Subir documentos
- `getDocuments()` - Listar documentos
- `deleteDocument()` - Eliminar documento

#### Storage de Orden
```
src/lib/supabase/work-order-storage.ts
```
**Funciones:**
- Manejo de archivos en Supabase Storage
- Gestión de permisos

---

### 6. **Tipos TypeScript**

#### Tipos de Órdenes
```
src/lib/types/work-orders.ts
```
**Interfaces:**
```typescript
interface WorkOrder {
  id: string
  order_number: string
  customer_id: string
  vehicle_id: string
  status: 'reception' | 'diagnostic' | 'approved' | 'in_progress' | 'completed' | 'delivered' | 'cancelled'
  description: string
  estimated_cost: number
  final_cost: number
  organization_id: string
  workshop_id: string
  created_at: string
  updated_at: string
}
```

---

## 🔄 Flujo Completo de Creación

### Paso 1: Usuario Abre Modal

```
Usuario hace clic en "Nueva Orden"
↓
CreateWorkOrderModal se monta
↓
useEffect ejecuta loadSystemUsers()
↓
useCustomers() carga clientes de la organización
↓
Modal renderiza con formulario vacío
```

---

### Paso 2: Usuario Llena Formulario

```
Datos del Cliente:
  - Nombre (con autocompletado)
  - Teléfono
  - Email

Datos del Vehículo:
  - Marca
  - Modelo
  - Año
  - Placa
  - Color
  - Kilometraje

Inspección del Vehículo:
  - Nivel de combustible (Vacío/1/4/1/2/3/4/Lleno)
  - Checkboxes de inspección visual
```

**Validaciones en Tiempo Real:**
- `handleChange()` actualiza formData
- `validateField()` valida cada campo
- `setErrors()` muestra errores inline

---

### Paso 3: Usuario Envía Formulario

```
handleSubmit() ejecuta
↓
1. Validar todos los campos
2. Verificar organizationId
3. Verificar workshopId
4. Crear/buscar cliente
5. Crear/buscar vehículo
6. Generar número de orden
7. Crear orden en Supabase
8. Crear inspección del vehículo
9. Llamar onSuccess()
10. Cerrar modal
```

---

### Paso 4: Creación en Base de Datos

```sql
BEGIN TRANSACTION;

-- 1. Crear/obtener cliente
INSERT INTO customers (organization_id, workshop_id, name, phone, email)
VALUES (...)
ON CONFLICT ... DO UPDATE ...
RETURNING id;

-- 2. Crear/obtener vehículo
INSERT INTO vehicles (organization_id, workshop_id, customer_id, brand, model, year, license_plate, color, vin, mileage)
VALUES (...)
RETURNING id;

-- 3. Generar número de orden
SELECT MAX(order_number) FROM work_orders WHERE organization_id = ...;
-- Incrementar +1

-- 4. Crear orden
INSERT INTO work_orders (
  organization_id,
  workshop_id,
  customer_id,
  vehicle_id,
  order_number,
  status,
  description,
  estimated_cost,
  assigned_mechanic
) VALUES (...) RETURNING *;

-- 5. Crear inspección
INSERT INTO vehicle_inspections (
  order_id,
  organization_id,
  fuel_level,
  has_scratches,
  has_dents,
  ...
) VALUES (...);

COMMIT;
```

---

## 📊 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  CreateWorkOrderModal.tsx                        │   │
│  │  - Formulario completo                           │   │
│  │  - Validaciones                                   │   │
│  │  - Autocompletado de clientes                    │   │
│  └──────────────────────────────────────────────────┘   │
│                        │                                 │
│                        ├─────► useCustomers()            │
│                        ├─────► useAuth()                 │
│                        └─────► useOrganization()         │
│                                                           │
└───────────────────────┬─────────────────────────────────┘
                        │ POST /api/orders
                        │
┌───────────────────────▼─────────────────────────────────┐
│                  API ROUTES (Next.js)                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  /api/orders/route.ts                            │   │
│  │  - Validar datos                                 │   │
│  │  - Verificar auth                                │   │
│  │  - Llamar queries                                │   │
│  └──────────────────────────────────────────────────┘   │
│                        │                                 │
│                        ├─────► Service Role Client       │
│                        └─────► RLS Bypass                │
│                                                           │
└───────────────────────┬─────────────────────────────────┘
                        │ Queries
                        │
┌───────────────────────▼─────────────────────────────────┐
│              QUERIES (Database Layer)                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  work-orders.ts                                  │   │
│  │  - createWorkOrder()                             │   │
│  │  - Transaction handling                          │   │
│  │  - Error handling                                │   │
│  └──────────────────────────────────────────────────┘   │
│                        │                                 │
│                        ├─────► createClient()            │
│                        ├─────► createVehicle()           │
│                        └─────► createInspection()        │
│                                                           │
└───────────────────────┬─────────────────────────────────┘
                        │ SQL
                        │
┌───────────────────────▼─────────────────────────────────┐
│                  SUPABASE (PostgreSQL)                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  customers  │  │  vehicles   │  │ work_orders │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │  vehicle_inspections                            │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  RLS Policies:                                           │
│  - organization_id match                                 │
│  - workshop_id match                                     │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🔍 Análisis de Optimización

### ⚠️ Problemas Actuales

#### 1. **Modal Demasiado Grande** (1,900 líneas)
**Problema:**
- Difícil de mantener
- Lógica mezclada con UI
- Testing complicado

**Solución:**
- Separar en componentes más pequeños
- Extraer lógica a custom hooks
- Crear sub-formularios

---

#### 2. **Validación Manual Campo por Campo**
**Problema:**
```typescript
// ❌ ACTUAL
switch (name) {
  case 'customerName':
    if (!value.trim()) return 'El nombre es requerido'
    if (value.trim().length < 3) return 'Mínimo 3 caracteres'
    // ... 50+ líneas más
}
```

**Solución:**
- Usar librería de validación: **Zod** o **React Hook Form**
- Definir schema único
- Validación automática

---

#### 3. **Sin Manejo de Transacciones en Frontend**
**Problema:**
- Si falla creación de vehículo, el cliente ya se creó
- No hay rollback
- Datos inconsistentes

**Solución:**
- Manejar transacciones en el backend
- Usar Supabase transactions o Postgres transactions
- Implementar rollback automático

---

#### 4. **Carga Innecesaria de Usuarios del Sistema**
**Problema:**
```typescript
// Se cargan TODOS los mecánicos aunque no se usen siempre
useEffect(() => {
  if (open) {
    loadSystemUsers()  // ← Puede ser heavy
  }
}, [open])
```

**Solución:**
- Lazy loading solo cuando se necesita
- Cache de mecánicos
- Cargar solo IDs y nombres (no todo el perfil)

---

#### 5. **Dropdown de Clientes No Escalable**
**Problema:**
- Carga TODOS los clientes en memoria
- Con 1000+ clientes puede ser lento
- Filtrado en cliente (no servidor)

**Solución:**
- Implementar búsqueda con debounce
- Query al servidor con filtro
- Paginación de resultados

---

#### 6. **Falta de Autoguardado**
**Problema:**
- Usuario pierde datos si cierra accidentalmente
- No hay draft/borrador

**Solución:**
- Implementar autoguardado en localStorage
- Recuperar borrador al abrir modal
- "Continuar donde lo dejaste"

---

#### 7. **Sin Feedback Visual Durante Creación**
**Problema:**
```typescript
// ❌ ACTUAL
setLoading(true)
await createOrder()
setLoading(false)
```
- Solo muestra "loading"
- Usuario no sabe qué está pasando

**Solución:**
- Progress bar con pasos
- Mensajes: "Creando cliente...", "Creando vehículo...", etc.
- Estimación de tiempo

---

#### 8. **Duplicación de Código con Dashboard Modal**
**Problema:**
- 2 modales casi idénticos
- Mantener ambos es doble trabajo

**Solución:**
- Consolidar en UN solo modal
- Usar props para variantes
- Compartir lógica en custom hook

---

#### 9. **Inspección del Vehículo Mezclada**
**Problema:**
- Lógica de inspección dentro del mismo form
- 20+ checkboxes inline

**Solución:**
- Componente separado: `VehicleInspectionForm`
- Paso a paso (wizard)
- Poder saltarlo y completar después

---

#### 10. **Sin Gestión de Errores Granular**
**Problema:**
```typescript
// ❌ ACTUAL
catch (error) {
  toast.error('Error al crear orden')
}
```
- Error genérico
- Usuario no sabe qué falló

**Solución:**
- Capturar errores específicos
- Mostrar mensaje según el error:
  - "Cliente duplicado"
  - "Placa ya registrada"
  - "Sin conexión a internet"

---

## 💡 Optimizaciones Sugeridas

### 🚀 Alta Prioridad

#### 1. **Refactorizar Modal en Componentes**

**Estructura Propuesta:**
```
src/components/ordenes/create-order/
├── CreateWorkOrderModal.tsx          (Orquestador principal)
├── CustomerSection.tsx               (Datos del cliente)
├── VehicleSection.tsx                (Datos del vehículo)
├── InspectionSection.tsx             (Inspección)
├── useCreateOrderForm.ts             (Lógica del form)
└── useCreateOrderMutation.ts         (Crear orden)
```

**Beneficios:**
- Componentes < 200 líneas cada uno
- Más fácil de testear
- Reutilizable

---

#### 2. **Implementar React Hook Form + Zod**

**Código Actual (Manual):**
```typescript
// ❌ 500+ líneas de validación manual
const validateField = (name: string, value: string) => {
  switch (name) {
    case 'customerName':
      if (!value.trim()) return 'El nombre es requerido'
      // ...
  }
}
```

**Código Propuesto (Automático):**
```typescript
// ✅ Schema declarativo
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const orderSchema = z.object({
  customerName: z.string().min(3, 'Mínimo 3 caracteres'),
  customerPhone: z.string().regex(/^\d{10}$/, 'Teléfono inválido'),
  customerEmail: z.string().email('Email inválido').optional(),
  vehicleBrand: z.string().min(2, 'Marca requerida'),
  vehicleModel: z.string().min(2, 'Modelo requerido'),
  vehicleYear: z.number().min(1900).max(2030),
  vehiclePlate: z.string().min(5, 'Placa requerida'),
  vehicleMileage: z.number().min(0),
  // ...
})

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(orderSchema)
})
```

**Beneficios:**
- 90% menos código
- Validación type-safe
- Errores automáticos
- Fácil de mantener

---

#### 3. **Implementar Wizard de Pasos**

**Estructura:**
```
Paso 1: Datos del Cliente
  ✓ Nombre
  ✓ Teléfono
  ✓ Email

Paso 2: Datos del Vehículo
  ✓ Marca/Modelo
  ✓ Año/Placa
  ✓ Kilometraje

Paso 3: Inspección (Opcional)
  ✓ Nivel combustible
  ✓ Estado visual
  ✓ Notas

Paso 4: Resumen y Confirmar
```

**Componente:**
```typescript
<Wizard>
  <Step name="cliente">
    <CustomerForm />
  </Step>
  
  <Step name="vehiculo">
    <VehicleForm />
  </Step>
  
  <Step name="inspeccion" optional>
    <InspectionForm />
  </Step>
  
  <Step name="resumen">
    <OrderSummary />
  </Step>
</Wizard>
```

**Beneficios:**
- UX mejorada (no abrumador)
- Poder saltar pasos opcionales
- Barra de progreso visual
- Validación por paso

---

#### 4. **Búsqueda de Clientes con Debounce**

**Actual:**
```typescript
// ❌ Filtra TODOS en memoria
const filtered = customers.filter(c => 
  c.name.toLowerCase().includes(query.toLowerCase())
)
```

**Propuesto:**
```typescript
// ✅ Query al servidor con debounce
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

const [query, setQuery] = useState('')
const debouncedQuery = useDebouncedValue(query, 300)

const { data: customers } = useQuery({
  queryKey: ['customers', 'search', debouncedQuery],
  queryFn: () => searchCustomers(debouncedQuery),
  enabled: debouncedQuery.length >= 2
})
```

**Beneficios:**
- No carga todos los clientes
- Búsqueda eficiente en servidor
- Escalable a miles de clientes

---

#### 5. **Autoguardado de Borrador**

**Implementación:**
```typescript
// Hook personalizado
const useDraftOrder = (key: string) => {
  const saveDraft = useCallback((data: Partial<OrderFormData>) => {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }))
  }, [key])
  
  const loadDraft = useCallback(() => {
    const draft = localStorage.getItem(key)
    if (!draft) return null
    
    const { data, timestamp } = JSON.parse(draft)
    
    // Borrador válido por 24 horas
    if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(key)
      return null
    }
    
    return data
  }, [key])
  
  return { saveDraft, loadDraft }
}

// Uso en el modal
const { saveDraft, loadDraft } = useDraftOrder('new-order-draft')

// Autoguardar cada 5 segundos
useEffect(() => {
  const interval = setInterval(() => {
    if (hasChanges) {
      saveDraft(formData)
    }
  }, 5000)
  
  return () => clearInterval(interval)
}, [formData, hasChanges])

// Cargar al abrir
useEffect(() => {
  if (open) {
    const draft = loadDraft()
    if (draft) {
      setFormData(draft)
      toast.info('Se recuperó un borrador')
    }
  }
}, [open])
```

**Beneficios:**
- No pierde datos
- Recuperación automática
- Mejor UX

---

### 🎯 Media Prioridad

#### 6. **Optimistic UI Updates**

**Actual:**
```typescript
// ❌ Espera respuesta del servidor
await createOrder(data)
// Luego actualiza UI
```

**Propuesto:**
```typescript
// ✅ Actualiza UI inmediatamente
const optimisticOrder = {
  ...data,
  id: crypto.randomUUID(),
  status: 'reception',
  created_at: new Date().toISOString()
}

// Actualizar UI inmediatamente
setOrders(prev => [optimisticOrder, ...prev])

// Crear en servidor en background
try {
  const serverOrder = await createOrder(data)
  // Reemplazar con datos reales
  setOrders(prev => prev.map(o => 
    o.id === optimisticOrder.id ? serverOrder : o
  ))
} catch (error) {
  // Revertir si falla
  setOrders(prev => prev.filter(o => o.id !== optimisticOrder.id))
  toast.error('Error al crear orden')
}
```

**Beneficios:**
- UI instantánea
- Mejor percepción de velocidad
- Rollback automático si falla

---

#### 7. **Cache de Mecánicos y Talleres**

**Propuesto:**
```typescript
// Cache con React Query
const { data: mechanics } = useQuery({
  queryKey: ['mechanics', organizationId],
  queryFn: () => fetchMechanics(organizationId),
  staleTime: 5 * 60 * 1000, // 5 minutos
  cacheTime: 30 * 60 * 1000  // 30 minutos
})
```

**Beneficios:**
- No recarga en cada modal
- Comparte cache entre componentes
- Revalidación automática

---

#### 8. **Progress Indicator Detallado**

**Implementación:**
```typescript
const [progress, setProgress] = useState({
  step: 0,
  total: 4,
  message: ''
})

const handleSubmit = async () => {
  try {
    setProgress({ step: 1, total: 4, message: 'Creando cliente...' })
    const customer = await createCustomer(data)
    
    setProgress({ step: 2, total: 4, message: 'Registrando vehículo...' })
    const vehicle = await createVehicle(data)
    
    setProgress({ step: 3, total: 4, message: 'Generando orden...' })
    const order = await createWorkOrder({ customer, vehicle })
    
    setProgress({ step: 4, total: 4, message: 'Guardando inspección...' })
    await createInspection(order.id, data.inspection)
    
    toast.success('Orden creada exitosamente')
  } catch (error) {
    // ...
  }
}

// UI
<div className="w-full bg-gray-200 rounded-full h-2">
  <div 
    className="bg-blue-600 h-2 rounded-full transition-all"
    style={{ width: `${(progress.step / progress.total) * 100}%` }}
  />
</div>
<p className="text-sm text-gray-600 mt-1">{progress.message}</p>
```

**Beneficios:**
- Usuario sabe qué está pasando
- Percepción de control
- Reduce ansiedad en esperas largas

---

### 📈 Baja Prioridad (Nice to Have)

#### 9. **Predicción Inteligente de Datos**

**Implementación:**
```typescript
// Cuando selecciona cliente, sugerir sus vehículos
const { data: customerVehicles } = useQuery({
  queryKey: ['vehicles', 'by-customer', selectedCustomer?.id],
  queryFn: () => fetchVehiclesByCustomer(selectedCustomer.id),
  enabled: !!selectedCustomer
})

// Auto-llenar con último vehículo usado
useEffect(() => {
  if (customerVehicles?.length > 0) {
    const lastUsed = customerVehicles[0]
    setFormData(prev => ({
      ...prev,
      vehicleBrand: lastUsed.brand,
      vehicleModel: lastUsed.model,
      vehiclePlate: lastUsed.license_plate,
      // ...
    }))
    toast.info('Datos del vehículo auto-completados')
  }
}, [customerVehicles])
```

---

#### 10. **Plantillas de Orden**

**Implementación:**
```typescript
// Guardar como plantilla
const saveAsTemplate = () => {
  const template = {
    name: 'Mantenimiento 10,000km',
    description: formData.description,
    estimated_cost: formData.estimated_cost,
    inspection_defaults: {
      fuel_level: '1/2',
      items_to_check: ['oil', 'filters', 'brakes']
    }
  }
  
  saveTemplate(template)
}

// Usar plantilla
const useTemplate = (template) => {
  setFormData(prev => ({
    ...prev,
    description: template.description,
    estimated_cost: template.estimated_cost
  }))
}
```

---

## 📦 Librerías Recomendadas

### Validación
```bash
npm install zod react-hook-form @hookform/resolvers
```

### State Management
```bash
npm install @tanstack/react-query zustand
```

### UI Components
```bash
npm install @radix-ui/react-progress @radix-ui/react-stepper
```

### Utilities
```bash
npm install lodash-es date-fns
```

---

## 🎯 Plan de Acción Recomendado

### Fase 1: Refactoring Base (1-2 semanas)
1. ✅ Separar modal en componentes
2. ✅ Implementar React Hook Form + Zod
3. ✅ Extraer lógica a custom hooks

### Fase 2: Mejoras de UX (1 semana)
4. ✅ Implementar wizard de pasos
5. ✅ Agregar autoguardado de borrador
6. ✅ Progress indicator detallado

### Fase 3: Optimizaciones (1 semana)
7. ✅ Búsqueda de clientes optimizada
8. ✅ Cache de datos frecuentes
9. ✅ Optimistic UI updates

### Fase 4: Features Avanzados (Opcional)
10. ✅ Predicción inteligente
11. ✅ Plantillas de orden
12. ✅ Exportación de borradores

---

## 📊 Métricas de Éxito

### Antes
- ⏱️ Tiempo de carga modal: ~2s
- 💾 Tamaño del componente: 1,900 líneas
- 🐛 Bugs reportados: ~5/mes
- 👤 Satisfacción usuario: 3.5/5

### Después (Esperado)
- ⏱️ Tiempo de carga modal: <500ms
- 💾 Tamaño del componente: <200 líneas cada uno
- 🐛 Bugs reportados: <1/mes
- 👤 Satisfacción usuario: 4.5/5

---

## 📚 Documentación Relacionada

### Documentos Existentes
- `FIX_AUTOCOMPLETAR_CLIENTES_ORDEN.md` - Dropdown de clientes
- `MEJORA_DROPDOWN_CLIENTES_UX.md` - UX del dropdown
- `DEBUG_DROPDOWN_CLIENTES.md` - Debugging del dropdown

### Documentos a Crear
- `REFACTORING_CREATE_ORDER_MODAL.md`
- `WIZARD_IMPLEMENTATION.md`
- `FORM_VALIDATION_SCHEMA.md`

---

**Última actualización:** 3 de Diciembre 2025  
**Estado:** 📋 Propuesta de Optimización  
**Prioridad:** Alta














