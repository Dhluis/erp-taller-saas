'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { WorkOrderDetailsTabs } from './WorkOrderDetailsTabs'
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
  
  // Contar imágenes y notas
  const imagesCount = order.images?.length || 0
  const notesCount = order.notes?.length || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        
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
        />
      </DialogContent>
    </Dialog>
  )
}





