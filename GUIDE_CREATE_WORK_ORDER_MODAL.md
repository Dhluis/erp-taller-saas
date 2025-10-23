# 📋 **GUÍA: Modal de Creación de Órdenes de Trabajo**

## 🎯 **Descripción**

El componente `CreateWorkOrderModal` permite crear órdenes de trabajo de manera rápida e intuitiva desde cualquier parte de la aplicación, especialmente desde el dashboard.

---

## ✨ **Características Implementadas**

### **✅ Multi-Tenant Automático**
- Usa `getSimpleTenantContextClient()` para obtener `organization_id` y `workshop_id`
- No necesitas pasar estos parámetros manualmente
- Garantiza aislamiento de datos por taller

### **✅ Lógica Inteligente**
- **Clientes:** Busca por teléfono, crea solo si no existe
- **Vehículos:** Busca por placa, crea solo si no existe, actualiza kilometraje
- **Órdenes:** Crea automáticamente en estado "Recepción"

### **✅ Validaciones Completas**
- Campos obligatorios marcados con `*`
- Validación de tipos (email, teléfono, número)
- Placas automáticamente en mayúsculas
- Límites de año de vehículo

### **✅ UX Optimizada**
- Loading states durante la creación
- Toast notifications con mensajes descriptivos
- Reset automático del formulario al cerrar
- Diseño responsivo y accesible

---

## 🚀 **CÓMO INTEGRAR EN TU DASHBOARD**

### **Opción 1: Integración Simple (Recomendada)**

```typescript
// src/app/dashboard/page.tsx
'use client'

import { useState } from 'react'
import { CreateWorkOrderModal } from '@/components/dashboard/CreateWorkOrderModal'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function DashboardPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const handleOrderCreated = () => {
    console.log('✅ Nueva orden creada')
    // Aquí puedes recargar las estadísticas del dashboard
    window.location.reload() // O usa un refetch más elegante
  }

  return (
    <div className="p-6">
      {/* Header con botón */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Orden
        </Button>
      </div>

      {/* Contenido del dashboard */}
      <div className="grid grid-cols-3 gap-4">
        {/* Tus métricas aquí */}
      </div>

      {/* Modal */}
      <CreateWorkOrderModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={handleOrderCreated}
      />
    </div>
  )
}
```

### **Opción 2: Con Botón Flotante (FAB)**

```typescript
// src/app/dashboard/page.tsx
'use client'

import { useState } from 'react'
import { CreateWorkOrderModal } from '@/components/dashboard/CreateWorkOrderModal'
import { Plus } from 'lucide-react'

export default function DashboardPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  return (
    <div className="p-6">
      {/* Contenido del dashboard */}
      <div>
        {/* ... tu contenido ... */}
      </div>

      {/* Botón Flotante (FAB) */}
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
        aria-label="Nueva orden"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modal */}
      <CreateWorkOrderModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={() => window.location.reload()}
      />
    </div>
  )
}
```

### **Opción 3: Con Revalidación de Datos (Next.js 13+)**

```typescript
// src/app/dashboard/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CreateWorkOrderModal } from '@/components/dashboard/CreateWorkOrderModal'

export default function DashboardPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const router = useRouter()

  const handleOrderCreated = () => {
    // Recargar los datos sin reload completo
    router.refresh()
    
    // O si tienes un estado local de órdenes:
    // refetchOrders()
  }

  return (
    <div>
      <button onClick={() => setIsCreateModalOpen(true)}>
        Nueva Orden
      </button>

      <CreateWorkOrderModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={handleOrderCreated}
      />
    </div>
  )
}
```

---

## 🎨 **PERSONALIZACIÓN**

### **Cambiar el Estado Inicial de la Orden**

Por defecto, las órdenes se crean en estado `'reception'`. Para cambiar esto:

```typescript
// En CreateWorkOrderModal.tsx, línea ~145
const { data: workOrder, error: workOrderError } = await supabase
  .from('work_orders')
  .insert({
    // ...
    status: 'diagnosis', // Cambiar aquí
    // ...
  })
```

### **Agregar Campos Personalizados**

```typescript
// 1. Agregar al estado del formulario
const [formData, setFormData] = useState({
  // ... campos existentes ...
  custom_field: '', // ✅ Nuevo campo
})

// 2. Agregar el input en el JSX
<div>
  <Label htmlFor="custom_field">Mi Campo Personalizado</Label>
  <Input
    id="custom_field"
    value={formData.custom_field}
    onChange={(e) => setFormData({ ...formData, custom_field: e.target.value })}
  />
</div>

// 3. Incluir en el insert
.insert({
  // ... campos existentes ...
  custom_field: formData.custom_field, // ✅ Usar aquí
})
```

### **Modificar los Toast Notifications**

```typescript
// Toast de éxito (línea ~156)
toast.success('✅ ¡Orden creada!', {
  description: `Orden #${workOrder.order_number} lista en Recepción`,
  duration: 3000, // ms
  position: 'top-right', // posición
})

// Toast de error (línea ~166)
toast.error('❌ Oops, algo salió mal', {
  description: error.message,
  duration: 5000,
  action: {
    label: 'Reintentar',
    onClick: () => handleSubmit(e)
  }
})
```

---

## 🧪 **TESTING**

### **Prueba Manual Rápida**

1. **Abrir el modal:** Click en "Nueva Orden"
2. **Llenar datos mínimos:**
   - Nombre: "Test Cliente"
   - Teléfono: "222-000-0000"
   - Marca: "Test"
   - Modelo: "Test"
   - Año: "2020"
   - Placa: "TEST-123"
   - Descripción: "Prueba de sistema"
3. **Enviar:** Click en "Crear Orden"
4. **Verificar:**
   - Toast de éxito aparece ✅
   - Modal se cierra ✅
   - Orden aparece en el Kanban (columna Recepción) ✅
   - Dashboard se actualiza ✅

### **Casos de Prueba Importantes**

| Caso | Pasos | Resultado Esperado |
|------|-------|-------------------|
| **Cliente Nuevo** | Usar teléfono único | Se crea cliente y orden |
| **Cliente Existente** | Usar teléfono existente | Se reutiliza cliente |
| **Vehículo Nuevo** | Usar placa única | Se crea vehículo y orden |
| **Vehículo Existente** | Usar placa existente | Se reutiliza vehículo |
| **Campos Vacíos** | Dejar campos obligatorios vacíos | Validación HTML5 |
| **Cancelar** | Click en "Cancelar" | Modal se cierra sin crear |

---

## 📊 **FLUJO DE DATOS**

```
1. Usuario abre modal
   ↓
2. Usuario llena formulario
   ↓
3. Usuario hace submit
   ↓
4. getSimpleTenantContextClient() → organization_id + workshop_id
   ↓
5. Buscar cliente por teléfono
   ├─ Existe → Usar ID
   └─ No existe → Crear nuevo
   ↓
6. Buscar vehículo por placa
   ├─ Existe → Usar ID + actualizar km
   └─ No existe → Crear nuevo
   ↓
7. Crear work_order con todos los IDs
   ↓
8. Toast de éxito + Cerrar modal + Callback onSuccess
   ↓
9. Dashboard se recarga/actualiza
```

---

## 🐛 **TROUBLESHOOTING**

### **Error: "Usuario no autenticado"**
**Causa:** No hay sesión activa  
**Solución:** Verificar que el usuario esté logueado

### **Error: "Workshop no encontrado"**
**Causa:** Usuario sin workshop asignado  
**Solución:** Asignar workshop al usuario en tabla `users`

### **Error: "organization_id no puede ser null"**
**Causa:** Workshop sin organization_id  
**Solución:** Ejecutar migración `MIGRATION_SIMPLE_WORKSHOPS.sql`

### **Modal no se abre**
**Causa:** Estado `open` no se está actualizando  
**Solución:** Verificar que `onOpenChange` esté conectado a `useState`

### **Datos no se refrescan**
**Causa:** Falta implementar recarga de datos  
**Solución:** Agregar `router.refresh()` o `window.location.reload()` en `onSuccess`

---

## 📝 **EJEMPLO COMPLETO: Dashboard con Todo Integrado**

```typescript
// src/app/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CreateWorkOrderModal } from '@/components/dashboard/CreateWorkOrderModal'
import { Button } from '@/components/ui/button'
import { Plus, RefreshCw } from 'lucide-react'

export default function DashboardPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(null)
  const router = useRouter()

  // Cargar estadísticas
  const loadStats = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/orders/stats')
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  const handleOrderCreated = () => {
    console.log('✅ Nueva orden creada, recargando stats...')
    loadStats() // Recargar stats
    router.refresh() // Refrescar la página
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Gestión de órdenes de trabajo</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadStats}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Orden
          </Button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-600">Órdenes Activas</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {stats?.total || 0}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-600">En Recepción</h3>
          <p className="text-3xl font-bold text-gray-600 mt-2">
            {stats?.reception || 0}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-600">Completadas</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {stats?.completed || 0}
          </p>
        </div>
      </div>

      {/* Modal de Creación */}
      <CreateWorkOrderModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={handleOrderCreated}
      />
    </div>
  )
}
```

---

## 🎉 **¡LISTO PARA USAR!**

El modal está completamente funcional y listo para integrarse en tu dashboard. Solo necesitas:

1. ✅ Importar el componente
2. ✅ Agregar un botón que abra el modal
3. ✅ Implementar el callback `onSuccess`

**¡Eso es todo!** El resto (multi-tenant, validaciones, creación de datos) ya está implementado. 🚀







