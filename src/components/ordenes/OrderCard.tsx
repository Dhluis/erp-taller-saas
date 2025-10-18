'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { WorkOrder } from '@/types/orders';
import { Car, User, Calendar, DollarSign, GripVertical, Camera } from 'lucide-react';
import Image from 'next/image';

interface OrderCardProps {
  order: WorkOrder;
  onClick?: () => void;
}

export function OrderCard({ order, onClick }: OrderCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: order.id,
    data: {
      type: 'order',
      order
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short'
    });
  };

  // Formatear moneda
  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Por cotizar';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-slate-800/50 border border-slate-700/50 rounded-lg mb-3 overflow-hidden hover:bg-slate-800/70 hover:border-cyan-500/30 transition-all group ${
        isDragging ? 'ring-2 ring-cyan-500 shadow-lg shadow-cyan-500/50' : ''
      }`}
    >
      {/* Header - SOLO DRAGGABLE */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-between px-4 py-2 bg-slate-900/30 border-b border-slate-700/50 cursor-grab active:cursor-grabbing hover:bg-slate-800/50 transition-colors touch-none select-none"
        style={{ touchAction: 'none' }}
      >
        <span className="text-xs text-slate-500 font-medium pointer-events-none">
          {formatDate(order.entry_date || order.created_at)}
        </span>
        <GripVertical className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors pointer-events-none" />
      </div>

      {/* Contenido - SOLO CLICKEABLE */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        className="p-4 cursor-pointer hover:bg-slate-800/30 transition-colors"
      >
        {/* Cliente */}
        <div className="flex items-start gap-2 mb-3">
          <User className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {order.customer?.name || 'Cliente sin nombre'}
            </p>
            {order.customer?.phone && (
              <p className="text-xs text-slate-400 truncate">{order.customer.phone}</p>
            )}
          </div>
        </div>

        {/* Vehículo */}
        <div className="flex items-center gap-2 mb-3">
          <Car className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <p className="text-xs text-slate-300 truncate">
            {order.vehicle?.brand} {order.vehicle?.model} {order.vehicle?.year}
          </p>
        </div>

        {/* Placa */}
        {order.vehicle?.license_plate && (
          <div className="mb-3">
            <span className="inline-block px-2 py-0.5 bg-slate-700/50 border border-slate-600 rounded text-xs font-mono text-slate-300">
              {order.vehicle.license_plate}
            </span>
          </div>
        )}

        {/* Descripción */}
        <p className="text-xs text-slate-400 mb-3 line-clamp-2">
          {order.description}
        </p>

        {/* Preview de fotos */}
        {order.images && order.images.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <Camera className="h-3 w-3 text-slate-500" />
            <span className="text-xs text-slate-500">
              {order.images.length} foto{order.images.length !== 1 ? 's' : ''}
            </span>
            
            {/* Preview de primera foto */}
            {order.images[0] && (
              <div className="relative w-8 h-8 rounded overflow-hidden ml-auto border border-slate-600">
                <Image
                  src={order.images[0].url}
                  alt="Preview"
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              </div>
            )}
          </div>
        )}

        {/* Footer: Monto */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-700/50">
          <div className="flex items-center gap-1 text-sm font-semibold text-cyan-400">
            <DollarSign className="w-4 h-4" />
            <span>{formatCurrency(order.total_amount || order.estimated_cost)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}