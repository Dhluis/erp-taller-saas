/**
 * =====================================================
 * EJEMPLO: Integración de UpgradeModal en formularios
 * =====================================================
 * 
 * Este archivo muestra cómo integrar el UpgradeModal
 * en tus formularios de creación de recursos.
 */

'use client'

import { useState } from 'react'
import { useLimitCheck } from '@/hooks/useLimitCheck'
import { UpgradeModal } from '@/components/billing/upgrade-modal'
import { useBilling } from '@/hooks/useBilling'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

/**
 * Ejemplo 1: Formulario de creación de orden
 */
export function CreateWorkOrderFormExample() {
  const { limitError, showUpgradeModal, handleApiError, closeUpgradeModal } = useLimitCheck()
  const { canCreateOrder } = useBilling()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      const data = Object.fromEntries(formData.entries())

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        
        // ✅ Verificar si es error de límite
        if (handleApiError({ status: response.status, ...error })) {
          return // Se mostró el modal de upgrade
        }
        
        // Otro tipo de error
        throw new Error(error.error || 'Error al crear orden')
      }

      const result = await response.json()
      toast.success('Orden creada exitosamente')
      // Reset form, redirect, etc.
    } catch (error: any) {
      toast.error(error.message || 'Error al crear orden')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        {/* ... campos del formulario ... */}
        
        <Button 
          type="submit"
          disabled={!canCreateOrder || loading}
        >
          {loading ? 'Creando...' : canCreateOrder ? 'Crear Orden' : 'Límite alcanzado'}
        </Button>
      </form>

      {/* ✅ Modal de upgrade */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={closeUpgradeModal}
        limitError={limitError || undefined}
      />
    </>
  )
}

/**
 * Ejemplo 2: Formulario de creación de cliente
 */
export function CreateCustomerFormExample() {
  const { limitError, showUpgradeModal, handleApiError, closeUpgradeModal } = useLimitCheck()
  const { canCreateCustomer } = useBilling()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (data: any) => {
    setLoading(true)

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        
        if (handleApiError({ status: response.status, ...error })) {
          return
        }
        
        throw new Error(error.error || 'Error al crear cliente')
      }

      toast.success('Cliente creado exitosamente')
    } catch (error: any) {
      toast.error(error.message || 'Error al crear cliente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Tu formulario aquí */}
      <Button 
        onClick={() => handleSubmit({ name: 'Test', email: 'test@test.com' })}
        disabled={!canCreateCustomer || loading}
      >
        {canCreateCustomer ? 'Crear Cliente' : 'Límite alcanzado'}
      </Button>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={closeUpgradeModal}
        limitError={limitError || undefined}
      />
    </>
  )
}

/**
 * Ejemplo 3: Prevenir creación antes de intentar (mejor UX)
 */
export function PreventCreationExample() {
  const { canCreateOrder, plan, usage } = useBilling()
  const { showUpgrade } = useLimitCheck()

  const handleCreateClick = () => {
    if (!canCreateOrder && plan && usage) {
      // Mostrar modal preventivamente
      showUpgrade({
        error: 'limit_reached',
        message: `Has alcanzado el límite de ${usage.orders.limit} órdenes este mes. Actualiza a Premium para límites ilimitados.`,
        current: usage.orders.current,
        limit: usage.orders.limit || 0,
        feature: 'max_orders_per_month',
        upgrade_url: '/settings/billing',
        plan_required: 'premium'
      })
      return
    }

    // Proceder con la creación
    // ...
  }

  return (
    <Button onClick={handleCreateClick} disabled={!canCreateOrder}>
      Crear Orden
    </Button>
  )
}
