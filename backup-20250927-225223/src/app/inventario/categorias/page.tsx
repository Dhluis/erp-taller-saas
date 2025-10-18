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
  Package,
  CheckCircle,
  XCircle,
  Folder,
  FolderOpen,
  Edit,
  Trash2,
  Loader2,
  Tag
} from "lucide-react"
import { 
  getInventoryCategories, 
  createInventoryCategory, 
  updateInventoryCategory,
  deleteInventoryCategory,
  getCategoryStats,
  InventoryCategory 
} from "@/lib/supabase/inventory-categories"

export default function CategoriasInventarioPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [stats, setStats] = useState({
    totalCategories: 0,
    activeCategories: 0,
    inactiveCategories: 0,
    topLevelCategories: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent_id: '',
    status: 'active' as 'active' | 'inactive'
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [categoriesData, statsData] = await Promise.all([
        getInventoryCategories(),
        getCategoryStats()
      ])
      
      // Si no hay categorías, usar datos mock
      if (categoriesData.length === 0) {
        console.log('Using mock data for inventory categories')
        const mockCategories = [
          {
            id: '1',
            name: 'Aceites y Lubricantes',
            description: 'Aceites para motor, transmisión y diferencial',
            parent_id: undefined,
            status: 'active' as const,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z'
          },
          {
            id: '2',
            name: 'Filtros',
            description: 'Filtros de aire, aceite, combustible y habitáculo',
            parent_id: undefined,
            status: 'active' as const,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z'
          },
          {
            id: '3',
            name: 'Frenos',
            description: 'Pastillas, discos, líquido de frenos y componentes',
            parent_id: undefined,
            status: 'active' as const,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z'
          },
          {
            id: '4',
            name: 'Motor',
            description: 'Componentes del sistema de motor',
            parent_id: undefined,
            status: 'active' as const,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z'
          }
        ]
        setCategories(mockCategories)
        setStats({
          totalCategories: mockCategories.length,
          activeCategories: mockCategories.filter(c => c.status === 'active').length,
          inactiveCategories: mockCategories.filter(c => c.status === 'inactive').length,
          topLevelCategories: mockCategories.filter(c => !c.parent_id).length
        })
      } else {
        setCategories(categoriesData)
        setStats(statsData)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      // En caso de error, usar datos mock
      const mockCategories = [
        {
          id: '1',
          name: 'Aceites y Lubricantes',
          description: 'Aceites para motor, transmisión y diferencial',
          parent_id: undefined,
          status: 'active' as const,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        }
      ]
      setCategories(mockCategories)
      setStats({
        totalCategories: 1,
        activeCategories: 1,
        inactiveCategories: 0,
        topLevelCategories: 1
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
      if (editingCategory) {
        result = await updateInventoryCategory(editingCategory.id, formData)
        if (result) {
          const updatedCategories = categories.map(cat => 
            cat.id === editingCategory.id ? { ...cat, ...formData } : cat
          )
          setCategories(updatedCategories)
        }
      } else {
        console.log('Creando categoría con datos:', formData)
        result = await createInventoryCategory(formData)
        console.log('Resultado de createInventoryCategory:', result)
        
        if (result) {
          setCategories([result, ...categories])
          setIsDialogOpen(false)
          setEditingCategory(null)
          setFormData({
            name: '',
            description: '',
            parent_id: '',
            status: 'active'
          })
          
          // Recargar estadísticas
          const statsData = await getCategoryStats()
          setStats(statsData)
          
          alert('Categoría creada exitosamente')
        } else {
          console.error('createInventoryCategory devolvió null o undefined')
          alert('Error al crear la categoría. Verifica la consola para más detalles.')
          return // Salir temprano si hay error
        }
      }
      
      if (editingCategory && result) {
        setIsDialogOpen(false)
        setEditingCategory(null)
        setFormData({
          name: '',
          description: '',
          parent_id: '',
          status: 'active'
        })
        
        // Recargar estadísticas
        const statsData = await getCategoryStats()
        setStats(statsData)
        
        alert('Categoría actualizada exitosamente')
      }
    } catch (error) {
      console.error('Error processing category:', error)
      alert('Error al procesar la categoría')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (category: InventoryCategory) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
      parent_id: category.parent_id || '',
      status: category.status
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta categoría?')) {
      try {
        const success = await deleteInventoryCategory(id)
        if (success) {
          setCategories(categories.filter(cat => cat.id !== id))
          const statsData = await getCategoryStats()
          setStats(statsData)
          alert('Categoría eliminada exitosamente')
        } else {
          alert('Error al eliminar la categoría')
        }
      } catch (error) {
        console.error('Error deleting category:', error)
        alert('Error al eliminar la categoría')
      }
    }
  }

  const handleNewCategory = () => {
    setEditingCategory(null)
    setFormData({
      name: '',
      description: '',
      parent_id: '',
      status: 'active'
    })
    setIsDialogOpen(true)
  }


  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="outline" className="bg-green-500 text-white">{status}</Badge>
      case "inactive":
        return <Badge variant="outline" className="bg-red-500 text-white">{status}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getParentCategoryName = (parentId: string) => {
    const parent = categories.find(cat => cat.id === parentId)
    return parent ? parent.name : 'Sin categoría padre'
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando categorías...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Categorías de Inventario</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={handleNewCategory}>
            <Plus className="mr-2 h-4 w-4" /> Nueva Categoría
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Categorías</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCategories}</div>
            <p className="text-xs text-muted-foreground">Categorías registradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorías Activas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCategories}</div>
            <p className="text-xs text-muted-foreground">Disponibles para uso</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorías Inactivas</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inactiveCategories}</div>
            <p className="text-xs text-muted-foreground">Deshabilitadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorías Principales</CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.topLevelCategories}</div>
            <p className="text-xs text-muted-foreground">Sin categoría padre</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 mt-8">
        <h3 className="text-xl font-semibold">Lista de Categorías</h3>
        <div className="flex items-center py-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o descripción..."
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
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Nombre</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Descripción</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Categoría Padre</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Estado</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Acciones</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {filteredCategories.map((category) => (
                  <tr key={category.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      <div className="flex items-center gap-2">
                        {category.parent_id ? (
                          <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Folder className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium">{category.name}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      {category.description || 'Sin descripción'}
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      {category.parent_id ? getParentCategoryName(category.parent_id) : 'Categoría principal'}
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      {getStatusBadge(category.status)}
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEdit(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDelete(category.id)}
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
              {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory 
                ? 'Modifica la información de la categoría.'
                : 'Completa la información de la nueva categoría.'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la Categoría *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Nombre de la categoría"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Descripción de la categoría"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="parent_id">Categoría Padre</Label>
              <select
                id="parent_id"
                value={formData.parent_id}
                onChange={(e) => setFormData({...formData, parent_id: e.target.value})}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Sin categoría padre</option>
                {categories
                  .filter(cat => cat.status === 'active' && cat.id !== editingCategory?.id)
                  .map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))
                }
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value as 'active' | 'inactive'})}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="active">Activa</option>
                <option value="inactive">Inactiva</option>
              </select>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingCategory ? 'Actualizando...' : 'Creando...'}
                  </>
                ) : (
                  <>
                    <Tag className="mr-2 h-4 w-4" />
                    {editingCategory ? 'Actualizar' : 'Crear'} Categoría
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
