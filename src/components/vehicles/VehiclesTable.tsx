'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  PencilIcon,
  TrashIcon,
  EyeIcon,
  TruckIcon,
  CalendarIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import type { Vehicle } from '@/lib/database/queries/vehicles';

interface VehiclesTableProps {
  vehicles: Vehicle[];
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
  onView: (vehicle: Vehicle) => void;
  loading?: boolean;
  hasFilters?: boolean;
}

export function VehiclesTable({ 
  vehicles, 
  onEdit, 
  onDelete, 
  onView,
  loading = false,
  hasFilters = false
}: VehiclesTableProps) {
  
  // ✅ OPTIMIZACIÓN: useMemo para cálculos pesados
  const processedVehicles = useMemo(() => {
    return vehicles.map(vehicle => ({
      ...vehicle,
      // Cálculos pesados que solo se ejecutan cuando vehicles cambia
      displayYear: vehicle.year ? vehicle.year.toString() : 'N/A',
      displayMileage: vehicle.mileage ? `${vehicle.mileage.toLocaleString()} km` : 'N/A',
      fullModel: `${vehicle.brand} ${vehicle.model}`,
      displayColor: vehicle.color || 'No especificado',
      hasCustomer: !!vehicle.customer_id,
      customerName: vehicle.customer_name || 'Sin cliente',
      lastServiceDate: vehicle.last_service_date ? new Date(vehicle.last_service_date).toLocaleDateString() : 'Nunca'
    }));
  }, [vehicles]);

  // ✅ OPTIMIZACIÓN: useCallback para funciones que se pasan como props
  const handleEdit = useCallback((vehicle: Vehicle) => {
    onEdit(vehicle);
  }, [onEdit]);

  const handleDelete = useCallback((vehicle: Vehicle) => {
    onDelete(vehicle);
  }, [onDelete]);

  const handleView = useCallback((vehicle: Vehicle) => {
    onView(vehicle);
  }, [onView]);
  
  if (loading) {
    return (
      <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-bg-tertiary border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">
                  Vehículo
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">
                  Cliente
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">
                  Placa
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">
                  Año
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-text-primary">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b border-border">
                  <td className="px-6 py-4">
                    <div className="h-10 bg-bg-tertiary animate-pulse rounded"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-10 bg-bg-tertiary animate-pulse rounded"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-10 bg-bg-tertiary animate-pulse rounded"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-10 bg-bg-tertiary animate-pulse rounded"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-10 bg-bg-tertiary animate-pulse rounded"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (vehicles.length === 0 && !loading) {
    return (
      <div className="bg-bg-secondary rounded-xl border border-border p-12 text-center">
        <div className="text-6xl mb-4">🚗</div>
        <h3 className="text-xl font-bold text-text-primary mb-2">
          {hasFilters
            ? 'No se encontraron vehículos con los filtros aplicados'
            : 'No hay vehículos registrados'}
        </h3>
        <p className="text-text-secondary">
          {hasFilters
            ? 'Intenta ajustar los filtros de búsqueda'
            : 'Comienza agregando el primer vehículo'}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile card list — visible below md */}
      <div className="block md:hidden space-y-3">
        {vehicles.map((vehicle) => (
          <div
            key={vehicle.id}
            className="bg-bg-secondary rounded-xl border border-border p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <TruckIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-text-primary">
                    {vehicle.brand} {vehicle.model}
                  </p>
                  {vehicle.color && (
                    <p className="text-xs text-text-secondary">Color: {vehicle.color}</p>
                  )}
                </div>
              </div>
              <span className="font-mono text-sm bg-bg-tertiary px-2 py-1 rounded text-text-primary">
                {vehicle.license_plate}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm text-text-secondary">
              <span>{vehicle.customer?.name || 'Sin cliente'}</span>
              <div className="flex items-center space-x-1">
                <CalendarIcon className="w-4 h-4" />
                <span>{vehicle.year ?? 'N/A'}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => onView(vehicle)}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-bg-tertiary hover:bg-bg-primary text-text-secondary text-sm transition-colors touch-manipulation"
              >
                <EyeIcon className="w-4 h-4" />
                Ver
              </button>
              <button
                onClick={() => onEdit(vehicle)}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-bg-tertiary hover:bg-bg-primary text-text-secondary text-sm transition-colors touch-manipulation"
              >
                <PencilIcon className="w-4 h-4" />
                Editar
              </button>
              <button
                onClick={() => onDelete(vehicle)}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-error/10 hover:bg-error/20 text-error text-sm transition-colors touch-manipulation"
              >
                <TrashIcon className="w-4 h-4" />
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table — visible from md up */}
      <div className="hidden md:block bg-bg-secondary rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-bg-tertiary border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">
                  Vehículo
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">
                  Cliente
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">
                  Placa
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">
                  Año
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-text-primary">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr
                  key={vehicle.id}
                  className="border-b border-border hover:bg-bg-tertiary/50 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <TruckIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">
                          {vehicle.brand} {vehicle.model}
                        </p>
                        {vehicle.color && (
                          <p className="text-sm text-text-secondary">
                            Color: {vehicle.color}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="font-medium text-text-primary">
                        {vehicle.customer?.name || 'Cliente no encontrado'}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {vehicle.customer?.email}
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <TagIcon className="w-4 h-4 text-text-secondary flex-shrink-0" />
                      <span className="font-mono text-sm bg-bg-tertiary px-2 py-1 rounded">
                        {vehicle.license_plate}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <CalendarIcon className="w-4 h-4 text-text-secondary flex-shrink-0" />
                      <span className="text-sm text-text-primary">
                        {vehicle.year}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onView(vehicle)}
                        className="p-2 hover:bg-bg-primary rounded-lg transition-colors"
                        title="Ver detalles"
                      >
                        <EyeIcon className="w-5 h-5 text-text-secondary hover:text-primary" />
                      </button>
                      <button
                        onClick={() => onEdit(vehicle)}
                        className="p-2 hover:bg-bg-primary rounded-lg transition-colors"
                        title="Editar"
                      >
                        <PencilIcon className="w-5 h-5 text-text-secondary hover:text-primary" />
                      </button>
                      <button
                        onClick={() => onDelete(vehicle)}
                        className="p-2 hover:bg-error/10 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <TrashIcon className="w-5 h-5 text-text-secondary hover:text-error" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
