'use client';

import { Modal } from '@/components/ui/Modal';
import { useState, useEffect } from 'react';
import { User, Car, FileText, DollarSign, AlertCircle } from 'lucide-react';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  onSuccess?: () => void;
}

export function NewOrderModal({ isOpen, onClose, organizationId, onSuccess }: NewOrderModalProps) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    customer_id: '',
    vehicle_id: '',
    description: '',
    estimated_cost: '',
    notes: '',
  });

  // Cargar clientes al abrir modal
  useEffect(() => {
    if (isOpen) {
      loadCustomers();
    }
  }, [isOpen]);

  // Cargar vehículos cuando se selecciona un cliente
  useEffect(() => {
    if (formData.customer_id) {
      loadVehicles(formData.customer_id);
    } else {
      setVehicles([]);
      setFormData(prev => ({ ...prev, vehicle_id: '' }));
    }
  }, [formData.customer_id]);

  async function loadCustomers() {
    try {
      const response = await fetch('/api/customers');
      if (!response.ok) throw new Error('Error al cargar clientes');
      const data = await response.json();
      setCustomers(data);
    } catch (err) {
      console.error('Error cargando clientes:', err);
      setError('Error al cargar clientes');
    }
  }

  async function loadVehicles(customerId: string) {
    try {
      const response = await fetch('/api/vehicles');
      if (!response.ok) throw new Error('Error al cargar vehículos');
      const allVehicles = await response.json();
      // Filtrar vehículos por cliente
      const customerVehicles = allVehicles.filter((v: any) => v.customer?.id === customerId);
      setVehicles(customerVehicles);
    } catch (err) {
      console.error('Error cargando vehículos:', err);
      setError('Error al cargar vehículos');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.customer_id || !formData.vehicle_id || !formData.description) {
      setError('Por favor completa todos los campos obligatorios');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: formData.customer_id,
          vehicle_id: formData.vehicle_id,
          description: formData.description,
          estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : 0,
          status: 'reception' // Estado inicial
        })
      });

      if (!response.ok) throw new Error('Error al crear la orden');

      // Reset form
      setFormData({
        customer_id: '',
        vehicle_id: '',
        description: '',
        estimated_cost: '',
        notes: '',
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error creando orden:', err);
      setError('Error al crear la orden');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setFormData({
      customer_id: '',
      vehicle_id: '',
      description: '',
      estimated_cost: '',
      notes: '',
    });
    setError(null);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nueva Orden de Trabajo" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Cliente */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
            <User className="w-4 h-4 text-cyan-400" />
            Cliente *
          </label>
          <select
            value={formData.customer_id}
            onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors"
            required
          >
            <option value="">Seleccionar cliente...</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} {customer.phone ? `- ${customer.phone}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Vehículo */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
            <Car className="w-4 h-4 text-blue-400" />
            Vehículo *
          </label>
          <select
            value={formData.vehicle_id}
            onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            required
            disabled={!formData.customer_id}
          >
            <option value="">
              {formData.customer_id ? 'Seleccionar vehículo...' : 'Primero selecciona un cliente'}
            </option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.brand} {vehicle.model} {vehicle.year} - {vehicle.license_plate}
              </option>
            ))}
          </select>
          {formData.customer_id && vehicles.length === 0 && (
            <p className="text-xs text-amber-400 mt-1">Este cliente no tiene vehículos registrados</p>
          )}
        </div>

        {/* Descripción */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
            <FileText className="w-4 h-4 text-purple-400" />
            Descripción del servicio *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors resize-none"
            rows={3}
            placeholder="Ej: Cambio de aceite y filtro, revisión general..."
            required
          />
        </div>

        {/* Costo estimado */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
            <DollarSign className="w-4 h-4 text-green-400" />
            Costo estimado (opcional)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.estimated_cost}
            onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors"
            placeholder="0.00"
          />
        </div>

        {/* Notas */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
            <FileText className="w-4 h-4 text-slate-400" />
            Notas adicionales (opcional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors resize-none"
            rows={2}
            placeholder="Observaciones, comentarios del cliente, etc..."
          />
        </div>

        {/* Botones */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Creando...' : 'Crear Orden'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
