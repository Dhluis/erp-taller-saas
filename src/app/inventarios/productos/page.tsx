'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/navigation/page-header';
import { Pagination } from '@/components/ui/pagination';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { 
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { RefreshCw } from 'lucide-react';
import { useInventory, type CreateInventoryItemData, type UpdateInventoryItemData, type InventoryItem } from '@/hooks/useInventory';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function InventariosProductosPage() {
  const {
    items,
    categories,
    pagination,
    loading,
    goToPage,
    changePageSize,
    setSearch,
    setFilters,
    refresh,
    createItem,
    updateItem,
    deleteItem,
    fetchCategories
  } = useInventory({
    page: 1,
    pageSize: 50,
    sortBy: 'name',
    sortOrder: 'asc',
    autoLoad: true
  });

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 500);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    category_id: '',
    unit_price: '',
    stock: '',
    minimum_stock: '',
    description: ''
  });
  const [editProduct, setEditProduct] = useState({
    name: '',
    sku: '',
    category_id: '',
    unit_price: '',
    stock: '',
    minimum_stock: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<InventoryItem | null>(null);

  // Sincronizar búsqueda con debounce
  useEffect(() => {
    setSearch(debouncedSearch);
  }, [debouncedSearch, setSearch]);

  // Sincronizar filtro de categoría
  useEffect(() => {
    if (categoryFilter && categoryFilter !== 'all') {
      setFilters({ category_id: categoryFilter });
    } else {
      setFilters({});
    }
  }, [categoryFilter, setFilters]);

  const handleInputChange = (field: string, value: string) => {
    setNewProduct(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditInputChange = (field: string, value: string) => {
    setEditProduct(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditProduct = (product: InventoryItem) => {
    setSelectedProduct(product);
    setEditProduct({
      name: product.name,
      sku: product.sku,
      category_id: product.category_id,
      unit_price: product.unit_price.toString(),
      stock: product.quantity.toString(),
      minimum_stock: (product.min_quantity || product.minimum_stock || 0).toString(),
      description: product.description || ''
    });
    setShowEditProductModal(true);
  };

  const handleViewDetails = (product: InventoryItem) => {
    setSelectedProduct(product);
    setShowDetailsModal(true);
  };

  const handleDeleteClick = (product: InventoryItem) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    setDeleting(true);
    try {
      const success = await deleteItem(productToDelete.id);
      if (success) {
        setDeleteDialogOpen(false);
        setProductToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!selectedProduct || !editProduct.name || !editProduct.sku || !editProduct.unit_price || !editProduct.category_id) {
      alert('Por favor completa los campos obligatorios');
      return;
    }

    setSaving(true);
    try {
      const productData: UpdateInventoryItemData = {
        category_id: editProduct.category_id,
        name: editProduct.name,
        sku: editProduct.sku,
        description: editProduct.description || undefined,
        quantity: parseInt(editProduct.stock) || 0,
        min_quantity: parseInt(editProduct.minimum_stock) || 0, // ✅ FIX: Usar min_quantity en lugar de minimum_stock
        unit_price: parseFloat(editProduct.unit_price),
      };

      const result = await updateItem(selectedProduct.id, productData);
      
      if (result) {
        setShowEditProductModal(false);
        setSelectedProduct(null);
      }
    } catch (error) {
      console.error('Error updating product:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateProduct = async () => {
    if (!newProduct.name || !newProduct.sku || !newProduct.unit_price || !newProduct.category_id) {
      alert('Por favor completa los campos obligatorios');
      return;
    }

    setSaving(true);
    try {
      const productData: CreateInventoryItemData = {
        category_id: newProduct.category_id,
        name: newProduct.name,
        sku: newProduct.sku,
        description: newProduct.description || undefined,
        quantity: parseInt(newProduct.stock) || 0,
        min_quantity: parseInt(newProduct.minimum_stock) || 0, // ✅ FIX: Usar min_quantity en lugar de minimum_stock
        unit_price: parseFloat(newProduct.unit_price),
      };

      const result = await createItem(productData);
      
      if (result) {
        // Resetear formulario
        setNewProduct({
          name: '',
          sku: '',
          category_id: '',
          unit_price: '',
          stock: '',
          minimum_stock: '',
          description: ''
        });
        setShowNewProductModal(false);
      }
    } catch (error) {
      console.error('Error creating product:', error);
    } finally {
      setSaving(false);
    }
  };

  // Ya no necesitamos filteredProducts - items ya viene filtrado del backend

  if (loading) {
    return (
      <AppLayout
        title="Productos"
        breadcrumbs={[
          { label: 'Inventarios', href: '/inventarios' },
          { label: 'Productos', href: '/inventarios/productos' }
        ]}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Productos"
      breadcrumbs={[
        { label: 'Inventarios', href: '/inventarios' },
        { label: 'Productos', href: '/inventarios/productos' }
      ]}
    >
      <div className="space-y-6">
        {/* Page Header con Breadcrumbs */}
        <PageHeader
          title="Productos"
          description="Gestión de inventario de productos"
          breadcrumbs={[
            { label: 'Inventarios', href: '/inventarios' },
            { label: 'Productos', href: '/inventarios/productos' }
          ]}
          actions={
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={refresh}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              <Button
                onClick={() => setShowNewProductModal(true)}
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Nuevo Producto
              </Button>
            </div>
          }
        />

        {/* Stats */}
        {!loading && pagination.total > 0 && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Total: {pagination.total} productos</span>
            <span>•</span>
            <span>Página {pagination.page} de {pagination.totalPages}</span>
          </div>
        )}

        {/* Filtros y búsqueda */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre, SKU o descripción..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 max-w-sm"
                />
              </div>
              <div className="w-48">
                <Select value={categoryFilter || 'all'} onValueChange={(value) => setCategoryFilter(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <FunnelIcon className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
                <Button variant="outline" size="sm">
                  <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
                  Ordenar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de productos */}
        {items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchQuery ? 'No se encontraron productos' : 'No hay productos'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery 
                  ? 'Intenta con otros términos de búsqueda'
                  : 'Comienza agregando el primer producto al inventario'
                }
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowNewProductModal(true)}>
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Agregar Producto
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      product.quantity > (product.min_quantity || product.minimum_stock || 0)
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {product.quantity > (product.min_quantity || product.minimum_stock || 0) ? 'En Stock' : 'Stock Bajo'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Categoría:</span>
                    <span className="text-sm font-medium">{product.category?.name || 'Sin categoría'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Stock:</span>
                    <span className="text-sm font-medium">{product.quantity} unidades</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Precio:</span>
                    <span className="text-sm font-medium">${product.unit_price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Stock Mínimo:</span>
                    <span className="text-sm font-medium">{product.min_quantity || product.minimum_stock || 0} unidades</span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleEditProduct(product)}
                    >
                      Editar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleViewDetails(product)}
                    >
                      Ver Detalles
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => handleDeleteClick(product)}
                      className="px-3 bg-red-600 hover:bg-red-700 text-white border-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-4">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  pageSize={pagination.pageSize}
                  total={pagination.total}
                  onPageChange={goToPage}
                  onPageSizeChange={changePageSize}
                  loading={loading}
                  pageSizeOptions={[25, 50, 100]}
                  showPageSizeSelector={true}
                  showGoToButtons={true}
                />
              </div>
            )}
          </>
        )}

        {/* Modal para Nuevo Producto */}
        {showNewProductModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-black border border-border shadow-lg rounded-lg p-6 w-full max-w-md" style={{backgroundColor: '#000000'}}>
              <h2 className="text-xl font-bold mb-4 text-text-primary">Nuevo Producto</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">Nombre del Producto *</label>
                  <Input 
                    placeholder="Ej: Aceite Motor 5W-30" 
                    value={newProduct.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">SKU *</label>
                  <Input 
                    placeholder="Ej: PROD-001" 
                    value={newProduct.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">Categoría *</label>
                  <Select value={newProduct.category_id} onValueChange={(value) => handleInputChange('category_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent className="bg-bg-secondary border-border">
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">Precio *</label>
                  <Input 
                    placeholder="0.00" 
                    type="number" 
                    step="0.01"
                    value={newProduct.unit_price}
                    onChange={(e) => handleInputChange('unit_price', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">Stock Inicial</label>
                  <Input 
                    placeholder="0" 
                    type="number" 
                    value={newProduct.stock}
                    onChange={(e) => handleInputChange('stock', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">Stock Mínimo</label>
                  <Input 
                    placeholder="0" 
                    type="number" 
                    value={newProduct.minimum_stock}
                    onChange={(e) => handleInputChange('minimum_stock', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">Descripción</label>
                  <Input 
                    placeholder="Descripción opcional del producto" 
                    value={newProduct.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowNewProductModal(false)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleCreateProduct}
                  disabled={saving}
                >
                  {saving ? 'Creando...' : 'Crear Producto'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para Editar Producto */}
        {showEditProductModal && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-black border border-border shadow-lg rounded-lg p-6 w-full max-w-md" style={{backgroundColor: '#000000'}}>
              <h2 className="text-xl font-bold mb-4 text-text-primary">Editar Producto</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">Nombre del Producto *</label>
                  <Input 
                    placeholder="Ej: Aceite Motor 5W-30" 
                    value={editProduct.name}
                    onChange={(e) => handleEditInputChange('name', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">SKU *</label>
                  <Input 
                    placeholder="Ej: PROD-001" 
                    value={editProduct.sku}
                    onChange={(e) => handleEditInputChange('sku', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">Categoría *</label>
                  <Select value={editProduct.category_id} onValueChange={(value) => handleEditInputChange('category_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent className="bg-bg-secondary border-border">
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">Precio *</label>
                  <Input 
                    placeholder="0.00" 
                    type="number" 
                    step="0.01"
                    value={editProduct.unit_price}
                    onChange={(e) => handleEditInputChange('unit_price', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">Stock Actual</label>
                  <Input 
                    placeholder="0" 
                    type="number" 
                    value={editProduct.stock}
                    onChange={(e) => handleEditInputChange('stock', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">Stock Mínimo</label>
                  <Input 
                    placeholder="0" 
                    type="number" 
                    value={editProduct.minimum_stock}
                    onChange={(e) => handleEditInputChange('minimum_stock', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">Descripción</label>
                  <Input 
                    placeholder="Descripción opcional del producto" 
                    value={editProduct.description}
                    onChange={(e) => handleEditInputChange('description', e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setShowEditProductModal(false);
                    setSelectedProduct(null);
                  }}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleUpdateProduct}
                  disabled={saving}
                >
                  {saving ? 'Actualizando...' : 'Actualizar Producto'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* AlertDialog para Confirmar Eliminación */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-bg-primary border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-text-primary">
                ¿Eliminar producto "{productToDelete?.name}"?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-text-secondary">
                Esta acción no se puede deshacer. El producto será eliminado permanentemente del inventario.
                Si el producto tiene movimientos asociados, no podrá ser eliminado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <Button variant="outline" disabled={deleting}>Cancelar</Button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                >
                  {deleting ? 'Eliminando...' : 'Eliminar'}
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal para Ver Detalles */}
        {showDetailsModal && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-black border border-border shadow-lg rounded-lg p-6 w-full max-w-md" style={{backgroundColor: '#000000'}}>
              <h2 className="text-xl font-bold mb-4 text-text-primary">Detalles del Producto</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-text-secondary">Nombre</label>
                    <p className="text-text-primary font-medium">{selectedProduct.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-text-secondary">SKU</label>
                    <p className="text-text-primary font-medium">{selectedProduct.sku}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">Categoría</label>
                  <p className="text-text-primary font-medium">{selectedProduct.category?.name || 'Sin categoría'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-text-secondary">Stock Actual</label>
                    <p className="text-text-primary font-medium">{selectedProduct.quantity} unidades</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-text-secondary">Stock Mínimo</label>
                    <p className="text-text-primary font-medium">{selectedProduct.min_quantity || selectedProduct.minimum_stock || 0} unidades</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">Precio</label>
                  <p className="text-text-primary font-medium">${selectedProduct.unit_price.toFixed(2)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">Estado de Stock</label>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    selectedProduct.quantity > (selectedProduct.min_quantity || selectedProduct.minimum_stock || 0)
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedProduct.quantity > (selectedProduct.min_quantity || selectedProduct.minimum_stock || 0) ? 'En Stock' : 'Stock Bajo'}
                  </span>
                </div>
                {selectedProduct.description && (
                  <div>
                    <label className="block text-sm font-medium mb-1 text-text-secondary">Descripción</label>
                    <p className="text-text-primary">{selectedProduct.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-text-secondary">Fecha de Creación</label>
                    <p className="text-text-primary text-sm">{new Date(selectedProduct.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-text-secondary">Última Actualización</label>
                    <p className="text-text-primary text-sm">{new Date(selectedProduct.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedProduct(null);
                  }}
                >
                  Cerrar
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleEditProduct(selectedProduct);
                  }}
                >
                  Editar Producto
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}