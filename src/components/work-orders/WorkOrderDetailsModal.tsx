'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { Badge } from '@/components/ui/badge'
import { WorkOrderDetailsTabs } from './WorkOrderDetailsTabs'
import AssignMechanicModal from '@/components/mecanicos/AssignMechanicModal'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Camera, MessageSquare } from 'lucide-react'

interface WorkOrderDetailsModalProps {
  order: any | null
  open: boolean
  onOpenChange: (open: boolean) => void
  userId?: string
  onUpdate?: () => void
}

// ✅ Estados oficiales según BD (11 estados)
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  reception: { label: 'Recepción', color: 'bg-gray-500' },
  diagnosis: { label: 'Diagnóstico', color: 'bg-purple-500' },
  initial_quote: { label: 'Cotización', color: 'bg-blue-500' },
  waiting_approval: { label: 'Esperando Aprobación', color: 'bg-yellow-500' },
  disassembly: { label: 'Desarmado', color: 'bg-orange-500' },
  waiting_parts: { label: 'Esperando Piezas', color: 'bg-amber-500' },
  assembly: { label: 'Armado', color: 'bg-indigo-500' },
  testing: { label: 'Pruebas', color: 'bg-cyan-500' },
  ready: { label: 'Listo', color: 'bg-green-500' },
  completed: { label: 'Completado', color: 'bg-emerald-500' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500' }
}

export function WorkOrderDetailsModal({
  order,
  open,
  onOpenChange,
  userId,
  onUpdate
}: WorkOrderDetailsModalProps) {
  const [showAssignMechanic, setShowAssignMechanic] = useState(false)
  
  if (!order) return null

  const statusInfo = STATUS_LABELS[order.status] || { label: order.status, color: 'bg-gray-500' }
  
  // Contar imágenes y notas
  const imagesCount = order.images?.length || 0
  const notesCount = order.notes?.length || 0
  
  const handleAssignSuccess = async () => {
    console.log('✅ [WorkOrderDetailsModal] Orden asignada, cerrando modal y refrescando...')
    setShowAssignMechanic(false)
    
    if (onUpdate) {
      console.log('🔄 [WorkOrderDetailsModal] Llamando onUpdate...')
      await onUpdate()
      console.log('✅ [WorkOrderDetailsModal] onUpdate completado')
    } else {
      console.warn('⚠️ [WorkOrderDetailsModal] onUpdate no está definido!')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        {/* DialogDescription para accesibilidad (oculto visualmente ya que hay header personalizado) */}
        <VisuallyHidden.Root>
          <DialogDescription>
            Detalles de la orden de trabajo {order.id?.slice(0, 8).toUpperCase()}. Estado: {statusInfo.label}
          </DialogDescription>
        </VisuallyHidden.Root>
        
        {/* 🔧 HEADER MEJORADO */}
        <DialogHeader className="space-y-3 pb-4 border-b">
          
          {/* Fila 1: Título + Botón cerrar */}
          <div className="flex items-start justify-between gap-3">
            <DialogTitle className="text-base sm:text-lg font-bold break-words flex-1 pr-2">
              Orden #{order.id?.slice(0, 8).toUpperCase()}
            </DialogTitle>
            <DialogClose className="shrink-0" />
          </div>
          
          {/* Fila 2: Badge de estado */}
          <div className="flex items-center gap-2">
            <Badge 
              className={`${statusInfo.color} text-white text-xs sm:text-sm px-2 py-1`}
            >
              {statusInfo.label}
            </Badge>
          </div>
          
          {/* Fila 3: Metadata (fecha + contadores) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              📅 Creada el {format(new Date(order.created_at), 'dd/MM/yyyy')}
            </span>
            
            {(imagesCount > 0 || notesCount > 0) && (
              <div className="flex items-center gap-2">
                {imagesCount > 0 && (
                  <span className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-md">
                    📸 <span className="font-medium">{imagesCount}</span>
                  </span>
                )}
                
                {notesCount > 0 && (
                  <span className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-md">
                    📝 <span className="font-medium">{notesCount}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        <WorkOrderDetailsTabs
          order={order}
          userId={userId}
          onUpdate={onUpdate}
          onAssignMechanic={() => setShowAssignMechanic(true)}
        />
      </DialogContent>
      
      {/* Modal de asignar/reasignar mecánico */}
      {order?.id && (
        <AssignMechanicModal
          isOpen={showAssignMechanic}
          onClose={() => setShowAssignMechanic(false)}
          orderId={order.id}
          currentMechanicId={(order.assigned_user as any)?.id || order.assigned_to || null}
          onSuccess={handleAssignSuccess}
        />
      )}
    </Dialog>
  )
}









