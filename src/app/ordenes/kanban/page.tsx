'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RefreshCw, Plus, List } from 'lucide-react';
import { OrderCard } from './components/OrderCard';
import { KanbanColumn } from './components/KanbanColumn';
import { WorkOrderDetailsModal } from '@/components/work-orders/WorkOrderDetailsModal';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useWorkOrders } from '@/hooks/useWorkOrders';
import type { WorkOrder } from '@/types/orders';

// Estados del Kanban para transmisiones automáticas
const KANBAN_COLUMNS = [
  {
    id: 'reception',
    title: 'Recepción',
    description: 'Orden recibida y registrada',
    color: 'bg-gray-100 border-gray-300',
    textColor: 'text-gray-700',
  },
  {
    id: 'diagnosis',
    title: 'Diagnóstico',
    description: 'Evaluación inicial del problema',
    color: 'bg-blue-100 border-blue-300',
    textColor: 'text-blue-700',
  },
  {
    id: 'initial_quote',
    title: 'Cotización Inicial',
    description: 'Estimación de costos y tiempo',
    color: 'bg-purple-100 border-purple-300',
    textColor: 'text-purple-700',
  },
  {
    id: 'waiting_approval',
    title: 'Esperando Aprobación',
    description: 'Esperando aprobación del cliente',
    color: 'bg-yellow-100 border-yellow-300',
    textColor: 'text-yellow-700',
  },
  {
    id: 'disassembly',
    title: 'Desarme',
    description: 'Desmontaje de la transmisión',
    color: 'bg-orange-100 border-orange-300',
    textColor: 'text-orange-700',
  },
  {
    id: 'waiting_parts',
    title: 'Espera de Piezas',
    description: 'Esperando piezas de repuesto',
    color: 'bg-red-100 border-red-300',
    textColor: 'text-red-700',
  },
  {
    id: 'assembly',
    title: 'Armado',
    description: 'Reensamblaje de la transmisión',
    color: 'bg-indigo-100 border-indigo-300',
    textColor: 'text-indigo-700',
  },
  {
    id: 'testing',
    title: 'Pruebas',
    description: 'Pruebas de funcionamiento',
    color: 'bg-cyan-100 border-cyan-300',
    textColor: 'text-cyan-700',
  },
  {
    id: 'ready',
    title: 'Listo para Entrega',
    description: 'Transmisión lista para entrega',
    color: 'bg-green-100 border-green-300',
    textColor: 'text-green-700',
  },
] as const;

type KanbanStatus = typeof KANBAN_COLUMNS[number]['id'] | 'completed' | 'cancelled';

export default function KanbanPage() {
  // Modal functionality restored
  const router = useRouter();
  const { organization } = useAuth();
  const [activeOrder, setActiveOrder] = useState<WorkOrder | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const organizationId = organization?.organization_id || null;

  const {
    workOrders,
    customers,
    vehicles,
    loadData,
    updateOrderStatus,
    loading: isLoading,
    error
  } = useWorkOrders();


  // Configurar sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,  // Menor distancia = más sensible
        delay: 100,    // Pequeño delay para diferenciar click de drag
        tolerance: 5,
      },
    })
  );

  // Cargar datos al montar el componente
  useEffect(() => {
    if (organizationId) {
      loadData();
    }
  }, [loadData, organizationId]);

  // Manejar errores
  useEffect(() => {
    if (error) {
      toast.error('Error', {
        description: error,
      });
    }
  }, [error]);

  // Agrupar órdenes por estado
  const ordersByStatus = useCallback(() => {
    if (!workOrders) return {};
    
    return workOrders.reduce((acc, order) => {
      const status = order.status as KanbanStatus;
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(order);
      return acc;
    }, {} as Record<KanbanStatus, WorkOrder[]>);
  }, [workOrders]);

  // Calcular días en estado actual
  const getDaysInStatus = useCallback((order: WorkOrder) => {
    const now = new Date();
    const updatedAt = new Date(order.updated_at);
    const diffTime = Math.abs(now.getTime() - updatedAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, []);

  // Manejar inicio del drag
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const order = workOrders?.find(o => o.id === active.id);
    setActiveOrder(order || null);
  }, [workOrders]);

  // Manejar fin del drag
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveOrder(null);

    if (!over) return;

    const orderId = active.id as string;
    const newStatus = over.id as KanbanStatus;

    // Verificar si el estado cambió
    const order = workOrders?.find(o => o.id === orderId);
    if (!order || order.status === newStatus) return;

    try {
      setIsUpdating(true);
      
      // Actualizar estado en Supabase
      await updateOrderStatus(orderId, newStatus);
      
      toast.success('Estado actualizado', {
        description: `Orden movida a ${KANBAN_COLUMNS.find(c => c.id === newStatus)?.title || newStatus}`,
      });

      // Recargar datos
      await loadData();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Error', {
        description: 'No se pudo actualizar el estado de la orden',
      });
    } finally {
      setIsUpdating(false);
    }
  }, [workOrders, updateOrderStatus, loadData]);

  // Crear orden
  const handleCreateOrder = useCallback(() => {
    router.push('/ordenes');
  }, [router]);

  // Refrescar datos
  const handleRefresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // Abrir modal de detalles
  const handleOpenOrderDetails = useCallback((order: WorkOrder) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  }, []);

  const ordersByStatusData = ordersByStatus();

  if (!organizationId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-400">Cargando organización...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Breadcrumbs */}
      <StandardBreadcrumbs
        currentPage="Kanban"
        parentPages={[
          { label: "Órdenes", href: "/ordenes" }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Kanban de Órdenes</h1>
          <p className="text-slate-400 mt-1">Gestión visual de órdenes de trabajo</p>
        </div>
        <div className="flex gap-2">
          <Link href="/ordenes">
            <Button variant="outline">
              <List className="mr-2 h-4 w-4" />
              Vista Lista
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isUpdating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button
            onClick={handleCreateOrder}
            disabled={isUpdating}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Orden
          </Button>
        </div>
      </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando Kanban...</p>
            </div>
          </div>
        )}

        {/* Kanban Board */}
        {!isLoading && (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToWindowEdges]}
          >
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-6 min-w-max">
                {KANBAN_COLUMNS.map((column) => {
                  const columnOrders = ordersByStatusData[column.id] || [];
                  
                  return (
                    <KanbanColumn
                      key={column.id}
                      column={column}
                      orders={columnOrders}
                      getDaysInStatus={getDaysInStatus}
                      customers={customers}
                      vehicles={vehicles}
                      onOrderClick={handleOpenOrderDetails}
                    />
                  );
                })}
              </div>
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
              {activeOrder && (
                <div className="transform rotate-3 opacity-90">
                  <OrderCard
                    order={activeOrder as any}
                    customers={customers}
                    vehicles={vehicles}
                    getDaysInStatus={getDaysInStatus}
                    isDragging={true}
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}

      {/* Empty State */}
      {!isLoading && workOrders?.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <Plus className="h-12 w-12 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            No hay órdenes de trabajo
          </h3>
          <p className="text-slate-400 mb-4">
            Comienza creando tu primera orden de trabajo
          </p>
          <Button onClick={handleCreateOrder}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Orden
          </Button>
        </div>
      )}

      {/* Modal de Detalles */}
      <WorkOrderDetailsModal
        order={selectedOrder}
        open={isDetailModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsDetailModalOpen(false);
            setSelectedOrder(null);
          }
        }}
      />
    </div>
  );
}
