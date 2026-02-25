'use client'

import { useState, useEffect, useRef } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WorkOrderImageManager } from '@/components/work-orders/WorkOrderImageManager'
import { WorkOrderNotes } from '@/components/work-orders/WorkOrderNotes'
import { WorkOrderItems } from '@/components/work-orders/WorkOrderItems'
import { WorkOrderServices } from '@/components/work-orders/WorkOrderServices'
import WorkOrderDocuments from '@/components/work-orders/WorkOrderDocuments'
import { WorkOrderGeneralForm } from '@/components/work-orders/WorkOrderGeneralForm'
import { WorkOrderHistory } from '@/components/work-orders/WorkOrderHistory'
import { WorkOrderImage } from '@/lib/supabase/work-order-storage'
import { WorkOrderNote } from '@/lib/types/work-orders'
import { useSession } from '@/lib/context/SessionContext'
import { toast } from 'sonner'
import { 
  ClipboardList, 
  Camera, 
  Receipt, 
  FileText,
  MessageSquare,
  History,
  Folder,
  Wrench,
  UserCog,
  Edit,
  Save,
  X,
  Loader2,
  Package
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCustomers } from '@/hooks/useCustomers'
import { useOrganization } from '@/lib/context/SessionContext'
import { createClient } from '@/lib/supabase/client'
import { 
  User, 
  Droplet, 
  Fuel, 
  Shield, 
  Clipboard, 
  ChevronDown,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

interface WorkOrderDetailsTabsProps {
  order: any // El tipo completo de WorkOrder
  userId?: string
  onUpdate?: () => void
  onAssignMechanic?: () => void // ✅ Callback para abrir modal de asignación
}

// ✅ Función helper para validar y filtrar notas
function validateNotes(notes: any[]): WorkOrderNote[] {
  if (!Array.isArray(notes)) return []
  
  return notes.filter((note: any) => {
    // Verificar que sea un objeto y tenga las propiedades mínimas requeridas
    if (!note || typeof note !== 'object') return false
    if (!note.id || typeof note.id !== 'string') return false
    if (!note.text || typeof note.text !== 'string') return false
    // Asegurar que createdAt sea una string válida
    if (!note.createdAt || typeof note.createdAt !== 'string') return false
    return true
  }) as WorkOrderNote[]
}

export function WorkOrderDetailsTabs({
  order,
  userId,
  onUpdate,
  onAssignMechanic
}: WorkOrderDetailsTabsProps) {
  const { profile } = useSession()
  const { organizationId } = useOrganization()
  const [images, setImages] = useState<WorkOrderImage[]>(order?.images || [])
  // ✅ VALIDAR NOTAS EN EL ESTADO INICIAL
  const [notes, setNotes] = useState<WorkOrderNote[]>(() => {
    return validateNotes(order?.notes || [])
  })
  const [documents, setDocuments] = useState<any[]>(order?.documents || [])
  const [lastNotesUpdate, setLastNotesUpdate] = useState<number>(0)
  const [sending, setSending] = useState(false)

  // ✅ Estado para modo de edición del tab General
  const [isEditingGeneral, setIsEditingGeneral] = useState(false)

  // ✅ Validar permisos para reasignar órdenes
  const canReassignOrders = profile?.role === 'ADMIN' || profile?.role === 'ASESOR'

  const handleReassignClick = () => {
    // ✅ Validación de permisos
    if (!canReassignOrders) {
      toast.error('No tienes permisos para reasignar órdenes', {
        description: 'Solo administradores y asesores pueden reasignar órdenes de trabajo.',
        duration: 4000
      })
      return
    }
    
    onAssignMechanic?.()
  }

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
    const notesTimestamp = Date.now()
    
    if (order?.notes && notesTimestamp - lastNotesUpdate > 1000) {
      console.log('🔄 [WorkOrderDetailsTabs] Sincronizando notas:', order.notes)
      
      // ✅ VALIDAR Y FILTRAR NOTAS usando la función helper
      const validNotes = validateNotes(order.notes)
      
      console.log('✅ [WorkOrderDetailsTabs] Notas validadas:', validNotes.length, 'de', order.notes.length)
      
      setNotes(validNotes)
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


  const handleImagesChange = async (newImages: WorkOrderImage[], options?: { skipRefetch?: boolean }) => {
    console.log('🔄 [WorkOrderDetailsTabs] Imágenes actualizadas:', newImages.length)
    setImages(newImages)
    if (!options?.skipRefetch) {
      onUpdate?.()
      console.log('✅ [WorkOrderDetailsTabs] Imagen agregada y orden refrescada')
    }
  }

  const handleNotesChange = async (newNotes: WorkOrderNote[]) => {
    console.log('🔄 [WorkOrderDetailsTabs] Notas actualizadas:', newNotes.length)
    setNotes(newNotes)
    // ❌ NO hacer refetch inmediato - igual que con imágenes
    // onUpdate?.()
    console.log('✅ [WorkOrderDetailsTabs] Nota agregada sin refetch')
  }

  const handleSendNotification = async () => {
    if (!organizationId || !order?.id) return
    setSending(true)
    try {
      const res = await fetch(`/api/work-orders/${order.id}/notify`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Notificación enviada', {
          description: data.message,
        })
      } else {
        toast.error('No se pudo enviar la notificación', {
          description: data.errors?.join(', ') || data.error || 'Error desconocido',
        })
      }
    } catch {
      toast.error('Error al enviar notificación')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
    <div className="flex justify-end mb-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSendNotification}
        disabled={sending}
      >
        {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
        Enviar al cliente
      </Button>
    </div>
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-1 p-1">
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

        {/* Tab: Servicios */}
        <TabsTrigger 
          value="services" 
          className="flex items-center justify-center gap-1 px-2 py-2.5 text-xs sm:text-sm"
        >
          <Package className="h-4 w-4" />
          <span className="hidden sm:inline">Servicios</span>
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

      {/* TAB GENERAL - Usando formulario completo replicado de creación */}
      <TabsContent value="general" className="space-y-8 mt-6">
        <WorkOrderGeneralForm
          order={order}
          isEditing={isEditingGeneral}
          onEditChange={setIsEditingGeneral}
          onSave={() => {
            onUpdate?.()
          }}
        />
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

      {/* TAB SERVICIOS */}
      <TabsContent value="services" className="mt-6">
        <WorkOrderServices orderId={order.id} onUpdate={onUpdate} />
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
        <WorkOrderHistory orderId={order.id} />
      </TabsContent>
    </Tabs>
    </>
  )
}