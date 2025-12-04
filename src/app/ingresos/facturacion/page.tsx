"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from '@/components/navigation/page-header'
import ModernIcons from '@/components/icons/ModernIcons'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  CalendarDays
} from "lucide-react"
import { 
  getAllInvoices, 
  getInvoiceStats, 
  createInvoice,
  updateInvoice,
  deleteInvoice,
  Invoice
} from "@/lib/supabase/quotations-invoices"

// Interfaz para el formulario de factura
interface CreateInvoiceFormData {
  invoice_number: string;
  customer_id: string;
  vehicle_id: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  due_date: string;
  notes?: string;
}
import { getCustomers } from "@/lib/supabase/customers"

export default function FacturacionPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalInvoices: 0,
    pendingInvoices: 0,
    paidInvoices: 0,
    overdueInvoices: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalPending: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form data
  const [formData, setFormData] = useState<CreateInvoiceFormData>({
    invoice_number: '',
    customer_id: '',
    vehicle_id: '',
    status: 'draft',
    subtotal: 0,
    tax_amount: 0,
    total: 0,
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 días desde hoy
    notes: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [invoicesData, statsData, customersData] = await Promise.all([
        getAllInvoices(),
        getInvoiceStats(),
        getCustomers()
      ])
      
      // Si no hay datos de Supabase, usar datos mock
      if (invoicesData.length === 0) {
        console.log('Using mock data for invoices')
        const mockInvoices = [
          {
            id: '1',
            invoice_number: 'INV-001',
            customer_id: '1',
            vehicle_id: '1',
            notes: 'Cambio de aceite, filtro de aire y revisión general',
            status: 'paid' as const,
            total: 986,
            subtotal: 850,
            tax_amount: 136,
            due_date: '2025-01-25',
            paid_date: '2025-01-20',
            payment_method: 'Efectivo',
            created_at: '2025-01-15T10:00:00Z',
            updated_at: '2025-01-20T14:30:00Z',
            notes: 'Cliente satisfecho con el servicio'
          },
          {
            id: '2',
            invoice_number: 'INV-002',
            customer_id: '2',
            vehicle_id: '2',
            notes: 'Reparación de frenos delanteros',
            status: 'sent' as const,
            total: 1392,
            subtotal: 1200,
            tax_amount: 192,
            due_date: '2025-01-30',
            paid_date: undefined,
            payment_method: undefined,
            created_at: '2025-01-16T09:00:00Z',
            updated_at: '2025-01-16T09:00:00Z',
            notes: 'Pendiente de pago'
          },
          {
            id: '3',
            invoice_number: 'INV-003',
            customer_id: '3',
            vehicle_id: '3',
            notes: 'Alineación y balanceo',
            status: 'overdue' as const,
            total: 754,
            subtotal: 650,
            tax_amount: 104,
            due_date: '2025-01-15',
            paid_date: undefined,
            payment_method: undefined,
            created_at: '2025-01-10T11:00:00Z',
            updated_at: '2025-01-10T11:00:00Z',
            notes: 'Factura vencida'
          }
        ]
        setInvoices(mockInvoices)
      } else {
        setInvoices(invoicesData)
      }
      
      // Si no hay estadísticas, calcular desde los datos de facturas
      if (statsData.totalInvoices === 0 && invoicesData.length > 0) {
        const calculatedStats = {
          totalInvoices: invoicesData.length,
          pendingInvoices: invoicesData.filter(i => i.status === 'sent').length,
          paidInvoices: invoicesData.filter(i => i.status === 'paid').length,
          overdueInvoices: invoicesData.filter(i => i.status === 'overdue').length,
          totalAmount: invoicesData.reduce((sum, i) => sum + i.total, 0),
          totalPaid: invoicesData.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0),
          totalPending: invoicesData.filter(i => i.status === 'sent').reduce((sum, i) => sum + i.total, 0)
        }
        setStats(calculatedStats)
      } else {
        setStats(statsData)
      }
      
      // Si no hay clientes, usar datos mock
      if (customersData.length === 0) {
        console.log('Using mock data for customers')
        const mockCustomers = [
          { id: '1', name: 'Juan Pérez', email: 'juan@email.com', phone: '+52 81 1111 2222' },
          { id: '2', name: 'María García', email: 'maria@email.com', phone: '+52 55 3333 4444' },
          { id: '3', name: 'Carlos Ruiz', email: 'carlos@email.com', phone: '+52 33 5555 6666' }
        ]
        setCustomers(mockCustomers)
      } else {
        setCustomers(customersData)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      // En caso de error total, usar datos mock
      const mockInvoices = [
        {
          id: '1',
          invoice_number: 'INV-001',
          customer_name: 'Juan Pérez',
          customer_rfc: 'PEPJ800101ABC',
          vehicle_info: 'Toyota Corolla 2020 - ABC123',
          service_description: 'Cambio de aceite, filtro de aire y revisión general',
          status: 'paid' as const,
          total: 986,
          subtotal: 850,
          tax_amount: 136,
          due_date: '2025-01-25',
          paid_date: '2025-01-20',
          payment_method: 'Efectivo',
          created_at: '2025-01-15T10:00:00Z',
          updated_at: '2025-01-20T14:30:00Z',
          notes: 'Cliente satisfecho con el servicio'
        }
      ]
      setInvoices(mockInvoices)
      setStats({
        totalInvoices: 1,
        pendingInvoices: 0,
        paidInvoices: 1,
        overdueInvoices: 0,
        totalAmount: 986,
        totalPaid: 986,
        totalPending: 0
      })
      setCustomers([
        { id: '1', name: 'Juan Pérez', email: 'juan@email.com', phone: '+52 81 1111 2222' }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const filteredInvoices = invoices.filter(
    (invoice) =>
      (invoice.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.notes || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline" className="bg-gray-500 text-white">Borrador</Badge>
      case "sent":
        return <Badge variant="outline" className="bg-yellow-500 text-white">Enviada</Badge>
      case "paid":
        return <Badge variant="outline" className="bg-green-500 text-white">Pagada</Badge>
      case "overdue":
        return <Badge variant="outline" className="bg-red-500 text-white">Vencida</Badge>
      case "cancelled":
        return <Badge variant="outline" className="bg-gray-500 text-white">Cancelada</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (id: string, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    const numValue = parseFloat(value) || 0
    setFormData(prev => {
      const updated = { ...prev, [id]: numValue }
      // Recalcular total si cambia subtotal o tax_amount
      if (id === 'subtotal' || id === 'tax_amount') {
        updated.total = updated.subtotal + updated.tax_amount
      }
      return updated
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      let result
      if (editingInvoice) {
        result = await updateInvoice(editingInvoice.id, formData)
        if (result) {
          const updatedInvoices = invoices.map(inv => 
            inv.id === editingInvoice.id ? { ...inv, ...formData } : inv
          )
          setInvoices(updatedInvoices)
        }
      } else {
        result = await createInvoice({
          customer_id: formData.customer_id,
          vehicle_id: formData.vehicle_id,
          description: formData.notes || '',
          due_date: formData.due_date,
          notes: formData.notes
        })
        if (result) {
          setInvoices([result, ...invoices])
        }
      }
      
      if (result) {
        setIsDialogOpen(false)
        setEditingInvoice(null)
        setFormData({
          invoice_number: '',
          customer_id: '',
          vehicle_id: '',
          status: 'draft',
          subtotal: 0,
          tax_amount: 0,
          total: 0,
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes: ''
        })
        
        // Recargar estadísticas
        const statsData = await getInvoiceStats()
        setStats(statsData)
        
        alert(editingInvoice ? 'Factura actualizada exitosamente' : 'Factura creada exitosamente')
      } else {
        alert('Error al procesar la factura')
      }
    } catch (error) {
      console.error('Error processing invoice:', error)
      alert('Error al procesar la factura')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice)
    setFormData({
      invoice_number: invoice.invoice_number,
      customer_id: invoice.customer_id,
      vehicle_id: invoice.vehicle_id,
      status: invoice.status,
      subtotal: invoice.subtotal || 0,
      tax_amount: invoice.tax_amount || 0,
      total: invoice.total || 0,
      due_date: invoice.due_date.split('T')[0],
      notes: invoice.notes || ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta factura?')) {
      try {
        const success = await deleteInvoice(id)
        if (success) {
          setInvoices(invoices.filter(inv => inv.id !== id))
          const statsData = await getInvoiceStats()
          setStats(statsData)
          alert('Factura eliminada exitosamente')
        } else {
          alert('Error al eliminar la factura')
        }
      } catch (error) {
        console.error('Error deleting invoice:', error)
        alert('Error al eliminar la factura')
      }
    }
  }

  const handleNewInvoice = () => {
    setEditingInvoice(null)
    setFormData({
      invoice_number: `INV-${Date.now()}`,
      customer_id: '',
      vehicle_id: '',
      status: 'draft',
      subtotal: 0,
      tax_amount: 0,
      total: 0,
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: ''
    })
    setIsDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando facturas...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <MainLayout
      title="Gestión de Facturación"
      breadcrumbs={[
        { label: 'Ingresos', href: '/ingresos' },
        { label: 'Facturación', href: '/ingresos/facturacion' }
      ]}
    >
      <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Page Header con Breadcrumbs */}
      <PageHeader
        title="Gestión de Facturación"
        description="Administra las facturas y cobros del taller"
        breadcrumbs={[
          { label: 'Ingresos', href: '/ingresos' },
          { label: 'Facturación', href: '/ingresos/facturacion' }
        ]}
        actions={
          <Button onClick={handleNewInvoice}>
            <Plus className="mr-2 h-4 w-4" /> Crear Nueva Factura
          </Button>
        }
      />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturas</CardTitle>
            <ModernIcons.Ordenes size={16} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInvoices}</div>
            <p className="text-xs text-muted-foreground">Facturas emitidas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas Pendientes</CardTitle>
            <ModernIcons.Warning size={16} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingInvoices}</div>
            <p className="text-xs text-muted-foreground">Por cobrar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas Pagadas</CardTitle>
            <ModernIcons.Check size={16} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.paidInvoices}</div>
            <p className="text-xs text-muted-foreground">Cobradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
            <ModernIcons.Finanzas size={16} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats.totalAmount || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Valor total facturado</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 mt-8">
        <h3 className="text-xl font-semibold">Historial de Facturas</h3>
        <div className="flex items-center py-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente o ID..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="rounded-md border">
          <div className="w-full">
            <table className="w-full text-left">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Número</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Cliente</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Vehículo</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Monto</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Estado</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Vencimiento</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Acciones</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      <div className="flex items-center gap-2">
                        <ModernIcons.Ordenes size={16} />
                        {invoice.invoice_number}
                      </div>
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      <div className="flex items-center gap-2">
                        <ModernIcons.Clientes size={16} />
                        <div>
                          <div className="font-medium">Cliente ID: {invoice.customer_id}</div>
                          <div className="text-sm text-muted-foreground">Vehículo ID: {invoice.vehicle_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      <div className="text-sm">
                        <div className="font-medium">{invoice.vehicle_info}</div>
                        <div className="text-muted-foreground">{invoice.service_description}</div>
                      </div>
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      <span className="font-medium">${(invoice.total || 0).toLocaleString()}</span>
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{getStatusBadge(invoice.status)}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        {new Date(invoice.due_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEdit(invoice)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDelete(invoice.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Creación/Edición de Factura */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto border border-border shadow-lg bg-card">
          <DialogHeader>
            <DialogTitle>
              {editingInvoice ? 'Editar Factura' : 'Crear Nueva Factura'}
            </DialogTitle>
            <DialogDescription>
              {editingInvoice 
                ? 'Modifica la información de la factura.'
                : 'Completa los datos para crear una nueva factura.'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoice_number">Número de Factura *</Label>
                <Input
                  id="invoice_number"
                  value={formData.invoice_number}
                  onChange={handleInputChange}
                  placeholder="INV-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_id">ID del Cliente *</Label>
                <Input
                  id="customer_id"
                  value={formData.customer_id}
                  onChange={handleInputChange}
                  placeholder="1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle_id">ID del Vehículo *</Label>
                <Input
                  id="vehicle_id"
                  value={formData.vehicle_id}
                  onChange={handleInputChange}
                  placeholder="1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas del Servicio *</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Cambio de aceite y filtro"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_description">Descripción del Servicio *</Label>
              <Textarea
                id="service_description"
                value={formData.service_description}
                onChange={handleInputChange}
                placeholder="Cambio de aceite, filtro de aire y revisión general"
                required
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Estado *</Label>
                <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="sent">Enviada</SelectItem>
                    <SelectItem value="paid">Pagada</SelectItem>
                    <SelectItem value="overdue">Vencida</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Fecha de Vencimiento *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_method">Método de Pago</Label>
                <Select value={formData.payment_method} onValueChange={(value) => handleSelectChange('payment_method', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sin especificar">Sin especificar</SelectItem>
                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                    <SelectItem value="Transferencia">Transferencia</SelectItem>
                    <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subtotal">Subtotal *</Label>
                <Input
                  id="subtotal"
                  type="number"
                  value={formData.subtotal}
                  onChange={handleAmountChange}
                  placeholder="0.00"
                  step="0.01"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_amount">Impuestos</Label>
                <Input
                  id="tax_amount"
                  type="number"
                  value={formData.tax_amount}
                  onChange={handleAmountChange}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="total">Total</Label>
                <Input
                  id="total"
                  type="number"
                  value={formData.total}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Observaciones adicionales..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingInvoice ? 'Actualizando...' : 'Creando...'}
                  </>
                ) : (
                  <>
                    <ModernIcons.Ordenes size={16} className="mr-2" />
                    {editingInvoice ? 'Actualizar Factura' : 'Crear Factura'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}
