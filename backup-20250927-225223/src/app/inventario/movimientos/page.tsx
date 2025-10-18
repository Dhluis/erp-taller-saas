"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Plus,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Edit,
  Trash2,
  Loader2,
  Package,
  Calendar,
  User,
  FileText
} from "lucide-react"
import { 
  getInventoryMovements, 
  createInventoryMovement, 
  updateInventoryMovement,
  deleteInventoryMovement,
  getMovementStats,
  InventoryMovement 
} from "@/lib/supabase/inventory-movements"
import { getInventoryProducts } from "@/lib/supabase/inventory-products"

export default function MovimientosInventarioPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalMovements: 0,
    movementsIn: 0,
    movementsOut: 0,
    totalQuantityIn: 0,
    totalQuantityOut: 0,
    adjustmentsToday: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMovement, setEditingMovement] = useState<InventoryMovement | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form data
  const [formData, setFormData] = useState({
    product_id: '',
    movement_type: 'in' as 'in' | 'out' | 'adjustment' | 'transfer',
    quantity: 0,
    reference_type: 'adjustment' as 'purchase' | 'sale' | 'adjustment' | 'transfer' | 'return',
    reference_id: '',
    notes: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [movementsData, productsData, statsData] = await Promise.all([
        getInventoryMovements(),
        getInventoryProducts(),
        getMovementStats()
      ])
      
      // Si no hay productos, usar datos mock
      if (productsData.length === 0) {
        console.log('Using mock data for inventory products')
        const mockProducts = [
          {
            id: '1',
            name: 'Aceite Motor 5W-30',
            description: 'Aceite sintético para motor',
            category_id: '1',
            category_name: 'Aceites',
            sku: 'ACE-001',
            barcode: '1234567890123',
            unit_price: 250,
            current_stock: 50,
            min_stock: 10,
            max_stock: 100,
            unit: 'litros',
            status: 'active' as const,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z'
          },
          {
            id: '2',
            name: 'Filtro de Aire',
            description: 'Filtro de aire para automóviles',
            category_id: '2',
            category_name: 'Filtros',
            sku: 'FIL-001',
            barcode: '1234567890124',
            unit_price: 150,
            current_stock: 25,
            min_stock: 5,
            max_stock: 50,
            unit: 'piezas',
            status: 'active' as const,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z'
          }
        ]
        setProducts(mockProducts)
      } else {
        setProducts(productsData.filter(prod => prod.status === 'active'))
      }
      
      setMovements(movementsData)
      setStats(statsData)
    } catch (error) {
      console.error('Error loading data:', error)
      // En caso de error total, usar datos mock
      const mockProducts = [
        {
          id: '1',
          name: 'Aceite Motor 5W-30',
          description: 'Aceite sintético para motor',
          category_id: '1',
          category_name: 'Aceites',
          sku: 'ACE-001',
          barcode: '1234567890123',
          unit_price: 250,
          current_stock: 50,
          min_stock: 10,
          max_stock: 100,
          unit: 'litros',
          status: 'active' as const,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        }
      ]
      setProducts(mockProducts)
      setMovements([])
      setStats({
        totalMovements: 0,
        movementsIn: 0,
        movementsOut: 0,
        totalQuantityIn: 0,
        totalQuantityOut: 0,
        adjustmentsToday: 0
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      let result
      if (editingMovement) {
        result = await updateInventoryMovement(editingMovement.id, formData)
        if (result) {
          const updatedMovements = movements.map(mov => 
            mov.id === editingMovement.id ? { ...mov, ...formData } : mov
          )
          setMovements(updatedMovements)
        }
      } else {
        result = await createInventoryMovement(formData)
        if (result) {
          setMovements([result, ...movements])
        }
      }
      
      if (result) {
        setIsDialogOpen(false)
        setEditingMovement(null)
        setFormData({
          product_id: '',
          movement_type: 'in',
          quantity: 0,
          reference_type: 'adjustment',
          reference_id: '',
          notes: ''
        })
        
        // Recargar estadísticas
        const statsData = await getMovementStats()
        setStats(statsData)
        
        alert(editingMovement ? 'Movimiento actualizado exitosamente' : 'Movimiento creado exitosamente')
      } else {
        alert('Error al procesar el movimiento')
      }
    } catch (error) {
      console.error('Error processing movement:', error)
      alert('Error al procesar el movimiento')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (movement: InventoryMovement) => {
    setEditingMovement(movement)
    setFormData({
      product_id: movement.product_id,
      movement_type: movement.movement_type,
      quantity: movement.quantity,
      reference_type: movement.reference_type,
      reference_id: movement.reference_id || '',
      notes: movement.notes || ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este movimiento?')) {
      try {
        const success = await deleteInventoryMovement(id)
        if (success) {
          setMovements(movements.filter(mov => mov.id !== id))
          const statsData = await getMovementStats()
          setStats(statsData)
          alert('Movimiento eliminado exitosamente')
        } else {
          alert('Error al eliminar el movimiento')
        }
      } catch (error) {
        console.error('Error deleting movement:', error)
        alert('Error al eliminar el movimiento')
      }
    }
  }

  const handleNewMovement = () => {
    setEditingMovement(null)
    setFormData({
      product_id: '',
      movement_type: 'in',
      quantity: 0,
      reference_type: 'adjustment',
      reference_id: '',
      notes: ''
    })
    setIsDialogOpen(true)
  }

  const filteredMovements = movements.filter(
    (movement) =>
      movement.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.movement_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.reference_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getMovementTypeBadge = (type: string) => {
    switch (type) {
      case "in":
        return <Badge variant="outline" className="bg-green-500 text-white flex items-center gap-1"><ArrowUp className="h-3 w-3" />Entrada</Badge>
      case "out":
        return <Badge variant="outline" className="bg-red-500 text-white flex items-center gap-1"><ArrowDown className="h-3 w-3" />Salida</Badge>
      case "adjustment":
        return <Badge variant="outline" className="bg-blue-500 text-white flex items-center gap-1"><RotateCcw className="h-3 w-3" />Ajuste</Badge>
      case "transfer":
        return <Badge variant="outline" className="bg-purple-500 text-white flex items-center gap-1"><ArrowUpDown className="h-3 w-3" />Transferencia</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const getReferenceTypeBadge = (type: string) => {
    switch (type) {
      case "purchase":
        return <Badge variant="outline" className="bg-green-100 text-green-800">Compra</Badge>
      case "sale":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Venta</Badge>
      case "adjustment":
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">Ajuste</Badge>
      case "transfer":
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">Transferencia</Badge>
      case "return":
        return <Badge variant="outline" className="bg-red-100 text-red-800">Devolución</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando movimientos...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Movimientos de Inventario</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={handleNewMovement}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Movimiento
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Movimientos</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMovements}</div>
            <p className="text-xs text-muted-foreground">Movimientos registrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.movementsIn}</div>
            <p className="text-xs text-muted-foreground">+{stats.totalQuantityIn} unidades</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salidas</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.movementsOut}</div>
            <p className="text-xs text-muted-foreground">-{stats.totalQuantityOut} unidades</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ajustes Hoy</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.adjustmentsToday}</div>
            <p className="text-xs text-muted-foreground">Ajustes realizados</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 mt-8">
        <h3 className="text-xl font-semibold">Historial de Movimientos</h3>
        <div className="flex items-center py-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por producto, tipo o notas..."
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
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Producto</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Tipo</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Cantidad</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Referencia</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Usuario</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Fecha</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Acciones</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {filteredMovements.map((movement) => (
                  <tr key={movement.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{movement.product_name}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      {getMovementTypeBadge(movement.movement_type)}
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      <span className={`font-medium ${movement.movement_type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                        {movement.movement_type === 'in' ? '+' : '-'}{movement.quantity}
                      </span>
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      {getReferenceTypeBadge(movement.reference_type)}
                      {movement.reference_id && (
                        <div className="text-sm text-muted-foreground">#{movement.reference_id}</div>
                      )}
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {movement.user_name}
                      </div>
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(movement.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEdit(movement)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDelete(movement.id)}
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

      {/* Modal de Creación/Edición */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingMovement ? 'Editar Movimiento' : 'Nuevo Movimiento'}
            </DialogTitle>
            <DialogDescription>
              {editingMovement 
                ? 'Modifica la información del movimiento.'
                : 'Registra un nuevo movimiento de inventario.'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product_id">Producto *</Label>
              <select
                id="product_id"
                value={formData.product_id}
                onChange={(e) => setFormData({...formData, product_id: e.target.value})}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              >
                <option value="">Seleccionar producto</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} - Stock: {product.current_stock}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="movement_type">Tipo de Movimiento *</Label>
                <select
                  id="movement_type"
                  value={formData.movement_type}
                  onChange={(e) => setFormData({...formData, movement_type: e.target.value as any})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  <option value="in">Entrada</option>
                  <option value="out">Salida</option>
                  <option value="adjustment">Ajuste</option>
                  <option value="transfer">Transferencia</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Cantidad *</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                  placeholder="0"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reference_type">Tipo de Referencia *</Label>
                <select
                  id="reference_type"
                  value={formData.reference_type}
                  onChange={(e) => setFormData({...formData, reference_type: e.target.value as any})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  <option value="purchase">Compra</option>
                  <option value="sale">Venta</option>
                  <option value="adjustment">Ajuste</option>
                  <option value="transfer">Transferencia</option>
                  <option value="return">Devolución</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference_id">ID de Referencia</Label>
                <Input
                  id="reference_id"
                  value={formData.reference_id}
                  onChange={(e) => setFormData({...formData, reference_id: e.target.value})}
                  placeholder="Número de referencia"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Observaciones adicionales"
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
                    {editingMovement ? 'Actualizando...' : 'Registrando...'}
                  </>
                ) : (
                  <>
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    {editingMovement ? 'Actualizar' : 'Registrar'} Movimiento
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
