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
import { EaglesAIActionButton } from './EaglesAIActionButton'
import { WorkOrderQRCode } from './WorkOrderQRCode'
import { Printer, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { downloadWorkOrderPDF } from '@/lib/utils/work-order-pdf'
import { getCompanySettings } from '@/lib/supabase/company-settings'
import { toast } from 'sonner'
import { useEffect } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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
  const [isPrinting, setIsPrinting] = useState(false)
  const [companySettings, setCompanySettings] = useState<any>(null)

  useEffect(() => {
    if (open && order?.organization_id) {
      const loadSettings = async () => {
        try {
          const settings = await getCompanySettings(order.organization_id)
          setCompanySettings(settings)
        } catch (error) {
          console.error('Error loading company settings:', error)
        }
      }
      loadSettings()
    }
  }, [open, order?.organization_id])
  
  if (!order) return null

  const statusInfo = STATUS_LABELS[order.status] || { label: order.status, color: 'bg-gray-500' }
  
  // Contar imágenes y notas
  const imagesCount = order.images?.length || 0
  const notesCount = order.notes?.length || 0
  
  const handleAssignSuccess = async () => {
    console.log('✅ [WorkOrderDetailsModal] Orden asignada, cerrando modal y refrescando...')
    setShowAssignMechanic(false)
    if (onUpdate) {
      onUpdate()
    }
  }

  const handlePrint = async () => {
    if (!order || !companySettings) {
      toast.error('No se pudo cargar la información de la empresa para imprimir.')
      return
    }

    try {
      setIsPrinting(true)
      await downloadWorkOrderPDF(order, companySettings)
      toast.success('Orden generada con éxito')
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Error al generar el PDF de la orden.')
    } finally {
      setIsPrinting(false)
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
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge 
                className={`${statusInfo.color} text-white text-xs sm:text-sm px-2 py-1`}
              >
                {statusInfo.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <EaglesAIActionButton 
                workOrderId={order.id} 
                customerPhone={order.customer?.phone} 
              />
              <WorkOrderQRCode 
                orderId={order.id} 
                orderNumber={order.order_number} 
                customerName={order.customer?.name} 
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={handlePrint}
                      disabled={isPrinting}
                    >
                      {isPrinting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Printer className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Imprimir Orden de Trabajo</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
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









