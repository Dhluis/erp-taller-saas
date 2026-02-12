"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs'
import { Plus, Search, Edit, Trash2, DollarSign, TrendingUp, Users, Target, UserPlus, UserCheck, Calendar, MessageSquare, Car } from "lucide-react"
import { LeadStatusBadge, type LeadStatus } from '@/components/whatsapp/LeadStatusBadge'
import { sanitize, INPUT_LIMITS } from '@/lib/utils/input-sanitizers'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from "@/components/ui/checkbox"

interface Lead {
  id: string
  name: string
  company: string
  phone: string
  email: string
  source: string
  lead_source?: string
  status: LeadStatus
  value: number | null
  estimated_value?: number | null
  notes: string
  last_contact: string
  assigned_to: string
  created_at: string
  customer_id?: string | null
  lead_score?: number
  whatsapp_conversation_id?: string | null
  whatsapp_conversation?: {
    id: string
    last_message?: string | null
    messages_count?: number | null
  } | null
}

function OriginBadge({ lead }: { lead: Lead }) {
  if (lead.whatsapp_conversation_id) {
    return <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/50">WhatsApp</Badge>
  }
  const src = (lead.lead_source || lead.source || '').toLowerCase()
  if (src === 'web' || src === 'landing') return <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/50">Web</Badge>
  return <Badge variant="secondary" className="bg-gray-500/20 text-gray-400 border-gray-500/50">Manual</Badge>
}

export default function ComercialPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [conversationModalId, setConversationModalId] = useState<string | null>(null)
  const [conversationMessages, setConversationMessages] = useState<{ direction: string; content: string; created_at: string }[]>([])
  const [conversationLoading, setConversationLoading] = useState(false)
  const [convertModalLead, setConvertModalLead] = useState<Lead | null>(null)
  const [convertVehicle, setConvertVehicle] = useState({ add: false, brand: '', model: '', year: '', plate: '', vin: '' })
  const [convertSubmitting, setConvertSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    source: "",
    status: "new" as LeadStatus,
    value: 0,
    notes: "",
    last_contact: "",
    assigned_to: ""
  })

  // Cargar leads desde API
  useEffect(() => {
    const loadLeads = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/leads')
        const data = await response.json()
        
        if (data.success && data.data) {
          const leadsData = Array.isArray(data.data) ? data.data : (data.data?.items ?? [])
          setLeads(leadsData.map((lead: any) => ({
            ...lead,
            company: lead.company || '',
            source: lead.source ?? lead.lead_source ?? '',
            value: lead.value ?? lead.estimated_value ?? null,
            last_contact: lead.last_contact || lead.created_at || '',
            assigned_to: lead.assigned_to || lead.assigned_user?.full_name || ''
          })))
        }
      } catch (error) {
        console.error('Error cargando leads:', error)
        toast.error('Error al cargar leads')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadLeads()
  }, [])

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = (lead.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const stats = {
    totalLeads: leads.length,
    totalValue: leads.reduce((sum, lead) => sum + ((lead.value as number) || 0), 0),
    byStatus: {
      new: leads.filter(lead => lead.status === 'new').length,
      contacted: leads.filter(lead => lead.status === 'contacted').length,
      qualified: leads.filter(lead => lead.status === 'qualified').length,
      appointment: leads.filter(lead => lead.status === 'appointment').length,
      converted: leads.filter(lead => lead.status === 'converted').length,
      lost: leads.filter(lead => lead.status === 'lost').length
    }
  }

  const handleUpdateStatus = async (leadId: string, newStatus: LeadStatus) => {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setLeads(leads.map(lead => 
          lead.id === leadId ? { ...lead, status: newStatus } : lead
        ))
        toast.success('Estado actualizado')
      } else {
        toast.error(data.error || 'Error al actualizar estado')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Error al actualizar estado')
    }
  }

  const handleDeleteLead = async (lead: Lead) => {
    if (!lead?.id) {
      toast.error('No se puede eliminar: lead inválido')
      return
    }

    const deleteLead = async () => {
      try {
        const response = await fetch(`/api/leads/${lead.id}`, {
          method: 'DELETE'
        })

        const data = await response.json().catch(() => ({}))

        if (response.ok && data?.success !== false) {
          setLeads(prev => prev.filter(l => l.id !== lead.id))
          toast.success('Lead eliminado')
        } else {
          toast.error(data.error || 'Error al eliminar lead')
        }
      } catch (error) {
        console.error('Error deleting lead:', error)
        toast.error('Error al eliminar lead')
      }
    }

    toast.custom(
      (t) => (
        <div className="w-[min(420px,90vw)] rounded-lg border border-cyan-500/50 bg-slate-800 p-4 text-white shadow-lg">
          <div className="text-sm font-semibold">
            ¿Eliminar lead "{lead.name || 'Sin nombre'}"?
          </div>
          <div className="mt-1 text-sm text-slate-300">
            Esta acción no se puede deshacer.
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
              onClick={() => toast.dismiss(t)}
            >
              Cancelar
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                toast.dismiss(t)
                void deleteLead()
              }}
            >
              Eliminar
            </Button>
          </div>
        </div>
      ),
      { position: 'top-center', duration: Infinity }
    )
  }

  const loadConversationMessages = useCallback(async (conversationId: string) => {
    setConversationLoading(true)
    try {
      const res = await fetch(`/api/whatsapp/conversations/${conversationId}/messages?limit=100`)
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setConversationMessages(json.data)
      } else {
        setConversationMessages([])
      }
    } catch {
      setConversationMessages([])
      toast.error('Error al cargar mensajes')
    } finally {
      setConversationLoading(false)
    }
  }, [])

  const openConversationModal = (convId: string) => {
    setConversationModalId(convId)
    setConversationMessages([])
    loadConversationMessages(convId)
  }

  const handleConvertToCustomer = async (lead: Lead, vehiclePayload?: { brand: string; model: string; year: number; plate: string; vin?: string }) => {
    if (!lead?.id) {
      toast.error('No se puede convertir: lead inválido')
      return
    }
    setIsConverting(true)
    try {
      const body: Record<string, unknown> = { additional_notes: 'Convertido desde página Comercial' }
      if (vehiclePayload) {
        body.vehicle = {
          brand: vehiclePayload.brand,
          model: vehiclePayload.model,
          year: vehiclePayload.year,
          plate: vehiclePayload.plate,
          ...(vehiclePayload.vin ? { vin: vehiclePayload.vin } : {})
        }
      }
      const response = await fetch(`/api/leads/${lead.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await response.json()
      if (data.success) {
        setLeads(leads.map(l =>
          l.id === lead.id
            ? { ...l, status: 'converted' as LeadStatus, customer_id: data.data.customer_id }
            : l
        ))
        setIsDialogOpen(false)
        setEditingLead(null)
        setConvertModalLead(null)
        setConvertVehicle({ add: false, brand: '', model: '', year: '', plate: '', vin: '' })
        toast.success('Lead convertido a cliente exitosamente')
        if (data.data?.customer_id) {
          // Opcional: redirigir a cliente
          // router.push(`/clientes/${data.data.customer_id}`)
        }
      } else {
        toast.error(data.error || 'Error al convertir lead')
      }
    } catch (error) {
      console.error('Error converting lead:', error)
      toast.error('Error al convertir lead')
    } finally {
      setIsConverting(false)
      setConvertSubmitting(false)
    }
  }

  const openConvertModal = (lead: Lead) => {
    setConvertModalLead(lead)
    setConvertVehicle({ add: false, brand: '', model: '', year: '', plate: '', vin: '' })
  }

  const submitConvertModal = async () => {
    if (!convertModalLead) return
    setConvertSubmitting(true)
    if (convertVehicle.add) {
      const y = parseInt(convertVehicle.year, 10)
      if (Number.isNaN(y) || y < 1950 || y > 2027) {
        toast.error('Año debe estar entre 1950 y 2027')
        setConvertSubmitting(false)
        return
      }
      if (!convertVehicle.brand.trim() || !convertVehicle.model.trim() || !convertVehicle.plate.trim()) {
        toast.error('Marca, modelo y placas son requeridos')
        setConvertSubmitting(false)
        return
      }
      await handleConvertToCustomer(convertModalLead, {
        brand: convertVehicle.brand.trim(),
        model: convertVehicle.model.trim(),
        year: y,
        plate: convertVehicle.plate.trim(),
        vin: convertVehicle.vin.trim() || undefined
      })
    } else {
      await handleConvertToCustomer(convertModalLead)
    }
  }

  const handleSaveLead = async () => {
    try {
      const url = editingLead ? `/api/leads/${editingLead.id}` : '/api/leads'
      const method = editingLead ? 'PATCH' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          company: formData.company,
          status: formData.status,
          estimated_value: formData.value,
          notes: formData.notes,
          lead_source: formData.source
        })
      })

      const data = await response.json()

      if (data.success) {
        if (editingLead) {
          setLeads(leads.map(l => l.id === editingLead.id ? data.data : l))
        } else {
          setLeads([...leads, data.data])
        }
        setIsDialogOpen(false)
        setEditingLead(null)
        setFormData({
          name: "",
          company: "",
          phone: "",
          email: "",
          source: "",
          status: "new",
          value: 0,
          notes: "",
          last_contact: "",
          assigned_to: ""
        })
        toast.success(editingLead ? 'Lead actualizado' : 'Lead creado')
      } else {
        toast.error(data.error || 'Error al guardar lead')
      }
    } catch (error) {
      console.error('Error saving lead:', error)
      toast.error('Error al guardar lead')
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Comercial</h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Cargando leads...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Breadcrumbs */}
      <StandardBreadcrumbs currentPage="Comercial" />

      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Comercial</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setEditingLead(null)
            setFormData({
              name: "",
              company: "",
              phone: "",
              email: "",
              source: "",
              status: "new",
              value: 0,
              notes: "",
              last_contact: "",
              assigned_to: ""
            })
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-slate-800 border-cyan-500/50 border-2 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">{editingLead ? 'Editar Lead' : 'Nuevo Lead'}</DialogTitle>
              <DialogDescription className="text-slate-400">
                {editingLead ? 'Edita la información del lead' : 'Agrega un nuevo lead al sistema'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-slate-300">Nombre</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  />
                </div>
                <div>
                  <Label htmlFor="company" className="text-slate-300">Empresa</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone" className="text-slate-300">Teléfono</Label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: sanitize.phone(e.target.value) })}
                    maxLength={INPUT_LIMITS.PHONE_MAX}
                    placeholder="4491234567"
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-slate-300">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="correo@ejemplo.com"
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="source" className="text-slate-300">Fuente</Label>
                  <Select value={formData.source} onValueChange={(value) => setFormData({ ...formData, source: value })}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white focus:border-cyan-500">
                      <SelectValue placeholder="Seleccionar fuente" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      <SelectItem value="web" className="hover:bg-gray-700 focus:bg-gray-700">Web</SelectItem>
                      <SelectItem value="referido" className="hover:bg-gray-700 focus:bg-gray-700">Referido</SelectItem>
                      <SelectItem value="telefono" className="hover:bg-gray-700 focus:bg-gray-700">Teléfono</SelectItem>
                      <SelectItem value="email" className="hover:bg-gray-700 focus:bg-gray-700">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status" className="text-slate-300">Estado</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as LeadStatus })}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white focus:border-cyan-500">
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      <SelectItem value="new" className="hover:bg-gray-700 focus:bg-gray-700">Nuevo</SelectItem>
                      <SelectItem value="contacted" className="hover:bg-gray-700 focus:bg-gray-700">Contactado</SelectItem>
                      <SelectItem value="qualified" className="hover:bg-gray-700 focus:bg-gray-700">Calificado</SelectItem>
                      <SelectItem value="appointment" className="hover:bg-gray-700 focus:bg-gray-700">Cita Agendada</SelectItem>
                      <SelectItem value="lost" className="hover:bg-gray-700 focus:bg-gray-700">Perdido</SelectItem>
                      {/* NO incluir "converted" - se hace con botón especial */}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="value" className="text-slate-300">Valor ($)</Label>
                <Input
                  id="value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: Math.max(0, Number(e.target.value)) })}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>
              <div>
                <Label htmlFor="notes" className="text-slate-300">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>
            </div>
            {editingLead && (() => {
              const canConvert = ['qualified', 'appointment'].includes(editingLead.status) && !editingLead.customer_id
              return (
                <>
                  {canConvert && (
                    <div className="py-4 border-t">
                      <Button
                        onClick={() => {
                          setIsDialogOpen(false)
                          openConvertModal(editingLead)
                        }}
                        className="w-full"
                        variant="primary"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Convertir a Cliente
                      </Button>
                    </div>
                  )}
                  {editingLead.customer_id && (
                    <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/50 rounded-lg mb-4">
                      <UserCheck className="h-4 w-4 text-green-400" />
                      <span className="text-sm text-green-400 font-medium">
                        Ya es cliente
                      </span>
                    </div>
                  )}
                </>
              )
            })()}
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsDialogOpen(false)
                  setEditingLead(null)
                  setFormData({
                    name: "",
                    company: "",
                    phone: "",
                    email: "",
                    source: "",
                    status: "new",
                    value: 0,
                    notes: "",
                    last_contact: "",
                    assigned_to: ""
                  })
                }}
                className="border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveLead}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Guardar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Leads</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="h-4 w-4 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalLeads}</div>
            <p className="text-xs text-gray-400 mt-1">Total en el sistema</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Valor Total</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/10">
              <DollarSign className="h-4 w-4 text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${(stats.totalValue || 0).toLocaleString()}</div>
            <p className="text-xs text-gray-400 mt-1">Valor estimado total</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Nuevos</CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Target className="h-4 w-4 text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.byStatus.new}</div>
            <p className="text-xs text-gray-400 mt-1">Leads nuevos</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Calificados</CardTitle>
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <TrendingUp className="h-4 w-4 text-yellow-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.byStatus.qualified}</div>
            <p className="text-xs text-gray-400 mt-1">Leads calificados</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Citas Agendadas</CardTitle>
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Calendar className="h-4 w-4 text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.byStatus.appointment}</div>
            <p className="text-xs text-gray-400 mt-1">Con cita programada</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Convertidos</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/10">
              <UserCheck className="h-4 w-4 text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.byStatus.converted}</div>
            <p className="text-xs text-gray-400 mt-1">Convertidos a clientes</p>
          </CardContent>
        </Card>
      </div>

      {/* Búsqueda y Filtros */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-500"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="bg-gray-800 border border-gray-700">
            <TabsTrigger 
              value="all"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300"
            >
              Todos ({stats.totalLeads})
            </TabsTrigger>
            <TabsTrigger 
              value="new"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300"
            >
              Nuevos ({stats.byStatus.new})
            </TabsTrigger>
            <TabsTrigger 
              value="contacted"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300"
            >
              Contactados ({stats.byStatus.contacted})
            </TabsTrigger>
            <TabsTrigger 
              value="qualified"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300"
            >
              Calificados ({stats.byStatus.qualified})
            </TabsTrigger>
            <TabsTrigger 
              value="appointment"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300"
            >
              Citas ({stats.byStatus.appointment})
            </TabsTrigger>
            <TabsTrigger 
              value="converted"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300"
            >
              Convertidos ({stats.byStatus.converted})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tabla de Leads */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Leads</CardTitle>
          <CardDescription className="text-gray-400">
            Lista de todos los leads del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700 hover:bg-gray-750">
                <TableHead className="text-gray-300">Nombre</TableHead>
                <TableHead className="text-gray-300">Empresa</TableHead>
                <TableHead className="text-gray-300">Contacto</TableHead>
                <TableHead className="text-gray-300">Origen</TableHead>
                <TableHead className="text-gray-300">Estado</TableHead>
                <TableHead className="text-gray-300">Valor</TableHead>
                <TableHead className="text-gray-300">Asignado</TableHead>
                <TableHead className="text-right text-gray-300">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow key={lead.id} className="border-gray-700 hover:bg-gray-750/50">
                  <TableCell className="font-medium text-white">{lead.name}</TableCell>
                  <TableCell className="text-gray-300">{lead.company || '-'}</TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm text-white">{lead.phone}</div>
                      <div className="text-sm text-gray-400">{lead.email || '-'}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <OriginBadge lead={lead} />
                  </TableCell>
                  <TableCell>
                    {lead.status === 'converted' || lead.customer_id ? (
                      <div className="flex items-center gap-2">
                        <LeadStatusBadge status={lead.status} size="sm" />
                        {lead.customer_id && (
                          <span className="text-xs text-green-600">✓ Cliente</span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <LeadStatusBadge status={lead.status} size="sm" />
                        <Select
                          value={lead.status}
                          onValueChange={(newStatus) => handleUpdateStatus(lead.id, newStatus as LeadStatus)}
                        >
                          <SelectTrigger className="w-[140px] h-7 text-xs bg-gray-800 border-gray-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700 text-white">
                            <SelectItem value="new" className="hover:bg-gray-700">Nuevo</SelectItem>
                            <SelectItem value="contacted" className="hover:bg-gray-700">Contactado</SelectItem>
                            <SelectItem value="qualified" className="hover:bg-gray-700">Calificado</SelectItem>
                            <SelectItem value="appointment" className="hover:bg-gray-700">Cita Agendada</SelectItem>
                            <SelectItem value="lost" className="hover:bg-gray-700">Perdido</SelectItem>
                            {/* NO incluir converted - se hace con botón */}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-white">${lead.value ? (lead.value || 0).toLocaleString() : '0'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-300">{lead.assigned_to || '-'}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 flex-wrap">
                      {lead.whatsapp_conversation_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                          onClick={() => openConversationModal(lead.whatsapp_conversation_id!)}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Ver conversación
                        </Button>
                      )}
                      {['qualified', 'appointment'].includes(lead.status) && !lead.customer_id && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => openConvertModal(lead)}
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          Convertir a Cliente
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="hover:bg-gray-700 text-gray-300 hover:text-white"
                        onClick={() => {
                          setEditingLead(lead)
                          setFormData({
                            name: lead.name,
                            company: lead.company,
                            phone: lead.phone,
                            email: lead.email,
                            source: lead.source || lead.lead_source || '',
                            status: lead.status,
                            value: lead.value ?? lead.estimated_value ?? 0,
                            notes: lead.notes,
                            last_contact: lead.last_contact,
                            assigned_to: lead.assigned_to
                          })
                          setIsDialogOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="hover:bg-gray-700 text-gray-300 hover:text-red-400"
                        onClick={() => handleDeleteLead(lead)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal: historial de conversación WhatsApp */}
      <Dialog open={!!conversationModalId} onOpenChange={(open) => !open && setConversationModalId(null)}>
        <DialogContent className="max-w-lg bg-slate-800 border-cyan-500/50 text-white max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Conversación WhatsApp</DialogTitle>
            <DialogDescription className="text-slate-400">Historial de mensajes</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px]">
            {conversationLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
              </div>
            ) : (
              conversationMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`rounded-lg p-3 text-sm ${
                    msg.direction === 'outgoing' || msg.direction === 'outbound'
                      ? 'ml-8 bg-cyan-500/20 border border-cyan-500/50'
                      : 'mr-8 bg-gray-700/50 border border-gray-600'
                  }`}
                >
                  <div className="text-xs text-slate-400 mb-1">
                    {msg.direction === 'incoming' || msg.direction === 'inbound' ? 'Cliente' : 'Taller'} · {new Date(msg.created_at).toLocaleString()}
                  </div>
                  <div className="text-white">{msg.content || '(sin texto)'}</div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Convertir Lead a Cliente (con vehículo opcional) */}
      <Dialog open={!!convertModalLead} onOpenChange={(open) => !open && setConvertModalLead(null)}>
        <DialogContent className="max-w-md bg-slate-800 border-cyan-500/50 text-white">
          <DialogHeader>
            <DialogTitle>Convertir a Cliente</DialogTitle>
            <DialogDescription className="text-slate-400">
              {convertModalLead && (
                <>Resumen: {convertModalLead.name} · {convertModalLead.phone}{convertModalLead.email ? ` · ${convertModalLead.email}` : ''}</>
              )}
            </DialogDescription>
          </DialogHeader>
          {convertModalLead && (
            <div className="space-y-4 py-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="add-vehicle"
                  checked={convertVehicle.add}
                  onCheckedChange={(checked) => setConvertVehicle((v) => ({ ...v, add: !!checked }))}
                  className="border-gray-600 data-[state=checked]:bg-cyan-600 data-[state=checked]:border-cyan-500"
                />
                <Label htmlFor="add-vehicle" className="text-slate-300 cursor-pointer">Agregar vehículo</Label>
              </div>
              {convertVehicle.add && (
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-gray-700 p-3">
                  <div>
                    <Label className="text-slate-400 text-xs">Marca</Label>
                    <Input
                      value={convertVehicle.brand}
                      onChange={(e) => setConvertVehicle((v) => ({ ...v, brand: e.target.value }))}
                      className="bg-gray-800 border-gray-700 text-white mt-1"
                      placeholder="Ej. Toyota"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs">Modelo</Label>
                    <Input
                      value={convertVehicle.model}
                      onChange={(e) => setConvertVehicle((v) => ({ ...v, model: e.target.value }))}
                      className="bg-gray-800 border-gray-700 text-white mt-1"
                      placeholder="Ej. Corolla"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs">Año (1950-2027)</Label>
                    <Input
                      inputMode="numeric"
                      value={convertVehicle.year}
                      onChange={(e) => setConvertVehicle((v) => ({ ...v, year: sanitize.year(e.target.value) }))}
                      maxLength={4}
                      className="bg-gray-800 border-gray-700 text-white mt-1"
                      placeholder="2024"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs">Placas</Label>
                    <Input
                      value={convertVehicle.plate}
                      onChange={(e) => setConvertVehicle((v) => ({ ...v, plate: sanitize.plate(e.target.value) }))}
                      maxLength={INPUT_LIMITS.PLATE_MAX}
                      className="bg-gray-800 border-gray-700 text-white mt-1"
                      placeholder="ABC-123"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-slate-400 text-xs">VIN (opcional)</Label>
                    <Input
                      value={convertVehicle.vin}
                      onChange={(e) => setConvertVehicle((v) => ({ ...v, vin: sanitize.vin(e.target.value) }))}
                      maxLength={INPUT_LIMITS.VIN_MAX}
                      className="bg-gray-800 border-gray-700 text-white mt-1"
                      placeholder="17 caracteres"
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  onClick={() => setConvertModalLead(null)}
                >
                  Cancelar
                </Button>
                {convertVehicle.add ? (
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={convertSubmitting}
                    onClick={submitConvertModal}
                  >
                    {convertSubmitting ? 'Convirtiendo...' : 'Convertir con vehículo'}
                  </Button>
                ) : (
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={convertSubmitting}
                    onClick={submitConvertModal}
                  >
                    {convertSubmitting ? 'Convirtiendo...' : 'Convertir sin vehículo'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
