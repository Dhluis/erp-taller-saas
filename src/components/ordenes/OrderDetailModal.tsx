'use client';

import { Modal } from '@/components/ui/Modal';
import type { WorkOrder } from '@/types/orders';
import { 
  User, 
  Phone, 
  Mail, 
  Car, 
  Calendar, 
  DollarSign, 
  FileText,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: WorkOrder | null;
}

export function OrderDetailModal({ isOpen, onClose, order }: OrderDetailModalProps) {
  if (!order) return null;

  // Formatear moneda
  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Formatear fecha
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  // Obtener color del estado
  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      reception: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      diagnosis: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      initial_quote: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      waiting_approval: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      disassembly: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      waiting_parts: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      assembly: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      testing: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      ready: 'bg-green-500/20 text-green-400 border-green-500/30',
      completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    };
    return colors[status] || 'bg-slate-500/20 text-slate-400';
  };

  // Traducir estado
  const translateStatus = (status: string) => {
    const translations: { [key: string]: string } = {
      reception: 'Recepción',
      diagnosis: 'Diagnóstico',
      initial_quote: 'Cotización',
      waiting_approval: 'Esperando Aprobación',
      disassembly: 'Desarmado',
      waiting_parts: 'Esperando Piezas',
      assembly: 'Armado',
      testing: 'Pruebas',
      ready: 'Listo',
      completed: 'Completado',
    };
    return translations[status] || status;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Orden de Trabajo`} size="lg">
      <div className="space-y-6">
        {/* Estado */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Estado actual:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
              {translateStatus(order.status)}
            </span>
          </div>
          <div className="text-sm text-slate-400">
            ID: {order.id.slice(0, 8)}...
          </div>
        </div>

        {/* Cliente y Vehículo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cliente */}
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              CLIENTE
            </h3>
            <div className="space-y-2">
              <p className="text-white font-medium">
                {order.customer?.name || 'Sin nombre'}
              </p>
              {order.customer?.phone && (
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Phone className="w-4 h-4 text-slate-400" />
                  {order.customer.phone}
                </div>
              )}
              {order.customer?.email && (
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Mail className="w-4 h-4 text-slate-400" />
                  {order.customer.email}
                </div>
              )}
            </div>
          </div>

          {/* Vehículo */}
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
              <Car className="w-4 h-4" />
              VEHÍCULO
            </h3>
            <div className="space-y-2">
              <p className="text-white font-medium">
                {order.vehicle?.brand} {order.vehicle?.model}
              </p>
              <div className="flex items-center gap-4 text-sm text-slate-300">
                <span>{order.vehicle?.year}</span>
                {order.vehicle?.color && (
                  <>
                    <span>•</span>
                    <span>{order.vehicle.color}</span>
                  </>
                )}
              </div>
              {order.vehicle?.license_plate && (
                <div className="inline-block px-3 py-1 bg-slate-700/50 border border-slate-600 rounded text-sm font-mono text-slate-200">
                  {order.vehicle.license_plate}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Descripción */}
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
          <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            DESCRIPCIÓN DEL SERVICIO
          </h3>
          <p className="text-slate-300 leading-relaxed">
            {order.description || 'Sin descripción'}
          </p>
        </div>

        {/* Costos */}
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
          <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            COSTOS
          </h3>
          <div className="space-y-2">
            {order.estimated_cost && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Costo Estimado:</span>
                <span className="text-slate-300">{formatCurrency(order.estimated_cost)}</span>
              </div>
            )}
            {order.subtotal && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Subtotal:</span>
                <span className="text-slate-300">{formatCurrency(order.subtotal)}</span>
              </div>
            )}
            {order.tax_amount && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">IVA (16%):</span>
                <span className="text-slate-300">{formatCurrency(order.tax_amount)}</span>
              </div>
            )}
            {order.discount_amount && order.discount_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Descuento:</span>
                <span className="text-green-400">-{formatCurrency(order.discount_amount)}</span>
              </div>
            )}
            {(order.total_amount || order.final_cost) && (
              <>
                <div className="border-t border-slate-700 my-2"></div>
                <div className="flex justify-between">
                  <span className="text-white font-semibold">Total:</span>
                  <span className="text-cyan-400 font-bold text-lg">
                    {formatCurrency(order.total_amount || order.final_cost)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Fechas */}
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
          <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            FECHAS
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <Clock className="w-3 h-3" />
                Entrada
              </div>
              <p className="text-sm text-slate-300">
                {formatDate(order.entry_date || order.created_at)}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <AlertCircle className="w-3 h-3" />
                Estimada
              </div>
              <p className="text-sm text-slate-300">
                {formatDate(order.estimated_completion)}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <CheckCircle2 className="w-3 h-3" />
                Completada
              </div>
              <p className="text-sm text-slate-300">
                {formatDate(order.completed_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Notas */}
        {order.notes && (
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              NOTAS
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              {order.notes}
            </p>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={() => console.log('Editar orden:', order.id)}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
          >
            Editar Orden
          </button>
        </div>
      </div>
    </Modal>
  );
}












