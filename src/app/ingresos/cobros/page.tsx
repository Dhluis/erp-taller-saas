"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { usePermissions } from '@/hooks/usePermissions'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  Search,
  DollarSign,
  TrendingUp,
  CheckCircle,
  Clock,
  CreditCard,
  Home,
  ChevronRight
} from "lucide-react"
import { getCollections, getCollectionStats, createCollection, Collection, CreateCollectionData } from "@/lib/supabase/collections"
import { useErrorHandler } from "@/lib/utils/error-handler"

export default function CobrosPage() {
  const router = useRouter()
  const permissions = usePermissions()
  
  // ✅ PROTECCIÓN: Solo ADMIN puede acceder a Cobros
  useEffect(() => {
    if (!permissions.isAdmin && !permissions.canPayInvoices()) {
      router.push('/dashboard');
    }
  }, [permissions, router]);
  
  // Si no tiene permisos, no renderizar nada
  if (!permissions.isAdmin && !permissions.canPayInvoices()) {
    return null;
  }
  
  const [searchTerm, setSearchTerm] = useState("")
  const [collections, setCollections] = useState<Collection[]>([])
  const [stats, setStats] = useState({
    totalCollections: 0,
    completedCollections: 0,
    pendingCollections: 0,
    totalCollected: 0,
    pendingAmount: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    customer_id: '',
    invoice_id: '',
    amount: 0,
    due_date: new Date().toISOString().split('T')[0],
    payment_method: 'transfer',
    reference_number: '',
    status: 'pending',
    notes: '',
    currency: 'MXN'
  })
  
  // Usar el nuevo sistema de manejo de errores
  const { error, handleError, clearError } = useErrorHandler()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    clearError()
    
    try {
      const [collectionsData, statsData] = await Promise.all([
        getCollections(),
        getCollectionStats()
      ])
      
      // Si no hay cobros, usar datos mock
      if (collectionsData.length === 0) {
        console.log('Using mock data for collections')
        const mockCollections = [
          {
            id: '1',
            customer_id: 'C001',
            amount: 2500,
            currency: 'MXN',
            status: 'paid' as const,
            due_date: '2024-01-15T00:00:00Z',
            created_at: '2024-01-15T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z',
            notes: 'Pago completado',
            payment_method: 'transfer',
            paid_date: '2024-01-15T00:00:00Z',
            reference_number: 'REF-001'
          },
          {
            id: '2',
            customer_id: 'C002',
            amount: 1800,
            currency: 'MXN',
            status: 'pending' as const,
            due_date: '2024-01-16T00:00:00Z',
            created_at: '2024-01-16T00:00:00Z',
            updated_at: '2024-01-16T00:00:00Z',
            notes: 'Pendiente de confirmación',
            payment_method: 'cash',
            reference_number: 'REF-002'
          }
        ]
        setCollections(mockCollections)
        setStats({
          totalCollections: mockCollections.length,
          completedCollections: mockCollections.filter(c => c.status === 'paid').length,
          pendingCollections: mockCollections.filter(c => c.status === 'pending').length,
          totalCollected: mockCollections.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0),
          pendingAmount: mockCollections.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0)
        })
      } else {
        setCollections(collectionsData)
        setStats({
          totalCollections: statsData.total,
          completedCollections: statsData.paid,
          pendingCollections: statsData.pending,
          totalCollected: statsData.totalPaid,
          pendingAmount: statsData.totalPending
        })
      }
    } catch (error) {
      console.error('Error loading collections:', error)
      handleError(error instanceof Error ? error : new Error('Error loading data'))
      
      // En caso de error, usar datos mock
      const mockCollections = [
        {
          id: '1',
          customer_id: 'C001',
          amount: 2500,
          currency: 'MXN',
          status: 'paid' as const,
          due_date: '2024-01-15T00:00:00Z',
          created_at: '2024-01-15T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z',
          notes: 'Pago completado',
          payment_method: 'transfer',
          paid_date: '2024-01-15T00:00:00Z',
          reference_number: 'REF-001'
        }
      ]
      setCollections(mockCollections)
      setStats({
        totalCollections: 1,
        completedCollections: 1,
        pendingCollections: 0,
        totalCollected: 2500,
        pendingAmount: 0
      })
    }
    
    setIsLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const newCollection = await createCollection(formData)
      if (newCollection) {
        // Recargar datos
        await loadData()
        setIsDialogOpen(false)
        // Resetear formulario
        setFormData({
          customer_id: '',
          invoice_id: '',
          amount: 0,
          due_date: new Date().toISOString().split('T')[0],
          payment_method: 'transfer',
          reference_number: '',
          status: 'pending',
          notes: '',
          currency: 'MXN'
        })
        alert('Cobro registrado exitosamente!')
      } else {
        alert('Error al registrar el cobro')
      }
    } catch (error) {
      console.error('Error creating collection:', error)
      alert('Error al registrar el cobro')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredCollections = collections.filter(
    (collection) =>
      (collection.customer_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (collection.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (collection.reference_number && (collection.reference_number || '').toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500 text-white">Completado</Badge>
      case "pending":
        return <Badge className="bg-yellow-500 text-white">Pendiente</Badge>
      case "overdue":
        return <Badge className="bg-red-500 text-white">Vencido</Badge>
      case "cancelled":
        return <Badge className="bg-gray-500 text-white">Cancelado</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando cobros...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Migas de Pan */}
      <nav className="flex items-center gap-2 mb-6 text-sm">
        <a 
          href="/dashboard" 
          className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors rounded-lg px-3 py-2 hover:bg-slate-800/50 group"
        >
          <Home className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span>Dashboard</span>
        </a>
        <ChevronRight className="w-4 h-4 text-slate-600" />
        <a 
          href="/ingresos" 
          className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors rounded-lg px-3 py-2 hover:bg-slate-800/50 group"
        >
          <span>Ingresos</span>
        </a>
        <ChevronRight className="w-4 h-4 text-slate-600" />
        <div className="flex items-center gap-2 text-white font-medium bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg px-4 py-2 border border-cyan-500/20 shadow-lg shadow-cyan-500/5">
          <CreditCard className="w-4 h-4 text-cyan-400" />
          <span>Gestión de Cobros</span>
        </div>
      </nav>

      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Gestión de Cobros</h2>
        <div className="flex items-center space-x-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Registrar Nuevo Cobro
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-black border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Registrar Nuevo Cobro</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Completa la información del cobro que deseas registrar.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_id" className="text-sm font-medium text-white">
                      Cliente ID *
                    </Label>
                    <Input
                      id="customer_id"
                      value={formData.customer_id}
                      onChange={(e) => setFormData({...formData, customer_id: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white placeholder-slate-400 focus:border-cyan-500 h-10"
                      placeholder="Ej: C001"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="invoice_id" className="text-sm font-medium text-white">
                      Factura ID (opcional)
                    </Label>
                    <Input
                      id="invoice_id"
                      value={formData.invoice_id}
                      onChange={(e) => setFormData({...formData, invoice_id: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white placeholder-slate-400 focus:border-cyan-500 h-10"
                      placeholder="Ej: F001"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-sm font-medium text-white">
                      Monto *
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                      className="bg-slate-900 border-slate-700 text-white placeholder-slate-400 focus:border-cyan-500 h-10"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="due_date" className="text-sm font-medium text-white">
                      Fecha de Vencimiento *
                    </Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white placeholder-slate-400 focus:border-cyan-500 h-10"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment_method" className="text-sm font-medium text-white">
                      Método de Pago *
                    </Label>
                    <Select
                      value={formData.payment_method}
                      onValueChange={(value) => setFormData({...formData, payment_method: value as any})}
                    >
                      <SelectTrigger className="bg-slate-900 border-slate-700 text-white h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700">
                        <SelectItem value="cash" className="text-white hover:bg-slate-800">Efectivo</SelectItem>
                        <SelectItem value="transfer" className="text-white hover:bg-slate-800">Transferencia</SelectItem>
                        <SelectItem value="card" className="text-white hover:bg-slate-800">Tarjeta</SelectItem>
                        <SelectItem value="check" className="text-white hover:bg-slate-800">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reference_number" className="text-sm font-medium text-white">
                      Referencia
                    </Label>
                    <Input
                      id="reference_number"
                      value={formData.reference_number}
                      onChange={(e) => setFormData({...formData, reference_number: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white placeholder-slate-400 focus:border-cyan-500 h-10"
                      placeholder="Ej: REF-001"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-sm font-medium text-white">
                      Estado *
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({...formData, status: value as any})}
                    >
                      <SelectTrigger className="bg-slate-900 border-slate-700 text-white h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700">
                        <SelectItem value="pending" className="text-white hover:bg-slate-800">Pendiente</SelectItem>
                        <SelectItem value="paid" className="text-white hover:bg-slate-800">Pagado</SelectItem>
                        <SelectItem value="overdue" className="text-white hover:bg-slate-800">Vencido</SelectItem>
                        <SelectItem value="cancelled" className="text-white hover:bg-slate-800">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-sm font-medium text-white">
                      Notas
                    </Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white placeholder-slate-400 focus:border-cyan-500 min-h-[80px] resize-none"
                      placeholder="Observaciones adicionales sobre el cobro..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter className="gap-3 pt-4 border-t border-slate-700">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => setIsDialogOpen(false)}
                    className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700 h-10"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white h-10 px-6"
                  >
                    {isSubmitting ? 'Registrando...' : 'Registrar Cobro'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cobrado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats.totalCollected || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+5.2% del mes pasado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendiente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats.pendingAmount || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Monto por cobrar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cobros</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCollections}</div>
            <p className="text-xs text-muted-foreground">Transacciones registradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedCollections}</div>
            <p className="text-xs text-muted-foreground">Cobros exitosos</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 mt-8">
        <h3 className="text-xl font-semibold">Historial de Cobros</h3>
        <div className="flex items-center py-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, ID o referencia..."
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
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">ID</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Cliente</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Monto</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Método</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Referencia</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Estado</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Fecha</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {filteredCollections.map((collection) => (
                  <tr key={collection.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{collection.id}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{collection.customer_id}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">${(collection.amount || 0).toLocaleString()}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 flex items-center gap-2"><CreditCard className="h-4 w-4 text-muted-foreground" />{collection.payment_method || '-'}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{collection.reference_number || '-'}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{getStatusBadge(collection.status)}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{new Date(collection.due_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
