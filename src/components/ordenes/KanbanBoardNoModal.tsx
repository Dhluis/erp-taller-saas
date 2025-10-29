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
import { FileText } from 'lucide-react';

interface KanbanBoardProps {
  organizationId: string;
}

// Definición de columnas del Kanban
const KANBAN_COLUMNS: Omit<KanbanColumnType, 'orders'>[] = [
  { id: 'reception', title: 'Recepción', color: 'text-slate-400', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/30' },
  { id: 'diagnosis', title: 'Diagnóstico', color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30' },
  { id: 'initial_quote', title: 'Cotización', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  { id: 'waiting_approval', title: 'Esperando Aprobación', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30' },
  { id: 'disassembly', title: 'Desarmado', color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
  { id: 'waiting_parts', title: 'Esperando Piezas', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' },
  { id: 'assembly', title: 'Armado', color: 'text-indigo-400', bgColor: 'bg-indigo-500/10', borderColor: 'border-indigo-500/30' },
  { id: 'testing', title: 'Pruebas', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/30' },
  { id: 'ready', title: 'Listo', color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30' },
  { id: 'completed', title: 'Completado', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
];

export function KanbanBoardNoModal({ organizationId }: KanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumnType[]>([]);
  const [activeOrder, setActiveOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1, // Muy sensible para activación rápida
      },
    })
  );

  // Cargar órdenes
  async function loadOrders() {
    try {
      console.log('🔄 [KanbanBoardNoModal] Cargando órdenes...');
      setLoading(true);
      setError(null);

      const orders = await getAllOrders(organizationId);
      console.log('✅ [KanbanBoardNoModal] Órdenes cargadas:', orders.length);

      // Agrupar órdenes por estado
      const columnsWithOrders = KANBAN_COLUMNS.map(column => ({
        ...column,
        orders: orders.filter(order => order.status === column.id)
      }));

      setColumns(columnsWithOrders);
    } catch (err) {
      console.error('❌ [KanbanBoardNoModal] Error cargando órdenes:', err);
      setError('Error cargando órdenes');
    } finally {
      setLoading(false);
    }
  }

  // Cargar órdenes al montar el componente
  useEffect(() => {
    loadOrders();
  }, [organizationId]);

  // Manejar inicio de arrastre
  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const order = columns
      .flatMap(col => col.orders)
      .find(order => order.id === active.id);
    
    if (order) {
      setActiveOrder(order);
    }
  }

  // Manejar fin de arrastre
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    
    if (!over) {
      setActiveOrder(null);
      return;
    }

    const orderId = active.id as string;
    const newStatus = over.id as OrderStatus;

    // Validar que over.id sea un status válido (no un UUID de otra orden)
    const validStatuses = ['reception', 'diagnosis', 'initial_quote', 'waiting_approval', 'disassembly', 'waiting_parts', 'assembly', 'testing', 'ready', 'completed'];
    if (!validStatuses.includes(newStatus)) {
      console.warn('⚠️ [handleDragEnd] over.id no es un status válido, ignorando drop');
      setActiveOrder(null);
      return;
    }

    // Actualizar estado local inmediatamente
    setColumns(prevColumns => 
      prevColumns.map(column => ({
        ...column,
        orders: column.orders.filter(order => order.id !== orderId)
      })).map(column => 
        column.id === newStatus 
          ? { ...column, orders: [...column.orders, { ...columns.flatMap(col => col.orders).find(order => order.id === orderId)!, status: newStatus }] }
          : column
      )
    );

    setActiveOrder(null);

    try {
      await updateOrderStatus(orderId, newStatus);
      console.log('✅ [handleDragEnd] Orden actualizada:', orderId, '→', newStatus);
    } catch (err) {
      console.error('❌ [handleDragEnd] Error actualizando orden:', err);
      // Recargar órdenes en caso de error
      loadOrders();
    }
  }

  // Manejar click en orden
  function handleOrderClick(orderId: string) {
    console.log('📋 Click en orden:', orderId);
    alert(`Click en orden: ${orderId}`);
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
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
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

  // Empty state
  const totalOrders = columns.reduce((sum, col) => sum + col.orders.length, 0);
  if (totalOrders === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-white mb-2">Sin órdenes de trabajo</h3>
          <p className="text-slate-400 mb-6">
            Aún no hay órdenes de trabajo registradas. Crea la primera orden para comenzar.
          </p>
          <button 
            onClick={() => console.log('Crear primera orden')}
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors font-medium"
          >
            Crear Primera Orden
          </button>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {columns.map((column) => (
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
    </DndContext>
  );
}















