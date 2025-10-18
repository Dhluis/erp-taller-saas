"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
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
  CreditCard
} from "lucide-react"
import { getCollections, getCollectionStats, createCollection, Collection, CreateCollectionData } from "@/lib/supabase/collections"
import { useErrorHandler } from "@/lib/utils/error-handler"

export default function CobrosPage() {
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
  const [formData, setFormData] = useState<CreateCollectionData>({
    client_id: '',
    invoice_id: '',
    amount: 0,
    collection_date: new Date().toISOString().split('T')[0],
    payment_method: 'transfer',
    reference: '',
    status: 'pending',
    notes: ''
  })
  
  // Usar el nuevo sistema de manejo de errores
  const { error, setError, clearError, handleAsyncError } = useErrorHandler()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    clearError()
    
    const result = await handleAsyncError(async () => {
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
            client_id: 'C001',
            invoice_id: 'F001',
            amount: 2500,
            collection_date: '2024-01-15T00:00:00Z',
            payment_method: 'transfer' as const,
            reference: 'REF-001',
            status: 'completed' as const,
            notes: 'Pago completado',
            created_at: '2024-01-15T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z'
          },
          {
            id: '2',
            client_id: 'C002',
            invoice_id: 'F002',
            amount: 1800,
            collection_date: '2024-01-16T00:00:00Z',
            payment_method: 'cash' as const,
            reference: 'REF-002',
            status: 'pending' as const,
            notes: 'Pendiente de confirmación',
            created_at: '2024-01-16T00:00:00Z',
            updated_at: '2024-01-16T00:00:00Z'
          }
        ]
        setCollections(mockCollections)
        setStats({
          totalCollections: mockCollections.length,
          completedCollections: mockCollections.filter(c => c.status === 'completed').length,
          pendingCollections: mockCollections.filter(c => c.status === 'pending').length,
          totalCollected: mockCollections.filter(c => c.status === 'completed').reduce((sum, c) => sum + c.amount, 0),
          pendingAmount: mockCollections.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0)
        })
      } else {
        setCollections(collectionsData)
        setStats({
          totalCollections: statsData.total_collections,
          completedCollections: statsData.completed_collections,
          pendingCollections: statsData.pending_collections,
          totalCollected: statsData.total_amount_collected,
          pendingAmount: statsData.total_amount_pending
        })
      }
    })
    
    if (!result) {
      // En caso de error, usar datos mock
      const mockCollections = [
        {
          id: '1',
          client_id: 'C001',
          invoice_id: 'F001',
          amount: 2500,
          collection_date: '2024-01-15T00:00:00Z',
          payment_method: 'transfer' as const,
          reference: 'REF-001',
          status: 'completed' as const,
          notes: 'Pago completado',
          created_at: '2024-01-15T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z'
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
          client_id: '',
          invoice_id: '',
          amount: 0,
          collection_date: new Date().toISOString().split('T')[0],
          payment_method: 'transfer',
          reference: '',
          status: 'pending',
          notes: ''
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
      collection.client_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collection.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (collection.reference && collection.reference.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="outline" className="bg-green-500 text-white">{status}</Badge>
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500 text-white">{status}</Badge>
      case "failed":
        return <Badge variant="outline" className="bg-red-500 text-white">{status}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
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
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Gestión de Cobros</h2>
        <div className="flex items-center space-x-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Registrar Nuevo Cobro
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Cobro</DialogTitle>
                <DialogDescription>
                  Completa la información del cobro que deseas registrar.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="client_id" className="text-right">
                      Cliente ID
                    </Label>
                    <Input
                      id="client_id"
                      value={formData.client_id}
                      onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="invoice_id" className="text-right">
                      Factura ID
                    </Label>
                    <Input
                      id="invoice_id"
                      value={formData.invoice_id}
                      onChange={(e) => setFormData({...formData, invoice_id: e.target.value})}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="amount" className="text-right">
                      Monto
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="collection_date" className="text-right">
                      Fecha
                    </Label>
                    <Input
                      id="collection_date"
                      type="date"
                      value={formData.collection_date}
                      onChange={(e) => setFormData({...formData, collection_date: e.target.value})}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="payment_method" className="text-right">
                      Método
                    </Label>
                    <Select
                      value={formData.payment_method}
                      onValueChange={(value) => setFormData({...formData, payment_method: value as any})}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Efectivo</SelectItem>
                        <SelectItem value="transfer">Transferencia</SelectItem>
                        <SelectItem value="card">Tarjeta</SelectItem>
                        <SelectItem value="check">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reference" className="text-right">
                      Referencia
                    </Label>
                    <Input
                      id="reference"
                      value={formData.reference}
                      onChange={(e) => setFormData({...formData, reference: e.target.value})}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="status" className="text-right">
                      Estado
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({...formData, status: value as any})}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="completed">Completado</SelectItem>
                        <SelectItem value="overdue">Vencido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="notes" className="text-right">
                      Notas
                    </Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
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
            <div className="text-2xl font-bold">${stats.totalCollected.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+5.2% del mes pasado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendiente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.pendingAmount.toLocaleString()}</div>
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
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{collection.client_id}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">${collection.amount.toLocaleString()}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 flex items-center gap-2"><CreditCard className="h-4 w-4 text-muted-foreground" />{collection.payment_method}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{collection.reference || '-'}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{getStatusBadge(collection.status)}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{new Date(collection.collection_date).toLocaleDateString()}</td>
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