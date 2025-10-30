'use client';

import { useState, useEffect } from 'react';
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
import { getAllOrders, updateOrderStatus } from '@/lib/database/queries/orders';
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

export function KanbanBoard({ organizationId, searchQuery = '', refreshKey }: KanbanBoardProps) {
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
        distance: 5, // Reducido para mayor sensibilidad
        delay: 0,
        tolerance: 5,
      },
    })
  );

  // Función para obtener rango de fechas según el filtro
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

  // Cargar órdenes al montar y cuando cambien los filtros
  useEffect(() => {
    loadOrders();
  }, [organizationId, dateFilter, customDateRange, searchQuery, refreshKey]);


  // Función de diagnóstico
  const runDiagnostics = async () => {
    console.log('🔍 [DIAGNOSTIC] Iniciando diagnósticos...');
    console.log('🔍 [DIAGNOSTIC] organizationId:', organizationId);
    
    try {
      // Verificar variables de entorno
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      console.log('🔍 [DIAGNOSTIC] Supabase URL configurada:', !!supabaseUrl);
      console.log('🔍 [DIAGNOSTIC] Supabase Key configurada:', !!supabaseKey);
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('❌ [DIAGNOSTIC] Variables de entorno faltantes');
        setError('Variables de entorno de Supabase no configuradas');
        return;
      }
      
      // Probar conexión básica
      const { getAllOrders } = await import('@/lib/database/queries/orders');
      const testOrders = await getAllOrders(organizationId);
      console.log('✅ [DIAGNOSTIC] Query exitosa, órdenes obtenidas:', testOrders.length);
      
    } catch (err) {
      console.error('❌ [DIAGNOSTIC] Error en diagnóstico:', err);
      setError(`Error de diagnóstico: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    }
  };

  // Ejecutar diagnósticos en desarrollo
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      runDiagnostics();
    }
  }, [organizationId]);

  // Función para cargar órdenes
  async function loadOrders() {
    try {
      setLoading(true);
      setError(null);
      
      const orders = await getAllOrders(organizationId);
      
      // ✅ LOGS DETALLADOS PARA DIAGNÓSTICO
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 KANBAN - ÓRDENES ANTES DE FILTRAR');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Total de órdenes obtenidas de DB:', orders.length);
      console.log('Filtro de fecha activo:', dateFilter);
      console.log('Organization ID:', organizationId);
      
      // Obtener rango de fechas
      const dateRange = getDateRange();
      
      // Filtrar por rango de fechas si existe
      let filteredByDate = orders;
      if (dateRange && dateRange.from && dateRange.to) {
        console.log('Rango de fechas aplicado:', {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString()
        });
        
        const beforeFilter = orders.length;
        filteredByDate = orders.filter(order => {
          const orderDate = new Date(order.created_at);
          const matches = orderDate >= dateRange.from! && orderDate <= dateRange.to!;
          if (!matches) {
            console.log(`  ❌ Orden ${order.id.substring(0, 8)}... excluida (fecha: ${orderDate.toISOString()})`);
          }
          return matches;
        });
        
        console.log(`Órdenes filtradas por fecha: ${beforeFilter} → ${filteredByDate.length} (eliminadas: ${beforeFilter - filteredByDate.length})`);
      } else {
        console.log('Sin filtro de fecha aplicado');
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
      
      console.log('Órdenes después de búsqueda:', filteredOrders.length);
      console.log('Distribución por estado:');
      KANBAN_COLUMNS.forEach(col => {
        const count = filteredOrders.filter(o => o.status === col.id).length;
        if (count > 0) {
          console.log(`  ${col.title}: ${count}`);
        }
      });
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Organizar órdenes por columna
      const newColumns = KANBAN_COLUMNS.map(col => ({
        ...col,
        orders: filteredOrders.filter(order => order.status === col.id),
      }));
      
      setColumns(newColumns);
    } catch (err) {
      console.error('Error cargando órdenes:', err);
      setError('Error al cargar las órdenes');
    } finally {
      setLoading(false);
    }
  }

  // Manejar inicio de arrastre
  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    console.log('🎯 [handleDragStart] Iniciando drag:', active.id);
    
    const order = columns
      .flatMap(col => col.orders)
      .find(order => order.id === active.id);
    
    if (order) {
      console.log('✅ [handleDragStart] Orden encontrada:', order.customer?.name);
      setActiveOrder(order);
    } else {
      console.warn('⚠️ [handleDragStart] Orden no encontrada');
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
      // Actualizar estado en la base de datos
      console.log('🔄 [handleDragEnd] Llamando updateOrderStatus con:', { orderId, newStatus });
      await updateOrderStatus(orderId, newStatus);

      // Actualizar estado local inmediatamente
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
        
        return newColumns;
      });

      console.log('✅ Orden movida exitosamente');
    } catch (err) {
      console.error('❌ Error al mover orden:', err);
      setError('Error al actualizar el estado de la orden');
      // Recargar órdenes en caso de error
      loadOrders();
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
  
  if (totalOrders === 0 && !loading && !error) {
    return (
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
            onClick={() => console.log('Crear orden')}
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors font-medium"
          >
            Crear Primera Orden
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Filtros de fecha */}
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
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
          onUpdate={() => {
            // Recargar órdenes después de actualizar
            loadOrders()
          }}
        />
      </DndContext>
    </>
  );
}
