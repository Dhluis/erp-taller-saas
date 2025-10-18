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
  FileText, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  User,
  Car,
  CreditCard,
  Download,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Loader2
} from "lucide-react"
import {
  getInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoiceStats,
  searchInvoices,
  markInvoiceAsPaid,
  sendInvoice,
  cancelInvoice,
  subscribeToInvoices,
  type Invoice,
  type CreateInvoiceData
} from "@/lib/supabase/invoices"

export default function FacturacionPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingAmount: 0,
    overdueCount: 0,
    thisMonthCount: 0
  })

  // Form data
  const [formData, setFormData] = useState<CreateInvoiceData>({
    customer_name: '',
    customer_rfc: '',
    vehicle_info: '',
    service_description: '',
    subtotal: 0,
    tax: 0,
    total: 0,
    status: 'draft',
    payment_method: '',
    due_date: '',
    paid_date: '',
    notes: ''
  })

  // Cargar datos al montar el componente
  useEffect(() => {
    loadData()

    // Suscribirse a cambios en tiempo real
    const subscription = subscribeToInvoices((payload) => {
      console.log('Invoice change:', payload)
      loadData()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Filtrar facturas cuando cambie el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = invoices.filter(invoice =>
        invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.vehicle_info.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredInvoices(filtered)
    } else {
      setFilteredInvoices(invoices)
    }
  }, [searchTerm, invoices])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [invoicesData, statsData] = await Promise.all([
        getInvoices(),
        getInvoiceStats()
      ])

      setInvoices(invoicesData)
      setFilteredInvoices(invoicesData)
      setStats(statsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: Invoice['status']) => {
    const statusConfig = {
      draft: { label: 'Borrador', variant: 'secondary' as const, color: 'text-gray-600' },
      sent: { label: 'Enviada', variant: 'default' as const, color: 'text-blue-600' },
      paid: { label: 'Pagada', variant: 'default' as const, color: 'text-green-600' },
      overdue: { label: 'Vencida', variant: 'destructive' as const, color: 'text-red-600' },
      cancelled: { label: 'Cancelada', variant: 'destructive' as const, color: 'text-red-600' }
    }
    const config = statusConfig[status]
    return <Badge variant={config.variant} className={config.color}>{config.label}</Badge>
  }

  const getStatusIcon = (status: Invoice['status']) => {
    switch (status) {
      case 'draft': return <FileText className="h-4 w-4 text-gray-500" />
      case 'sent': return <Clock className="h-4 w-4 text-blue-500" />
      case 'paid': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'overdue': return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'cancelled': return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice)
    setFormData({
      customer_name: invoice.customer_name,
      customer_rfc: invoice.customer_rfc,
      vehicle_info: invoice.vehicle_info,
      service_description: invoice.service_description,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
      status: invoice.status,
      payment_method: invoice.payment_method || '',
      due_date: invoice.due_date,
      paid_date: invoice.paid_date || '',
      notes: invoice.notes || ''
    })
    setIsDialogOpen(true)
  }

  const handleClose = () => {
    setIsDialogOpen(false)
    setEditingInvoice(null)
    setFormData({
      customer_name: '',
      customer_rfc: '',
      vehicle_info: '',
      service_description: '',
      subtotal: 0,
      tax: 0,
      total: 0,
      status: 'draft',
      payment_method: '',
      due_date: '',
      paid_date: '',
      notes: ''
    })
  }

  const handleSubmit = async () => {
    if (!formData.customer_name.trim() || !formData.customer_rfc.trim() || !formData.vehicle_info.trim() || !formData.service_description.trim()) return

    setIsSubmitting(true)
    try {
      if (editingInvoice) {
        // Actualizar factura existente
        const updated = await updateInvoice(editingInvoice.id, formData)
        if (updated) {
          console.log('Factura actualizada:', updated)
        }
      } else {
        // Crear nueva factura
        const created = await createInvoice(formData)
        if (created) {
          console.log('Factura creada:', created)
        }
      }

      handleClose()
      loadData()
    } catch (error) {
      console.error('Error saving invoice:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta factura?')) return

    try {
      const success = await deleteInvoice(id)
      if (success) {
        console.log('Factura eliminada')
        loadData()
      }
    } catch (error) {
      console.error('Error deleting invoice:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Facturación</h1>
          <p className="text-muted-foreground">
            Gestiona las facturas y cobros de tus servicios
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingInvoice(null)
              setFormData({
                customer_name: '',
                customer_rfc: '',
                vehicle_info: '',
                service_description: '',
                subtotal: 0,
                tax: 0,
                total: 0,
                status: 'draft',
                payment_method: '',
                due_date: '',
                paid_date: '',
                notes: ''
              })
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Factura
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                {editingInvoice ? 'Editar Factura' : 'Nueva Factura'}
              </DialogTitle>
              <DialogDescription>
                {editingInvoice 
                  ? 'Modifica la información de la factura' 
                  : 'Crea una nueva factura para un cliente'
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer_name">Cliente *</Label>
                  <Input 
                    id="customer_name" 
                    defaultValue={editingInvoice?.customer_name || ''}
                    placeholder="Juan Pérez"
                  />
                </div>
                <div>
                  <Label htmlFor="customer_rfc">RFC *</Label>
                  <Input 
                    id="customer_rfc" 
                    defaultValue={editingInvoice?.customer_rfc || ''}
                    placeholder="PEPJ800101ABC"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="vehicle_info">Vehículo *</Label>
                <Input 
                  id="vehicle_info" 
                  defaultValue={editingInvoice?.vehicle_info || ''}
                  placeholder="Toyota Corolla 2020 - ABC123"
                />
              </div>
              
              <div>
                <Label htmlFor="service_description">Descripción del Servicio *</Label>
                <Textarea 
                  id="service_description" 
                  defaultValue={editingInvoice?.service_description || ''}
                  placeholder="Descripción detallada de los servicios realizados"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="subtotal">Subtotal *</Label>
                  <Input 
                    id="subtotal" 
                    type="number"
                    step="0.01"
                    defaultValue={editingInvoice?.subtotal || ''}
                    placeholder="850.00"
                  />
                </div>
                <div>
                  <Label htmlFor="tax">IVA (16%)</Label>
                  <Input 
                    id="tax" 
                    type="number"
                    step="0.01"
                    defaultValue={editingInvoice?.tax || ''}
                    placeholder="136.00"
                    readOnly
                  />
                </div>
                <div>
                  <Label htmlFor="total">Total</Label>
                  <Input 
                    id="total" 
                    type="number"
                    step="0.01"
                    defaultValue={editingInvoice?.total || ''}
                    placeholder="986.00"
                    readOnly
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="due_date">Fecha de Vencimiento *</Label>
                  <Input 
                    id="due_date" 
                    type="date"
                    defaultValue={editingInvoice?.due_date || ''}
                  />
                </div>
                <div>
                  <Label htmlFor="payment_method">Método de Pago</Label>
                  <select 
                    id="payment_method"
                    defaultValue={editingInvoice?.payment_method || ''}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Seleccionar método</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea 
                  id="notes" 
                  defaultValue={editingInvoice?.notes || ''}
                  placeholder="Notas adicionales sobre la factura"
                  rows={2}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || !formData.customer_name.trim() || !formData.customer_rfc.trim() || !formData.vehicle_info.trim() || !formData.service_description.trim()}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingInvoice ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar facturas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          Filtros
        </Button>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium">Ingresos Totales</span>
          </div>
          <p className="text-2xl font-bold mt-2">${stats.totalRevenue.toLocaleString()}</p>
        </div>
        
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            <span className="text-sm font-medium">Por Cobrar</span>
          </div>
          <p className="text-2xl font-bold mt-2">${stats.pendingAmount.toLocaleString()}</p>
        </div>
        
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-sm font-medium">Vencidas</span>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.overdueCount}</p>
        </div>
        
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium">Este Mes</span>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.thisMonthCount}</p>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-card rounded-lg border">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Cargando facturas...</span>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Factura</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vehículo</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No se encontraron facturas con ese criterio' : 'No hay facturas registradas'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{invoice.invoice_number}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(invoice.created_at).toLocaleDateString('es-MX')}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{invoice.customer_name}</div>
                    <div className="text-sm text-muted-foreground">{invoice.customer_rfc}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{invoice.vehicle_info}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-xs">
                    <p className="text-sm truncate">{invoice.service_description}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">${invoice.total.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">
                      Subtotal: ${invoice.subtotal.toLocaleString()}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(invoice.status)}
                    {getStatusBadge(invoice.status)}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {new Date(invoice.due_date).toLocaleDateString('es-MX')}
                    </div>
                    {invoice.paid_date && (
                      <div className="text-sm text-muted-foreground">
                        Pagado: {new Date(invoice.paid_date).toLocaleDateString('es-MX')}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEdit(invoice)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(invoice.id)}>
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
    </div>
  )
}
