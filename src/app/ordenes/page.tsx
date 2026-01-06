'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs';
import { OrdersViewTabs } from '@/components/ordenes/OrdersViewTabs';
import CreateWorkOrderModal from '@/components/ordenes/CreateWorkOrderModal';
import { OrderDetailModal } from '@/components/ordenes/OrderDetailModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
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
import { Search, FileText, Edit, Trash2, Eye, Plus, Download, RefreshCw, User } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkOrders, type WorkOrder } from '@/hooks/useWorkOrders';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useOrganization, useSession } from '@/lib/context/SessionContext';
import { usePermissions } from '@/hooks/usePermissions';
import type { OrderStatus } from '@/types/orders';

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
  const router = useRouter();
  const { organizationId, loading: orgLoading, ready } = useOrganization();
  const { profile } = useSession();
  const permissions = usePermissions();

  // ==========================================
  // STATE LOCAL
  // ==========================================
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [orderPendingDelete, setOrderPendingDelete] = useState<WorkOrder | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [assignedUsersMap, setAssignedUsersMap] = useState<Record<string, any>>({});

  // ==========================================
  // ✅ DEBOUNCE DE BÚSQUEDA
  // ==========================================
  const debouncedSearch = useDebouncedValue(searchQuery, 500);

  // ==========================================
  // ✅ HOOK CON PAGINACIÓN
  // ==========================================
  const {
    workOrders,
    loading,
    error,
    pagination,
    goToPage,
    changePageSize,
    setSearch,
    setFilters,
    refresh,
    deleteWorkOrder: deleteWorkOrderFromHook,
    fetchWorkOrderById,
  } = useWorkOrders({
    page: 1,
    pageSize: 10, // 10 para work orders (tienen más info)
    sortBy: 'created_at',
    sortOrder: 'desc',
    autoLoad: true,
    enableCache: false,
  });

  // ==========================================
  // ✅ EFFECTS
  // ==========================================
  
  // Actualizar búsqueda en el backend cuando cambia el debounce
  useEffect(() => {
    setSearch(debouncedSearch);
  }, [debouncedSearch, setSearch]);

  // Actualizar filtro de status en el backend
  useEffect(() => {
    if (statusFilter !== 'all') {
      setFilters({ status: statusFilter });
    } else {
      setFilters({});
    }
  }, [statusFilter, setFilters]);

  // Mostrar error si hay uno
  useEffect(() => {
    if (error) {
      toast.error('Error al cargar órdenes', { description: error });
    }
  }, [error]);

  // Cargar usuarios asignados para mostrar en la tabla
  useEffect(() => {
    if (workOrders.length === 0) {
      setAssignedUsersMap({});
      return;
    }

    const assignedUserIds = [...new Set(
      workOrders
        .map((order: any) => order.assigned_to)
        .filter((id: string | null | undefined) => id)
    )] as string[];

    if (assignedUserIds.length === 0) {
      setAssignedUsersMap({});
      return;
    }

    const loadUsers = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: users, error } = await supabase
          .from('system_users')
          .select('id, first_name, last_name, role, email')
          .in('id', assignedUserIds);
        
        if (!error && users) {
          const usersMap = users.reduce((acc: Record<string, any>, user: any) => {
            acc[user.id] = user;
            return acc;
          }, {});
          setAssignedUsersMap(usersMap);
        }
      } catch (error) {
        console.error('Error cargando usuarios:', error);
      }
    };

    loadUsers();
  }, [workOrders]);

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleViewOrder = async (order: WorkOrder) => {
    try {
      const fullOrder = await fetchWorkOrderById(order.id);
      if (fullOrder) {
        setSelectedOrder(fullOrder);
        setIsDetailModalOpen(true);
      }
    } catch (error) {
      toast.error('Error al cargar detalles de la orden');
    }
  };

  const handleEditOrder = (order: WorkOrder) => {
    router.push(`/ordenes/${order.id}`);
  };

  const handleDeleteClick = (order: WorkOrder) => {
    setOrderPendingDelete(order);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!orderPendingDelete) return;

    setIsDeleting(true);
    try {
      const success = await deleteWorkOrderFromHook(orderPendingDelete.id);
      
      if (success) {
        toast.success('Orden eliminada exitosamente');
        setIsDeleteDialogOpen(false);
        setOrderPendingDelete(null);
        await refresh();
      } else {
        throw new Error('No se pudo eliminar la orden');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('Error al eliminar la orden');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRefresh = () => {
    refresh();
    toast.success('Lista actualizada');
  };

  const handleExport = () => {
    toast.info('Función de exportación en desarrollo');
  };

  const formatCurrency = (amount?: number | null) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const truncateId = (id: string) => {
    return id.substring(0, 8) + '...';
  };

  // ==========================================
  // LOADING STATE
  // ==========================================
  
  if (!organizationId || orgLoading || !ready) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando organización...</p>
          {organizationId && !ready && (
            <p className="text-xs text-slate-500 mt-2">Estabilizando organización...</p>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumbs */}
      <StandardBreadcrumbs currentPage="Órdenes de Trabajo" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Órdenes de Trabajo</h1>
          <p className="text-slate-400 mt-1">Gestiona todas las órdenes del taller</p>
          
          {/* ✅ Stats de paginación */}
          {!loading && pagination && pagination.total > 0 && (
            <p className="text-sm text-slate-500 mt-1">
              Total: {pagination.total} órdenes | Página {pagination.page || 1} de {pagination.totalPages || 1}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
            className="gap-2 border-slate-600 text-slate-200 hover:bg-slate-700/40"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </Button>

          {permissions.canCreate('work_orders') && (
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              className="gap-2 bg-cyan-500 hover:bg-cyan-600"
            >
              <Plus className="w-4 h-4" />
              Nueva Orden
            </Button>
          )}
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
              <p className="text-2xl font-bold text-white">{pagination.total}</p>
            </div>
            <FileText className="w-8 h-8 text-slate-500" />
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">En Proceso</p>
              <p className="text-2xl font-bold text-blue-400">
                {workOrders.filter((o) => !['completed', 'cancelled'].includes(o.status)).length}
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
                {workOrders.filter((o) => o.status === 'completed').length}
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
                  workOrders
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
              disabled={loading}
            />
          </div>

          {/* Filtro de estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
            className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            disabled={loading}
          >
            <option value="all">Todos los estados</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>

          {/* Limpiar filtros */}
          {(searchQuery || statusFilter !== 'all') && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="border-slate-600 text-slate-200 hover:bg-slate-700/40"
            >
              Limpiar filtros
            </Button>
          )}

          {/* Exportar */}
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </Button>
        </div>

        {/* Resultados */}
        <div className="mt-4 text-sm text-slate-400">
          Mostrando {workOrders.length} de {pagination.total} órdenes
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
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-red-400 mb-4">❌ {error}</div>
            <Button onClick={refresh} variant="outline">
              Reintentar
            </Button>
          </div>
        ) : workOrders.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-lg text-slate-300 mb-2">No se encontraron órdenes</p>
              <p className="text-sm text-slate-500">
                {searchQuery || statusFilter !== 'all'
                  ? 'Intenta ajustar los filtros'
                  : 'Crea tu primera orden de trabajo'}
              </p>
              {!searchQuery && statusFilter === 'all' && permissions.canCreate('work_orders') && (
                <Button onClick={() => setIsCreateModalOpen(true)} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primera Orden
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
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
                      Empleado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider min-w-[100px]">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider sticky right-0 bg-slate-800/95 z-20 min-w-[150px] border-l border-slate-700">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {workOrders.map((order) => {
                    const assignedUser = order.assigned_to ? assignedUsersMap[order.assigned_to] : null;
                    return (
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

                        {/* Empleado */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {assignedUser ? (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-400" />
                              <div>
                                <div className="text-sm text-white">
                                  {assignedUser.first_name} {assignedUser.last_name}
                                </div>
                                <div className="text-xs text-slate-400">
                                  {assignedUser.role === 'ADMIN' ? 'Administrador' :
                                    assignedUser.role === 'ASESOR' ? 'Asesor' :
                                    assignedUser.role === 'MECANICO' ? 'Mecánico' :
                                    assignedUser.role}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-500 italic">Sin asignar</span>
                          )}
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
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-slate-800/95 z-20 border-l border-slate-700/50">
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
                            {(permissions.isAdmin || permissions.isAdvisor) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                title="Eliminar"
                                onClick={() => handleDeleteClick(order)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* ✅ Componente de Paginación */}
            {pagination && pagination.totalPages && pagination.totalPages > 1 && (
              <Pagination
                currentPage={pagination.page || 1}
                totalPages={pagination.totalPages || 1}
                pageSize={pagination.pageSize || 10}
                total={pagination.total || 0}
                onPageChange={goToPage}
                onPageSizeChange={changePageSize}
                loading={loading}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            )}
          </>
        )}
      </div>

      {/* Modal de crear orden */}
      <CreateWorkOrderModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={() => {
          refresh();
        }}
      />

      {/* Modal de detalles */}
      <OrderDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        onUpdate={() => {
          refresh();
          setIsDetailModalOpen(false);
        }}
      />

      {/* Confirmación de eliminado */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#0F172A] border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar orden de trabajo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La orden y todos sus datos asociados serán eliminados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
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
