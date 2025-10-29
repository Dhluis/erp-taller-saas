'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OrderCard } from './OrderCard';
import type { WorkOrder, Customer, Vehicle } from '@/hooks/useWorkOrders';

interface KanbanColumnProps {
  column: {
    id: string;
    title: string;
    description: string;
    color: string;
    textColor: string;
  };
  orders: WorkOrder[];
  getDaysInStatus: (order: WorkOrder) => number;
  customers: Customer[];
  vehicles: Vehicle[];
  onOrderClick?: (order: WorkOrder) => void;
}

export function KanbanColumn({
  column,
  orders,
  getDaysInStatus,
  customers,
  vehicles,
  onOrderClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div className="w-80 flex-shrink-0">
      <Card 
        ref={setNodeRef}
        className={`h-full transition-colors ${
          isOver ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
        } ${column.color}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className={`text-sm font-medium ${column.textColor}`}>
              {column.title}
            </CardTitle>
            <Badge 
              variant="secondary" 
              className={`${column.textColor} bg-white/50`}
            >
              {orders.length}
            </Badge>
          </div>
          <p className={`text-xs ${column.textColor} opacity-75`}>
            {column.description}
          </p>
        </CardHeader>
        
        <CardContent className="pt-0">
          <SortableContext
            items={orders.map(order => order.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  customers={customers}
                  vehicles={vehicles}
                  getDaysInStatus={getDaysInStatus}
                  isDragging={false}
                  onClick={onOrderClick}
                />
              ))}
              
              {orders.length === 0 && (
                <div className="text-center py-8">
                  <p className={`text-sm ${column.textColor} opacity-50`}>
                    Sin órdenes
                  </p>
                </div>
              )}
            </div>
          </SortableContext>
        </CardContent>
      </Card>
    </div>
  );
}
