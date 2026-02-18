'use client';

// Force dynamic rendering to avoid cache issues
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs';
import { OrdersViewTabs } from '@/components/ordenes/OrdersViewTabs';
import CreateWorkOrderModal from '@/components/ordenes/CreateWorkOrderModal';
import { WorkOrderDetailsModal } from '@/components/work-orders/WorkOrderDetailsModal';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Search, FileText, Edit, Trash2, Eye, Plus, Download, RefreshCw, User } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useWorkOrders, type WorkOrder } from '@/hooks/useWorkOrders';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useOrganization, useSession } from '@/lib/context/SessionContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useOrgCurrency } from '@/lib/context/CurrencyContext';
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

function OrdenesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { organizationId, loading: orgLoading, ready } = useOrganization();
  const { profile } = useSession();
  const permissions = usePermissions();
  const { currency } = useOrgCurrency();

  // Support multiple status separated by comma (e.g. ?filter_status=in_progress,diagnosis,testing)
  const statusFilterParam = searchParams.get('filter_status') || 'all';
  const initialStatusFilter: OrderStatus | 'all' | string =
    statusFilterParam === 'all' ? 'all' : statusFilterParam;

  // ==========================================
  // STATE LOCAL
  // ==========================================
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all' | string>(initialStatusFilter);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [orderPendingDelete, setOrderPendingDelete] = useState<WorkOrder | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [assignedUsersMap, setAssignedUsersMap] = useState<Record<string, any>>({});
  const [showExportModal, setShowExportModal] = useState(false);

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

  // Actualizar filtro de status en el backend (soporta uno o varios separados por coma)
  useEffect(() => {
    if (statusFilter !== 'all') {
      setFilters({ status: String(statusFilter) });
    } else {
      setFilters({});
    }
    // ✅ El hook useWorkOrders ya dispara automáticamente el fetch cuando cambian los filtros
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
        
        // ✅ Buscar en la tabla users (no system_users) y usar full_name
        const { data: users, error } = await supabase
          .from('users')
          .select('id, full_name, role, email, organization_id')
          .in('id', assignedUserIds)
          .eq('organization_id', organizationId || ''); // ✅ Filtrar por organización para seguridad
        
        if (!error && users) {
          const usersMap = users.reduce((acc: Record<string, any>, user: any) => {
            acc[user.id] = {
              id: user.id,
              full_name: user.full_name,
              first_name: user.full_name?.split(' ')[0] || '', // Para compatibilidad con el render
              last_name: user.full_name?.split(' ').slice(1).join(' ') || '', // Para compatibilidad con el render
              role: user.role,
              email: user.email
            };
            return acc;
          }, {});
          setAssignedUsersMap(usersMap);
          console.log('✅ [Ordenes] Usuarios asignados cargados:', Object.keys(usersMap).length);
        } else if (error) {
          console.error('❌ [Ordenes] Error cargando usuarios asignados:', error);
        }
      } catch (error) {
        console.error('❌ [Ordenes] Error cargando usuarios:', error);
      }
    };

    loadUsers();
  }, [workOrders]);

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleViewOrder = async (order: WorkOrder) => {
    try {
      // Cargar orden completa con todos los datos (imágenes, notas, items, etc.)
      const fullOrder = await fetchWorkOrderById(order.id);
      if (fullOrder) {
        setSelectedOrder(fullOrder);
        setIsDetailModalOpen(true);
      } else {
        // Si no se puede cargar completa, usar la orden básica
        setSelectedOrder(order);
        setIsDetailModalOpen(true);
      }
    } catch (error) {
      console.error('Error loading order details:', error);
      // Aún así mostrar el modal con la orden básica
      setSelectedOrder(order);
      setIsDetailModalOpen(true);
    }
  };

  const handleEditOrder = async (order: WorkOrder) => {
    try {
      // Cargar orden completa con todos los datos (imágenes, notas, items, etc.)
      const fullOrder = await fetchWorkOrderById(order.id);
      if (fullOrder) {
        setSelectedOrder(fullOrder);
        setIsDetailModalOpen(true);
      } else {
        // Si no se puede cargar completa, usar la orden básica
        setSelectedOrder(order);
        setIsDetailModalOpen(true);
      }
    } catch (error) {
      console.error('Error loading order details:', error);
      // Aún así mostrar el modal con la orden básica
      setSelectedOrder(order);
      setIsDetailModalOpen(true);
    }
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

  const exportToCSV = () => {
    if (!workOrders.length) {
      toast.error('No hay órdenes para exportar');
      return;
    }

    const headers = ['# Orden', 'Cliente', 'Vehículo', 'Estado', 'Fecha Entrada', 'Total', 'Descripción'];
    const statusMap: Record<string, string> = {
      reception: 'Recepción', diagnosis: 'Diagnóstico', initial_quote: 'Cotización',
      waiting_approval: 'Esp. Aprobación', disassembly: 'Desarmado', waiting_parts: 'Esp. Piezas',
      assembly: 'Armado', testing: 'Pruebas', ready: 'Listo', completed: 'Completado', cancelled: 'Cancelado'
    };

    const rows = workOrders.map(o => [
      (o as any).order_number || o.id.slice(0, 8),
      o.customer?.name || '',
      o.vehicle ? `${o.vehicle.brand} ${o.vehicle.model} ${o.vehicle.year || ''}`.trim() : '',
      statusMap[o.status] || o.status,
      new Date(o.entry_date).toLocaleDateString('es-MX'),
      `$${(o.total_amount || 0).toFixed(2)}`,
      o.description || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ordenes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${workOrders.length} órdenes exportadas a CSV`);
  };

  const exportToPDF = async () => {
    if (!workOrders.length) {
      toast.error('No hay órdenes para exportar');
      return;
    }

    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const statusMap: Record<string, string> = {
      reception: 'Recepción', diagnosis: 'Diagnóstico', initial_quote: 'Cotización',
      waiting_approval: 'Esp. Aprobación', disassembly: 'Desarmado', waiting_parts: 'Esp. Piezas',
      assembly: 'Armado', testing: 'Pruebas', ready: 'Listo', completed: 'Completado', cancelled: 'Cancelado'
    };

    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(18);
    doc.text('Reporte de Órdenes de Trabajo', 14, 16);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-MX')}  |  Total: ${workOrders.length} órdenes`, 14, 24);

    autoTable(doc, {
      startY: 30,
      head: [['# Orden', 'Cliente', 'Vehículo', 'Estado', 'Fecha Entrada', 'Total']],
      body: workOrders.map(o => [
        (o as any).order_number || o.id.slice(0, 8),
        o.customer?.name || '',
        o.vehicle ? `${o.vehicle.brand} ${o.vehicle.model} ${o.vehicle.year || ''}`.trim() : '',
        statusMap[o.status] || o.status,
        new Date(o.entry_date).toLocaleDateString('es-MX'),
        `$${(o.total_amount || 0).toFixed(2)}`
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    });

    doc.save(`ordenes_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success(`${workOrders.length} órdenes exportadas a PDF`);
  };

  const handleExport = () => setShowExportModal(true);

  const formatCurrency = (amount?: number | null) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
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
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as OrderStatus | 'all' | string)}
            disabled={loading}
          >
            <SelectTrigger className="w-[200px] bg-slate-900/50 border-slate-700 text-white hover:bg-slate-800/50 focus:ring-2 focus:ring-cyan-500">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem 
                value="all" 
                className="text-white hover:bg-slate-800 focus:bg-slate-800 cursor-pointer"
              >
                Todos los estados
              </SelectItem>
              {statusFilter.includes(',') && (
                <SelectItem
                  value={statusFilter}
                  className="text-white hover:bg-slate-800 focus:bg-slate-800 cursor-pointer"
                >
                  Varios estados
                </SelectItem>
              )}
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <SelectItem
                  key={key}
                  value={key}
                  className="text-white hover:bg-slate-800 focus:bg-slate-800 cursor-pointer"
                >
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
                                  {assignedUser.full_name || `${assignedUser.first_name || ''} ${assignedUser.last_name || ''}`.trim() || 'Sin nombre'}
                                </div>
                                <div className="text-xs text-slate-400">
                                  {assignedUser.role === 'ADMIN' ? 'Administrador' :
                                    assignedUser.role === 'ASESOR' ? 'Asesor' :
                                    assignedUser.role === 'MECANICO' ? 'Mecánico' :
                                    assignedUser.role || 'Sin rol'}
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

      {/* Modal de detalles - Usando el mismo modal completo que Kanban */}
      <WorkOrderDetailsModal
        order={selectedOrder}
        open={isDetailModalOpen}
        onOpenChange={(open) => {
          setIsDetailModalOpen(open);
          if (!open) setSelectedOrder(null);
        }}
        userId={profile?.id}
        onUpdate={async () => {
          console.log('🔄 [OrdenesPage] onUpdate llamado - recargando órdenes...');
          // Recargar órdenes después de actualizar
          await refresh();
          
          // ✅ Actualizar selectedOrder con la orden recargada si existe
          if (selectedOrder?.id) {
            try {
              const updatedOrder = await fetchWorkOrderById(selectedOrder.id);
              if (updatedOrder) {
                console.log('✅ [OrdenesPage] Actualizando selectedOrder con orden recargada');
                setSelectedOrder(updatedOrder);
              }
            } catch (error) {
              console.warn('⚠️ [OrdenesPage] Error al recargar orden:', error);
            }
          }
          console.log('✅ [OrdenesPage] onUpdate completado');
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

      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Exportar Órdenes</DialogTitle>
            <DialogDescription className="text-gray-400">
              {workOrders.length} órdenes con los filtros actuales
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 border-gray-600 hover:bg-gray-700 text-white"
              onClick={() => { exportToCSV(); setShowExportModal(false); }}
            >
              <Download className="w-4 h-4 text-green-400" />
              <div className="text-left">
                <div className="font-medium">CSV / Excel</div>
                <div className="text-xs text-gray-400">Compatible con Excel, Google Sheets</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 border-gray-600 hover:bg-gray-700 text-white"
              onClick={() => { exportToPDF(); setShowExportModal(false); }}
            >
              <Download className="w-4 h-4 text-red-400" />
              <div className="text-left">
                <div className="font-medium">PDF</div>
                <div className="text-xs text-gray-400">Reporte en formato PDF landscape</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function OrdenesPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500" />
      </div>
    }>
      <OrdenesPageContent />
    </Suspense>
  );
}
