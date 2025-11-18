'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getAllWorkOrders, deleteWorkOrder } from '@/lib/database/queries/work-orders';
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs';
import { OrdersViewTabs } from '@/components/ordenes/OrdersViewTabs';
import CreateWorkOrderModal from '@/components/ordenes/CreateWorkOrderModal';
import { OrderDetailModal } from '@/components/ordenes/OrderDetailModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Search, FileText, Edit, Trash2, Eye, Plus, Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { WorkOrder, OrderStatus } from '@/types/orders';

// Mapeo de estados con colores
const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bgColor: string }> = {
  reception: { label: 'Recepción', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  diagnosis: { label: 'Diagnóstico', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  initial_quote: { label: 'Cotización', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  waiting_approval: { label: 'Aprobación', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  disassembly: { label: 'Desarmado', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  waiting_parts: { label: 'Esperando Piezas', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  assembly: { label: 'Armado', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  testing: { label: 'Pruebas', color: 'text-cyan-700', bgColor: 'bg-cyan-100' },
  ready: { label: 'Listo', color: 'text-green-700', bgColor: 'bg-green-100' },
  completed: { label: 'Completado', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  cancelled: { label: 'Cancelado', color: 'text-red-700', bgColor: 'bg-red-100' },
  pending: { label: 'Pendiente', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  in_progress: { label: 'En Proceso', color: 'text-blue-700', bgColor: 'bg-blue-100' },
};

export default function OrdenesPage() {
  const { organization } = useAuth();
  const router = useRouter();
  const organizationId = organization?.id || null;

  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [orderPendingDelete, setOrderPendingDelete] = useState<WorkOrder | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Cargar órdenes - función reutilizable (OPTIMIZADA)
  const loadOrders = useCallback(async () => {
    if (!organizationId) {
      console.log('⚠️ No hay organizationId');
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 Cargando órdenes...');
      console.log('🔍 organizationId:', organizationId);

      const data = await getAllWorkOrders(organizationId);

      console.log('📊 Órdenes recibidas:', data?.length);
      console.log('📋 Primera orden:', data?.[0]);

      const normalizedData = (data ?? []).map((order: any) => ({
        ...order,
        entry_date: order.entry_date ?? order.created_at ?? '',
      })) as WorkOrder[];

      setOrders(normalizedData as unknown as WorkOrder[]);
      setFilteredOrders(normalizedData as unknown as WorkOrder[]);
    } catch (error) {
      console.error('❌ Error cargando órdenes:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Filtrar órdenes
  useEffect(() => {
    let filtered = orders;

    // Filtro de búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.customer?.name?.toLowerCase().includes(query) ||
          order.vehicle?.brand?.toLowerCase().includes(query) ||
          order.vehicle?.model?.toLowerCase().includes(query) ||
          order.vehicle?.license_plate?.toLowerCase().includes(query) ||
          order.description?.toLowerCase().includes(query) ||
          order.id.toLowerCase().includes(query)
      );
    }

    // Filtro de estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    setFilteredOrders(filtered);
  }, [searchQuery, statusFilter, orders]);

  // Formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Formatear moneda
  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Truncar ID
  const truncateId = (id: string) => {
    return id.substring(0, 8) + '...';
  };

  const handleViewOrder = (order: WorkOrder) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  const handleEditOrder = (order: WorkOrder) => {
    router.push(`/ordenes/${order.id}`);
  };

  const handleRequestDelete = (order: WorkOrder) => {
    setOrderPendingDelete(order);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!orderPendingDelete) return;

    try {
      setIsDeleting(true);
      await deleteWorkOrder(orderPendingDelete.id);
      toast.success('Orden eliminada correctamente');
      setIsDeleteDialogOpen(false);
      setOrderPendingDelete(null);
      loadOrders();
    } catch (error) {
      console.error('Error eliminando orden:', error);
      toast.error('No se pudo eliminar la orden. Intenta nuevamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!organizationId) {
    return (
      <div className="flex items-center justify-center h-64">
          <p className="text-slate-400">Cargando organización...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumbs */}
      <StandardBreadcrumbs currentPage="Órdenes de Trabajo" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Órdenes de Trabajo</h1>
          <p className="text-slate-400 mt-1">Gestiona todas las órdenes del taller</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => loadOrders()}
            className="gap-2 border-slate-600 text-slate-200 hover:bg-slate-700/40"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </Button>
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-2 bg-cyan-500 hover:bg-cyan-600"
          >
            <Plus className="w-4 h-4" />
          Nueva Orden
          </Button>
        </div>
      </div>

      {/* Tabs de vista */}
      <OrdersViewTabs />

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Órdenes</p>
              <p className="text-2xl font-bold text-white">{orders.length}</p>
            </div>
            <FileText className="w-8 h-8 text-slate-500" />
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">En Proceso</p>
              <p className="text-2xl font-bold text-blue-400">
                {orders.filter((o) => !['completed', 'cancelled'].includes(o.status)).length}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Completadas</p>
              <p className="text-2xl font-bold text-green-400">
                {orders.filter((o) => o.status === 'completed').length}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Facturado</p>
              <p className="text-2xl font-bold text-cyan-400">
                {formatCurrency(
                  orders
                    .filter((o) => o.status === 'completed')
                    .reduce((sum, o) => sum + (o.total_amount || o.estimated_cost || 0), 0)
                )}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <span className="text-cyan-400 text-sm font-bold">$</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
            type="text"
              placeholder="Buscar por cliente, vehículo, placa o ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-900/50 border-slate-700 text-white"
          />
        </div>

          {/* Filtro de estado */}
        <select
          value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
            className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="all">Todos los estados</option>
          <option value="reception">Recepción</option>
          <option value="diagnosis">Diagnóstico</option>
          <option value="initial_quote">Cotización</option>
            <option value="waiting_approval">Aprobación</option>
          <option value="disassembly">Desarmado</option>
          <option value="waiting_parts">Esperando Piezas</option>
          <option value="assembly">Armado</option>
          <option value="testing">Pruebas</option>
          <option value="ready">Listo</option>
          <option value="completed">Completado</option>
        </select>

          {/* Exportar */}
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </Button>
        </div>

        {/* Resultados */}
        <div className="mt-4 text-sm text-slate-400">
          Mostrando {filteredOrders.length} de {orders.length} órdenes
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
              <p className="text-slate-400">Cargando órdenes...</p>
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-lg text-slate-300 mb-2">No se encontraron órdenes</p>
              <p className="text-sm text-slate-500">
                {searchQuery || statusFilter !== 'all'
                  ? 'Intenta ajustar los filtros'
                  : 'Crea tu primera orden de trabajo'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Vehículo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Servicio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-700/30 transition-colors"
                  >
                    {/* ID */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 text-slate-500 mr-2" />
                        <span className="text-sm font-mono text-slate-300" title={order.id}>
                          {truncateId(order.id)}
                        </span>
                      </div>
                    </td>

                    {/* Cliente */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-white">
                          {order.customer?.name || 'Sin cliente'}
                        </div>
                        {order.customer?.phone && (
                          <div className="text-xs text-slate-400">{order.customer.phone}</div>
                        )}
                      </div>
                    </td>

                    {/* Vehículo */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-white">
                          {order.vehicle?.brand} {order.vehicle?.model}
                        </div>
                        <div className="text-xs text-slate-400">
                          {order.vehicle?.license_plate || 'Sin placa'}
                        </div>
                      </div>
                    </td>

                    {/* Servicio */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-300 max-w-xs truncate" title={order.description}>
                        {order.description || 'Sin descripción'}
                      </div>
                    </td>

                    {/* Total */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-cyan-400">
                        {formatCurrency(order.total_amount || order.estimated_cost)}
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        className={`${STATUS_CONFIG[order.status]?.bgColor} ${STATUS_CONFIG[order.status]?.color} border-0`}
                      >
                        {STATUS_CONFIG[order.status]?.label || order.status}
                      </Badge>
                    </td>

                    {/* Fecha */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {formatDate(order.entry_date || order.created_at)}
                    </td>

                    {/* Acciones */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                          title="Ver detalles"
                          onClick={() => handleViewOrder(order)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                          title="Editar"
                          onClick={() => handleEditOrder(order)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          title="Eliminar"
                          onClick={() => handleRequestDelete(order)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de crear orden */}
      <CreateWorkOrderModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={() => {
          console.log('🔄 [OrdenesPage] onSuccess llamado, recargando órdenes...');
          console.log('🔄 [OrdenesPage] organizationId:', organizationId);
          // Forzar recarga después de un pequeño delay
          setTimeout(() => {
            console.log('🔄 [OrdenesPage] Ejecutando loadOrders...');
            loadOrders();
            console.log('✅ [OrdenesPage] loadOrders ejecutado');
          }, 500);
        }}
      />

      {/* Modal de detalles */}
      <OrderDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        order={selectedOrder}
        onUpdate={() => {
          loadOrders();
          setIsDetailModalOpen(false);
        }}
      />

      {/* Confirmación de eliminado */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#0F172A] border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar orden?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la orden{' '}
              <span className="font-semibold text-white">
                {orderPendingDelete?.customer?.name ?? 'Sin cliente'}
              </span>{' '}
              y todos sus datos. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}