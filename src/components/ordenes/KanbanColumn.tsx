'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { KanbanColumn as KanbanColumnType } from '@/types/orders';
import { OrderCard } from './OrderCard';

interface KanbanColumnProps {
  column: KanbanColumnType;
  onOrderClick?: (orderId: string) => void;
}

export function KanbanColumn({ column, onOrderClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div className="flex-shrink-0 w-80">
      {/* Header */}
      <div className={`${column.bgColor} ${column.borderColor} border rounded-lg p-3 mb-3`}>
        <div className="flex items-center justify-between">
          <h3 className={`font-semibold ${column.color}`}>{column.title}</h3>
          <span className={`${column.bgColor} ${column.color} px-2 py-0.5 rounded-full text-xs font-medium`}>
            {column.orders.length}
          </span>
        </div>
      </div>

      {/* Zona de drop */}
      <div
        ref={setNodeRef}
        className={`min-h-[200px] max-h-[calc(100vh-280px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent rounded-lg border-2 border-dashed transition-all duration-200 p-2 ${
          isOver 
            ? 'border-cyan-500/70 bg-cyan-500/10 shadow-lg shadow-cyan-500/20' 
            : 'border-transparent hover:border-slate-600/50'
        }`}
      >
        <SortableContext
          items={column.orders.map(order => order.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.orders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onClick={() => onOrderClick?.(order.id)}
            />
          ))}
        </SortableContext>

        {/* Empty state */}
        {column.orders.length === 0 && (
          <div className={`text-center py-8 text-sm border-2 border-dashed rounded-lg transition-all duration-200 ${
            isOver 
              ? 'border-cyan-500/70 bg-cyan-500/10 text-cyan-400' 
              : 'border-slate-600/30 bg-slate-800/20 text-slate-500'
          }`}>
            <div className="mb-2">{isOver ? '🎯' : '📋'}</div>
            <p>{isOver ? 'Suelta aquí' : 'Sin órdenes'}</p>
            <p className={`text-xs mt-1 ${isOver ? 'text-cyan-300' : 'text-slate-600'}`}>
              {isOver ? 'La orden se moverá aquí' : 'Arrastra aquí para agregar'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
