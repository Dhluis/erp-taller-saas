'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { Customer } from '@/lib/database/queries/customers';

interface CustomerFormProps {
  customer?: Customer | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isOpen: boolean;
}

export function CustomerForm({ customer, onSubmit, onCancel, isOpen }: CustomerFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Cargar datos del cliente si estamos editando
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        notes: customer.notes || '',
      });
    } else {
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
      });
    }
    setErrors({});
  }, [customer, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es requerido';
    } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'El teléfono no es válido';
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
      // El componente padre manejará el cierre del modal
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      setErrors({ submit: 'Error al guardar el cliente. Intenta de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
                {customer ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                {customer 
                  ? 'Actualiza la información del cliente' 
                  : 'Completa los datos del nuevo cliente'
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

            {/* Información Personal */}
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Información Personal
              </h3>
              <div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Nombre Completo <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className={`
                      w-full px-4 py-2.5 bg-bg-tertiary border rounded-lg
                      text-text-primary placeholder-text-muted
                      focus:outline-none focus:ring-2 focus:ring-primary/50
                      transition-all
                      ${errors.name ? 'border-error' : 'border-border'}
                    `}
                    placeholder="Juan Pérez"
                  />
                  {errors.name && (
                    <p className="text-error text-sm mt-1">{errors.name}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Información de Contacto */}
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Información de Contacto
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Email <span className="text-error">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={`
                      w-full px-4 py-2.5 bg-bg-tertiary border rounded-lg
                      text-text-primary placeholder-text-muted
                      focus:outline-none focus:ring-2 focus:ring-primary/50
                      transition-all
                      ${errors.email ? 'border-error' : 'border-border'}
                    `}
                    placeholder="juan@email.com"
                  />
                  {errors.email && (
                    <p className="text-error text-sm mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Teléfono <span className="text-error">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className={`
                      w-full px-4 py-2.5 bg-bg-tertiary border rounded-lg
                      text-text-primary placeholder-text-muted
                      focus:outline-none focus:ring-2 focus:ring-primary/50
                      transition-all
                      ${errors.phone ? 'border-error' : 'border-border'}
                    `}
                    placeholder="449-123-4567"
                  />
                  {errors.phone && (
                    <p className="text-error text-sm mt-1">{errors.phone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Dirección */}
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Dirección
              </h3>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Dirección
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full px-4 py-2.5 bg-bg-tertiary border border-border rounded-lg
                           text-text-primary placeholder-text-muted
                           focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Calle Principal 123, Aguascalientes, Aguascalientes"
                />
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Notas
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 bg-bg-tertiary border border-border rounded-lg
                         text-text-primary placeholder-text-muted
                         focus:outline-none focus:ring-2 focus:ring-primary/50
                         resize-none"
                placeholder="Información adicional sobre el cliente..."
              />
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
                  <span>{customer ? 'Actualizar' : 'Crear'} Cliente</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
