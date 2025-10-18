'use client';

import { XMarkIcon, TruckIcon, UserIcon, CalendarIcon, TagIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import type { Vehicle } from '@/lib/database/queries/vehicles';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface VehicleDetailsModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
}

export function VehicleDetailsModal({ vehicle, isOpen, onClose }: VehicleDetailsModalProps) {
  if (!isOpen || !vehicle) return null;

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
          className="relative w-full max-w-4xl bg-bg-secondary rounded-xl border border-border shadow-2xl animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <TruckIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text-primary">
                  {vehicle.brand} {vehicle.model}
                </h2>
                <p className="text-sm text-text-secondary">
                  {vehicle.license_plate} • {vehicle.year}
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
            {/* Información del Vehículo */}
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center space-x-2">
                <TruckIcon className="w-5 h-5" />
                <span>Información del Vehículo</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-bg-tertiary rounded-lg p-4">
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Marca y Modelo
                  </label>
                  <p className="text-text-primary font-medium">
                    {vehicle.brand} {vehicle.model}
                  </p>
                </div>
                <div className="bg-bg-tertiary rounded-lg p-4">
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Año
                  </label>
                  <p className="text-text-primary font-medium">
                    {vehicle.year}
                  </p>
                </div>
                <div className="bg-bg-tertiary rounded-lg p-4">
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Placa
                  </label>
                  <p className="text-text-primary font-mono text-sm">
                    {vehicle.license_plate}
                  </p>
                </div>
                {vehicle.color && (
                  <div className="bg-bg-tertiary rounded-lg p-4">
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Color
                    </label>
                    <p className="text-text-primary font-medium">
                      {vehicle.color}
                    </p>
                  </div>
                )}
                {vehicle.vin && (
                  <div className="bg-bg-tertiary rounded-lg p-4 md:col-span-2">
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      VIN (Número de Serie)
                    </label>
                    <p className="text-text-primary font-mono text-sm">
                      {vehicle.vin}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Información del Cliente */}
            {vehicle.customer && (
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center space-x-2">
                  <UserIcon className="w-5 h-5" />
                  <span>Cliente Propietario</span>
                </h3>
                <div className="bg-bg-tertiary rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        Nombre
                      </label>
                      <p className="text-text-primary font-medium">
                        {vehicle.customer.name}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        Email
                      </label>
                      <a
                        href={`mailto:${vehicle.customer.email}`}
                        className="text-primary hover:text-primary-light transition-colors block truncate"
                      >
                        {vehicle.customer.email}
                      </a>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        Teléfono
                      </label>
                      <a
                        href={`tel:${vehicle.customer.phone}`}
                        className="text-text-primary hover:text-primary-light transition-colors block"
                      >
                        {vehicle.customer.phone}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Kilometraje */}
            {vehicle.mileage && (
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-4">
                  Kilometraje
                </h3>
                <div className="bg-bg-tertiary rounded-lg p-4">
                  <p className="text-text-primary">
                    {vehicle.mileage.toLocaleString()} km
                  </p>
                </div>
              </div>
            )}

            {/* Información del Sistema */}
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center space-x-2">
                <WrenchScrewdriverIcon className="w-5 h-5" />
                <span>Información del Sistema</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-bg-tertiary rounded-lg p-4">
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Fecha de Registro
                  </label>
                  <p className="text-text-primary">
                    {vehicle.created_at
                      ? format(new Date(vehicle.created_at), 'dd MMMM yyyy HH:mm', { locale: es })
                      : 'N/A'}
                  </p>
                </div>
                <div className="bg-bg-tertiary rounded-lg p-4">
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Última Actualización
                  </label>
                  <p className="text-text-primary">
                    {vehicle.updated_at
                      ? format(new Date(vehicle.updated_at), 'dd MMMM yyyy HH:mm', { locale: es })
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end p-6 border-t border-border">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-primary hover:bg-primary-light rounded-lg text-bg-primary font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
