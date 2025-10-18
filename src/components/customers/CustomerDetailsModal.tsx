'use client';

import { XMarkIcon, PhoneIcon, EnvelopeIcon, MapPinIcon, UserIcon } from '@heroicons/react/24/outline';
import type { Customer } from '@/lib/database/queries/customers';

interface CustomerDetailsModalProps {
  customer: Customer | null;
  onClose: () => void;
  isOpen: boolean;
}

export function CustomerDetailsModal({ customer, onClose, isOpen }: CustomerDetailsModalProps) {
  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative w-full max-w-2xl bg-bg-secondary rounded-xl border border-border shadow-2xl animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold text-lg">
                  {customer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text-primary">
                  {customer.name}
                </h2>
                <p className="text-sm text-text-secondary">
                  Detalles del cliente
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-text-secondary" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Información Personal */}
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center space-x-2">
                <UserIcon className="w-5 h-5" />
                <span>Información Personal</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-bg-tertiary rounded-lg p-4">
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Nombre completo
                  </label>
                  <p className="text-text-primary font-medium">
                    {customer.name}
                  </p>
                </div>
                <div className="bg-bg-tertiary rounded-lg p-4">
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    ID del cliente
                  </label>
                  <p className="text-text-primary font-mono text-sm">
                    {customer.id}
                  </p>
                </div>
              </div>
            </div>

            {/* Información de Contacto */}
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center space-x-2">
                <PhoneIcon className="w-5 h-5" />
                <span>Información de Contacto</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-bg-tertiary rounded-lg p-4">
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Email
                  </label>
                  <div className="flex items-center space-x-2">
                    <EnvelopeIcon className="w-4 h-4 text-text-secondary" />
                    <a
                      href={`mailto:${customer.email}`}
                      className="text-primary hover:text-primary-light transition-colors"
                    >
                      {customer.email}
                    </a>
                  </div>
                </div>
                <div className="bg-bg-tertiary rounded-lg p-4">
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Teléfono
                  </label>
                  <div className="flex items-center space-x-2">
                    <PhoneIcon className="w-4 h-4 text-text-secondary" />
                    <a
                      href={`tel:${customer.phone}`}
                      className="text-text-primary hover:text-primary transition-colors"
                    >
                      {customer.phone}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Dirección */}
            {customer.address && (
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center space-x-2">
                  <MapPinIcon className="w-5 h-5" />
                  <span>Dirección</span>
                </h3>
                <div className="bg-bg-tertiary rounded-lg p-4">
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Dirección
                  </label>
                  <p className="text-text-primary">{customer.address}</p>
                </div>
              </div>
            )}

            {/* Notas */}
            {customer.notes && (
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-4">
                  Notas
                </h3>
                <div className="bg-bg-tertiary rounded-lg p-4">
                  <p className="text-text-primary whitespace-pre-wrap">
                    {customer.notes}
                  </p>
                </div>
              </div>
            )}

            {/* Fechas */}
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Información del Sistema
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-bg-tertiary rounded-lg p-4">
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Fecha de registro
                  </label>
                  <p className="text-text-primary">
                    {new Date(customer.created_at).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="bg-bg-tertiary rounded-lg p-4">
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Última actualización
                  </label>
                  <p className="text-text-primary">
                    {new Date(customer.updated_at).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end p-6 border-t border-border">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-primary hover:bg-primary-light
                       rounded-lg text-bg-primary font-medium
                       transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
