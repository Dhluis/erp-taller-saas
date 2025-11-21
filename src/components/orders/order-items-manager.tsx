"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AddItemModal } from "./add-item-modal"
import { Plus, Edit, Trash2, Wrench, Package, User } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { safeFetch, safeDelete } from "@/lib/api"

interface OrderItem {
  id: string
  order_id: string
  service_id?: string
  inventory_id?: string
  item_type: 'service' | 'product'
  description: string
  quantity: number
  unit_price: number
  discount_percent: number
  discount_amount: number
  tax_percent: number
  subtotal: number
  tax_amount: number
  total: number
  mechanic_id?: string
  status: string
  notes?: string
  created_at: string
  updated_at: string
  // Relaciones
  services?: {
    name: string
    category: string
  }
  inventory?: {
    name: string
    code: string
  }
  employees?: {
    name: string
    role: string
  }
}

interface OrderItemsManagerProps {
  orderId: string
  onTotalChange?: (total: number) => void
}

export function OrderItemsManager({ orderId, onTotalChange }: OrderItemsManagerProps) {
  const [items, setItems] = useState<OrderItem[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadOrderItems()
  }, [orderId])

  const loadOrderItems = async () => {
    try {
      setLoading(true)
      const result = await safeFetch(`/api/orders/${orderId}/items`)
      
      if (!result.success) {
        toast({
          title: "Error",
          description: result.error || "No se pudieron cargar los items de la orden",
          variant: "destructive"
        })
        return
      }
      
      if (result.data) {
        const itemsData = Array.isArray(result.data) ? result.data : []
        setItems(itemsData)
        
        // Calcular total general
        const total = itemsData.reduce((sum: number, item: OrderItem) => sum + (item.total || 0), 0)
        onTotalChange?.(total)
      } else {
        setItems([])
      }
    } catch (error) {
      console.error('Error loading order items:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los items de la orden",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = () => {
    setEditingItem(null)
    setIsModalOpen(true)
  }

  const handleEditItem = (item: OrderItem) => {
    setEditingItem(item)
    setIsModalOpen(true)
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('¿Estás seguro de eliminar este item?')) return

    try {
      const result = await safeDelete(`/api/orders/${orderId}/items/${itemId}`)

      if (!result.success) {
        toast({
          title: "Error",
          description: result.error || "No se pudo eliminar el item",
          variant: "destructive"
        })
        return
      }

      toast({
        title: "Item eliminado",
        description: "El item se ha eliminado correctamente"
      })

      loadOrderItems()
    } catch (error) {
      console.error('Error deleting item:', error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el item",
        variant: "destructive"
      })
    }
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingItem(null)
  }

  const handleItemSaved = () => {
    handleModalClose()
    loadOrderItems()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendiente', variant: 'secondary' as const },
      in_progress: { label: 'En Proceso', variant: 'default' as const },
      completed: { label: 'Completado', variant: 'success' as const }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getItemTypeIcon = (type: string) => {
    return type === 'service' ? <Wrench className="h-4 w-4" /> : <Package className="h-4 w-4" />
  }

  const getItemTypeLabel = (type: string) => {
    return type === 'service' ? 'Servicio' : 'Producto'
  }

  const getItemTypeColor = (type: string) => {
    return type === 'service' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
  }

  // Calcular totales
  const subtotal = (items || []).reduce((sum, item) => sum + (item.subtotal || 0), 0)
  const totalDiscounts = (items || []).reduce((sum, item) => sum + (item.discount_amount || 0), 0)
  const totalTax = (items || []).reduce((sum, item) => sum + (item.tax_amount || 0), 0)
  const grandTotal = (items || []).reduce((sum, item) => sum + (item.total || 0), 0)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Servicios y Productos</CardTitle>
          <CardDescription>Cargando items de la orden...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Servicios y Productos</CardTitle>
            <CardDescription>
              Gestiona los servicios y productos de esta orden de trabajo
            </CardDescription>
          </div>
          <Button onClick={handleAddItem}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Item
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay items agregados a esta orden</p>
            <p className="text-sm">Haz clic en "Agregar Item" para comenzar</p>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Mecánico</TableHead>
                    <TableHead className="text-right">Cant.</TableHead>
                    <TableHead className="text-right">P. Unit</TableHead>
                    <TableHead className="text-right">Desc.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">IVA</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(items || []).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getItemTypeIcon(item.item_type)}
                          <Badge variant="outline" className={getItemTypeColor(item.item_type)}>
                            {getItemTypeLabel(item.item_type)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.description}</p>
                          {item.notes && (
                            <p className="text-sm text-muted-foreground">{item.notes}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.employees ? (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{item.employees.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Sin asignar</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right">
                        {item.discount_percent > 0 && `${item.discount_percent}%`}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.subtotal)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.tax_amount)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(item.total)}
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditItem(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Resumen de Totales */}
            <div className="mt-6 flex justify-end">
              <div className="bg-muted p-4 rounded-lg w-80">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Descuentos:</span>
                    <span className="text-red-600">-{formatCurrency(totalDiscounts)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>IVA (16%):</span>
                    <span>{formatCurrency(totalTax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total:</span>
                    <span>{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Modal para agregar/editar items */}
        <Dialog open={isModalOpen} onOpenChange={handleModalClose}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Editar Item' : 'Agregar Item'}
              </DialogTitle>
              <DialogDescription>
                {editingItem ? 'Modifica los datos del item' : 'Agrega un nuevo servicio o producto a la orden'}
              </DialogDescription>
            </DialogHeader>
            <AddItemModal
              orderId={orderId}
              item={editingItem}
              onSave={handleItemSaved}
              onCancel={handleModalClose}
            />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

