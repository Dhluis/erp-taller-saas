'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import type { WorkOrder, OrderStatus, KanbanColumn as KanbanColumnType } from '@/types/orders';
import { KanbanColumn } from './KanbanColumn';
import { OrderCard } from './OrderCard';
// ✅ Removido: getAllWorkOrders y updateWorkOrder - ahora se usan API routes
import { FileText, CalendarIcon } from 'lucide-react';
import { OrderDetailModal } from './OrderDetailModal';
import { WorkOrderDetailsModal } from '@/components/work-orders/WorkOrderDetailsModal';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface KanbanBoardProps {
  organizationId: string;
  searchQuery?: string;
  refreshKey?: number;
  onCreateOrder?: () => void;
}

// Definición de columnas del Kanban
const KANBAN_COLUMNS: Omit<KanbanColumnType, 'orders'>[] = [
  {
    id: 'reception',
    title: 'Recepción',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30',
  },
  {
    id: 'diagnosis',
    title: 'Diagnóstico',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
  {
    id: 'initial_quote',
    title: 'Cotización',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 'waiting_approval',
    title: 'Esperando Aprobación',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  {
    id: 'disassembly',
    title: 'Desarmado',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
  {
    id: 'waiting_parts',
    title: 'Esperando Piezas',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  {
    id: 'assembly',
    title: 'Armado',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/30',
  },
  {
    id: 'testing',
    title: 'Pruebas',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
  },
  {
    id: 'ready',
    title: 'Listo',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  {
    id: 'completed',
    title: 'Completado',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
];

export function KanbanBoard({ organizationId, searchQuery = '', refreshKey, onCreateOrder }: KanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumnType[]>([]);
  const [activeOrder, setActiveOrder] = useState<WorkOrder | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para filtro de fechas
  const [dateFilter, setDateFilter] = useState<'all' | '7days' | '30days' | 'month' | 'custom'>('all');
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({
    from: undefined,
    to: undefined
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 0, // Sin distancia mínima - activa inmediatamente
      },
    })
  );

  // ✅ DIAGNOSTICS ELIMINADO para reducir llamadas duplicadas
  // Las verificaciones se hacen en loadOrders() si es necesario

  // Función para cargar órdenes (OPTIMIZADA) - Memoizada con useCallback
  const loadOrders = useCallback(async () => {
    // ✅ FIX: Verificar que organizationId esté disponible antes de cargar
    if (!organizationId) {
      console.log('⚠️ [KanbanBoard] No hay organizationId, saltando carga');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 [KanbanBoard] loadOrders() ejecutándose...');
      console.log('🔄 [KanbanBoard] organizationId:', organizationId);
      console.log('🔄 [KanbanBoard] refreshKey:', refreshKey);
      console.log('🔄 [KanbanBoard] Timestamp:', new Date().toISOString());
      
      // ✅ FIX: Limpiar cache antes de cargar cuando refreshKey cambia o es la primera carga
      if (refreshKey > 0 || columns.length === 0) {
        const { clearOrdersCache } = await import('@/lib/database/queries/work-orders');
        clearOrdersCache(organizationId);
        console.log('🧹 [KanbanBoard] Cache limpiado para organizationId:', organizationId);
      }
      
      // ✅ Usar API route en lugar de query directa
      const response = await fetch('/api/work-orders', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar órdenes');
      }

      const result = await response.json();
      const orders = result.success ? result.data : [];
      console.log('📊 [KanbanBoard] Órdenes recibidas de API:', orders?.length || 0);
      
      // ✅ LOGS DETALLADOS PARA DIAGNÓSTICO
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 KANBAN - ÓRDENES ANTES DE FILTRAR');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Total de órdenes obtenidas de DB:', orders.length);
      console.log('Filtro de fecha activo:', dateFilter);
      console.log('Organization ID:', organizationId);
      
      // Función para obtener rango de fechas según el filtro (dentro del callback)
      const getDateRange = () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        
        switch (dateFilter) {
          case '7days':
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 7);
            sevenDaysAgo.setHours(0, 0, 0, 0);
            return { from: sevenDaysAgo, to: today };
            
          case '30days':
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 30);
            thirtyDaysAgo.setHours(0, 0, 0, 0);
            return { from: thirtyDaysAgo, to: today };
            
          case 'month':
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            return { from: firstDayOfMonth, to: lastDayOfMonth };
            
          case 'custom':
            return customDateRange.from && customDateRange.to
              ? { from: customDateRange.from, to: customDateRange.to }
              : null;
            
          case 'all':
          default:
            return null;
        }
      };
      
      // Obtener rango de fechas
      const dateRange = getDateRange();
      
      // Filtrar por rango de fechas si existe
      let filteredByDate = orders;
      // ✅ OPTIMIZACIÓN: Solo logs en desarrollo
      const isDev = process.env.NODE_ENV === 'development';
      
      if (dateRange && dateRange.from && dateRange.to) {
        if (isDev) {
          console.log('Rango de fechas aplicado:', {
            from: dateRange.from.toISOString(),
            to: dateRange.to.toISOString()
          });
        }
        
        filteredByDate = orders.filter(order => {
          // Usar entry_date si está disponible, sino created_at
          const orderDateStr = order.entry_date || order.created_at;
          if (!orderDateStr) return false; // Si no hay fecha, excluir
          const orderDate = new Date(orderDateStr);
          return orderDate >= dateRange.from! && orderDate <= dateRange.to!;
        });
      }
      
      // Filtrar por búsqueda si existe
      const filteredOrders = searchQuery
        ? filteredByDate.filter(order => {
            const searchLower = searchQuery.toLowerCase();
            return (
              order.customer?.name?.toLowerCase().includes(searchLower) ||
              order.customer?.phone?.includes(searchQuery) ||
              order.vehicle?.brand?.toLowerCase().includes(searchLower) ||
              order.vehicle?.model?.toLowerCase().includes(searchLower) ||
              order.vehicle?.license_plate?.toLowerCase().includes(searchLower) ||
              order.description?.toLowerCase().includes(searchLower)
            );
          })
        : filteredByDate;
      
      if (isDev) {
        console.log('Órdenes después de filtros:', filteredOrders.length);
      }
      
      // Organizar órdenes por columna
      const newColumns = KANBAN_COLUMNS.map(col => ({
        ...col,
        orders: filteredOrders.filter(order => order.status === col.id),
      }));
      
      setColumns(newColumns);
      
      // Retornar órdenes para que el componente padre pueda actualizar selectedOrder
      return filteredOrders;
    } catch (err) {
      console.error('Error cargando órdenes:', err);
      setError('Error al cargar las órdenes');
      return [];
    } finally {
      setLoading(false);
    }
  }, [organizationId, dateFilter, customDateRange, searchQuery, refreshKey]);

  // ✅ FIX: Cargar órdenes al montar y cuando cambien los filtros, solo si organizationId está disponible
  // IMPORTANTE: Este useEffect se ejecuta cuando organizationId cambia de undefined a un valor
  // Ahora también verificamos que organizationId sea una cadena válida (no null/undefined)
  useEffect(() => {
    if (organizationId && typeof organizationId === 'string' && organizationId.length > 0) {
      console.log('🔄 [KanbanBoard] useEffect triggered - organizationId disponible:', organizationId);
      console.log('🔄 [KanbanBoard] Ejecutando loadOrders...');
      // ✅ FIX: Agregar un pequeño delay para asegurar que el estado se haya propagado
      const timeoutId = setTimeout(() => {
        loadOrders();
      }, 150);
      return () => clearTimeout(timeoutId);
    } else {
      console.log('⚠️ [KanbanBoard] organizationId no disponible todavía, esperando...', { organizationId });
    }
  }, [organizationId, loadOrders]);

  // Cargar órdenes cuando cambie refreshKey (para botón Actualizar y después de crear orden)
  useEffect(() => {
    if (organizationId && typeof organizationId === 'string' && organizationId.length > 0 && refreshKey > 0) {
      console.log('🔄 [KanbanBoard] useEffect triggered - refreshKey:', refreshKey);
      // ✅ FIX: Agregar un pequeño delay para asegurar que el estado se haya propagado
      const timeoutId = setTimeout(() => {
        loadOrders();
      }, 150);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, organizationId]);

  // Manejar inicio de arrastre
  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    console.log('🎯 [handleDragStart] Iniciando drag:', active.id);
    console.log('🎯 [handleDragStart] active.data:', active.data);
    
    const order = columns
      .flatMap(col => col.orders)
      .find(order => order.id === active.id);
    
    if (order) {
      console.log('✅ [handleDragStart] Orden encontrada:', order.customer?.name);
      setActiveOrder(order);
    } else {
      console.warn('⚠️ [handleDragStart] Orden no encontrada');
      console.warn('⚠️ [handleDragStart] IDs disponibles:', columns.flatMap(col => col.orders.map(o => o.id)));
      setActiveOrder(null);
    }
  }

  // Manejar fin de arrastre
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    
    setActiveOrder(null);

    if (!over) return;

    const orderId = active.id as string;
    const newStatus = over.id as OrderStatus;

    console.log('🔄 [handleDragEnd] Debug info:');
    console.log('🔄 [handleDragEnd] active.id:', active.id);
    console.log('🔄 [handleDragEnd] over.id:', over.id);
    console.log('🔄 [handleDragEnd] orderId (from active.id):', orderId);
    console.log('🔄 [handleDragEnd] newStatus (from over.id):', newStatus);
    console.log('🔄 [handleDragEnd] typeof orderId:', typeof orderId);
    console.log('🔄 [handleDragEnd] typeof newStatus:', typeof newStatus);

    // Validar que over.id sea un status válido (no un UUID de otra orden)
    const validStatuses = ['reception', 'diagnosis', 'initial_quote', 'waiting_approval', 'disassembly', 'waiting_parts', 'assembly', 'testing', 'ready', 'completed'];
    if (!validStatuses.includes(newStatus)) {
      console.warn('⚠️ [handleDragEnd] over.id no es un status válido, ignorando drop');
      return;
    }

    // Encontrar la orden y su estado actual
    const currentColumn = columns.find(col => 
      col.orders.some(order => order.id === orderId)
    );
    
    console.log('🔄 [handleDragEnd] currentColumn:', currentColumn?.id);
    console.log('🔄 [handleDragEnd] newStatus === currentColumn.id:', newStatus === currentColumn?.id);
    
    if (!currentColumn || currentColumn.id === newStatus) return;

    try {
      // Actualizar estado local PRIMERO para feedback inmediato
      setColumns(prevColumns => {
        const newColumns = prevColumns.map(col => {
          // Remover de columna actual
          if (col.id === currentColumn.id) {
            return {
              ...col,
              orders: col.orders.filter(order => order.id !== orderId),
            };
          }
          
          // Agregar a nueva columna
          if (col.id === newStatus) {
            const order = currentColumn.orders.find(o => o.id === orderId);
            if (order) {
              return {
                ...col,
                orders: [...col.orders, { ...order, status: newStatus }],
              };
            }
          }
          
          return col;
        });
        
        console.log('🔄 [handleDragEnd] Columnas actualizadas localmente');
        return newColumns;
      });

      // Actualizar estado en la base de datos DESPUÉS usando API route
      console.log('🔄 [handleDragEnd] Llamando API route PUT /api/work-orders/[id] con:', { orderId, newStatus });
      
      const response = await fetch(`/api/work-orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al actualizar orden');
      }

      const result = await response.json();
      console.log('✅ [handleDragEnd] Orden actualizada en DB:', result.data);
      console.log('✅ [handleDragEnd] Orden movida exitosamente');

      // NO recargar órdenes - confiar en la actualización local y DB
      // Esto evita que la recarga sobrescriba los cambios visuales
    } catch (err) {
      console.error('❌ [handleDragEnd] Error al mover orden:', err);
      console.error('❌ [handleDragEnd] Error details:', err instanceof Error ? err.message : String(err));
      
      // Revertir cambios locales en caso de error
      // Guardar la orden antes de moverla para poder revertir
      const orderToRevert = currentColumn.orders.find(o => o.id === orderId);
      
      setColumns(prevColumns => {
        const newColumns = prevColumns.map(col => {
          // Revertir: volver a agregar a columna original
          if (col.id === currentColumn.id && orderToRevert) {
            // Verificar que no esté ya en la columna
            if (!col.orders.some(o => o.id === orderId)) {
              return {
                ...col,
                orders: [...col.orders, orderToRevert],
              };
            }
          }
          
          // Revertir: remover de nueva columna
          if (col.id === newStatus) {
            return {
              ...col,
              orders: col.orders.filter(order => order.id !== orderId),
            };
          }
          
          return col;
        });
        
        return newColumns;
      });
      
      setError('Error al actualizar el estado de la orden');
    }
  }

  // Manejar click en orden
  function handleOrderClick(orderId: string) {
    console.log('📋 Click en orden:', orderId);
    
    // Encontrar la orden completa
    const order = columns
      .flatMap(col => col.orders)
      .find(order => order.id === orderId);
    
    if (order) {
      console.log('✅ Orden encontrada:', order);
      setSelectedOrder(order);
      setDetailsModalOpen(true);
    } else {
      console.error('❌ Orden no encontrada:', orderId);
    }
  }

  // Cerrar modal
  function handleCloseModal() {
    setIsModalOpen(false);
    setSelectedOrder(null);
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando órdenes...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={loadOrders}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Empty state cuando no hay órdenes
  const totalOrders = columns.reduce((sum, col) => sum + col.orders.length, 0);

  return (
    <>
      {/* Filtros de fecha - Siempre visibles para todos los usuarios */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button
          size="sm"
          variant={dateFilter === 'all' ? 'default' : 'outline'}
          onClick={() => {
            setDateFilter('all');
            setCustomDateRange({ from: undefined, to: undefined });
          }}
        >
          Todas
        </Button>

        <Button
          size="sm"
          variant={dateFilter === '7days' ? 'default' : 'outline'}
          onClick={() => setDateFilter('7days')}
        >
          Últimos 7 días
        </Button>

        <Button
          size="sm"
          variant={dateFilter === '30days' ? 'default' : 'outline'}
          onClick={() => setDateFilter('30days')}
        >
          Últimos 30 días
        </Button>

        <Button
          size="sm"
          variant={dateFilter === 'month' ? 'default' : 'outline'}
          onClick={() => setDateFilter('month')}
        >
          Este mes
        </Button>

        {/* Botón Personalizado con Calendar */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant={dateFilter === 'custom' ? 'default' : 'outline'}
              className="justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {customDateRange.from && customDateRange.to ? (
                <>
                  {format(customDateRange.from, 'dd/MM/yyyy', { locale: es })} - {format(customDateRange.to, 'dd/MM/yyyy', { locale: es })}
                </>
              ) : (
                'Personalizado'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-700" align="start">
            <Calendar
              mode="range"
              selected={{
                from: customDateRange.from,
                to: customDateRange.to
              }}
              onSelect={(range) => {
                if (range?.from || range?.to) {
                  setCustomDateRange({
                    from: range?.from,
                    to: range?.to
                  });
                  if (range?.from && range?.to) {
                    setDateFilter('custom');
                  }
                }
              }}
              locale={es}
              numberOfMonths={typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 2}
              disabled={(date) => date > new Date()}
              fromDate={new Date(2020, 0, 1)}
              toDate={new Date()}
              initialFocus
            />
            
            {/* Botón para limpiar fechas */}
            {(customDateRange.from || customDateRange.to) && (
              <div className="p-3 border-t border-slate-700">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setCustomDateRange({ from: undefined, to: undefined });
                    setDateFilter('all');
                  }}
                >
                  Limpiar fechas
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Indicador de filtro activo */}
        {dateFilter !== 'all' && (
          <span className="text-sm text-slate-400 ml-2">
            Filtro activo: {
              dateFilter === '7days' ? 'Últimos 7 días' :
              dateFilter === '30days' ? 'Últimos 30 días' :
              dateFilter === 'month' ? 'Este mes' :
              'Personalizado'
            }
          </span>
        )}
      </div>

      {/* Empty state cuando no hay órdenes - Mostrar después de los filtros */}
      {totalOrders === 0 && !loading && !error && (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-12 h-12 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No hay órdenes todavía
            </h3>
            <p className="text-slate-400 mb-6">
              Comienza creando tu primera orden de trabajo
            </p>
            <button
              onClick={() => onCreateOrder?.()}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors font-medium"
            >
              Crear Primera Orden
            </button>
          </div>
        </div>
      )}

      {/* Kanban Board - Solo mostrar si hay órdenes o está cargando */}
      {(totalOrders > 0 || loading || error) && (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-4 min-h-[400px]">
          {columns.map(column => (
            <KanbanColumn
              key={column.id}
              column={column}
              onOrderClick={handleOrderClick}
            />
          ))}
        </div>

      {/* Overlay durante el arrastre */}
      <DragOverlay>
        {activeOrder ? (
          <div className="rotate-2 scale-105 shadow-2xl shadow-cyan-500/20 border-2 border-cyan-500/50">
            <OrderCard order={activeOrder} />
          </div>
        ) : null}
      </DragOverlay>

        {/* Modal de detalles */}
        <WorkOrderDetailsModal
          order={selectedOrder}
          open={detailsModalOpen}
          onOpenChange={setDetailsModalOpen}
          onUpdate={async () => {
            // Recargar órdenes después de actualizar
            const reloadedOrders = await loadOrders()
            
            // ✅ Actualizar selectedOrder con la orden recargada
            if (selectedOrder?.id && reloadedOrders) {
              const updatedOrder = reloadedOrders.find(order => order.id === selectedOrder.id)
              
              if (updatedOrder) {
                console.log('✅ [KanbanBoard] Actualizando selectedOrder con orden recargada')
                setSelectedOrder(updatedOrder)
              }
            }
          }}
        />
      </DndContext>
      )}
    </>
  );
}
