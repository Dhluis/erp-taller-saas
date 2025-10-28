'use client';

import { useState, useEffect } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/navigation/page-header';
import { Button } from '@/components/ui/button';
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
    loading, 
    error, 
    createVehicle, 
    updateVehicle, 
    deleteVehicle, 
    refreshVehicles 
  } = useVehicles();
  
  const { toast, showToast, hideToast } = useToast();

  // Estados locales
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<any>({});

  // Estados de modales
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Filtrar vehículos cuando cambie la búsqueda o filtros
  useEffect(() => {
    let filtered = vehicles;

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(vehicle => 
        vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.license_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.vin?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtros adicionales
    if (filters.brand) {
      filtered = filtered.filter(vehicle => vehicle.brand === filters.brand);
    }
    if (filters.year) {
      filtered = filtered.filter(vehicle => vehicle.year.toString() === filters.year);
    }
    if (filters.customer) {
      filtered = filtered.filter(vehicle => vehicle.customer_id === filters.customer);
    }

    setFilteredVehicles(filtered);
  }, [vehicles, searchTerm, filters]);

  // Mostrar error si hay uno
  useEffect(() => {
    if (error) {
      showToast(error, 'error');
    }
  }, [error, showToast]);

  const handleSearch = (search: string) => {
    setSearchTerm(search);
  };

  const handleFilter = (newFilters: any) => {
    setFilters(newFilters);
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
      setShowDeleteModal(false);
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
            <Button onClick={handleAddVehicle} className="flex items-center space-x-2">
              <PlusIcon className="h-4 w-4 mr-2" />
              Nuevo Vehículo
            </Button>
          }
        />

        {error && (
          <div className="bg-error/10 border border-error/30 text-error p-4 rounded-lg mb-6">
            <p>{error}</p>
          </div>
        )}

        <div className="mb-6">
          <VehiclesFilters onSearch={handleSearch} onFilter={handleFilter} />
        </div>

        <VehiclesTable
          vehicles={filteredVehicles}
          onEdit={handleEditVehicle}
          onDelete={handleDeleteVehicle}
          onView={handleViewVehicle}
          loading={loading}
        />

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
