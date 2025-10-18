'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Users, Car, FileText, Calendar, Wrench, Settings, Hammer } from 'lucide-react'
import { CreateWorkOrderModal } from './CreateWorkOrderModal'

interface QuickActionsProps {
  onOrderCreated?: () => void
}

export function QuickActions({ onOrderCreated }: QuickActionsProps) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [prefilledServiceType, setPrefilledServiceType] = useState<string>('')

  // Funciones para abrir modal con diferentes tipos de servicio
  const handleNewOrder = () => {
    console.log('🔥 [QuickActions] Nueva Orden clickeada')
    setPrefilledServiceType('')
    setModalOpen(true)
  }

  const handleDiagnostico = () => {
    console.log('🔥 [QuickActions] Diagnóstico clickeado')
    setPrefilledServiceType('diagnostico')
    setModalOpen(true)
  }

  const handleMantenimiento = () => {
    console.log('🔥 [QuickActions] Mantenimiento clickeado')
    setPrefilledServiceType('mantenimiento')
    setModalOpen(true)
  }

  const handleReparacion = () => {
    console.log('🔥 [QuickActions] Reparación clickeada')
    setPrefilledServiceType('reparacion')
    setModalOpen(true)
  }

  // Funciones para navegación
  const handleCliente = () => {
    console.log('🔥 [QuickActions] Navegar a Clientes')
    router.push('/clientes')
  }

  const handleVehiculo = () => {
    console.log('🔥 [QuickActions] Navegar a Vehículos')
    router.push('/vehiculos')
  }

  const handleCotizacion = () => {
    console.log('🔥 [QuickActions] Navegar a Cotizaciones')
    router.push('/cotizaciones')
  }

  const handleCita = () => {
    console.log('🔥 [QuickActions] Navegar a Órdenes')
    router.push('/ordenes')
  }

  const handleOrderCreated = () => {
    console.log('✅ Orden creada desde QuickActions')
    setModalOpen(false)
    setPrefilledServiceType('')
    onOrderCreated?.()
  }

  return (
    <>
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-xl">⚡</span>
            Acciones Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {/* Nueva Orden de Trabajo - Acción principal */}
          <Button
            className="w-full justify-start h-auto py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md"
            onClick={handleNewOrder}
          >
            <Plus className="h-5 w-5 mr-3" />
            <div className="text-left">
              <div className="font-semibold">Nueva Orden de Trabajo</div>
              <div className="text-xs text-blue-100 mt-0.5">
                Registra un nuevo servicio
              </div>
            </div>
          </Button>

          {/* Acciones Rápidas Específicas */}
          <div className="grid grid-cols-1 gap-2 pt-2 border-t">
            <Button
              className="w-full justify-start h-auto py-2 px-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-sm"
              onClick={handleDiagnostico}
            >
              <Wrench className="h-4 w-4 mr-2" />
              <div className="text-left">
                <div className="font-medium text-sm">Diagnóstico</div>
                <div className="text-xs text-purple-100 mt-0.5">
                  Evaluación inicial
                </div>
              </div>
            </Button>

            <Button
              className="w-full justify-start h-auto py-2 px-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-sm"
              onClick={handleMantenimiento}
            >
              <Settings className="h-4 w-4 mr-2" />
              <div className="text-left">
                <div className="font-medium text-sm">Mantenimiento</div>
                <div className="text-xs text-green-100 mt-0.5">
                  Servicio preventivo
                </div>
              </div>
            </Button>

            <Button
              className="w-full justify-start h-auto py-2 px-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 shadow-sm"
              onClick={handleReparacion}
            >
              <Hammer className="h-4 w-4 mr-2" />
              <div className="text-left">
                <div className="font-medium text-sm">Reparación</div>
                <div className="text-xs text-orange-100 mt-0.5">
                  Servicio correctivo
                </div>
              </div>
            </Button>
          </div>

          {/* Acciones secundarias - Navegación */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t">
            <Button
              variant="outline"
              className="h-auto py-2 px-3 flex-col items-start hover:bg-blue-50"
              onClick={handleCliente}
            >
              <Users className="h-4 w-4 mb-1 text-blue-600" />
              <span className="text-xs font-medium">Cliente</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-2 px-3 flex-col items-start hover:bg-green-50"
              onClick={handleVehiculo}
            >
              <Car className="h-4 w-4 mb-1 text-green-600" />
              <span className="text-xs font-medium">Vehículo</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-2 px-3 flex-col items-start hover:bg-purple-50"
              onClick={handleCotizacion}
            >
              <FileText className="h-4 w-4 mb-1 text-purple-600" />
              <span className="text-xs font-medium">Cotización</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-2 px-3 flex-col items-start hover:bg-orange-50"
              onClick={handleCita}
            >
              <Calendar className="h-4 w-4 mb-1 text-orange-600" />
              <span className="text-xs font-medium">Cita</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal de creación de orden */}
      <CreateWorkOrderModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleOrderCreated}
        prefilledServiceType={prefilledServiceType}
      />
    </>
  )
}

