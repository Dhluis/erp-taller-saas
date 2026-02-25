'use client';

import { useState, useEffect } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/navigation/page-header';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { 
  CustomersTable, 
  CustomersFilters, 
  CustomerForm, 
  DeleteCustomerModal, 
  CustomerDetailsModal 
} from '@/components/customers';
import { WorkOrderDetailsModal } from '@/components/work-orders/WorkOrderDetailsModal';
import { useCustomers } from '@/hooks/useCustomers';
import { useWorkOrders } from '@/hooks/useWorkOrders';
import { useSession } from '@/lib/context/SessionContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/ToastContainer';
import type { Customer } from '@/lib/database/queries/customers';

export default function ClientesPage() {
  // ✅ Hook con paginación
  const { 
    customers, 
    loading, 
    error,
    pagination,
    goToPage,
    changePageSize,
    setSearch,
    setFilters: setFiltersHook,
    refresh,
    createCustomer, 
    updateCustomer, 
    deleteCustomer,
  } = useCustomers({
    page: 1,
    pageSize: 20,
    autoLoad: true,
    enableCache: false,
  });
  
  const { toast, showToast, hideToast } = useToast();
  const { profile } = useSession();

  // Hook solo para obtener la orden por ID y abrir el modal de detalles (sin cargar lista de órdenes)
  const { fetchWorkOrderById } = useWorkOrders({ autoLoad: false });

  // Estados locales
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<any>({});
  
  // ✅ Debounce para búsqueda
  const debouncedSearch = useDebouncedValue(searchTerm, 500);

  // Modal de orden de ingreso (detalle/edición)
  const [isOrderDetailModalOpen, setIsOrderDetailModalOpen] = useState(false);
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<any | null>(null);
  const [loadingOrderForModal, setLoadingOrderForModal] = useState(false);

  // Estados de modales
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ✅ Sincronizar búsqueda debounced con hook
  useEffect(() => {
    setSearch(debouncedSearch);
  }, [debouncedSearch, setSearch]);

  // ✅ Sincronizar filtros con hook
  useEffect(() => {
    setFiltersHook(filters);
  }, [filters, setFiltersHook]);

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

  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setShowCustomerForm(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerForm(true);
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetailsModal(true);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDeleteModal(true);
  };

  const handleOpenOrderDetails = async (orderId: string) => {
    setLoadingOrderForModal(true);
    try {
      const order = await fetchWorkOrderById(orderId);
      if (order) {
        setSelectedOrderForModal(order);
        setIsOrderDetailModalOpen(true);
      } else {
        showToast('No se pudo cargar la orden', 'error');
      }
    } catch (e) {
      console.error('Error cargando orden:', e);
      showToast('Error al cargar la orden', 'error');
    } finally {
      setLoadingOrderForModal(false);
    }
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      setFormLoading(true);
      
      if (selectedCustomer) {
        // Editar cliente existente
        await updateCustomer(selectedCustomer.id, formData);
        showToast('Cliente actualizado correctamente', 'success');
      } else {
        // Crear nuevo cliente (org se resuelve en API por tenant)
        await createCustomer(formData);
        showToast('Cliente creado correctamente', 'success');
      }
      
      setShowCustomerForm(false);
      await refresh(); // Recargar lista después de crear/actualizar
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      showToast('Error al guardar el cliente', 'error');
      throw error;
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCustomer) return;
    
    try {
      setDeleteLoading(true);
      
      await deleteCustomer(selectedCustomer.id);
      showToast('Cliente eliminado correctamente', 'success');
      setShowDeleteModal(false);
      await refresh(); // Recargar lista después de eliminar
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      showToast('Error al eliminar el cliente', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCloseModals = () => {
    setShowCustomerForm(false);
    setShowDeleteModal(false);
    setShowDetailsModal(false);
    setSelectedCustomer(null);
  };

  return (
    <AppLayout 
      title="Gestión de Clientes"
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Clientes', href: '/clientes' }
      ]}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Gestión de Clientes</h1>
            <p className="text-text-secondary">Administra la información de tus clientes</p>
          </div>
          <Button onClick={handleAddCustomer} className="flex items-center space-x-2">
            <PlusIcon className="w-5 h-5" />
            <span>Nuevo Cliente</span>
          </Button>
        </div>

        {/* Filtros */}
        <CustomersFilters
          onSearch={handleSearch}
          onFilter={handleFilter}
        />

        {/* Tabla de clientes */}
        <CustomersTable
          customers={customers}
          onEdit={handleEditCustomer}
          onDelete={handleDeleteCustomer}
          onView={handleViewCustomer}
          onOpenOrderDetails={handleOpenOrderDetails}
          loading={loading}
        />

        {/* ✅ Componente de Paginación */}
        {!loading && pagination.totalPages > 1 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPageChange={goToPage}
            onPageSizeChange={changePageSize}
            loading={loading}
            pageSizeOptions={[10, 20, 50, 100]}
          />
        )}

        {/* Contador de resultados */}
        {!loading && (
          <div className="text-sm text-text-secondary">
            Mostrando {customers.length} de {pagination.total} clientes
            {pagination.totalPages > 1 && ` | Página ${pagination.page} de ${pagination.totalPages}`}
          </div>
        )}
      </div>

      {/* Modales */}
      <CustomerForm
        customer={selectedCustomer}
        onSubmit={handleFormSubmit}
        onCancel={handleCloseModals}
        isOpen={showCustomerForm}
      />

      <DeleteCustomerModal
        customer={selectedCustomer}
        isOpen={showDeleteModal}
        onConfirm={handleDeleteConfirm}
        onCancel={handleCloseModals}
        loading={deleteLoading}
      />

      <CustomerDetailsModal
        customer={selectedCustomer}
        onClose={handleCloseModals}
        isOpen={showDetailsModal}
      />

      {/* Modal de detalle/edición de orden de ingreso (mismo que en Órdenes) */}
      <WorkOrderDetailsModal
        order={selectedOrderForModal}
        open={isOrderDetailModalOpen}
        onOpenChange={(open) => {
          setIsOrderDetailModalOpen(open);
          if (!open) setSelectedOrderForModal(null);
        }}
        userId={profile?.id}
        onUpdate={async () => {
          await refresh();
          if (selectedOrderForModal?.id) {
            try {
              const updated = await fetchWorkOrderById(selectedOrderForModal.id);
              if (updated) setSelectedOrderForModal(updated);
            } catch (_) {}
          }
        }}
      />

      {/* Toast Notifications */}
      <ToastContainer toast={toast} onClose={hideToast} />
    </AppLayout>
  );
}
