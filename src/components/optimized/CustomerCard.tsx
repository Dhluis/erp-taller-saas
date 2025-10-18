'use client';

import { useMemo, useCallback } from 'react';
import { 
  UserIcon, 
  PhoneIcon, 
  EnvelopeIcon, 
  TruckIcon,
  CalendarIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { useOptimizedCalculations, useStatistics } from '@/hooks/useOptimizedCalculations';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  vehicles: any[];
  total_spent: number;
  last_order_date: string;
  created_at: string;
}

interface CustomerCardProps {
  customer: Customer;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onView: (customer: Customer) => void;
}

export function CustomerCard({ customer, onEdit, onDelete, onView }: CustomerCardProps) {
  
  // ✅ OPTIMIZACIÓN: useMemo para cálculos pesados
  const processedData = useMemo(() => {
    // Cálculos pesados que solo se ejecutan cuando customer cambia
    const expensiveCalculation = (customer: Customer) => {
      // Simular cálculo pesado
      const vehicleStats = customer.vehicles?.reduce((acc, vehicle) => {
        acc.totalVehicles++;
        acc.totalMileage += vehicle.mileage || 0;
        acc.avgYear += vehicle.year || 0;
        return acc;
      }, { totalVehicles: 0, totalMileage: 0, avgYear: 0 }) || { totalVehicles: 0, totalMileage: 0, avgYear: 0 };

      const avgYear = vehicleStats.totalVehicles > 0 
        ? Math.round(vehicleStats.avgYear / vehicleStats.totalVehicles)
        : 0;

      return {
        displayName: customer.name,
        displayEmail: customer.email || 'Sin email',
        displayPhone: customer.phone || 'Sin teléfono',
        displaySpent: customer.total_spent ? `$${customer.total_spent.toLocaleString()}` : '$0',
        displayLastOrder: customer.last_order_date 
          ? new Date(customer.last_order_date).toLocaleDateString()
          : 'Nunca',
        displayCreated: new Date(customer.created_at).toLocaleDateString(),
        vehicleCount: vehicleStats.totalVehicles,
        totalMileage: vehicleStats.totalMileage.toLocaleString(),
        avgVehicleYear: avgYear,
        hasVehicles: vehicleStats.totalVehicles > 0,
        customerValue: customer.total_spent || 0,
        isActive: customer.last_order_date && 
          new Date(customer.last_order_date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      };
    };

    return expensiveCalculation(customer);
  }, [customer]);

  // ✅ OPTIMIZACIÓN: useCallback para funciones que se pasan como props
  const handleEdit = useCallback(() => {
    onEdit(customer);
  }, [onEdit, customer]);

  const handleDelete = useCallback(() => {
    onDelete(customer);
  }, [onDelete, customer]);

  const handleView = useCallback(() => {
    onView(customer);
  }, [onView, customer]);

  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-6 hover:border-primary/50 transition-all duration-200 group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <UserIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary group-hover:text-primary transition-colors">
              {processedData.displayName}
            </h3>
            <p className="text-sm text-text-secondary">
              Cliente desde {processedData.displayCreated}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleView}
            className="p-2 hover:bg-bg-primary rounded-lg transition-colors"
            title="Ver detalles"
          >
            <UserIcon className="w-4 h-4 text-text-secondary hover:text-primary" />
          </button>
          <button
            onClick={handleEdit}
            className="p-2 hover:bg-bg-primary rounded-lg transition-colors"
            title="Editar"
          >
            <UserIcon className="w-4 h-4 text-text-secondary hover:text-primary" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 hover:bg-error/10 rounded-lg transition-colors"
            title="Eliminar"
          >
            <UserIcon className="w-4 h-4 text-text-secondary hover:text-error" />
          </button>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center space-x-2 text-sm text-text-secondary">
          <EnvelopeIcon className="w-4 h-4" />
          <span>{processedData.displayEmail}</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-text-secondary">
          <PhoneIcon className="w-4 h-4" />
          <span>{processedData.displayPhone}</span>
        </div>
      </div>

      {/* Vehicle Info */}
      {processedData.hasVehicles && (
        <div className="bg-bg-tertiary rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <TruckIcon className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-text-primary">
              {processedData.vehicleCount} vehículo{processedData.vehicleCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
            <div>Kilometraje total: {processedData.totalMileage} km</div>
            <div>Año promedio: {processedData.avgVehicleYear}</div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-bg-tertiary rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <CurrencyDollarIcon className="w-4 h-4 text-green-500" />
            <span className="text-xs text-text-secondary">Total gastado</span>
          </div>
          <p className="text-lg font-semibold text-text-primary">
            {processedData.displaySpent}
          </p>
        </div>
        
        <div className="bg-bg-tertiary rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <CalendarIcon className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-text-secondary">Última orden</span>
          </div>
          <p className="text-sm font-medium text-text-primary">
            {processedData.displayLastOrder}
          </p>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mt-4 flex items-center justify-between">
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          processedData.isActive 
            ? 'bg-green-500/20 text-green-500' 
            : 'bg-gray-500/20 text-gray-500'
        }`}>
          {processedData.isActive ? 'Activo' : 'Inactivo'}
        </div>
        
        <div className="text-xs text-text-secondary">
          {processedData.vehicleCount} vehículo{processedData.vehicleCount !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}

/**
 * Componente optimizado para lista de clientes
 */
interface CustomerListProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onView: (customer: Customer) => void;
}

export function CustomerList({ customers, onEdit, onDelete, onView }: CustomerListProps) {
  // ✅ OPTIMIZACIÓN: useStatistics para cálculos de estadísticas
  const stats = useStatistics(customers.map(c => c.total_spent || 0));

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-bg-secondary rounded-lg p-4">
          <h3 className="text-sm text-text-secondary mb-1">Total Clientes</h3>
          <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
        </div>
        <div className="bg-bg-secondary rounded-lg p-4">
          <h3 className="text-sm text-text-secondary mb-1">Gasto Promedio</h3>
          <p className="text-2xl font-bold text-text-primary">${stats.average.toLocaleString()}</p>
        </div>
        <div className="bg-bg-secondary rounded-lg p-4">
          <h3 className="text-sm text-text-secondary mb-1">Gasto Total</h3>
          <p className="text-2xl font-bold text-text-primary">${stats.sum.toLocaleString()}</p>
        </div>
        <div className="bg-bg-secondary rounded-lg p-4">
          <h3 className="text-sm text-text-secondary mb-1">Gasto Máximo</h3>
          <p className="text-2xl font-bold text-text-primary">${stats.max.toLocaleString()}</p>
        </div>
      </div>

      {/* Customer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.map(customer => (
          <CustomerCard
            key={customer.id}
            customer={customer}
            onEdit={onEdit}
            onDelete={onDelete}
            onView={onView}
          />
        ))}
      </div>
    </div>
  );
}











