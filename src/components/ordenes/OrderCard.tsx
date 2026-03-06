'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { WorkOrder } from '@/types/orders';
import { Car, User, DollarSign, GripVertical, Camera } from 'lucide-react';
import Image from 'next/image';
import { useOrgCurrency } from '@/lib/context/CurrencyContext';

const COLUMN_LABELS: Record<string, string> = {
  reception: 'Recepción',
  diagnosis: 'Diagnóstico',
  initial_quote: 'Cotización',
  waiting_approval: 'Aprobación',
  disassembly: 'Desarmado',
  waiting_parts: 'Piezas',
  assembly: 'Armado',
  testing: 'Pruebas',
  ready: 'Listo',
  completed: 'Completado',
};
const ALL_ORDER_STATUSES = Object.keys(COLUMN_LABELS);

interface OrderCardProps {
  order: WorkOrder;
  onClick?: () => void;
  onStatusChange?: (newStatus: string) => void;
}

export function OrderCard({ order, onClick, onStatusChange }: OrderCardProps) {
  const { currency } = useOrgCurrency()
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
      currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-slate-800/50 border border-slate-700/50 rounded-lg mb-3 overflow-hidden hover:bg-slate-800/70 hover:border-cyan-500/30 transition-all group ${
        isDragging ? 'ring-2 ring-cyan-500 shadow-lg shadow-cyan-500/50 z-50' : ''
      }`}
    >
      {/* Header - SOLO DRAGGABLE - área táctil ampliada para mobile */}
      <div
        {...attributes}
        {...listeners}
        onContextMenu={(e) => e.preventDefault()}
        className="flex items-center justify-between px-4 py-3 min-h-[48px] bg-slate-900/30 border-b border-slate-700/50 cursor-grab active:cursor-grabbing hover:bg-slate-800/50 transition-colors touch-none select-none"
        style={{ touchAction: 'none', userSelect: 'none', WebkitTouchCallout: 'none' }}
      >
        <span className="text-xs text-slate-500 font-medium pointer-events-none">
          {formatDate(order.entry_date || order.created_at)}
        </span>
        <GripVertical className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors pointer-events-none flex-shrink-0" />
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

        {/* Mobile: Mover a (solo en touch / móvil) */}
        {onStatusChange && (
          <div
            className="md:hidden pt-2 pb-1"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <select
              value=""
              onChange={(e) => { if (e.target.value) onStatusChange(e.target.value) }}
              className="w-full text-xs bg-slate-700 border border-slate-600 text-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="" disabled>→ Mover a...</option>
              {ALL_ORDER_STATUSES.filter(s => s !== order.status).map(s => (
                <option key={s} value={s}>{COLUMN_LABELS[s]}</option>
              ))}
            </select>
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