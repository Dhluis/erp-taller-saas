'use client';

import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, IconButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/navigation/page-header';
import { Pagination } from '@/components/ui/pagination';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useSearchParams } from 'next/navigation';
import { 
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { RefreshCw, Brain, Loader2, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { useInventory, type CreateInventoryItemData, type UpdateInventoryItemData, type InventoryItem } from '@/hooks/useInventory';
import { VoiceInput } from '@/components/ui/VoiceInput';
import { cn } from '@/lib/utils';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';

import { Suspense } from 'react';


export default function InventariosProductosPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    }>
      <InventariosContent />
    </Suspense>
  );
}

function InventariosContent() {
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<InventoryItem | null>(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingCell, setEditingCell] = useState<{ id: string, field: 'price' | 'stock' } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [isAnalyzingCopilot, setIsAnalyzingCopilot] = useState(false);
  const [copilotReport, setCopilotReport] = useState<string | null>(null);
  const [showCopilotModal, setShowCopilotModal] = useState(false);

  const searchParams = useSearchParams();
  const processedRef = useRef(false);

  // Funciones de Copiloto AI
  const handleRunCopilot = async () => {
    const lowStockItems = items.filter(
      p => p.quantity <= (p.min_quantity || p.minimum_stock || 0)
    ).map(p => ({
      name: p.name,
      sku: p.sku,
      stock: p.quantity,
      min_stock: p.min_quantity || p.minimum_stock || 0
    }));

    setIsAnalyzingCopilot(true);
    setShowCopilotModal(true);
    setCopilotReport(null);

    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'inventory-copilot',
          payload: { items: lowStockItems }
        })
      });
      const data = await res.json();
      if (data.success) {
        setCopilotReport(data.report);
      } else {
        toast.error('Error generando el reporte del Copiloto');
        setShowCopilotModal(false);
      }
    } catch (error) {
      toast.error('Error de conexión con Eagles AI');
      setShowCopilotModal(false);
    } finally {
      setIsAnalyzingCopilot(false);
    }
  };

  // Funciones de selección masiva
  const toggleSelection = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleAll = () => setSelectedIds(prev => prev.length === items.length ? [] : items.map(i => i.id));

  // Funciones de edición en línea (Inline Editing)
  const startEditing = (id: string, field: 'price' | 'stock', value: string) => {
    setEditingCell({ id, field });
    setEditValue(value);
  };

  const saveEditing = async (product: InventoryItem) => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    const numValue = parseFloat(editValue);
    
    if (isNaN(numValue)) {
      toast.error('Valor inválido');
      setEditingCell(null);
      return;
    }

    const isPrice = field === 'price';
    const originalValue = isPrice ? product.unit_price : product.quantity;
    
    if (numValue !== originalValue) {
      try {
        const updateData: Partial<UpdateInventoryItemData> = isPrice 
          ? { unit_price: numValue } 
          : { quantity: numValue };
        await updateItem(id, updateData as UpdateInventoryItemData);
        toast.success(isPrice ? 'Precio actualizado' : 'Stock actualizado');
      } catch (e) {
        console.error(e);
        toast.error('Error al actualizar');
      }
    }
    setEditingCell(null);
  };

  // Acciones Masivas (Bulk Actions)
  const handleBulkIncreasePrice = async () => {
    if (selectedIds.length === 0) return;
    setBulkProcessing(true);
    try {
      const promises = selectedIds.map(id => {
        const product = items.find(i => i.id === id);
        if (product) {
          return updateItem(id, { unit_price: product.unit_price * 1.10 } as UpdateInventoryItemData);
        }
      });
      await Promise.all(promises);
      toast.success('Precios aumentados 10%');
      setSelectedIds([]);
    } catch(e) {
      toast.error('Error al aumentar precios');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkExportCsv = () => {
    if (selectedIds.length === 0) return;
    const selectedProducts = items.filter(i => selectedIds.includes(i.id));
    const csvContent = "data:text/csv;charset=utf-8," 
      + "SKU,Nombre,Categoría,Precio,Stock\n"
      + selectedProducts.map(p => `${p.sku},${p.name},${p.category?.name || ''},${p.unit_price},${p.quantity}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "inventario_seleccionado.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exportación completa');
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0 || !confirm('¿Estás seguro de eliminar los productos seleccionados?')) return;
    setBulkProcessing(true);
    try {
      const promises = selectedIds.map(id => deleteItem(id));
      await Promise.all(promises);
      toast.success('Productos eliminados');
      setSelectedIds([]);
    } catch(e) {
      toast.error('Error al eliminar masivamente');
    } finally {
      setBulkProcessing(false);
    }
  };

  useEffect(() => {
    if (processedRef.current) return;

    // Abrir modal de nuevo producto directamente (sin AI)
    const openCreate = searchParams.get('create');
    if (openCreate === 'true') {
      processedRef.current = true;
      setShowNewProductModal(true);
      return;
    }

    const openMagicCreate = searchParams.get('openMagicCreate');
    if (openMagicCreate === 'true') {
      try {
        console.log('🔍 [Inventory] Buscando datos de AI en URL/Storage...');
        let aiDataRaw = sessionStorage.getItem('confiadrive_ai_pending_data');
        if (!aiDataRaw) {
          aiDataRaw = searchParams.get('aiData');
        }

        if (aiDataRaw) {
          const parsedData = JSON.parse(aiDataRaw);
          console.log('✨ [Inventory] Datos encontrados:', parsedData);
          
          if (parsedData.action_type === 'inventory' && parsedData.product) {
            const p = parsedData.product;
            
            let foundCategoryId = '';
            if (p.category_name && categories.length > 0) {
              const cat = categories.find(c => 
                c.name.toLowerCase().includes(p.category_name.toLowerCase())
              );
              if (cat) {
                foundCategoryId = cat.id;
                console.log('✅ [Inventory] Categoría auto-detectada:', cat.name);
              }
            }

            setNewProduct({
              name: p.name || '',
              sku: p.sku || '',
              unit_price: p.unit_price?.toString() || '',
              stock: (p.quantity || p.stock)?.toString() || '',
              minimum_stock: (p.min_quantity || p.minimum_stock)?.toString() || '5',
              description: p.description || 'Producto agregado vía Eagles AI',
              category_id: foundCategoryId || ''
            });

            console.log('🚀 [Inventory] Abriendo modal de nuevo producto...');
            setShowNewProductModal(true);
            toast.success('¡Eagles AI preparó los datos del producto!');
            
            // Limpiar
            sessionStorage.removeItem('confiadrive_ai_pending_data');
            const newPath = window.location.pathname;
            window.history.replaceState({}, '', newPath);
          } else {
            console.log('⏭️ [Inventory] Datos no corresponden a inventario:', parsedData.action_type);
          }
        } else {
          console.log('⚠️ [Inventory] No se encontraron datos de AI en el storage');
        }
      } catch (e) {
        console.error('❌ [Inventory] Error al procesar datos de AI:', e);
      }
    }
  }, [searchParams, categories]);

  const handleInventoryVoiceTranscription = async (text: string) => {
    setIsProcessingAI(true);
    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'magic-create',
          payload: { text, context: 'inventory' }
        })
      });

      const result = await response.json();
      if (result.success && result.data?.product) {
        const p = result.data.product;
        
        // Buscar categoría por nombre (opcional)
        let foundCategoryId = '';
        if (p.category_name) {
          const cat = categories.find(c => 
            c.name.toLowerCase().includes(p.category_name.toLowerCase())
          );
          if (cat) foundCategoryId = cat.id;
        }

        const updatedData = {
          name: p.name,
          sku: p.sku,
          unit_price: p.unit_price?.toString(),
          stock: (p.quantity || p.stock)?.toString(),
          minimum_stock: (p.min_quantity || p.minimum_stock)?.toString(),
          description: p.description,
          category_id: foundCategoryId
        };

        // Si el modal de edición está abierto, actualizamos ese estado
        if (showEditProductModal) {
          setEditProduct(prev => ({
            ...prev,
            name: updatedData.name || prev.name,
            sku: updatedData.sku || prev.sku,
            unit_price: updatedData.unit_price || prev.unit_price,
            stock: updatedData.stock || prev.stock,
            minimum_stock: updatedData.minimum_stock || prev.minimum_stock,
            description: updatedData.description || prev.description,
            category_id: updatedData.category_id || prev.category_id
          }));
        } else {
          // Si no, actualizamos el de nuevo producto
          setNewProduct(prev => ({
            ...prev,
            name: updatedData.name || prev.name,
            sku: updatedData.sku || prev.sku,
            unit_price: updatedData.unit_price || prev.unit_price,
            stock: updatedData.stock || prev.stock,
            minimum_stock: updatedData.minimum_stock || prev.minimum_stock,
            description: updatedData.description || prev.description,
            category_id: updatedData.category_id || prev.category_id
          }));
          setShowNewProductModal(true);
        }
        
        toast.success('¡IA procesó tu dictado con éxito!');
      }
    } catch (error) {
      console.error('Error processing AI voice:', error);
      toast.error('No se pudo procesar el dictado de IA');
    } finally {
      setIsProcessingAI(false);
    }
  };

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
    try {
      await deleteItem(productToDelete.id);
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Error al eliminar el producto');
    }
  };

  const handleUpdateProduct = async () => {
    if (!selectedProduct || !editProduct.name || !editProduct.sku || !editProduct.unit_price || !editProduct.category_id) {
      toast.error('Por favor completa los campos obligatorios');
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
      toast.error('Por favor completa los campos obligatorios');
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
                className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20 hover:text-indigo-300"
                onClick={handleRunCopilot}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Copiloto AI
              </Button>
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
            {selectedIds.length > 0 && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4 flex items-center justify-between">
                <span className="text-sm text-blue-400 font-medium">{selectedIds.length} productos seleccionados</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleBulkIncreasePrice} disabled={bulkProcessing} className="border-blue-500/50 text-blue-400">
                    {bulkProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Subir Precio 10%
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleBulkExportCsv} disabled={bulkProcessing} className="border-green-500/50 text-green-400">
                    Exportar CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleBulkDelete} disabled={bulkProcessing} className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                    Eliminar
                  </Button>
                </div>
              </div>
            )}

            <div className="rounded-md border border-slate-700 bg-slate-900 overflow-x-auto shadow-sm">
              <table className="w-full text-sm text-left text-slate-300">
                <thead className="text-xs text-slate-400 uppercase bg-slate-800/50 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-600 bg-slate-800 cursor-pointer" 
                        checked={items.length > 0 && selectedIds.length === items.length}
                        onChange={toggleAll}
                      />
                    </th>
                    <th className="px-4 py-3 min-w-[200px]">Producto & SKU</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3 w-32">Precio (Und)</th>
                    <th className="px-4 py-3 w-32">Stock</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((product) => {
                    const isLowStock = product.quantity <= (product.min_quantity || product.minimum_stock || 0);
                    return (
                      <tr key={product.id} className="border-b border-slate-800 hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 text-center">
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-600 bg-slate-800 cursor-pointer" 
                            checked={selectedIds.includes(product.id)}
                            onChange={() => toggleSelection(product.id)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-100">{product.name}</div>
                          <div className="text-xs text-slate-500">{product.sku}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {product.category?.name || '---'}
                        </td>
                        <td 
                          className="px-4 py-3 font-medium text-slate-200 cursor-pointer hover:bg-slate-800 rounded group transition-colors"
                          onDoubleClick={() => startEditing(product.id, 'price', product.unit_price.toString())}
                          title="Doble clic para editar"
                        >
                          {editingCell?.id === product.id && editingCell.field === 'price' ? (
                            <Input 
                              type="number" step="0.01" 
                              className="h-8 w-24 text-sm px-2 bg-slate-900 border-blue-500 -ml-2" 
                              value={editValue}
                              autoFocus
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => saveEditing(product)}
                              onKeyDown={(e) => e.key === 'Enter' && saveEditing(product)}
                            />
                          ) : (
                            <div className="flex items-center w-full pb-0.5 border-b border-transparent group-hover:border-slate-500">
                              ${product.unit_price.toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td 
                          className="px-4 py-3 cursor-pointer hover:bg-slate-800 rounded group transition-colors"
                          onDoubleClick={() => startEditing(product.id, 'stock', product.quantity.toString())}
                          title="Doble clic para editar"
                        >
                          {editingCell?.id === product.id && editingCell.field === 'stock' ? (
                            <Input 
                              type="number" 
                              className="h-8 w-20 text-sm px-2 bg-slate-900 border-blue-500 -ml-2" 
                              value={editValue}
                              autoFocus
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => saveEditing(product)}
                              onKeyDown={(e) => e.key === 'Enter' && saveEditing(product)}
                            />
                          ) : (
                            <div className="flex items-center gap-2 pb-0.5 border-b border-transparent group-hover:border-slate-500 w-max">
                              <span className={`font-medium ${isLowStock ? 'text-red-400' : 'text-slate-200'}`}>
                                {product.quantity}
                              </span>
                              {isLowStock && <span className="bg-red-500/10 text-red-400 px-1 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider border border-red-500/20">Bajo</span>}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <IconButton icon={<AdjustmentsHorizontalIcon className="h-4 w-4" />} size="sm" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-white" onClick={() => handleEditProduct(product)} />
                            <IconButton icon={<TrashIcon className="h-4 w-4" />} size="sm" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={() => handleDeleteClick(product)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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

        {/* Modal Copiloto AI */}
        {showCopilotModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0b0f1a] border border-slate-800 shadow-2xl shadow-indigo-500/10 rounded-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-900/50">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-indigo-400" />
                    Eagles System Copilot
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">Análisis inteligente de tu inventario crítico</p>
                </div>
                <IconButton icon={<X className="h-5 w-5" />} size="md" variant="ghost" onClick={() => setShowCopilotModal(false)} className="text-slate-400 hover:text-white" />
              </div>
              <div className="p-6 overflow-y-auto">
                {isAnalyzingCopilot ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
                    <p className="text-slate-400 animate-pulse">Analizando niveles de stock y creando recomendaciones...</p>
                  </div>
                ) : (
                  <div className="bg-slate-900/50 rounded-lg p-5 border border-slate-800 prose prose-invert max-w-none text-slate-300">
                    <div className="whitespace-pre-wrap font-sans leading-relaxed text-[15px]">
                      {copilotReport}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex justify-end">
                <Button onClick={() => setShowCopilotModal(false)} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                  Entendido
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para Nuevo Producto */}
        {showNewProductModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0b0f1a] border border-slate-800 shadow-2xl rounded-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 pb-2">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <PlusIcon className="h-5 w-5 text-blue-500" />
                  Nuevo Producto
                </h2>
                <p className="text-xs text-slate-400 mt-1">Ingresa los detalles manualmente o usa la IA</p>
              </div>

              {/* Asistente de Voz AI */}
              <div className="px-6 py-3 bg-slate-900/50 border-y border-slate-800 flex-shrink-0">
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                  <div className="relative flex items-center gap-3 bg-[#0f172a] border border-pink-500/30 rounded-lg p-2 shadow-xl">
                    <div className="p-1.5 bg-pink-500/10 rounded-lg shrink-0">
                      <Brain className={cn("h-5 w-5 text-pink-500", isProcessingAI && "animate-pulse")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[9px] font-bold text-pink-400 uppercase tracking-widest">Eagles AI</p>
                        <span className="h-1 w-1 rounded-full bg-slate-600"></span>
                        <p className="text-[10px] text-slate-400 truncate">Dicta nombre, SKU y precio...</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isProcessingAI ? (
                        <Loader2 className="h-5 w-5 text-pink-500 animate-spin" />
                      ) : (
                        <VoiceInput
                          onTranscript={handleInventoryVoiceTranscription}
                          className="h-9 w-9 bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-500/20 rounded-full"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-4 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">Nombre del Producto *</label>
                  <Input 
                    placeholder="Ej: Aceite Motor 5W-30" 
                    value={newProduct.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                        <SelectValue placeholder="Seleccionar" />
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
                </div>
                <div className="grid grid-cols-3 gap-4">
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0b0f1a] border border-slate-800 shadow-2xl rounded-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 pb-2">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <AdjustmentsHorizontalIcon className="h-5 w-5 text-blue-500" />
                  Editar Producto
                </h2>
                <p className="text-xs text-slate-400 mt-1">Actualiza los datos manualmente o con IA</p>
              </div>
              
              {/* Asistente de Voz AI */}
              <div className="px-6 py-3 bg-slate-900/50 border-y border-slate-800 flex-shrink-0">
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                  <div className="relative flex items-center gap-3 bg-[#0f172a] border border-pink-500/30 rounded-lg p-2 shadow-xl">
                    <div className="p-1.5 bg-pink-500/10 rounded-lg shrink-0">
                      <Brain className={cn("h-5 w-5 text-pink-500", isProcessingAI && "animate-pulse")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[9px] font-bold text-pink-400 uppercase tracking-widest">Eagles AI</p>
                        <span className="h-1 w-1 rounded-full bg-slate-600"></span>
                        <p className="text-[10px] text-slate-400 truncate">Actualiza datos con tu voz...</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isProcessingAI ? (
                        <Loader2 className="h-5 w-5 text-pink-500 animate-spin" />
                      ) : (
                        <VoiceInput
                          onTranscript={handleInventoryVoiceTranscription}
                          className="h-9 w-9 bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-500/20 rounded-full"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-4 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">Nombre del Producto *</label>
                  <Input 
                    placeholder="Ej: Aceite Motor 5W-30" 
                    value={editProduct.name}
                    onChange={(e) => handleEditInputChange('name', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                        <SelectValue placeholder="Seleccionar" />
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
                </div>
                <div className="grid grid-cols-3 gap-4">
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
              <div className="p-6 py-4 bg-slate-900/50 border-t border-slate-800 flex gap-2 shrink-0">
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

        <ConfirmDeleteDialog
          open={deleteDialogOpen}
          onClose={() => { setDeleteDialogOpen(false); setProductToDelete(null); }}
          onConfirm={handleDeleteConfirm}
          title="Eliminar Producto"
          entityName={productToDelete?.name}
          items={['El producto será eliminado del inventario permanentemente']}
          confirmText="Eliminar Producto"
        />

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

