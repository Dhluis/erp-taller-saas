"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Plus, 
  Search, 
  Target, 
  TrendingUp, 
  Users, 
  DollarSign,
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  Loader2
} from "lucide-react"
import {
  getLeads,
  createLead,
  updateLead,
  deleteLead,
  searchLeads,
  getLeadsStats,
  getCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignsStats,
  subscribeToLeads,
  subscribeToCampaigns,
  type Lead,
  type Campaign,
  type CreateLeadData,
  type CreateCampaignData
} from "@/lib/supabase/leads"

export default function ComercialPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [activeTab, setActiveTab] = useState<'leads' | 'campaigns' | 'analytics'>('leads')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    totalValue: 0,
    conversionRate: 0,
    activeCampaigns: 0,
    leadsBySource: {} as Record<string, number>,
    leadsByStatus: {} as Record<string, number>
  })

  // Form data
  const [formData, setFormData] = useState<CreateLeadData>({
    name: '',
    company: '',
    phone: '',
    email: '',
    source: '',
    status: 'new',
    value: 0,
    notes: '',
    last_contact: '',
    assigned_to: ''
  })

  // Cargar datos al montar el componente
  useEffect(() => {
    loadData()

    // Suscribirse a cambios en tiempo real
    const leadsSubscription = subscribeToLeads((payload) => {
      console.log('Lead change:', payload)
      loadData()
    })

    const campaignsSubscription = subscribeToCampaigns((payload) => {
      console.log('Campaign change:', payload)
      loadData()
    })

    return () => {
      leadsSubscription.unsubscribe()
      campaignsSubscription.unsubscribe()
    }
  }, [])

  // Filtrar leads cuando cambie el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = leads.filter(lead =>
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredLeads(filtered)
    } else {
      setFilteredLeads(leads)
    }
  }, [searchTerm, leads])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [leadsData, campaignsData, statsData] = await Promise.all([
        getLeads(),
        getCampaigns(),
        getLeadsStats()
      ])

      setLeads(leadsData)
      setFilteredLeads(leadsData)
      setCampaigns(campaignsData)
      setStats(statsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: Lead['status']) => {
    const statusConfig = {
      new: { label: 'Nuevo', variant: 'secondary' as const, color: 'text-blue-600' },
      contacted: { label: 'Contactado', variant: 'default' as const, color: 'text-orange-600' },
      qualified: { label: 'Calificado', variant: 'default' as const, color: 'text-purple-600' },
      proposal: { label: 'Propuesta', variant: 'default' as const, color: 'text-indigo-600' },
      negotiation: { label: 'Negociación', variant: 'default' as const, color: 'text-yellow-600' },
      won: { label: 'Ganado', variant: 'default' as const, color: 'text-green-600' },
      lost: { label: 'Perdido', variant: 'destructive' as const, color: 'text-red-600' }
    }
    const config = statusConfig[status]
    return <Badge variant={config.variant} className={config.color}>{config.label}</Badge>
  }

  const getStatusIcon = (status: Lead['status']) => {
    switch (status) {
      case 'new': return <Clock className="h-4 w-4 text-blue-500" />
      case 'contacted': return <Phone className="h-4 w-4 text-orange-500" />
      case 'qualified': return <CheckCircle className="h-4 w-4 text-purple-500" />
      case 'proposal': return <MessageSquare className="h-4 w-4 text-indigo-500" />
      case 'negotiation': return <Target className="h-4 w-4 text-yellow-500" />
      case 'won': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'lost': return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getCampaignTypeIcon = (type: Campaign['type']) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />
      case 'phone': return <Phone className="h-4 w-4" />
      case 'social': return <MessageSquare className="h-4 w-4" />
      case 'event': return <Calendar className="h-4 w-4" />
    }
  }

  const getCampaignStatusBadge = (status: Campaign['status']) => {
    const statusConfig = {
      active: { label: 'Activa', variant: 'default' as const, color: 'text-green-600' },
      paused: { label: 'Pausada', variant: 'secondary' as const, color: 'text-yellow-600' },
      completed: { label: 'Completada', variant: 'default' as const, color: 'text-blue-600' }
    }
    const config = statusConfig[status]
    return <Badge variant={config.variant} className={config.color}>{config.label}</Badge>
  }

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead)
    setFormData({
      name: lead.name,
      company: lead.company || '',
      phone: lead.phone,
      email: lead.email,
      source: lead.source,
      status: lead.status,
      value: lead.value || 0,
      notes: lead.notes || '',
      last_contact: lead.last_contact || '',
      assigned_to: lead.assigned_to || ''
    })
    setIsDialogOpen(true)
  }

  const handleClose = () => {
    setIsDialogOpen(false)
    setEditingLead(null)
    setFormData({
      name: '',
      company: '',
      phone: '',
      email: '',
      source: '',
      status: 'new',
      value: 0,
      notes: '',
      last_contact: '',
      assigned_to: ''
    })
  }

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.phone.trim() || !formData.email.trim()) return

    setIsSubmitting(true)
    try {
      if (editingLead) {
        // Actualizar lead existente
        const updated = await updateLead(editingLead.id, formData)
        if (updated) {
          console.log('Lead actualizado:', updated)
        }
      } else {
        // Crear nuevo lead
        const created = await createLead(formData)
        if (created) {
          console.log('Lead creado:', created)
        }
      }

      handleClose()
      loadData()
    } catch (error) {
      console.error('Error saving lead:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este lead?')) return

    try {
      const success = await deleteLead(id)
      if (success) {
        console.log('Lead eliminado')
        loadData()
      }
    } catch (error) {
      console.error('Error deleting lead:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión Comercial</h1>
          <p className="text-muted-foreground">
            Administra leads, campañas y estrategias de ventas
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingLead(null)
              setFormData({
                name: '',
                company: '',
                phone: '',
                email: '',
                source: '',
                status: 'new',
                value: 0,
                notes: '',
                last_contact: '',
                assigned_to: ''
              })
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingLead ? 'Editar Lead' : 'Nuevo Lead'}
              </DialogTitle>
              <DialogDescription>
                {editingLead 
                  ? 'Modifica la información del lead' 
                  : 'Agrega un nuevo lead al sistema'
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nombre *</Label>
                  <Input 
                    id="name" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Roberto Martínez"
                  />
                </div>
                <div>
                  <Label htmlFor="company">Empresa</Label>
                  <Input 
                    id="company" 
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    placeholder="Transportes del Norte"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Teléfono *</Label>
                  <Input 
                    id="phone" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+52 81 1111 2222"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="roberto@email.com"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="source">Fuente</Label>
                  <select 
                    id="source"
                    value={formData.source}
                    onChange={(e) => setFormData({...formData, source: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Seleccionar fuente</option>
                    <option value="Referido">Referido</option>
                    <option value="Google Ads">Google Ads</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Web">Sitio Web</option>
                    <option value="Evento">Evento</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="value">Valor Estimado</Label>
                  <Input 
                    id="value" 
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({...formData, value: parseFloat(e.target.value) || 0})}
                    placeholder="15000"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea 
                  id="notes" 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Notas sobre el lead y seguimiento"
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || !formData.name.trim() || !formData.phone.trim() || !formData.email.trim()}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingLead ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'leads' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('leads')}
          className="px-4"
        >
          Leads
        </Button>
        <Button
          variant={activeTab === 'campaigns' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('campaigns')}
          className="px-4"
        >
          Campañas
        </Button>
        <Button
          variant={activeTab === 'analytics' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('analytics')}
          className="px-4"
        >
          Analytics
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium">Total Leads</span>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.total}</p>
        </div>
        
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium">Valor Total</span>
          </div>
          <p className="text-2xl font-bold mt-2">${stats.totalValue ? stats.totalValue.toLocaleString() : '0'}</p>
        </div>
        
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-500" />
            <span className="text-sm font-medium">Tasa Conversión</span>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.conversionRate.toFixed(1)}%</p>
        </div>
        
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-orange-500" />
            <span className="text-sm font-medium">Campañas Activas</span>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.activeCampaigns}</p>
        </div>
      </div>

      {/* Search */}
      {activeTab === 'leads' && (
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            Filtros
          </Button>
        </div>
      )}

      {/* Content based on active tab */}
      {activeTab === 'leads' && (
        <div className="bg-card rounded-lg border">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Cargando leads...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Fuente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Asignado a</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'No se encontraron leads con ese criterio' : 'No hay leads registrados'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{lead.name}</div>
                      {lead.company && (
                        <div className="text-sm text-muted-foreground">{lead.company}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {lead.phone}
                      </div>
                      <div className="text-sm flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {lead.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{lead.source}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(lead.status)}
                      {getStatusBadge(lead.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">${lead.value ? lead.value.toLocaleString() : '0'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{lead.assigned_to}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEdit(lead)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(lead.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {activeTab === 'campaigns' && (
        <div className="bg-card rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaña</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Leads Generados</TableHead>
                <TableHead>Tasa Conversión</TableHead>
                <TableHead>Presupuesto</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{campaign.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(campaign.start_date).toLocaleDateString('es-MX')} - {new Date(campaign.end_date).toLocaleDateString('es-MX')}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getCampaignTypeIcon(campaign.type)}
                      <span className="capitalize">{campaign.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getCampaignStatusBadge(campaign.status)}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{campaign.leads_generated}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{campaign.conversion_rate}%</span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm">${campaign.spent ? campaign.spent.toLocaleString() : '0'} / ${campaign.budget ? campaign.budget.toLocaleString() : '0'}</div>
                      <div className="w-full bg-muted rounded-full h-2 mt-1">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${(campaign.spent / campaign.budget) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Leads por Fuente</h3>
            <div className="space-y-3">
              {['Referido', 'Facebook', 'Google Ads'].map((source) => {
                const count = leads.filter(lead => lead.source === source).length
                const percentage = leads.length > 0 ? ((count / leads.length) * 100).toFixed(1) : '0'
                return (
                  <div key={source} className="flex items-center justify-between">
                    <span className="text-sm">{source}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{count}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Leads por Estado</h3>
            <div className="space-y-3">
              {[
                { status: 'new', label: 'Nuevos' },
                { status: 'contacted', label: 'Contactados' },
                { status: 'qualified', label: 'Calificados' },
                { status: 'won', label: 'Ganados' }
              ].map(({ status, label }) => {
                const count = leads.filter(lead => lead.status === status).length
                const percentage = leads.length > 0 ? ((count / leads.length) * 100).toFixed(1) : '0'
                return (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm">{label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{count}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
