'use client';

import { useState, useEffect } from 'react';
import { Package, Plus, Download, Upload } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { PageHeader } from '@/components/navigation/page-header';
import { Button } from '@/components/ui/button';
import InventoryFilters from '@/components/inventory/InventoryFilters';
import InventoryTable from '@/components/inventory/InventoryTable';
import InventoryForm from '@/components/inventory/InventoryForm';
import DeleteInventoryModal from '@/components/inventory/DeleteInventoryModal';
import MovementsModal from '@/components/inventory/MovementsModal';
import CategoryManager from '@/components/inventory/CategoryManager';
import { InventoryItem } from '@/hooks/useInventory';

export default function InventarioPage() {
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMovementsModal, setShowMovementsModal] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);

  // Hook
  const {
    items,
    categories,
    movements,
    loading,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    fetchMovements,
    createMovement,
  } = useInventory();

  // Filter items
  useEffect(() => {
    let filtered = items;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((item) => item.category_id === selectedCategory);
    }

    // Filter by low stock
    if (showLowStock) {
      filtered = filtered.filter((item) => item.quantity <= item.minimum_stock);
    }

    setFilteredItems(filtered);
  }, [items, searchTerm, selectedCategory, showLowStock]);

  // Handlers - Items
  const handleCreateItem = async (data: any) => {
    try {
      await createItem(data);
      setShowForm(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Error creating item:', error);
    }
  };

  const handleUpdateItem = async (data: any) => {
    if (selectedItem) {
      try {
        await updateItem(selectedItem.id, data);
        setShowForm(false);
        setSelectedItem(null);
      } catch (error) {
        console.error('Error updating item:', error);
      }
    }
  };

  const handleDeleteItem = async () => {
    if (selectedItem) {
      try {
        await deleteItem(selectedItem.id);
        setShowDeleteModal(false);
        setSelectedItem(null);
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  const handleEditClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowForm(true);
  };

  const handleDeleteClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const handleViewMovements = async (item: InventoryItem) => {
    setSelectedItem(item);
    await fetchMovements(item.id);
    setShowMovementsModal(true);
  };

  // Handlers - Movements
  const handleAddMovement = async (data: any) => {
    try {
      await createMovement(data);
      if (selectedItem) {
        await fetchMovements(selectedItem.id);
      }
    } catch (error) {
      console.error('Error creating movement:', error);
    }
  };

  // Handlers - Categories
  const handleCreateCategory = async (data: any) => {
    try {
      await createCategory(data);
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleUpdateCategory = async (id: string, data: any) => {
    try {
      await updateCategory(id, data);
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory(id);
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  // Stats
  const totalItems = items.length;
  const lowStockItems = items.filter((item) => item.quantity <= item.minimum_stock).length;
  const totalValue = items.reduce((acc, item) => acc + item.quantity * item.unit_price, 0);
  const outOfStockItems = items.filter((item) => item.quantity === 0).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header con Breadcrumbs */}
        <PageHeader
          title="Inventario"
          description="Control de stock y artículos del taller"
          breadcrumbs={[
            { label: 'Inventario', href: '/inventario' }
          ]}
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => setShowCategoryManager(!showCategoryManager)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Package className="w-4 h-4" />
                Categorías
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Importar
              </Button>
              <Button
                onClick={() => {
                  setSelectedItem(null);
                  setShowForm(true);
                }}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nuevo Item
              </Button>
            </div>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total Items</span>
              <Package className="w-5 h-5 text-cyan-400" />
            </div>
            <p className="text-3xl font-bold text-white">{totalItems}</p>
            <p className="text-cyan-400 text-sm mt-1">
              {categories.length} categorías
            </p>
          </div>

          <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Stock Bajo</span>
              <Package className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-3xl font-bold text-white">{lowStockItems}</p>
            <p className="text-yellow-400 text-sm mt-1">
              Requieren atención
            </p>
          </div>

          <div className="bg-gradient-to-br from-red-500/10 to-pink-500/10 border border-red-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Sin Stock</span>
              <Package className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-3xl font-bold text-white">{outOfStockItems}</p>
            <p className="text-red-400 text-sm mt-1">
              Agotados
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Valor Total</span>
              <Package className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-3xl font-bold text-white">
              {new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: 'MXN',
                minimumFractionDigits: 0,
              }).format(totalValue)}
            </p>
            <p className="text-green-400 text-sm mt-1">
              En inventario
            </p>
          </div>
        </div>

        {/* Category Manager */}
        {showCategoryManager && (
          <CategoryManager
            categories={categories}
            onCreateCategory={handleCreateCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            loading={loading}
          />
        )}

        {/* Filters */}
        <InventoryFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          showLowStock={showLowStock}
          onLowStockToggle={() => setShowLowStock(!showLowStock)}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          categories={categories}
        />

        {/* Table */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg overflow-hidden">
          <InventoryTable
            items={filteredItems}
            loading={loading}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            onViewMovements={handleViewMovements}
          />
        </div>

        {/* Results Info */}
        {!loading && (
          <div className="text-center text-gray-400 text-sm">
            Mostrando {filteredItems.length} de {totalItems} items
            {searchTerm && ` - Búsqueda: "${searchTerm}"`}
            {selectedCategory && ` - Categoría filtrada`}
            {showLowStock && ` - Solo stock bajo`}
          </div>
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <InventoryForm
          item={selectedItem}
          categories={categories}
          onSubmit={selectedItem ? handleUpdateItem : handleCreateItem}
          onClose={() => {
            setShowForm(false);
            setSelectedItem(null);
          }}
          loading={loading}
        />
      )}

      {showDeleteModal && (
        <DeleteInventoryModal
          item={selectedItem}
          onConfirm={handleDeleteItem}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedItem(null);
          }}
          loading={loading}
        />
      )}

      {showMovementsModal && (
        <MovementsModal
          item={selectedItem}
          movements={movements}
          onClose={() => {
            setShowMovementsModal(false);
            setSelectedItem(null);
          }}
          onAddMovement={handleAddMovement}
          loading={loading}
        />
      )}
    </div>
  );
}
