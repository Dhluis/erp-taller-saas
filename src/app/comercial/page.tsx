"use client"

import { useState, useEffect } from "react"
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
import { Plus, Search, Edit, Trash2, DollarSign, TrendingUp, Users, Target, UserPlus, UserCheck, Calendar } from "lucide-react"
import { LeadStatusBadge, type LeadStatus } from '@/components/whatsapp/LeadStatusBadge'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Lead {
  id: string
  name: string
  company: string
  phone: string
  email: string
  source: string
  status: LeadStatus
  value: number | null
  notes: string
  last_contact: string
  assigned_to: string
  created_at: string
  customer_id?: string | null
  lead_score?: number
}

export default function TestComercialPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [isConverting, setIsConverting] = useState(false)
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
          // Adaptar datos de API al formato local si es necesario
          const leadsData = data.data.items || data.data || []
          setLeads(leadsData.map((lead: any) => ({
            ...lead,
            company: lead.company || '',
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

  const handleConvertToCustomer = async (lead: Lead) => {
    if (!lead || !lead.id) {
      toast.error('No se puede convertir: lead inválido')
      return
    }

    setIsConverting(true)
    try {
      const response = await fetch(`/api/leads/${lead.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          additional_notes: 'Convertido desde página Comercial'
        })
      })

      const data = await response.json()

      if (data.success) {
        // Actualizar lead en la lista
        setLeads(leads.map(l => 
          l.id === lead.id 
            ? { ...l, status: 'converted' as LeadStatus, customer_id: data.data.customer_id }
            : l
        ))
        setIsDialogOpen(false)
        setEditingLead(null)
        toast.success('Lead convertido a cliente exitosamente')
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
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingLead ? 'Editar Lead' : 'Nuevo Lead'}</DialogTitle>
              <DialogDescription>
                {editingLead ? 'Edita la información del lead' : 'Agrega un nuevo lead al sistema'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="company">Empresa</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="source">Fuente</Label>
                  <Select value={formData.source} onValueChange={(value) => setFormData({ ...formData, source: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar fuente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web">Web</SelectItem>
                      <SelectItem value="referido">Referido</SelectItem>
                      <SelectItem value="telefono">Teléfono</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Estado</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as LeadStatus })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Nuevo</SelectItem>
                      <SelectItem value="contacted">Contactado</SelectItem>
                      <SelectItem value="qualified">Calificado</SelectItem>
                      <SelectItem value="appointment">Cita Agendada</SelectItem>
                      <SelectItem value="lost">Perdido</SelectItem>
                      {/* NO incluir "converted" - se hace con botón especial */}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="value">Valor ($)</Label>
                <Input
                  id="value"
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                        onClick={() => handleConvertToCustomer(editingLead)}
                        className="w-full"
                        variant="default"
                        disabled={isConverting}
                      >
                        {isConverting ? (
                          <>Cargando...</>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Convertir a Cliente
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  {editingLead.customer_id && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                      <UserCheck className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-800 font-medium">
                        Ya es cliente
                      </span>
                    </div>
                  )}
                </>
              )
            })()}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
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
              }}>
                Cancelar
              </Button>
              <Button onClick={handleSaveLead}>
                Guardar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeads}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats.totalValue || 0).toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nuevos</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byStatus.new}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calificados</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byStatus.qualified}</div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Citas Agendadas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byStatus.appointment}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Convertidos</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byStatus.converted}</div>
          </CardContent>
        </Card>
      </div>

      {/* Búsqueda y Filtros */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">Todos ({stats.totalLeads})</TabsTrigger>
            <TabsTrigger value="new">Nuevos ({stats.byStatus.new})</TabsTrigger>
            <TabsTrigger value="contacted">Contactados ({stats.byStatus.contacted})</TabsTrigger>
            <TabsTrigger value="qualified">Calificados ({stats.byStatus.qualified})</TabsTrigger>
            <TabsTrigger value="appointment">Citas ({stats.byStatus.appointment})</TabsTrigger>
            <TabsTrigger value="converted">Convertidos ({stats.byStatus.converted})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tabla de Leads */}
      <Card>
        <CardHeader>
          <CardTitle>Leads</CardTitle>
          <CardDescription>
            Lista de todos los leads del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Asignado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>{lead.company}</TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm">{lead.phone}</div>
                      <div className="text-sm text-muted-foreground">{lead.email}</div>
                    </div>
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
                          <SelectTrigger className="w-[140px] h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">Nuevo</SelectItem>
                            <SelectItem value="contacted">Contactado</SelectItem>
                            <SelectItem value="qualified">Calificado</SelectItem>
                            <SelectItem value="appointment">Cita Agendada</SelectItem>
                            <SelectItem value="lost">Perdido</SelectItem>
                            {/* NO incluir converted - se hace con botón */}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">${lead.value ? (lead.value || 0).toLocaleString() : '0'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{lead.assigned_to}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setEditingLead(lead)
                          setFormData({
                            name: lead.name,
                            company: lead.company,
                            phone: lead.phone,
                            email: lead.email,
                            source: lead.source,
                            status: lead.status,
                            value: lead.value || 0,
                            notes: lead.notes,
                            last_contact: lead.last_contact,
                            assigned_to: lead.assigned_to
                          })
                          setIsDialogOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
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
    </div>
  )
}
