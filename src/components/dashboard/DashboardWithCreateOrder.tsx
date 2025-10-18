'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CreateWorkOrderModal } from './CreateWorkOrderModal'
import { Plus } from 'lucide-react'

/**
 * Componente que integra el modal de creación de órdenes con el dashboard
 * Ejemplo de uso en el dashboard principal
 */
export function DashboardWithCreateOrder() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const handleCreateSuccess = () => {
    console.log('✅ Nueva orden creada exitosamente')
    // Aquí podrías recargar datos del dashboard, mostrar notificaciones, etc.
    // Por ejemplo:
    // - Recargar estadísticas
    // - Actualizar lista de órdenes recientes
    // - Mostrar toast de éxito
  }

  return (
    <div className="space-y-6">
      {/* Header del Dashboard con botón de crear */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Gestiona las órdenes de trabajo de tu taller</p>
        </div>
        
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Orden
        </Button>
      </div>

      {/* Contenido del Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Aquí irían las métricas del dashboard */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold text-gray-900">Órdenes Activas</h3>
          <p className="text-3xl font-bold text-blue-600">15</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold text-gray-900">Ingresos del Mes</h3>
          <p className="text-3xl font-bold text-green-600">$45,600</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold text-gray-900">Clientes Atendidos</h3>
          <p className="text-3xl font-bold text-purple-600">8</p>
        </div>
      </div>

      {/* Modal de creación de orden */}
      <CreateWorkOrderModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={handleCreateSuccess}
      />
    </div>
  )
}



