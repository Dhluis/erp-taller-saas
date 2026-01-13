// src/components/whatsapp/LeadManagementPanel.tsx
'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Sparkles, 
  TrendingUp, 
  DollarSign, 
  UserPlus,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { LeadStatusBadge, type LeadStatus } from './LeadStatusBadge'
import { toast } from 'sonner'

interface Lead {
  id: string
  name: string
  phone: string
  email?: string
  company?: string
  status: LeadStatus
  lead_score?: number
  estimated_value?: number
  notes?: string
  whatsapp_conversation_id?: string
  customer_id?: string
}

interface LeadManagementPanelProps {
  conversationId: string
  customerPhone: string
  customerName: string
  lead?: Lead | null
  onLeadCreated?: (lead: Lead) => void
  onLeadUpdated?: (lead: Lead) => void
  onLeadConverted?: (customerId: string) => void
}

export function LeadManagementPanel({
  conversationId,
  customerPhone,
  customerName,
  lead: initialLead,
  onLeadCreated,
  onLeadUpdated,
  onLeadConverted,
}: LeadManagementPanelProps) {
  const [lead, setLead] = useState<Lead | null>(initialLead || null)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showConvertDialog, setShowConvertDialog] = useState(false)

  // Form state
  const [estimatedValue, setEstimatedValue] = useState(lead?.estimated_value || 0)
  const [notes, setNotes] = useState(lead?.notes || '')
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus>(lead?.status || 'new')
  const [leadScore, setLeadScore] = useState(lead?.lead_score || 0)

  // Crear lead desde conversación
  const handleCreateLead = async () => {
    setIsCreating(true)
    try {
      const response = await fetch('/api/leads/from-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          estimated_value: estimatedValue,
          notes,
          lead_source: 'whatsapp'
        })
      })

      const data = await response.json()

      if (data.success) {
        setLead(data.data)
        setShowCreateDialog(false)
        toast.success('Lead creado exitosamente')
        onLeadCreated?.(data.data)
      } else {
        toast.error(data.error || 'Error al crear lead')
      }
    } catch (error) {
      console.error('Error creating lead:', error)
      toast.error('Error al crear lead')
    } finally {
      setIsCreating(false)
    }
  }

  // Actualizar estado del lead
  const handleUpdateStatus = async (newStatus: LeadStatus) => {
    if (!lead || !lead.id) {
      console.error('No se puede actualizar: lead o lead.id es undefined')
      return
    }

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          lead_score: leadScore,
          estimated_value: estimatedValue,
          notes
        })
      })

      const data = await response.json()

      if (data.success) {
        setLead(data.data)
        setSelectedStatus(newStatus)
        toast.success('Lead actualizado exitosamente')
        onLeadUpdated?.(data.data)
      } else {
        toast.error(data.error || 'Error al actualizar lead')
      }
    } catch (error) {
      console.error('Error updating lead:', error)
      toast.error('Error al actualizar lead')
    } finally {
      setIsUpdating(false)
    }
  }

  // Convertir lead a cliente
  const handleConvertToCustomer = async () => {
    if (!lead || !lead.id) {
      console.error('No se puede convertir: lead o lead.id es undefined')
      return
    }

    setIsConverting(true)
    try {
      const response = await fetch(`/api/leads/${lead.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          additional_notes: 'Convertido desde conversación de WhatsApp'
        })
      })

      const data = await response.json()

      if (data.success) {
        setLead(data.data.lead)
        setShowConvertDialog(false)
        toast.success('Lead convertido a cliente exitosamente')
        onLeadConverted?.(data.data.customer_id)
      } else {
        toast.error(data.error || 'Error al convertir lead')
      }
    } catch (error) {
      console.error('Error converting lead:', error)
      toast.error('Error al convertir lead')
    } finally {
      setIsConverting(false)
    }
  }

  // Si no hay lead, mostrar botón para crear
  if (!lead) {
    return (
      <>
        <Card className="p-4 border-dashed border-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Convertir en Lead</h3>
                <p className="text-xs text-muted-foreground">
                  Gestiona esta oportunidad en tu pipeline de ventas
                </p>
              </div>
            </div>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              size="sm"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Marcar como Lead
            </Button>
          </div>
        </Card>

        {/* Dialog para crear lead */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Lead</DialogTitle>
              <DialogDescription>
                Convierte esta conversación en un lead para gestionar en tu pipeline de ventas
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="customer-info">Cliente</Label>
                <Input
                  id="customer-info"
                  value={`${customerName} - ${customerPhone}`}
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated-value">Valor Estimado ($)</Label>
                <Input
                  id="estimated-value"
                  type="number"
                  placeholder="15000"
                  value={estimatedValue || ''}
                  onChange={(e) => setEstimatedValue(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  placeholder="Información adicional sobre este lead..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={isCreating}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateLead}
                disabled={isCreating}
              >
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Crear Lead
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // Si ya es un lead, mostrar panel de gestión
  const canConvert = ['qualified', 'appointment'].includes(lead.status) && !lead.customer_id

  return (
    <>
      <Card className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Lead Activo</h3>
              <LeadStatusBadge status={lead.status} size="sm" />
            </div>
          </div>
          
          {lead.customer_id && (
            <div className="text-xs text-green-600 font-medium flex items-center gap-1">
              <UserPlus className="h-3.5 w-3.5" />
              Ya es cliente
            </div>
          )}
        </div>

        {/* Información del lead */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <Label className="text-xs text-muted-foreground">Puntuación</Label>
            <div className="flex items-center gap-2 mt-1">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="font-semibold">{lead.lead_score || 0}/100</span>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Valor Estimado</Label>
            <div className="flex items-center gap-2 mt-1">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="font-semibold">
                ${(lead.estimated_value || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Actualizar estado */}
        {!lead.customer_id && (
          <div className="space-y-2">
            <Label htmlFor="lead-status" className="text-xs">
              Actualizar Estado
            </Label>
            <div className="flex gap-2">
              <Select
                value={selectedStatus}
                onValueChange={(value) => setSelectedStatus(value as LeadStatus)}
              >
                <SelectTrigger id="lead-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-bg-secondary dark:bg-gray-800 border-border">
                  <SelectItem value="new" className="hover:bg-bg-tertiary dark:hover:bg-gray-700">Nuevo</SelectItem>
                  <SelectItem value="contacted" className="hover:bg-bg-tertiary dark:hover:bg-gray-700">Contactado</SelectItem>
                  <SelectItem value="qualified" className="hover:bg-bg-tertiary dark:hover:bg-gray-700">Calificado</SelectItem>
                  <SelectItem value="appointment" className="hover:bg-bg-tertiary dark:hover:bg-gray-700">Cita Agendada</SelectItem>
                  <SelectItem value="lost" className="hover:bg-bg-tertiary dark:hover:bg-gray-700">Perdido</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={() => handleUpdateStatus(selectedStatus)}
                disabled={isUpdating || selectedStatus === lead.status}
              >
                {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar
              </Button>
            </div>
          </div>
        )}

        {/* Botón convertir a cliente */}
        {canConvert && (
          <Button
            onClick={() => setShowConvertDialog(true)}
            className="w-full"
            variant="default"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Convertir a Cliente
          </Button>
        )}

        {/* Nota si no puede convertir */}
        {!canConvert && !lead.customer_id && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800">
              Califica el lead primero para poder convertirlo a cliente
            </p>
          </div>
        )}
      </Card>

      {/* Dialog para confirmar conversión */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convertir a Cliente</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas convertir este lead a cliente? 
              El cliente aparecerá en el sistema y podrás crear órdenes de trabajo.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Lead</span>
              <LeadStatusBadge status={lead.status} size="sm" />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Valor Estimado</span>
              <span className="font-semibold">
                ${(lead.estimated_value || 0).toLocaleString()}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConvertDialog(false)}
              disabled={isConverting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConvertToCustomer}
              disabled={isConverting}
            >
              {isConverting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sí, Convertir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

