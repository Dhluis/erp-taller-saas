'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { Vehicle, CreateVehicleData } from '@/lib/database/queries/vehicles';
import { useCustomers } from '@/hooks/useCustomers';
import { sanitize, INPUT_LIMITS } from '@/lib/utils/input-sanitizers';

interface VehicleFormProps {
  vehicle?: Vehicle | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isOpen: boolean;
}

export function VehicleForm({ vehicle, onSubmit, onCancel, isOpen }: VehicleFormProps) {
  const { customers, loading: customersLoading } = useCustomers();
  
  const [formData, setFormData] = useState({
    customer_id: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    license_plate: '',
    vin: '',
    color: '',
    mileage: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Cargar datos del vehículo si estamos editando
  useEffect(() => {
    if (vehicle) {
      setFormData({
        customer_id: vehicle.customer_id || '',
        brand: vehicle.brand || '',
        model: vehicle.model || '',
        year: vehicle.year || new Date().getFullYear(),
        license_plate: vehicle.license_plate || '',
        vin: vehicle.vin || '',
        color: vehicle.color || '',
        mileage: vehicle.mileage?.toString() || '',
      });
    } else {
      // Reset form
      setFormData({
        customer_id: '',
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        license_plate: '',
        vin: '',
        color: '',
        mileage: '',
      });
    }
    setErrors({});
  }, [vehicle, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const currentYear = new Date().getFullYear();

    if (!formData.customer_id.trim()) {
      newErrors.customer_id = 'El cliente es requerido';
    }

    if (!formData.brand.trim()) {
      newErrors.brand = 'La marca es requerida';
    }

    if (!formData.model.trim()) {
      newErrors.model = 'El modelo es requerido';
    }

    if (formData.year && (formData.year < INPUT_LIMITS.YEAR_MIN || formData.year > INPUT_LIMITS.YEAR_MAX)) {
      newErrors.year = `El año debe estar entre ${INPUT_LIMITS.YEAR_MIN} y ${INPUT_LIMITS.YEAR_MAX}`;
    }

    if (formData.vin && formData.vin.length > 0 && formData.vin.length !== 17) {
      newErrors.vin = `El VIN debe tener exactamente 17 caracteres (tiene ${formData.vin.length})`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error al guardar vehículo:', error);
      setErrors({ submit: 'Error al guardar el vehículo. Intenta de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    let processed = value;
    if (typeof value === 'string') {
      switch (field) {
        case 'license_plate': processed = sanitize.plate(value); break;
        case 'vin': processed = sanitize.vin(value); break;
        case 'mileage': processed = sanitize.mileage(value); break;
      }
    }
    
    setFormData(prev => ({ ...prev, [field]: processed }));
    // Limpiar error del campo al escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

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
          className="relative w-full max-w-2xl rounded-xl border border-border shadow-2xl animate-fadeIn"
          style={{backgroundColor: '#000000'}}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div>
              <h2 className="text-2xl font-bold text-text-primary">
                {vehicle ? 'Editar Vehículo' : 'Nuevo Vehículo'}
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                {vehicle
                  ? 'Actualiza la información del vehículo'
                  : 'Completa los datos del nuevo vehículo'
                }
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-text-secondary" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Error general */}
            {errors.submit && (
              <div className="p-4 bg-error/10 border border-error/30 rounded-lg">
                <p className="text-error text-sm">{errors.submit}</p>
              </div>
            )}

            {/* Información Básica */}
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Información Básica
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Cliente <span className="text-error">*</span>
                  </label>
                  <select
                    value={formData.customer_id}
                    onChange={(e) => handleChange('customer_id', e.target.value)}
                    disabled={customersLoading}
                    className={`
                      w-full px-4 py-2.5 bg-bg-tertiary border rounded-lg
                      text-text-primary
                      focus:outline-none focus:ring-2 focus:ring-primary/50
                      transition-all
                      ${errors.customer_id ? 'border-error' : 'border-border'}
                      ${customersLoading ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <option value="">
                      {customersLoading ? 'Cargando clientes...' : 'Seleccionar cliente'}
                    </option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} - {customer.email}
                      </option>
                    ))}
                  </select>
                  {errors.customer_id && (
                    <p className="text-error text-sm mt-1">{errors.customer_id}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Año
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.year}
                    onChange={(e) => {
                      const cleaned = sanitize.year(e.target.value)
                      handleChange('year', cleaned ? parseInt(cleaned) : 0)
                    }}
                    maxLength={4}
                    className={`w-full px-4 py-2.5 bg-bg-tertiary border rounded-lg
                             text-text-primary
                             focus:outline-none focus:ring-2 focus:ring-primary/50
                             ${errors.year ? 'border-error' : 'border-border'}`}
                    placeholder="2024"
                  />
                  {errors.year && (
                    <p className="text-error text-sm mt-1">{errors.year}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Información del Vehículo */}
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Información del Vehículo
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Marca <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => handleChange('brand', e.target.value)}
                    className={`
                      w-full px-4 py-2.5 bg-bg-tertiary border rounded-lg
                      text-text-primary placeholder-text-muted
                      focus:outline-none focus:ring-2 focus:ring-primary/50
                      transition-all
                      ${errors.brand ? 'border-error' : 'border-border'}
                    `}
                    placeholder="Toyota"
                  />
                  {errors.brand && (
                    <p className="text-error text-sm mt-1">{errors.brand}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Modelo <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => handleChange('model', e.target.value)}
                    className={`
                      w-full px-4 py-2.5 bg-bg-tertiary border rounded-lg
                      text-text-primary placeholder-text-muted
                      focus:outline-none focus:ring-2 focus:ring-primary/50
                      transition-all
                      ${errors.model ? 'border-error' : 'border-border'}
                    `}
                    placeholder="Corolla"
                  />
                  {errors.model && (
                    <p className="text-error text-sm mt-1">{errors.model}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Placa
                  </label>
                  <input
                    type="text"
                    value={formData.license_plate}
                    onChange={(e) => handleChange('license_plate', e.target.value)}
                    maxLength={INPUT_LIMITS.PLATE_MAX}
                    className="w-full px-4 py-2.5 bg-bg-tertiary border border-border rounded-lg
                             text-text-primary placeholder-text-muted uppercase
                             focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="ABC-123"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Color
                  </label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => handleChange('color', e.target.value)}
                    className="w-full px-4 py-2.5 bg-bg-tertiary border border-border rounded-lg
                             text-text-primary placeholder-text-muted
                             focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Blanco"
                  />
                </div>
              </div>
            </div>

            {/* Información Adicional */}
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Información Adicional
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    VIN (Número de Serie)
                  </label>
                  <input
                    type="text"
                    value={formData.vin}
                    onChange={(e) => handleChange('vin', e.target.value)}
                    maxLength={INPUT_LIMITS.VIN_MAX}
                    className={`w-full px-4 py-2.5 bg-bg-tertiary border rounded-lg
                             text-text-primary placeholder-text-muted uppercase
                             focus:outline-none focus:ring-2 focus:ring-primary/50
                             ${errors.vin ? 'border-error' : 'border-border'}`}
                    placeholder="1HGBH41JXMN109186"
                  />
                  {errors.vin && (
                    <p className="text-error text-sm mt-1">{errors.vin}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Kilometraje
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.mileage}
                    onChange={(e) => handleChange('mileage', e.target.value)}
                    className="w-full px-4 py-2.5 bg-bg-tertiary border border-border rounded-lg
                             text-text-primary placeholder-text-muted
                             focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="150000"
                  />
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="px-6 py-2.5 bg-bg-tertiary hover:bg-bg-primary border border-border
                         rounded-lg text-text-secondary hover:text-text-primary
                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-primary hover:bg-primary-light
                         rounded-lg text-bg-primary font-medium
                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-bg-primary/30 border-t-bg-primary rounded-full animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>{vehicle ? 'Actualizar' : 'Crear'} Vehículo</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
