'use client';

// Disable static generation
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkOrders } from '@/hooks/useWorkOrders';
import { WorkOrderFilters } from '@/components/work-orders/WorkOrderFilters';
import { WorkOrderStatsCards } from '@/components/work-orders/WorkOrderStatsCards';
import { WorkOrderCard } from '@/components/work-orders/WorkOrderCard';
import { WorkOrderForm } from '@/components/work-orders/WorkOrderForm';
import { DeleteWorkOrderModal } from '@/components/work-orders/DeleteWorkOrderModal';
import { WorkOrder } from '@/hooks/useWorkOrders';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { OrderItemsManager } from '@/components/work-orders/OrderItemsManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

type WorkOrderStatus =
  | 'pending'
  | 'in_progress'
  | 'diagnosed'
  | 'approved'
  | 'in_repair'
  | 'waiting_parts'
  | 'completed'
  | 'delivered';

const kanbanColumns: {
  id: WorkOrderStatus;
  title: string;
  color: string;
}[] = [
  { id: 'pending', title: 'Pendiente', color: 'bg-gray-100 border-gray-300' },
  { id: 'in_progress', title: 'En Progreso', color: 'bg-blue-100 border-blue-300' },
  { id: 'diagnosed', title: 'Diagnosticada', color: 'bg-purple-100 border-purple-300' },
  { id: 'approved', title: 'Aprobada', color: 'bg-cyan-100 border-cyan-300' },
  { id: 'in_repair', title: 'En Reparación', color: 'bg-orange-100 border-orange-300' },
  {
    id: 'waiting_parts',
    title: 'Esperando Piezas',
    color: 'bg-yellow-100 border-yellow-300',
  },
  { id: 'completed', title: 'Completada', color: 'bg-green-100 border-green-300' },
  { id: 'delivered', title: 'Entregada', color: 'bg-emerald-100 border-emerald-300' },
];

export default function WorkOrdersPage() {
  const {
    workOrders,
    currentWorkOrder,
    stats,
    loading,
    fetchWorkOrders,
    searchWorkOrders,
    fetchStats,
    fetchWorkOrderById,
    createWorkOrder,
    updateWorkOrder,
    deleteWorkOrder,
    updateWorkOrderStatus,
    addOrderItem,
    updateOrderItem,
    deleteOrderItem,
    setCurrentWorkOrder,
  } = useWorkOrders();

  // Estados UI
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrder | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingWorkOrder, setDeletingWorkOrder] = useState<WorkOrder | null>(null);

  // Cargar datos iniciales
  useEffect(() => {
    fetchWorkOrders();
    fetchStats();
  }, []);

  // Manejar búsqueda
  const handleSearch = () => {
    if (searchTerm.trim()) {
      searchWorkOrders(searchTerm);
    } else {
      fetchWorkOrders(selectedStatus !== 'all' ? selectedStatus : undefined);
    }
  };

  // Manejar cambio de filtro de estado
  const handleStatusFilterChange = (status: string) => {
    setSelectedStatus(status);
    if (status === 'all') {
      fetchWorkOrders();
    } else {
      fetchWorkOrders(status);
    }
    fetchStats();
  };

  // Limpiar filtros
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedStatus('all');
    fetchWorkOrders();
  };

  // Refrescar datos
  const handleRefresh = () => {
    fetchWorkOrders(selectedStatus !== 'all' ? selectedStatus : undefined);
    fetchStats();
  };

  // Crear nueva orden
  const handleCreateWorkOrder = () => {
    setEditingWorkOrder(null);
    setIsFormOpen(true);
  };

  // Ver detalles de orden
  const handleViewDetails = async (workOrder: WorkOrder) => {
    try {
      console.log('👁️ [handleViewDetails] Ver detalles de orden:', workOrder.id);
      await fetchWorkOrderById(workOrder.id);
      console.log('✅ [handleViewDetails] Orden cargada, abriendo modal');
      setIsDetailsOpen(true);
    } catch (error) {
      console.error('❌ [handleViewDetails] Error:', error);
      toast.error('Error al cargar los detalles de la orden');
    }
  };

  // Editar orden
  const handleEditWorkOrder = (workOrder: WorkOrder) => {
    try {
      console.log('✏️ [handleEditWorkOrder] Editar orden:', workOrder.id);
      setEditingWorkOrder(workOrder);
      setIsFormOpen(true);
      console.log('✅ [handleEditWorkOrder] Modal de edición abierto');
    } catch (error) {
      console.error('❌ [handleEditWorkOrder] Error:', error);
      toast.error('Error al abrir el formulario de edición');
    }
  };

  // Eliminar orden
  const handleDeleteClick = (workOrder: WorkOrder) => {
    setDeletingWorkOrder(workOrder);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deletingWorkOrder) {
      await deleteWorkOrder(deletingWorkOrder.id);
      setIsDeleteModalOpen(false);
      setDeletingWorkOrder(null);
      fetchStats();
    }
  };

  // Cambiar estado de orden (drag & drop simulado)
  const handleStatusChange = async (workOrderId: string, newStatus: WorkOrderStatus) => {
    await updateWorkOrderStatus(workOrderId, newStatus);
    fetchStats();
  };

  // Submit formulario
  const handleFormSubmit = async (data: any) => {
    if (editingWorkOrder) {
      await updateWorkOrder(editingWorkOrder.id, data);
    } else {
      await createWorkOrder(data);
    }
    fetchStats();
  };

  // Agrupar órdenes por estado
  const groupedOrders = kanbanColumns.reduce((acc, column) => {
    acc[column.id] = (workOrders || []).filter((order) => order.status === column.id);
    return acc;
  }, {} as Record<WorkOrderStatus, WorkOrder[]>);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Órdenes de Trabajo</h1>
          <p className="text-muted-foreground">
            Gestiona las órdenes de trabajo del taller
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refrescar
          </Button>
          <Button onClick={handleCreateWorkOrder}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Orden
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <WorkOrderStatsCards stats={stats} loading={loading} />

      {/* Filtros */}
      <WorkOrderFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedStatus={selectedStatus}
        onStatusChange={handleStatusFilterChange}
        onSearch={handleSearch}
        onClearFilters={handleClearFilters}
      />

      {/* Vista Kanban */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {kanbanColumns.map((column) => {
            const orders = groupedOrders[column.id] || [];
            const columnTotal = orders.reduce(
              (sum, order) => sum + order.total_amount,
              0
            );

            return (
              <div key={column.id} className="w-80 flex-shrink-0">
                <Card className={`${column.color} border-2`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">
                        {column.title}
                      </CardTitle>
                      <Badge variant="secondary" className="ml-2">
                        {orders.length}
                      </Badge>
                    </div>
                    {columnTotal > 0 && (
                      <p className="text-xs text-muted-foreground font-medium">
                        Total: ${columnTotal.toFixed(2)}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                      {orders.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No hay órdenes
                        </div>
                      ) : (
                        orders.map((order) => (
                          <div key={order.id} className="relative group">
                            <WorkOrderCard
                              workOrder={order}
                              onView={handleViewDetails}
                              onEdit={handleEditWorkOrder}
                              onDelete={handleDeleteClick}
                            />
                            {/* Acciones rápidas de cambio de estado */}
                            <div className="absolute -right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex flex-col gap-1">
                                {column.id !== 'pending' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 bg-white shadow"
                                    onClick={() => {
                                      const currentIndex = kanbanColumns.findIndex(
                                        (c) => c.id === column.id
                                      );
                                      if (currentIndex > 0) {
                                        handleStatusChange(
                                          order.id,
                                          kanbanColumns[currentIndex - 1].id
                                        );
                                      }
                                    }}
                                    title="Mover a etapa anterior"
                                  >
                                    ←
                                  </Button>
                                )}
                                {column.id !== 'delivered' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 bg-white shadow"
                                    onClick={() => {
                                      const currentIndex = kanbanColumns.findIndex(
                                        (c) => c.id === column.id
                                      );
                                      if (currentIndex < kanbanColumns.length - 1) {
                                        handleStatusChange(
                                          order.id,
                                          kanbanColumns[currentIndex + 1].id
                                        );
                                      }
                                    }}
                                    title="Mover a siguiente etapa"
                                  >
                                    →
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Formulario Crear/Editar */}
      <WorkOrderForm
        workOrder={editingWorkOrder}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingWorkOrder(null);
        }}
        onSubmit={handleFormSubmit}
        isSubmitting={loading}
      />

      {/* Modal: Detalles de Orden */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>
                Orden #{currentWorkOrder?.id.slice(0, 8).toUpperCase()}
              </span>
              {currentWorkOrder && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingWorkOrder(currentWorkOrder);
                      setIsDetailsOpen(false);
                      setIsFormOpen(true);
                    }}
                  >
                    Editar Orden
                  </Button>
                </div>
              )}
            </DialogTitle>
            <DialogDescription>
              Detalles completos de la orden de trabajo
            </DialogDescription>
          </DialogHeader>

          {currentWorkOrder && (
            <div className="space-y-6">
              {/* Información general */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Información General</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Estado
                    </p>
                    <div className="mt-1">
                      <Badge className="text-base">
                        {currentWorkOrder.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Cliente
                    </p>
                    <p className="font-medium">
                      {currentWorkOrder.customer
                        ? currentWorkOrder.customer.name
                        : 'N/A'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {currentWorkOrder.customer?.phone || 'Sin teléfono'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Vehículo
                    </p>
                    <p className="font-medium">
                      {currentWorkOrder.vehicle
                        ? `${currentWorkOrder.vehicle.brand} ${currentWorkOrder.vehicle.model} ${currentWorkOrder.vehicle.year}`
                        : 'N/A'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {currentWorkOrder.vehicle?.license_plate || 'Sin placas'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Asignado a
                    </p>
                    <p className="font-medium">
                      {currentWorkOrder.assigned_to || 'Sin asignar'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Descripción
                    </p>
                    <p className="mt-1">{currentWorkOrder.description}</p>
                  </div>
                  {currentWorkOrder.diagnosis && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        Diagnóstico
                      </p>
                      <p className="mt-1">{currentWorkOrder.diagnosis}</p>
                    </div>
                  )}
                  {currentWorkOrder.estimated_completion && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Fecha estimada
                      </p>
                      <p className="font-medium">
                        {new Date(
                          currentWorkOrder.estimated_completion
                        ).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Items de la orden */}
              <OrderItemsManager
                items={currentWorkOrder.items || []}
                onAddItem={async (itemData) => {
                  await addOrderItem(currentWorkOrder.id, itemData);
                  await fetchWorkOrderById(currentWorkOrder.id);
                }}
                onUpdateItem={async (itemId, itemData) => {
                  await updateOrderItem(currentWorkOrder.id, itemId, itemData);
                  await fetchWorkOrderById(currentWorkOrder.id);
                }}
                onDeleteItem={async (itemId) => {
                  await deleteOrderItem(currentWorkOrder.id, itemId);
                  await fetchWorkOrderById(currentWorkOrder.id);
                }}
                isLoading={loading}
              />

              {/* Totales */}
              <Card className="border-cyan-200 bg-cyan-50">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">
                        ${currentWorkOrder.subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IVA (16%):</span>
                      <span className="font-medium">
                        ${currentWorkOrder.tax.toFixed(2)}
                      </span>
                    </div>
                    {currentWorkOrder.discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Descuento:</span>
                        <span className="font-medium">
                          -${currentWorkOrder.discount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-cyan-600">
                        ${currentWorkOrder.total_amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Eliminar Orden */}
      <DeleteWorkOrderModal
        workOrder={deletingWorkOrder}
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingWorkOrder(null);
        }}
        onConfirm={handleConfirmDelete}
        isDeleting={loading}
      />
    </div>
  );
}

