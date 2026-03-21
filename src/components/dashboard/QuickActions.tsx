'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Users, Car, FileText, MessageSquare, Mail } from 'lucide-react'
import CreateWorkOrderModal from '@/components/ordenes/CreateWorkOrderModal'
import { usePermissions } from '@/hooks/usePermissions'

interface QuickActionsProps {
  onOrderCreated?: () => void
  initialData?: any
}

export function QuickActions({ onOrderCreated, initialData }: QuickActionsProps) {
  const router = useRouter()
  const permissions = usePermissions()
  const [modalOpen, setModalOpen] = useState(false)
  const [prefilledServiceType, setPrefilledServiceType] = useState<string>('')

  // Efecto para abrir el modal si llegan datos iniciales (desde Eagles AI)
  useEffect(() => {
    if (initialData) {
      console.log('⚡ [QuickActions] Detectados datos iniciales de AI, abriendo modal...');
      setModalOpen(true);
    }
  }, [initialData]);

  // Funciones para abrir modal con diferentes tipos de servicio
  const handleNewOrder = () => {
    console.log('🔥 [QuickActions] Nueva Orden clickeada')
    setPrefilledServiceType('')
    setModalOpen(true)
  }

  // Funciones para navegación
  const handleConversaciones = () => {
    console.log('🔥 [QuickActions] Navegar a Conversaciones en nueva pestaña')
    const url = window.location.origin + '/dashboard/whatsapp/conversaciones'
    window.open(url, '_blank', 'noopener,noreferrer')
  }

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

  const handleMensajeria = () => {
    console.log('🔥 [QuickActions] Navegar a Mensajería')
    router.push('/mensajeria')
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
        <CardHeader className="border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="text-xl">⚡</span>
            Acciones Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {/* Nueva Orden de Trabajo - Acción principal */}
          {/* ✅ Solo mostrar si el usuario tiene permisos para crear órdenes */}
          {permissions.canCreate('work_orders') && (
            <Button
              className="w-full justify-start h-auto py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all duration-300"
              onClick={handleNewOrder}
            >
              <div className="flex items-center">
                <span className="text-xl mr-3">⚙️</span>
                <Plus className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-semibold">Nueva Orden de Trabajo</div>
                  <div className="text-xs text-blue-100 mt-0.5">
                    Registra un nuevo servicio
                  </div>
                </div>
              </div>
            </Button>
          )}

          {/* Acciones Rápidas Específicas */}
          <div className="grid grid-cols-1 gap-2 pt-2 border-t">
            {/* Ver Conversaciones - Verde/WhatsApp */}
            <Button
              className="w-full justify-start h-auto py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md transition-all duration-300"
              onClick={handleConversaciones}
            >
              <div className="flex items-center">
                <span className="text-xl mr-3">💬</span>
                <MessageSquare className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-semibold text-sm">Ver Conversaciones</div>
                  <div className="text-xs text-green-100 mt-0.5">
                    Mensajes de WhatsApp
                  </div>
                </div>
              </div>
            </Button>

            {/* Vehículos - Azul */}
            <Button
              className="w-full justify-start h-auto py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-md transition-all duration-300"
              onClick={handleVehiculo}
            >
              <div className="flex items-center">
                <span className="text-xl mr-3">🚗</span>
                <Car className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-semibold text-sm">Vehículos</div>
                  <div className="text-xs text-blue-100 mt-0.5">
                    Gestionar vehículos
                  </div>
                </div>
              </div>
            </Button>

            {/* Clientes - Púrpura */}
            <Button
              className="w-full justify-start h-auto py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md transition-all duration-300"
              onClick={handleCliente}
            >
              <div className="flex items-center">
                <span className="text-xl mr-3">👥</span>
                <Users className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-semibold text-sm">Clientes</div>
                  <div className="text-xs text-purple-100 mt-0.5">
                    Gestionar clientes
                  </div>
                </div>
              </div>
            </Button>

            {/* Cotización - Naranja/Amber */}
            <Button
              className="w-full justify-start h-auto py-3 px-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-md transition-all duration-300"
              onClick={handleCotizacion}
            >
              <div className="flex items-center">
                <span className="text-xl mr-3">📋</span>
                <FileText className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-semibold text-sm">Cotización</div>
                  <div className="text-xs text-amber-100 mt-0.5">
                    Crear nueva cotización
                  </div>
                </div>
              </div>
            </Button>

            {/* Mensajería - Amarillo */}
            <Button
              className="w-full justify-start h-auto py-3 px-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white shadow-md transition-all duration-300"
              onClick={handleMensajeria}
            >
              <div className="flex items-center">
                <span className="text-xl mr-3">💬</span>
                <Mail className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-semibold text-sm">Mensajería</div>
                  <div className="text-xs text-yellow-100 mt-0.5">
                    Email, SMS y WhatsApp
                  </div>
                </div>
              </div>
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
        initialData={initialData}
      />
    </>
  )
}

