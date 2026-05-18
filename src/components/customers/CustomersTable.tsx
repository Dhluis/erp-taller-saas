'use client';

import { useMemo, useCallback } from 'react';
import { 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  TruckIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';
import { usePermissions } from '@/hooks/usePermissions';
import type { Customer } from '@/lib/database/queries/customers';

/** Cliente con relaciones devueltas por la API de lista */
export interface CustomerListItem extends Customer {
  vehicles?: Array<{ id: string; brand?: string; model?: string; year?: number; license_plate?: string; color?: string }>;
  last_work_order?: { id: string; order_number: string | null; status: string; created_at: string } | null;
}

interface CustomersTableProps {
  customers: CustomerListItem[];
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onView: (customer: Customer) => void;
  onOpenOrderDetails?: (orderId: string) => void;
  loading?: boolean;
}

export function CustomersTable({ 
  customers, 
  onEdit, 
  onDelete, 
  onView,
  onOpenOrderDetails,
  loading = false 
}: CustomersTableProps) {
  const permissions = usePermissions();
  const canDelete = permissions.canDelete('customers');
  
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
      firstVehicle: customer.vehicles?.[0],
      lastOrderDate: (customer as any).last_order_date ? new Date((customer as any).last_order_date).toLocaleDateString() : 'Nunca',
      totalSpent: (customer as any).total_spent ? `$${Number((customer as any).total_spent).toLocaleString()}` : '$0'
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
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">
                  Vehículo
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">
                  Orden de ingreso
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
    <>
      {/* Mobile card list — visible below md */}
      <div className="block md:hidden space-y-3">
        {processedCustomers.map((customer) => (
          <div
            key={customer.id}
            className="bg-bg-secondary rounded-xl border border-border p-4 space-y-3"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold text-sm">
                  {customer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-text-primary truncate">{customer.name}</p>
                {customer.firstVehicle && (
                  <p className="text-xs text-text-secondary truncate">
                    {[customer.firstVehicle.brand, customer.firstVehicle.model].filter(Boolean).join(' ')}
                    {customer.firstVehicle.license_plate ? ` · ${customer.firstVehicle.license_plate}` : ''}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1 text-sm">
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors">
                  <PhoneIcon className="w-4 h-4 flex-shrink-0" />
                  <span>{customer.phone}</span>
                </a>
              )}
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-primary hover:text-primary-light transition-colors">
                  <EnvelopeIcon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{customer.email}</span>
                </a>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => onView(customer)}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-bg-tertiary hover:bg-bg-primary text-text-secondary text-sm transition-colors touch-manipulation"
              >
                <EyeIcon className="w-4 h-4" />
                Ver
              </button>
              <button
                onClick={() => handleEdit(customer)}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-bg-tertiary hover:bg-bg-primary text-text-secondary text-sm transition-colors touch-manipulation"
              >
                <PencilIcon className="w-4 h-4" />
                Editar
              </button>
              {canDelete && (
                <button
                  onClick={() => handleDelete(customer)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-error/10 hover:bg-error/20 text-error text-sm transition-colors touch-manipulation"
                >
                  <TrashIcon className="w-4 h-4" />
                  Eliminar
                </button>
              )}
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
                Cliente
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">
                Contacto
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">
                Ubicación
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">
                Vehículo
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">
                Orden de ingreso
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

                     {/* Vehículo */}
                     <td className="px-6 py-4">
                       <div className="flex items-center space-x-2 text-sm">
                         <TruckIcon className="w-4 h-4 text-text-secondary flex-shrink-0" />
                         {customer.firstVehicle ? (
                           <span className="text-text-primary truncate max-w-[180px]" title={`${customer.firstVehicle.brand ?? ''} ${customer.firstVehicle.model ?? ''} ${customer.firstVehicle.license_plate ?? ''}`.trim()}>
                             {[customer.firstVehicle.brand, customer.firstVehicle.model].filter(Boolean).join(' ')}
                             {customer.firstVehicle.license_plate ? ` · ${customer.firstVehicle.license_plate}` : ''}
                           </span>
                         ) : (
                           <span className="text-text-muted">Sin vehículo</span>
                         )}
                       </div>
                     </td>

                     {/* Orden de ingreso */}
                     <td className="px-6 py-4">
                       {customer.last_work_order ? (
                         <button
                           type="button"
                           onClick={() => onOpenOrderDetails?.(customer.last_work_order!.id)}
                           className="p-2 rounded-lg hover:bg-bg-primary transition-colors text-primary hover:text-primary-light"
                           title="Ver y editar orden de ingreso"
                         >
                           <WrenchScrewdriverIcon className="w-5 h-5" />
                         </button>
                       ) : (
                         <span className="text-text-muted text-sm">—</span>
                       )}
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
                    
                    {/* ✅ Solo mostrar botón eliminar si tiene permisos */}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(customer)}
                        className="p-2 hover:bg-error/10 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <TrashIcon className="w-5 h-5 text-text-secondary hover:text-error" />
                      </button>
                    )}
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
