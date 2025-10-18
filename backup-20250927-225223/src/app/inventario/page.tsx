"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { Package, AlertTriangle, Plus, Minus } from "lucide-react"

interface InventoryItem {
  id: string
  code: string
  name: string
  description: string
  quantity: number
  min_quantity: number
  unit_price: number
  category: string
}

export default function InventarioPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [adjustmentQty, setAdjustmentQty] = useState("")
  const supabase = createClient()

  useEffect(() => {
    fetchInventory()
  }, [])

  const fetchInventory = async () => {
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .order("name")
    
    if (data) setItems(data)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const itemData = {
      code: formData.get("code") as string,
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      quantity: parseInt(formData.get("quantity") as string) || 0,
      min_quantity: parseInt(formData.get("min_quantity") as string) || 1,
      unit_price: parseFloat(formData.get("unit_price") as string) || 0,
      category: formData.get("category") as string,
      organization_id: "00000000-0000-0000-0000-000000000000"
    }

    try {
      const { error } = await supabase
        .from("inventory")
        .insert([itemData])

      if (error) throw error
      
      alert("Producto agregado exitosamente!")
      e.currentTarget.reset()
      fetchInventory()
    } catch (error: any) {
      console.error("Error:", error)
      if (error.message?.includes("duplicate key")) {
        alert("El código del producto ya existe")
      } else {
        alert("Error al agregar el producto")
      }
    } finally {
      setLoading(false)
    }
  }

  const adjustQuantity = async (item: InventoryItem, adjustment: number) => {
    const newQuantity = item.quantity + adjustment
    if (newQuantity < 0) {
      alert("La cantidad no puede ser negativa")
      return
    }

    try {
      const { error } = await supabase
        .from("inventory")
        .update({ quantity: newQuantity })
        .eq("id", item.id)

      if (error) throw error
      
      fetchInventory()
      setSelectedItem(null)
      setAdjustmentQty("")
    } catch (error) {
      console.error("Error:", error)
      alert("Error al actualizar la cantidad")
    }
  }

  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity === 0) {
      return <Badge variant="destructive">Sin Stock</Badge>
    } else if (item.quantity <= item.min_quantity) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Stock Bajo</Badge>
    } else {
      return <Badge variant="outline" className="text-green-600">En Stock</Badge>
    }
  }

  const categories = ["Filtros", "Aceites", "Frenos", "Suspensión", "Motor", "Eléctrico", "Otros"]

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Control de Inventario</h1>
        <div className="flex gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">Total Productos</p>
                <p className="text-xl font-bold">{items.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-500">Stock Bajo</p>
                <p className="text-xl font-bold">
                  {items.filter(item => item.quantity <= item.min_quantity).length}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de nuevo producto */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Agregar Producto</CardTitle>
            <CardDescription>Añade un nuevo producto al inventario</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="code">Código *</Label>
                <Input 
                  name="code" 
                  placeholder="REF-001" 
                  required 
                />
              </div>

              <div>
                <Label htmlFor="name">Nombre *</Label>
                <Input 
                  name="name" 
                  placeholder="Filtro de aceite" 
                  required 
                />
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Input 
                  name="description" 
                  placeholder="Compatible con..." 
                />
              </div>

              <div>
                <Label htmlFor="category">Categoría</Label>
                <Select name="category" defaultValue="Otros">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">Cantidad inicial</Label>
                  <Input 
                    name="quantity" 
                    type="number" 
                    placeholder="10" 
                    defaultValue="0"
                  />
                </div>
                <div>
                  <Label htmlFor="min_quantity">Stock mínimo</Label>
                  <Input 
                    name="min_quantity" 
                    type="number" 
                    placeholder="5" 
                    defaultValue="1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="unit_price">Precio unitario ($)</Label>
                <Input 
                  name="unit_price" 
                  type="number" 
                  step="0.01"
                  placeholder="25.00" 
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Agregando..." : "Agregar Producto"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Tabla de inventario */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Productos en Inventario</CardTitle>
            <CardDescription>Lista de refacciones y productos</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-center">Cantidad</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.code}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-gray-500">{item.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold">{item.quantity}</span>
                      {item.quantity <= item.min_quantity && (
                        <p className="text-xs text-yellow-600">Min: {item.min_quantity}</p>
                      )}
                    </TableCell>
                    <TableCell>${item.unit_price.toFixed(2)}</TableCell>
                    <TableCell>{getStockStatus(item)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const qty = prompt("¿Cuántas unidades agregar?")
                            if (qty && !isNaN(Number(qty))) {
                              adjustQuantity(item, parseInt(qty))
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const qty = prompt("¿Cuántas unidades quitar?")
                            if (qty && !isNaN(Number(qty))) {
                              adjustQuantity(item, -parseInt(qty))
                            }
                          }}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {items.length === 0 && (
              <p className="text-center text-gray-500 mt-4">No hay productos en el inventario</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}