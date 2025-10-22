'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WorkOrderImageManager } from '@/components/work-orders/WorkOrderImageManager'
import { WorkOrderNotes } from '@/components/work-orders/WorkOrderNotes'
import { WorkOrderItems } from '@/components/work-orders/WorkOrderItems'
import WorkOrderDocuments from '@/components/work-orders/WorkOrderDocuments'
import { WorkOrderImage } from '@/lib/supabase/work-order-storage'
import { WorkOrderNote } from '@/lib/types/work-orders'
import { 
  ClipboardList, 
  Camera, 
  Receipt, 
  FileText,
  MessageSquare,
  History,
  Folder
} from 'lucide-react'

interface WorkOrderDetailsTabsProps {
  order: any // El tipo completo de WorkOrder
  userId?: string
  onUpdate?: () => void
}

export function WorkOrderDetailsTabs({
  order,
  userId,
  onUpdate
}: WorkOrderDetailsTabsProps) {
  const [images, setImages] = useState<WorkOrderImage[]>(order?.images || [])
  const [notes, setNotes] = useState<WorkOrderNote[]>(order?.notes || [])
  const [documents, setDocuments] = useState<any[]>(order?.documents || [])
  const [lastNotesUpdate, setLastNotesUpdate] = useState<number>(0)

  // ✅ SINCRONIZAR ESTADO CON LA PROPIEDAD order.images
  useEffect(() => {
    console.log('🔄 [WorkOrderDetailsTabs] Sincronizando imágenes:', order?.images)
    if (order?.images) {
      setImages(order.images)
    } else {
      setImages([])
    }
  }, [order?.images])

  // ✅ SINCRONIZAR ESTADO CON LA PROPIEDAD order.notes
  useEffect(() => {
    // Solo sincronizar si workOrder.notes cambió desde fuera
    // (no si cambiamos nosotros las notas)
    const notesTimestamp = Date.now()
    
    if (order?.notes && notesTimestamp - lastNotesUpdate > 1000) {
      console.log('🔄 [WorkOrderDetailsTabs] Sincronizando notas:', order.notes)
      setNotes(order.notes)
      setLastNotesUpdate(notesTimestamp)
    } else if (!order?.notes) {
      setNotes([])
    }
  }, [order?.notes, lastNotesUpdate])

  // ✅ SINCRONIZAR ESTADO CON LA PROPIEDAD order.documents
  useEffect(() => {
    console.log('🔄 [WorkOrderDetailsTabs] Sincronizando documentos:', order?.documents)
    if (order?.documents) {
      setDocuments(order.documents)
    } else {
      setDocuments([])
    }
  }, [order?.documents])

  const handleImagesChange = async (newImages: WorkOrderImage[]) => {
    console.log('🔄 [WorkOrderDetailsTabs] Imágenes actualizadas:', newImages.length)
    setImages(newImages)
    // Opcional: notificar al padre que hubo cambios
    onUpdate?.()
  }

  const handleNotesChange = async (newNotes: WorkOrderNote[]) => {
    console.log('🔄 [WorkOrderDetailsTabs] Notas actualizadas:', newNotes.length)
    setNotes(newNotes)
    // Opcional: notificar al padre que hubo cambios
    onUpdate?.()
  }

  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1 p-1">
        {/* Tab: General */}
        <TabsTrigger 
          value="general" 
          className="flex items-center justify-center gap-1 px-2 py-2.5 text-xs sm:text-sm"
        >
          <ClipboardList className="h-4 w-4" />
          <span className="hidden sm:inline">General</span>
        </TabsTrigger>

        {/* Tab: Fotos */}
        <TabsTrigger 
          value="photos" 
          className="flex items-center justify-center gap-1 px-2 py-2.5 text-xs sm:text-sm relative"
        >
          <Camera className="h-4 w-4" />
          <span className="hidden sm:inline">Fotos</span>
          {images.length > 0 && (
            <span className="absolute -top-1 -right-1 sm:static sm:ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] sm:text-xs text-primary-foreground leading-none">
              {images.length}
            </span>
          )}
        </TabsTrigger>

        {/* Tab: Items */}
        <TabsTrigger 
          value="items" 
          className="flex items-center justify-center gap-1 px-2 py-2.5 text-xs sm:text-sm"
        >
          <Receipt className="h-4 w-4" />
          <span className="hidden sm:inline">Items</span>
        </TabsTrigger>

        {/* Tab: Notas */}
        <TabsTrigger 
          value="notes" 
          className="flex items-center justify-center gap-1 px-2 py-2.5 text-xs sm:text-sm relative"
        >
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline">Notas</span>
          {notes.length > 0 && (
            <span className="absolute -top-1 -right-1 sm:static sm:ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] sm:text-xs text-primary-foreground leading-none">
              {notes.length}
            </span>
          )}
        </TabsTrigger>

        {/* Tab: Documentos */}
        <TabsTrigger 
          value="documents" 
          className="flex items-center justify-center gap-1 px-2 py-2.5 text-xs sm:text-sm relative"
        >
          <Folder className="h-4 w-4" />
          <span className="hidden sm:inline">Documentos</span>
          {documents.length > 0 && (
            <span className="absolute -top-1 -right-1 sm:static sm:ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] sm:text-xs text-primary-foreground leading-none">
              {documents.length}
            </span>
          )}
        </TabsTrigger>

        {/* Tab: Historia */}
        <TabsTrigger 
          value="history" 
          className="flex items-center justify-center gap-1 px-2 py-2.5 text-xs sm:text-sm"
        >
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">Historia</span>
        </TabsTrigger>
      </TabsList>

      {/* TAB GENERAL */}
      <TabsContent value="general" className="space-y-8 mt-6">
        {/* Info Cliente y Vehículo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Info del Cliente */}
          <div className="space-y-3">
            <h4 className="font-semibold text-lg">Cliente</h4>
            <div className="text-sm space-y-2">
              <p><span className="text-muted-foreground">Nombre:</span> {order.customer?.name}</p>
              <p><span className="text-muted-foreground">Teléfono:</span> {order.customer?.phone}</p>
              <p><span className="text-muted-foreground">Email:</span> {order.customer?.email}</p>
            </div>
          </div>

          {/* Info del Vehículo */}
          <div className="space-y-3">
            <h4 className="font-semibold text-lg">Vehículo</h4>
            <div className="text-sm space-y-2">
              <p><span className="text-muted-foreground">Marca:</span> {order.vehicle?.brand}</p>
              <p><span className="text-muted-foreground">Modelo:</span> {order.vehicle?.model}</p>
              <p><span className="text-muted-foreground">Año:</span> {order.vehicle?.year}</p>
              <p><span className="text-muted-foreground">Placas:</span> {order.vehicle?.license_plate}</p>
              <p><span className="text-muted-foreground">Color:</span> {order.vehicle?.color}</p>
            </div>
          </div>
        </div>

        {/* Descripción */}
        <div className="space-y-3">
          <h4 className="font-semibold text-lg">Descripción del Trabajo</h4>
          <p className="text-sm text-muted-foreground">
            {order.description || 'Sin descripción'}
          </p>
        </div>

        {/* Costos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h4 className="font-semibold text-lg">Costo Estimado</h4>
            <p className="text-2xl font-bold">
              ${order.estimated_cost?.toFixed(2) || '0.00'}
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-semibold text-lg">Costo Final</h4>
            <p className="text-2xl font-bold">
              ${order.final_cost?.toFixed(2) || '0.00'}
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-semibold text-lg">Total</h4>
            <p className="text-2xl font-bold">
              ${order.total_amount?.toFixed(2) || '0.00'}
            </p>
          </div>
        </div>
      </TabsContent>

      {/* TAB FOTOS */}
      <TabsContent value="photos" className="mt-6">
        <WorkOrderImageManager
          orderId={order.id}
          images={images}
          onImagesChange={handleImagesChange}
          currentStatus={order.status}
          userId={userId}
          maxImages={20}
        />
      </TabsContent>

      {/* TAB ITEMS */}
      <TabsContent value="items" className="mt-6">
        <WorkOrderItems
          orderId={order.id}
          orderStatus={order.status}
          onTotalChange={(total) => {
            console.log('💰 Total actualizado:', total)
            onUpdate?.()
          }}
        />
      </TabsContent>

      {/* TAB NOTAS */}
      <TabsContent value="notes" className="mt-6">
        <WorkOrderNotes
          orderId={order.id}
          notes={notes}
          onNotesChange={handleNotesChange}
          userId={userId}
          userName={order.userName || 'Usuario'}
        />
      </TabsContent>

      {/* TAB DOCUMENTOS */}
      <TabsContent value="documents" className="mt-6">
        <WorkOrderDocuments
          workOrderId={order.id}
          userId={userId || 'unknown'}
          initialDocuments={documents}
          onUpdate={onUpdate}
        />
      </TabsContent>

      {/* TAB HISTORIA */}
      <TabsContent value="history" className="mt-6">
        <div className="text-center text-muted-foreground py-12">
          <History className="mx-auto h-12 w-12 mb-4" />
          <p className="text-lg">Historial de cambios</p>
          <p className="text-sm">(Por implementar)</p>
        </div>
      </TabsContent>
    </Tabs>
  )
}
