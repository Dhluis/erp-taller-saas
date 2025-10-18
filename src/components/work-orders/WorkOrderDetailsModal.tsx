'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { WorkOrderDetailsTabs } from './WorkOrderDetailsTabs'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface WorkOrderDetailsModalProps {
  order: any | null
  open: boolean
  onOpenChange: (open: boolean) => void
  userId?: string
  onUpdate?: () => void
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  reception: { label: 'Recepción', color: 'bg-gray-500' },
  diagnosis: { label: 'Diagnóstico', color: 'bg-purple-500' },
  initial_quote: { label: 'Cotización', color: 'bg-blue-500' },
  waiting_approval: { label: 'Esperando Aprobación', color: 'bg-yellow-500' },
  disassembly: { label: 'Desarmado', color: 'bg-pink-500' },
  waiting_parts: { label: 'Esperando Piezas', color: 'bg-orange-500' },
  assembly: { label: 'Armado', color: 'bg-cyan-500' },
  testing: { label: 'Pruebas', color: 'bg-teal-500' },
  ready: { label: 'Listo', color: 'bg-lime-500' },
  completed: { label: 'Completado', color: 'bg-green-500' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500' }
}

export function WorkOrderDetailsModal({
  order,
  open,
  onOpenChange,
  userId,
  onUpdate
}: WorkOrderDetailsModalProps) {
  if (!order) return null

  const statusInfo = STATUS_LABELS[order.status] || { label: order.status, color: 'bg-gray-500' }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl">
                Orden #{order.id?.slice(0, 8)}
              </DialogTitle>
              <DialogDescription>
                Creada el {format(new Date(order.created_at), "d 'de' MMMM 'de' yyyy", { locale: es })}
              </DialogDescription>
            </div>
            <Badge className={statusInfo.color}>
              {statusInfo.label}
            </Badge>
          </div>
        </DialogHeader>

        <WorkOrderDetailsTabs
          order={order}
          userId={userId}
          onUpdate={onUpdate}
        />
      </DialogContent>
    </Dialog>
  )
}
