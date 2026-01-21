'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, DollarSign, Car, User, Wrench } from 'lucide-react';
import type { WorkOrder, Customer, Vehicle } from '@/hooks/useWorkOrders';

interface OrderCardProps {
  order: WorkOrder;
  customers: Customer[];
  vehicles: Vehicle[];
  getDaysInStatus: (order: WorkOrder) => number;
  isDragging?: boolean;
  onClick?: (order: WorkOrder) => void;
}

export function OrderCard({
  order,
  customers,
  vehicles,
  getDaysInStatus,
  isDragging = false,
  onClick,
}: OrderCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: order.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Buscar datos relacionados
  const customer = customers.find(c => c.id === order.customer_id);
  const vehicle = vehicles.find(v => v.id === order.vehicle_id);
  
  // Calcular días en estado actual
  const daysInStatus = getDaysInStatus(order);
  
  // Truncar UUID para mostrar como número de orden
  const orderNumber = order.id.substring(0, 8).toUpperCase();
  
  // Formatear monto estimado
  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'Sin estimar';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        console.log('OrderCard clicked:', { orderId: order.id, isDragging, isSortableDragging, hasOnClick: !!onClick });
        // Solo navegar si no estamos arrastrando
        if (!isDragging && !isSortableDragging) {
          e.stopPropagation();
          if (onClick) {
            console.log('Calling onClick function');
            onClick(order);
          } else {
            console.log('No onClick function, navigating directly');
            window.location.href = `/ordenes/${order.id}`;
          }
        }
      }}
      className={`
        cursor-grab active:cursor-grabbing transition-all duration-200
        hover:shadow-md hover:scale-[1.02]
        ${isDragging || isSortableDragging ? 'opacity-50 shadow-lg' : ''}
        ${isDragging ? 'rotate-3' : ''}
      `}
    >
      <Card>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs font-mono">
              #{orderNumber}
            </Badge>
            <Badge 
              variant="secondary" 
              className={`
                text-xs
                ${daysInStatus > 7 ? 'bg-red-100 text-red-700' : 
                  daysInStatus > 3 ? 'bg-yellow-100 text-yellow-700' : 
                  'bg-green-100 text-green-700'}
              `}
            >
              <Clock className="h-3 w-3 mr-1" />
              {daysInStatus}d
            </Badge>
          </div>
        </div>

        {/* Cliente */}
        <div className="flex items-center gap-2 mb-2">
          <User className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-900 truncate">
            {customer?.name || 'Cliente no encontrado'}
          </span>
        </div>

        {/* Vehículo */}
        <div className="flex items-center gap-2 mb-3">
          <Car className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600 truncate">
            {vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Vehículo no encontrado'}
            {vehicle?.year && ` (${vehicle.year})`}
          </span>
        </div>

        {/* Descripción */}
        {order.description && (
          <div className="mb-3">
            <p className="text-sm text-gray-700 line-clamp-2">
              {order.description}
            </p>
          </div>
        )}

        {/* Mecánico asignado */}
        {(order as any).assigned_user ? (
          <div className="flex items-center gap-2 mb-2 pt-2 border-t border-gray-100">
            <Wrench className="h-4 w-4 text-cyan-600" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-cyan-700 truncate">
                {(order as any).assigned_user.full_name || 'Sin nombre'}
              </span>
              <div className="text-xs text-gray-500">
                {(order as any).assigned_user.role === 'MECANICO' ? 'Mecánico' :
                  (order as any).assigned_user.role === 'ASESOR' ? 'Asesor' :
                  (order as any).assigned_user.role === 'ADMIN' ? 'Administrador' :
                  (order as any).assigned_user.role || 'Sin rol'}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-2 pt-2 border-t border-gray-100">
            <Wrench className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500 italic">Sin asignar</span>
          </div>
        )}

        {/* Monto estimado */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <DollarSign className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-700">
            {formatCurrency(order.estimated_cost)}
          </span>
        </div>

        {/* Fecha de entrada */}
        <div className="text-xs text-gray-500 mt-2">
          Entrada: {new Date(order.entry_date).toLocaleDateString('es-MX')}
        </div>
      </CardContent>
      </Card>
    </div>
  );
}
