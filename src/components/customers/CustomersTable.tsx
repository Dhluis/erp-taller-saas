'use client';

import { useState, useMemo, useCallback } from 'react';
import { INVENTORY_CONSTANTS } from '@/lib/constants';
import { InventoryUtils, DateUtils, CurrencyUtils } from '@/lib/utils/constants';
import { 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon 
} from '@heroicons/react/24/outline';
import type { Customer } from '@/lib/database/queries/customers';

interface CustomersTableProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onView: (customer: Customer) => void;
  loading?: boolean;
}

export function CustomersTable({ 
  customers, 
  onEdit, 
  onDelete, 
  onView,
  loading = false 
}: CustomersTableProps) {
  
  // ✅ OPTIMIZACIÓN: useMemo para cálculos pesados
  const processedCustomers = useMemo(() => {
    return customers.map(customer => ({
      ...customer,
      // Cálculos pesados que solo se ejecutan cuando customers cambia
      fullName: `${customer.name}`,
      displayPhone: customer.phone ? customer.phone : 'Sin teléfono',
      displayEmail: customer.email ? customer.email : 'Sin email',
      hasVehicles: customer.vehicles && customer.vehicles.length > 0,
      vehicleCount: customer.vehicles ? customer.vehicles.length : 0,
      lastOrderDate: customer.last_order_date ? new Date(customer.last_order_date).toLocaleDateString() : 'Nunca',
      totalSpent: customer.total_spent ? `$${customer.total_spent.toLocaleString()}` : '$0'
    }));
  }, [customers]);

  // ✅ OPTIMIZACIÓN: useCallback para funciones que se pasan como props
  const handleEdit = useCallback((customer: Customer) => {
    onEdit(customer);
  }, [onEdit]);

  const handleDelete = useCallback((customer: Customer) => {
    onDelete(customer);
  }, [onDelete]);

  const handleView = useCallback((customer: Customer) => {
    onView(customer);
  }, [onView]);
  
  if (loading) {
    return (
      <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-bg-tertiary border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">
                  Cliente
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">
                  Contacto
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">
                  Ubicación
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="bg-bg-secondary rounded-xl border border-border p-12 text-center">
        <div className="text-6xl mb-4">👥</div>
        <h3 className="text-xl font-bold text-text-primary mb-2">
          No hay clientes registrados
        </h3>
        <p className="text-text-secondary">
          Comienza agregando tu primer cliente
        </p>
      </div>
    );
  }

  return (
    <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-bg-tertiary border-b border-border">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">
                Cliente
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">
                Contacto
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">
                Ubicación
              </th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-text-primary">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {processedCustomers.map((customer) => (
              <tr 
                key={customer.id}
                className="border-b border-border hover:bg-bg-tertiary/50 transition-colors group"
              >
                {/* Cliente */}
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                         <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                           <span className="text-primary font-bold text-sm">
                             {customer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                           </span>
                         </div>
                         <div>
                           <p className="font-medium text-text-primary">
                             {customer.name}
                           </p>
                      {customer.notes && (
                        <p className="text-sm text-text-secondary truncate max-w-xs">
                          {customer.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Contacto */}
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-sm">
                      <EnvelopeIcon className="w-4 h-4 text-text-secondary flex-shrink-0" />
                      <a 
                        href={`mailto:${customer.email}`}
                        className="text-primary hover:text-primary-light transition-colors truncate"
                      >
                        {customer.email}
                      </a>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <PhoneIcon className="w-4 h-4 text-text-secondary flex-shrink-0" />
                      <a 
                        href={`tel:${customer.phone}`}
                        className="text-text-secondary hover:text-text-primary transition-colors"
                      >
                        {customer.phone}
                      </a>
                    </div>
                  </div>
                </td>

                     {/* Ubicación */}
                     <td className="px-6 py-4">
                       <div className="flex items-start space-x-2">
                         <MapPinIcon className="w-4 h-4 text-text-secondary flex-shrink-0 mt-1" />
                         <div className="text-sm">
                           {customer.address ? (
                             <p className="text-text-primary truncate max-w-xs">{customer.address}</p>
                           ) : (
                             <p className="text-text-muted">Sin dirección</p>
                           )}
                         </div>
                       </div>
                     </td>

                {/* Acciones */}
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => onView(customer)}
                      className="p-2 hover:bg-bg-primary rounded-lg transition-colors group-hover:visible"
                      title="Ver detalles"
                    >
                      <EyeIcon className="w-5 h-5 text-text-secondary hover:text-primary" />
                    </button>
                    
                    <button
                      onClick={() => handleEdit(customer)}
                      className="p-2 hover:bg-bg-primary rounded-lg transition-colors"
                      title="Editar"
                    >
                      <PencilIcon className="w-5 h-5 text-text-secondary hover:text-primary" />
                    </button>
                    
                    <button
                      onClick={() => handleDelete(customer)}
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
  );
}
