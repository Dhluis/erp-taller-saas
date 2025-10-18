"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
  AlertCircle
} from "lucide-react"

interface Invoice {
  id: string
  number: string
  client_name: string
  client_email: string
  date: string
  due_date: string
  subtotal: number
  tax: number
  total: number
  status: string
  payment_method: string
  notes: string
  created_at: string
}

export default function TestFacturacionPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    client_name: "",
    client_email: "",
    subtotal: 0,
    tax: 0,
    total: 0,
    payment_method: "",
    notes: ""
  })

  // Datos de ejemplo
  useEffect(() => {
    const mockInvoices: Invoice[] = [
      {
        id: "1",
        number: "FAC-001",
        client_name: "AutoServicios ABC",
        client_email: "contacto@autoservicios.com",
        date: "2024-01-15",
        due_date: "2024-02-15",
        subtotal: 2000,
        tax: 320,
        total: 2320,
        status: "pagada",
        payment_method: "Transferencia",
        notes: "Servicio de mantenimiento completo",
        created_at: "2024-01-15"
      },
      {
        id: "2",
        number: "FAC-002",
        client_name: "Transportes XYZ",
        client_email: "admin@transportes.com",
        date: "2024-01-14",
        due_date: "2024-02-14",
        subtotal: 1500,
        tax: 240,
        total: 1740,
        status: "pendiente",
        payment_method: "Efectivo",
        notes: "Reparación de frenos",
        created_at: "2024-01-14"
      },
      {
        id: "3",
        number: "FAC-003",
        client_name: "Taller López",
        client_email: "info@tallerlopez.com",
        date: "2024-01-13",
        due_date: "2024-02-13",
        subtotal: 3000,
        tax: 480,
        total: 3480,
        status: "vencida",
        payment_method: "Tarjeta",
        notes: "Cambio de motor",
        created_at: "2024-01-13"
      }
    ]
    
    setInvoices(mockInvoices)
    setIsLoading(false)
  }, [])

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = (invoice.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (invoice.number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (invoice.client_email || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || invoice.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const stats = {
    totalRevenue: invoices.filter(i => i.status === "pagada").reduce((sum, i) => sum + i.total, 0),
    pendingAmount: invoices.filter(i => i.status === "pendiente").reduce((sum, i) => sum + i.total, 0),
    overdueAmount: invoices.filter(i => i.status === "vencida").reduce((sum, i) => sum + i.total, 0),
    totalInvoices: invoices.length
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pagada: { label: "Pagada", className: "bg-green-500" },
      pendiente: { label: "Pendiente", className: "bg-yellow-500" },
      vencida: { label: "Vencida", className: "bg-red-500" },
      cancelada: { label: "Cancelada", className: "bg-gray-500" }
    }
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, className: "bg-gray-500" }
    return <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pagada": return <CheckCircle className="h-4 w-4 text-green-500" />
      case "pendiente": return <Clock className="h-4 w-4 text-yellow-500" />
      case "vencida": return <XCircle className="h-4 w-4 text-red-500" />
      case "cancelada": return <AlertCircle className="h-4 w-4 text-gray-500" />
      default: return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Facturación</h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Cargando facturas...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Facturación</h2>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Factura
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nueva Factura</DialogTitle>
                <DialogDescription>
                  Crear una nueva factura para un cliente
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="client_name">Cliente</Label>
                    <Input
                      id="client_name"
                      value={formData.client_name}
                      onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                      placeholder="Nombre del cliente"
                    />
                  </div>
                  <div>
                    <Label htmlFor="client_email">Email</Label>
                    <Input
                      id="client_email"
                      type="email"
                      value={formData.client_email}
                      onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                      placeholder="email@cliente.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="subtotal">Subtotal</Label>
                    <Input
                      id="subtotal"
                      type="number"
                      value={formData.subtotal}
                      onChange={(e) => setFormData({ ...formData, subtotal: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tax">Impuestos</Label>
                    <Input
                      id="tax"
                      type="number"
                      value={formData.tax}
                      onChange={(e) => setFormData({ ...formData, tax: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="total">Total</Label>
                    <Input
                      id="total"
                      type="number"
                      value={formData.total}
                      onChange={(e) => setFormData({ ...formData, total: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="payment_method">Método de Pago</Label>
                  <Select value={formData.payment_method} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Efectivo">Efectivo</SelectItem>
                      <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                      <SelectItem value="Transferencia">Transferencia</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Notas adicionales..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => {
                  // Aquí iría la lógica para guardar
                  setIsDialogOpen(false)
                }}>
                  Crear Factura
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats.totalRevenue || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +18% desde el mes pasado
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats.pendingAmount || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {invoices.filter(i => i.status === "pendiente").length} facturas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats.overdueAmount || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {invoices.filter(i => i.status === "vencida").length} facturas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInvoices}</div>
            <p className="text-xs text-muted-foreground">
              Este mes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar facturas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pagada">Pagadas</SelectItem>
                  <SelectItem value="pendiente">Pendientes</SelectItem>
                  <SelectItem value="vencida">Vencidas</SelectItem>
                  <SelectItem value="cancelada">Canceladas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="export">Exportar</Label>
              <Button variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Descargar PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Facturas */}
      <Card>
        <CardHeader>
          <CardTitle>Facturas</CardTitle>
          <CardDescription>
            Lista de todas las facturas del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.number}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{invoice.client_name}</div>
                      <div className="text-sm text-muted-foreground">{invoice.client_email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {new Date(invoice.date).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">${(invoice.total || 0).toLocaleString()}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(invoice.status)}
                      {getStatusBadge(invoice.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      {invoice.payment_method}
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
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredInvoices.length === 0 && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No se encontraron facturas</h3>
              <p className="text-muted-foreground">
                Intenta ajustar los filtros para ver más resultados
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

