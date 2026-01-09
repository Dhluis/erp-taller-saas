'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/navigation/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  MagnifyingGlassIcon,
  PlusIcon,
  TagIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useInventory } from '@/hooks/useInventory';
import { toast } from 'sonner';
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

export default function InventariosCategoriasPage() {
  const { categories, loading, fetchCategories, createCategory, updateCategory, deleteCategory } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  // Cargar categorías al montar el componente
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleInputChange = (field: string, value: string) => {
    setNewCategory(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateCategory = async () => {
    console.log('🔄 [PAGE] handleCreateCategory - Iniciando');
    console.log('📦 [PAGE] Datos:', newCategory);
    
    if (!newCategory.name.trim()) {
      toast.error('Por favor ingresa el nombre de la categoría');
      return;
    }

    setSaving(true);
    try {
      console.log('🔄 [PAGE] Llamando createCategory...');
      const result = await createCategory({
        name: newCategory.name.trim(),
        description: newCategory.description.trim() || null
      });
      
      console.log('📦 [PAGE] Resultado:', result);
      
      if (result) {
        console.log('✅ [PAGE] Categoría creada, cerrando modal');
        setNewCategory({ name: '', description: '' });
        setShowNewCategoryModal(false);
      } else {
        console.log('❌ [PAGE] createCategory retornó null');
      }
    } catch (error) {
      console.error('❌ [PAGE] Error:', error);
      toast.error('Error al crear la categoría');
    } finally {
      setSaving(false);
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setNewCategory({
      name: category.name,
      description: category.description || ''
    });
    setShowNewCategoryModal(true);
  };

  const handleUpdateCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error('Por favor ingresa el nombre de la categoría');
      return;
    }

    setSaving(true);
    try {
      await updateCategory(editingCategory.id, {
        name: newCategory.name.trim(),
        description: newCategory.description.trim() || null
      });
      
      // Resetear formulario
      setNewCategory({
        name: '',
        description: ''
      });
      setEditingCategory(null);
      setShowNewCategoryModal(false);
      toast.success('Categoría actualizada exitosamente');
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Error al actualizar la categoría');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (categoryId: string) => {
    setCategoryToDelete(categoryId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    setDeleting(true);
    try {
      await deleteCategory(categoryToDelete);
      // ✅ Toast manejado aquí (único lugar)
      toast.success('Categoría eliminada exitosamente');
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Error al eliminar la categoría');
    } finally {
      setDeleting(false);
    }
  };

  const handleCloseModal = () => {
    setShowNewCategoryModal(false);
    setEditingCategory(null);
    setNewCategory({
      name: '',
      description: ''
    });
  };

  // Debug: Ver qué hay en categories
  console.log('🔍 [PAGE] categories state:', categories);
  console.log('🔍 [PAGE] categories length:', categories.length);
  console.log('🔍 [PAGE] searchTerm:', searchTerm);

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  console.log('🔍 [PAGE] filteredCategories length:', filteredCategories.length);

  if (loading) {
    return (
      <AppLayout
        title="Categorías"
        breadcrumbs={[
          { label: 'Inventarios', href: '/inventarios' },
          { label: 'Categorías', href: '/inventarios/categorias' }
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
    title="Categorías"
    breadcrumbs={[
      { label: 'Inventarios', href: '/inventarios' },
      { label: 'Categorías', href: '/inventarios/categorias' }
    ]}
  >
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Categorías de Inventario"
        description="Organiza tus productos por categorías para una mejor gestión"
        breadcrumbs={[
          { label: 'Inventarios', href: '/inventarios' },
          { label: 'Categorías', href: '/inventarios/categorias' }
        ]}
        actions={
          <Button
            onClick={() => setShowNewCategoryModal(true)}
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Nueva Categoría
          </Button>
        }
      />

      {/* Filtros y búsqueda */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar categorías por nombre o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de categorías */}
      {filteredCategories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">🏷️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm ? 'No se encontraron categorías' : 'No hay categorías'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'Intenta con otros términos de búsqueda'
                : 'Comienza creando la primera categoría'
              }
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowNewCategoryModal(true)}>
                <PlusIcon className="w-5 h-5 mr-2" />
                Crear Categoría
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((category) => (
            <Card key={category.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <TagIcon className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Activa
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {category.description && (
                  <p className="text-sm text-gray-600">{category.description}</p>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Productos:</span>
                  <span className="text-sm font-medium">0</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => handleEditCategory(category)}
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1 text-red-600 hover:text-red-700"
                    onClick={() => handleDeleteClick(category.id)}
                    disabled={deleting}
                  >
                    <TrashIcon className="h-4 w-4 mr-1" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal para Nueva/Editar Categoría */}
      {showNewCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-black border border-border shadow-lg rounded-lg p-6 w-full max-w-md" style={{backgroundColor: '#000000'}}>
            <h2 className="text-xl font-bold mb-4 text-text-primary">
              {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-text-secondary">Nombre de la Categoría *</label>
                <Input 
                  placeholder="Ej: Lubricantes" 
                  value={newCategory.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-text-secondary">Descripción</label>
                <Input 
                  placeholder="Descripción opcional de la categoría" 
                  value={newCategory.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleCloseModal}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-1"
                onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
                disabled={saving}
              >
                {saving 
                  ? (editingCategory ? 'Actualizando...' : 'Creando...') 
                  : (editingCategory ? 'Actualizar Categoría' : 'Crear Categoría')
                }
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog de confirmación para eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-bg-primary border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text-primary">
              ¿Eliminar categoría?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-text-secondary">
              Esta acción no se puede deshacer. La categoría será eliminada permanentemente.
              {categoryToDelete && (
                <>
                  <br />
                  <br />
                  <strong className="text-text-primary">
                    {categories.find(c => c.id === categoryToDelete)?.name}
                  </strong>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </AppLayout>
  );
}
