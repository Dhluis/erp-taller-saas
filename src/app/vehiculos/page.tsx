'use client';

import { useState, useEffect } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { RefreshCw } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/navigation/page-header';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { 
  VehiclesTable, 
  VehiclesFilters, 
  VehicleForm, 
  DeleteVehicleModal, 
  VehicleDetailsModal 
} from '@/components/vehicles';
import { useVehicles } from '@/hooks/useVehicles';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/ToastContainer';
import type { Vehicle } from '@/lib/database/queries/vehicles';

export default function VehiculosPage() {
  // Hooks
  const {
    vehicles,
    pagination,
    loading,
    error,
    goToPage,
    changePageSize,
    setSearch,
    setFilters,
    refresh,
    createVehicle,
    updateVehicle,
    deleteVehicle,
  } = useVehicles({
    page: 1,
    pageSize: 20,
    sortBy: 'created_at',
    sortOrder: 'desc',
    autoLoad: true
  });
  
  const { toast, showToast, hideToast } = useToast();

  // Estados locales
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 500);
  const [customerFilter, setCustomerFilter] = useState('');

  // Estados de modales
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Sincronizar búsqueda con debounce
  useEffect(() => {
    setSearch(debouncedSearch);
  }, [debouncedSearch, setSearch]);

  // Sincronizar filtro de cliente
  useEffect(() => {
    if (customerFilter) {
      setFilters({ customer_id: customerFilter });
    } else {
      setFilters({});
    }
  }, [customerFilter, setFilters]);

  // Mostrar error si hay uno
  useEffect(() => {
    if (error) {
      showToast(error, 'error');
    }
  }, [error, showToast]);

  const handleSearch = (search: string) => {
    setSearchQuery(search);
  };

  const handleFilter = (newFilters: any) => {
    // Si viene customer_id en los filtros, actualizar el estado local
    if (newFilters.customer) {
      setCustomerFilter(newFilters.customer);
    } else if (newFilters.customer_id) {
      setCustomerFilter(newFilters.customer_id);
    } else {
      setCustomerFilter('');
    }
  };

  const handleAddVehicle = () => {
    setSelectedVehicle(null);
    setShowVehicleForm(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setShowVehicleForm(true);
  };

  const handleViewVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setShowDetailsModal(true);
  };

  const handleDeleteVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setShowDeleteModal(true);
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      setFormLoading(true);
      
      if (selectedVehicle) {
        // Editar vehículo existente
        await updateVehicle(selectedVehicle.id, formData);
        showToast('Vehículo actualizado correctamente', 'success');
      } else {
        // Crear nuevo vehículo
        await createVehicle(formData);
        showToast('Vehículo creado correctamente', 'success');
      }
      
      setShowVehicleForm(false);
    } catch (error) {
      console.error('Error al guardar vehículo:', error);
      showToast('Error al guardar el vehículo', 'error');
      throw error;
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedVehicle) return;
    
    try {
      setDeleteLoading(true);
      
      await deleteVehicle(selectedVehicle.id);
      showToast('Vehículo eliminado correctamente', 'success');
      
      // Cerrar todos los modales y limpiar selección
      setShowDeleteModal(false);
      setShowDetailsModal(false);
      setSelectedVehicle(null);
      
      // Refrescar la lista (esto ya lo hace deleteVehicle internamente)
    } catch (error) {
      console.error('Error al eliminar vehículo:', error);
      showToast('Error al eliminar el vehículo', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCloseModals = () => {
    setShowVehicleForm(false);
    setShowDeleteModal(false);
    setShowDetailsModal(false);
    setSelectedVehicle(null);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header con Breadcrumbs */}
        <PageHeader
          title="Vehículos"
          description="Gestiona los vehículos de tus clientes"
          breadcrumbs={[
            { label: 'Vehículos', href: '/vehiculos' }
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
              <Button onClick={handleAddVehicle} className="flex items-center space-x-2">
                <PlusIcon className="h-4 w-4 mr-2" />
                Nuevo Vehículo
              </Button>
            </div>
          }
        />

        {error && (
          <div className="bg-error/10 border border-error/30 text-error p-4 rounded-lg mb-6">
            <p>{error}</p>
          </div>
        )}

        {/* Stats */}
        {!loading && pagination.total > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            Total: {pagination.total} vehículos | 
            Página {pagination.page} de {pagination.totalPages}
          </p>
        )}

        <div className="mb-6">
          <VehiclesFilters 
            onSearch={handleSearch} 
            onFilter={handleFilter}
            searchValue={searchQuery}
            disabled={loading}
          />
        </div>

        {!loading && !error && vehicles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery || customerFilter
                ? 'No se encontraron vehículos con los filtros aplicados'
                : 'No hay vehículos registrados'}
            </p>
          </div>
        ) : (
          <VehiclesTable
            vehicles={vehicles}
            onEdit={handleEditVehicle}
            onDelete={handleDeleteVehicle}
            onView={handleViewVehicle}
            loading={loading}
            hasFilters={!!(searchQuery || customerFilter)}
          />
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              pageSize={pagination.pageSize}
              total={pagination.total}
              onPageChange={goToPage}
              onPageSizeChange={changePageSize}
              loading={loading}
            />
          </div>
        )}

        <VehicleForm
          isOpen={showVehicleForm}
          vehicle={selectedVehicle}
          onSubmit={handleFormSubmit}
          onCancel={handleCloseModals}
        />

        <DeleteVehicleModal
          isOpen={showDeleteModal}
          vehicle={selectedVehicle}
          onConfirm={handleDeleteConfirm}
          onCancel={handleCloseModals}
          loading={deleteLoading}
        />

        <VehicleDetailsModal
          vehicle={selectedVehicle}
          onClose={handleCloseModals}
          isOpen={showDetailsModal}
        />

        {/* Toast Notifications */}
        <ToastContainer toast={toast} onClose={hideToast} />
      </div>
    </AppLayout>
  );
}
