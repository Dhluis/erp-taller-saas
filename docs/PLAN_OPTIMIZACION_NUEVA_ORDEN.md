# 🚀 Plan de Optimización: Nueva Orden de Trabajo

## 📅 Fecha: 3 de Diciembre 2025

---

## 🎯 Objetivo

Transformar el sistema de creación de órdenes de un **monolito de 1,900 líneas** a una arquitectura **modular, mantenible y escalable**.

---

## 📋 Tabla de Contenidos

1. [Quick Wins (Implementar Ya)](#quick-wins)
2. [Refactoring Principal](#refactoring-principal)
3. [Código de Ejemplo](#código-de-ejemplo)
4. [Testing](#testing)
5. [Migración](#migración)

---

## ⚡ Quick Wins (Implementar Ya)

### 1. Mover Validaciones a Constantes

**Antes:**
```typescript
// ❌ Hardcoded en múltiples lugares
if (value.trim().length < 3) return 'Mínimo 3 caracteres'
```

**Después:**
```typescript
// ✅ src/lib/constants/validation.ts
export const VALIDATION_RULES = {
  customerName: {
    minLength: 3,
    maxLength: 100,
    pattern: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
    messages: {
      required: 'El nombre es requerido',
      minLength: 'Mínimo 3 caracteres',
      pattern: 'Solo letras permitidas'
    }
  },
  customerPhone: {
    pattern: /^\d{10,13}$/,
    messages: {
      required: 'El teléfono es requerido',
      pattern: 'Formato: 10-13 dígitos'
    }
  },
  // ...
}
```

**Beneficio:** Un solo lugar para actualizar reglas.

---

### 2. Extraer Mensajes de Toast

**Antes:**
```typescript
// ❌ Strings hardcoded
toast.success('Orden creada exitosamente')
toast.error('Error al crear orden')
```

**Después:**
```typescript
// ✅ src/lib/constants/messages.ts
export const TOAST_MESSAGES = {
  order: {
    createSuccess: 'Orden creada exitosamente',
    createError: 'Error al crear orden',
    updateSuccess: 'Orden actualizada',
    updateError: 'Error al actualizar orden',
    deleteSuccess: 'Orden eliminada',
    deleteError: 'Error al eliminar orden',
  },
  customer: {
    found: 'Cliente encontrado',
    created: 'Cliente creado',
    duplicate: 'Cliente ya existe',
  },
  vehicle: {
    found: 'Vehículo encontrado',
    created: 'Vehículo registrado',
    duplicate: 'Placa ya registrada',
  }
}

// Uso
toast.success(TOAST_MESSAGES.order.createSuccess)
```

**Beneficio:** Fácil de traducir, consistente.

---

### 3. Memoizar Funciones Costosas

**Antes:**
```typescript
// ❌ Re-crea función en cada render
const filteredCustomers = customers.filter(c => 
  c.name.toLowerCase().includes(query.toLowerCase())
)
```

**Después:**
```typescript
// ✅ Memoiza el filtrado
const filteredCustomers = useMemo(() => {
  if (!query) return customers
  
  const lowerQuery = query.toLowerCase()
  return customers.filter(c => 
    c.name.toLowerCase().includes(lowerQuery)
  )
}, [customers, query])
```

**Beneficio:** Evita re-filtrar en cada render.

---

## 🏗️ Refactoring Principal

### Estructura Propuesta

```
src/features/orders/
├── components/
│   ├── CreateOrderModal/
│   │   ├── index.tsx                  (Contenedor principal)
│   │   ├── CustomerStep.tsx           (Paso 1)
│   │   ├── VehicleStep.tsx            (Paso 2)
│   │   ├── InspectionStep.tsx         (Paso 3)
│   │   ├── SummaryStep.tsx            (Paso 4)
│   │   └── ProgressBar.tsx
│   │
│   ├── CustomerSearch/
│   │   ├── index.tsx
│   │   ├── CustomerDropdown.tsx
│   │   └── CustomerItem.tsx
│   │
│   └── VehicleInspection/
│       ├── index.tsx
│       ├── FuelLevelSelector.tsx
│       └── ChecklistGroup.tsx
│
├── hooks/
│   ├── useCreateOrderForm.ts          (Form state)
│   ├── useCreateOrderMutation.ts      (API call)
│   ├── useOrderValidation.ts          (Validación)
│   ├── useCustomerSearch.ts           (Búsqueda)
│   └── useDraftOrder.ts               (Autoguardado)
│
├── schemas/
│   └── orderSchema.ts                 (Zod schema)
│
├── types/
│   └── index.ts
│
└── utils/
    ├── formatters.ts
    └── validators.ts
```

---

## 💻 Código de Ejemplo

### 1. Schema de Validación (Zod)

```typescript
// src/features/orders/schemas/orderSchema.ts
import { z } from 'zod'

export const orderSchema = z.object({
  // Cliente
  customer: z.object({
    name: z.string()
      .min(3, 'Mínimo 3 caracteres')
      .max(100, 'Máximo 100 caracteres')
      .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'Solo letras'),
    
    phone: z.string()
      .regex(/^\+?\d{10,13}$/, 'Formato: +52 444 123 4567'),
    
    email: z.string()
      .email('Email inválido')
      .optional()
      .or(z.literal('')),
    
    address: z.string().optional()
  }),
  
  // Vehículo
  vehicle: z.object({
    brand: z.string().min(2, 'Marca requerida'),
    model: z.string().min(2, 'Modelo requerido'),
    year: z.number()
      .min(1900, 'Año muy antiguo')
      .max(new Date().getFullYear() + 1, 'Año inválido'),
    licensePlate: z.string().min(5, 'Placa requerida'),
    color: z.string().optional(),
    vin: z.string().optional(),
    mileage: z.number()
      .min(0, 'Kilometraje debe ser positivo')
  }),
  
  // Orden
  description: z.string()
    .min(10, 'Descripción muy corta')
    .max(500, 'Máximo 500 caracteres'),
  
  estimatedCost: z.number()
    .min(0, 'Costo debe ser positivo')
    .optional(),
  
  assignedMechanic: z.string().optional(),
  
  // Inspección (opcional)
  inspection: z.object({
    fuelLevel: z.enum(['empty', '1/4', '1/2', '3/4', 'full']),
    hasScratches: z.boolean(),
    hasDents: z.boolean(),
    hasRust: z.boolean(),
    lightsWork: z.boolean(),
    tiresCondition: z.enum(['good', 'fair', 'poor']),
    notes: z.string().optional()
  }).optional()
})

export type OrderFormData = z.infer<typeof orderSchema>
```

---

### 2. Custom Hook para el Formulario

```typescript
// src/features/orders/hooks/useCreateOrderForm.ts
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { orderSchema, type OrderFormData } from '../schemas/orderSchema'
import { useDraftOrder } from './useDraftOrder'

export const useCreateOrderForm = () => {
  const { saveDraft, loadDraft, clearDraft } = useDraftOrder('new-order')
  
  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: loadDraft() || {
      customer: {
        name: '',
        phone: '',
        email: '',
        address: ''
      },
      vehicle: {
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        licensePlate: '',
        color: '',
        mileage: 0
      },
      description: '',
      estimatedCost: 0,
      inspection: {
        fuelLevel: '1/2',
        hasScratches: false,
        hasDents: false,
        hasRust: false,
        lightsWork: true,
        tiresCondition: 'good',
        notes: ''
      }
    }
  })
  
  // Autoguardar cada 5 segundos
  useEffect(() => {
    const subscription = form.watch((values) => {
      const timeout = setTimeout(() => {
        saveDraft(values as OrderFormData)
      }, 5000)
      
      return () => clearTimeout(timeout)
    })
    
    return () => subscription.unsubscribe()
  }, [form, saveDraft])
  
  return {
    form,
    clearDraft
  }
}
```

---

### 3. Custom Hook para la Mutación

```typescript
// src/features/orders/hooks/useCreateOrderMutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createWorkOrder } from '@/lib/api/orders'
import type { OrderFormData } from '../schemas/orderSchema'

interface CreateOrderProgress {
  step: number
  total: number
  message: string
}

export const useCreateOrderMutation = (
  onProgress?: (progress: CreateOrderProgress) => void
) => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: OrderFormData) => {
      // Paso 1: Crear/buscar cliente
      onProgress?.({ step: 1, total: 4, message: 'Verificando cliente...' })
      const customer = await createOrFindCustomer(data.customer)
      
      // Paso 2: Crear/buscar vehículo
      onProgress?.({ step: 2, total: 4, message: 'Registrando vehículo...' })
      const vehicle = await createOrFindVehicle({
        ...data.vehicle,
        customerId: customer.id
      })
      
      // Paso 3: Crear orden
      onProgress?.({ step: 3, total: 4, message: 'Generando orden...' })
      const order = await createWorkOrder({
        customerId: customer.id,
        vehicleId: vehicle.id,
        description: data.description,
        estimatedCost: data.estimatedCost,
        assignedMechanic: data.assignedMechanic
      })
      
      // Paso 4: Crear inspección (si existe)
      if (data.inspection) {
        onProgress?.({ step: 4, total: 4, message: 'Guardando inspección...' })
        await createInspection({
          orderId: order.id,
          ...data.inspection
        })
      }
      
      return order
    },
    
    onSuccess: (order) => {
      // Invalidar cache de órdenes
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      
      toast.success('Orden creada exitosamente', {
        description: `Orden #${order.order_number}`
      })
    },
    
    onError: (error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Cliente o vehículo duplicado')
      } else if (error.message.includes('network')) {
        toast.error('Sin conexión a internet')
      } else {
        toast.error('Error al crear orden')
      }
    }
  })
}
```

---

### 4. Componente del Modal Principal

```typescript
// src/features/orders/components/CreateOrderModal/index.tsx
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useCreateOrderForm } from '../../hooks/useCreateOrderForm'
import { useCreateOrderMutation } from '../../hooks/useCreateOrderMutation'
import { CustomerStep } from './CustomerStep'
import { VehicleStep } from './VehicleStep'
import { InspectionStep } from './InspectionStep'
import { SummaryStep } from './SummaryStep'
import { ProgressBar } from './ProgressBar'

interface CreateOrderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export const CreateOrderModal = ({ open, onOpenChange, onSuccess }: CreateOrderModalProps) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState({ step: 0, total: 4, message: '' })
  
  const { form, clearDraft } = useCreateOrderForm()
  const mutation = useCreateOrderMutation((progress) => setProgress(progress))
  
  const steps = [
    { name: 'Cliente', component: CustomerStep },
    { name: 'Vehículo', component: VehicleStep },
    { name: 'Inspección', component: InspectionStep, optional: true },
    { name: 'Resumen', component: SummaryStep }
  ]
  
  const CurrentStepComponent = steps[currentStep].component
  
  const handleNext = async () => {
    // Validar paso actual
    const fieldsToValidate = getFieldsForStep(currentStep)
    const isValid = await form.trigger(fieldsToValidate)
    
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))
    }
  }
  
  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }
  
  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      const order = await mutation.mutateAsync(data)
      clearDraft()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Error creating order:', error)
    }
  })
  
  const handleClose = () => {
    if (form.formState.isDirty) {
      const confirm = window.confirm('¿Guardar borrador antes de salir?')
      if (confirm) {
        // Ya se guardó automáticamente
      } else {
        clearDraft()
      }
    }
    onOpenChange(false)
  }
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Nueva Orden de Trabajo</DialogTitle>
          <p className="text-sm text-muted-foreground">
            La orden se creará en estado Recepción
          </p>
        </DialogHeader>
        
        {/* Barra de progreso */}
        <ProgressBar
          steps={steps}
          currentStep={currentStep}
          progress={mutation.isLoading ? progress : undefined}
        />
        
        {/* Paso actual */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <CurrentStepComponent form={form} />
          
          {/* Botones de navegación */}
          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0 || mutation.isLoading}
            >
              Anterior
            </Button>
            
            <div className="flex gap-2">
              {steps[currentStep].optional && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={mutation.isLoading}
                >
                  Omitir
                </Button>
              )}
              
              {currentStep < steps.length - 1 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={mutation.isLoading}
                >
                  Siguiente
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={mutation.isLoading}
                >
                  {mutation.isLoading ? 'Creando...' : 'Crear Orden'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

---

### 5. Componente de Paso (Ejemplo: Cliente)

```typescript
// src/features/orders/components/CreateOrderModal/CustomerStep.tsx
import { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CustomerSearch } from '../CustomerSearch'
import type { OrderFormData } from '../../schemas/orderSchema'

interface CustomerStepProps {
  form: UseFormReturn<OrderFormData>
}

export const CustomerStep = ({ form }: CustomerStepProps) => {
  const { register, formState: { errors }, setValue } = form
  
  const handleCustomerSelect = (customer: Customer) => {
    setValue('customer.name', customer.name)
    setValue('customer.phone', customer.phone)
    setValue('customer.email', customer.email || '')
    setValue('customer.address', customer.address || '')
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Datos del Cliente</h3>
      
      {/* Búsqueda de clientes */}
      <CustomerSearch onSelect={handleCustomerSelect} />
      
      {/* Formulario manual */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="customerName">Nombre *</Label>
          <Input
            id="customerName"
            {...register('customer.name')}
            placeholder="Juan Pérez"
            className={errors.customer?.name ? 'border-red-500' : ''}
          />
          {errors.customer?.name && (
            <p className="text-sm text-red-500 mt-1">
              {errors.customer.name.message}
            </p>
          )}
        </div>
        
        <div>
          <Label htmlFor="customerPhone">Teléfono *</Label>
          <Input
            id="customerPhone"
            {...register('customer.phone')}
            placeholder="+52 444 123 4567"
            className={errors.customer?.phone ? 'border-red-500' : ''}
          />
          {errors.customer?.phone && (
            <p className="text-sm text-red-500 mt-1">
              {errors.customer.phone.message}
            </p>
          )}
        </div>
        
        <div className="col-span-2">
          <Label htmlFor="customerEmail">Email (opcional)</Label>
          <Input
            id="customerEmail"
            type="email"
            {...register('customer.email')}
            placeholder="cliente@ejemplo.com"
            className={errors.customer?.email ? 'border-red-500' : ''}
          />
          {errors.customer?.email && (
            <p className="text-sm text-red-500 mt-1">
              {errors.customer.email.message}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## 🧪 Testing

### Test del Schema

```typescript
// src/features/orders/schemas/orderSchema.test.ts
import { describe, it, expect } from 'vitest'
import { orderSchema } from './orderSchema'

describe('orderSchema', () => {
  it('valida datos correctos', () => {
    const validData = {
      customer: {
        name: 'Juan Pérez',
        phone: '+525551234567',
        email: 'juan@example.com'
      },
      vehicle: {
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
        licensePlate: 'ABC-123-D',
        mileage: 50000
      },
      description: 'Cambio de aceite y filtros',
      estimatedCost: 1500
    }
    
    const result = orderSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })
  
  it('rechaza nombre muy corto', () => {
    const invalidData = {
      customer: {
        name: 'AB',  // ← Muy corto
        phone: '+525551234567'
      },
      // ...
    }
    
    const result = orderSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('Mínimo 3 caracteres')
  })
})
```

---

### Test del Hook

```typescript
// src/features/orders/hooks/useCreateOrderForm.test.ts
import { renderHook, act } from '@testing-library/react'
import { useCreateOrderForm } from './useCreateOrderForm'

describe('useCreateOrderForm', () => {
  it('inicializa con valores por defecto', () => {
    const { result } = renderHook(() => useCreateOrderForm())
    
    expect(result.current.form.getValues('customer.name')).toBe('')
    expect(result.current.form.getValues('vehicle.year')).toBe(2025)
  })
  
  it('valida el formulario correctamente', async () => {
    const { result } = renderHook(() => useCreateOrderForm())
    
    act(() => {
      result.current.form.setValue('customer.name', 'AB')
    })
    
    const isValid = await result.current.form.trigger('customer.name')
    expect(isValid).toBe(false)
  })
})
```

---

## 🔄 Migración

### Fase 1: Preparación
1. Instalar dependencias
2. Crear estructura de carpetas
3. Escribir schemas y tipos

### Fase 2: Componentes
4. Crear componentes pequeños
5. Testear individualmente
6. Integrar en modal

### Fase 3: Integración
7. Reemplazar modal antiguo
8. Migrar llamadas API
9. Testing E2E

### Fase 4: Limpieza
10. Eliminar código legacy
11. Actualizar documentación
12. Celebrar 🎉

---

## 📊 Checklist de Implementación

- [ ] Instalar dependencias (Zod, React Hook Form, etc.)
- [ ] Crear estructura de carpetas
- [ ] Definir schema de validación
- [ ] Crear custom hooks
- [ ] Separar componentes por pasos
- [ ] Implementar wizard de navegación
- [ ] Agregar progress bar
- [ ] Implementar autoguardado
- [ ] Agregar tests unitarios
- [ ] Testing E2E
- [ ] Migrar a producción
- [ ] Eliminar código legacy
- [ ] Actualizar documentación

---

**Estado:** 📋 Plan Listo para Implementar  
**Estimación:** 2-3 semanas  
**Prioridad:** Alta  
**Última actualización:** 3 de Diciembre 2025
















