'use client';

import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { Customer } from '@/lib/database/queries/customers';

interface DeleteCustomerModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function DeleteCustomerModal({
  customer,
  isOpen,
  onConfirm,
  onCancel,
  loading = false,
}: DeleteCustomerModalProps) {
  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative w-full max-w-md bg-bg-secondary rounded-xl border border-error/30 shadow-2xl animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-border">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-error/20 flex items-center justify-center flex-shrink-0">
                <ExclamationTriangleIcon className="w-6 h-6 text-error" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-primary">
                  Eliminar Cliente
                </h3>
                <p className="text-sm text-text-secondary mt-1">
                  Esta acción no se puede deshacer
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              disabled={loading}
              className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors disabled:opacity-50"
            >
              <XMarkIcon className="w-5 h-5 text-text-secondary" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="bg-error/10 border border-error/30 rounded-lg p-4 mb-4">
              <p className="text-text-primary">
                ¿Estás seguro que deseas eliminar a{' '}
                <span className="font-bold">
                  {customer.name}
                </span>?
              </p>
            </div>

            <div className="space-y-2 text-sm text-text-secondary">
              <p>Se eliminará:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Información del cliente</li>
                <li>Historial de órdenes</li>
                <li>Vehículos asociados</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-6 py-2.5 bg-bg-tertiary hover:bg-bg-primary border border-border
                       rounded-lg text-text-secondary hover:text-text-primary
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="px-6 py-2.5 bg-error hover:bg-error/90
                       rounded-lg text-white font-medium
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Eliminando...</span>
                </>
              ) : (
                <span>Eliminar Cliente</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
