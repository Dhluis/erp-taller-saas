'use client';

import { Modal } from '@/components/ui/Modal';
import { useState, useEffect } from 'react';
import { User, Car, FileText, DollarSign, AlertCircle, Droplet, Fuel, Shield, Clipboard, Wrench } from 'lucide-react';

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

  // Form data - EXTENDIDO con campos de inspección
  const [formData, setFormData] = useState({
    // Datos básicos (ya existentes)
    customer_id: '',
    vehicle_id: '',
    description: '',
    estimated_cost: '',
    notes: '',
    
    // ✅ NUEVO: Checklist de fluidos
    fluids: {
      aceite_motor: false,
      aceite_transmision: false,
      liquido_frenos: false,
      liquido_embrague: false,
      refrigerante: false,
      aceite_hidraulico: false,
      limpia_parabrisas: false,
    },
    
    // ✅ NUEVO: Estado del vehículo
    fuel_level: 'half', // empty, quarter, half, three_quarters, full
    valuable_items: '',
    
    // ✅ NUEVO: Motivos de ingreso
    will_diagnose: false,
    entry_reason: '',
    procedures: '',
    
    // ✅ NUEVO: Datos del servicio
    is_warranty: false,
    authorize_test_drive: false,
  });

  // ✅ FIX: Cargar clientes al abrir modal solo si organizationId está disponible
  useEffect(() => {
    if (isOpen && organizationId) {
      console.log('🔄 [NewOrderModal] Cargando clientes para organizationId:', organizationId);
      loadCustomers();
    } else if (isOpen && !organizationId) {
      console.warn('⚠️ [NewOrderModal] organizationId no disponible, no se pueden cargar clientes');
      setError('No se puede cargar la lista de clientes. Por favor, intenta de nuevo.');
    }
  }, [isOpen, organizationId]);

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
    if (!organizationId) {
      console.error('❌ [NewOrderModal] No hay organizationId para cargar clientes');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // ✅ FIX: Forzar sin cache y agregar timestamp
      const response = await fetch(`/api/customers?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      
      if (!response.ok) throw new Error('Error al cargar clientes');
      const data = await response.json();
      
      // ✅ FIX: Verificar que la respuesta tenga el formato correcto
      const customersData = data?.success ? data.data : (Array.isArray(data) ? data : []);
      
      // ✅ FIX: Filtrar solo clientes de la organización actual
      const filteredCustomers = customersData.filter((c: any) => {
        const customerOrgId = c.organization_id;
        const matches = customerOrgId === organizationId;
        if (!matches && customerOrgId) {
          console.warn('⚠️ [NewOrderModal] Cliente con organization_id diferente encontrado:', {
            customer_id: c.id,
            customer_name: c.name,
            customer_org_id: customerOrgId,
            expected_org_id: organizationId
          });
        }
        return matches;
      });
      
      console.log('✅ [NewOrderModal] Clientes cargados:', filteredCustomers.length);
      console.log('✅ [NewOrderModal] Primeros clientes:', filteredCustomers.slice(0, 3).map((c: any) => ({ id: c.id, name: c.name })));
      
      setCustomers(filteredCustomers);
    } catch (err) {
      console.error('❌ [NewOrderModal] Error cargando clientes:', err);
      setError('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }

  async function loadVehicles(customerId: string) {
    try {
      const response = await fetch('/api/vehicles');
      if (!response.ok) throw new Error('Error al cargar vehículos');
      const allVehicles = await response.json();
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
      // 1. Crear la orden
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: formData.customer_id,
          vehicle_id: formData.vehicle_id,
          description: formData.description,
          estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : 0,
          status: 'reception'
        })
      });

      if (!orderResponse.ok) throw new Error('Error al crear la orden');
      
      const order = await orderResponse.json();

      // 2. Guardar inspección del vehículo
      const inspectionResponse = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          organization_id: organizationId,
          fluids_check: formData.fluids,
          fuel_level: formData.fuel_level,
          valuable_items: formData.valuable_items,
          will_diagnose: formData.will_diagnose,
          entry_reason: formData.entry_reason,
          procedures: formData.procedures,
          is_warranty: formData.is_warranty,
          authorize_test_drive: formData.authorize_test_drive,
        })
      });

      if (!inspectionResponse.ok) {
        console.warn('Advertencia: No se pudo guardar la inspección');
      }

      // Reset form
      setFormData({
        customer_id: '',
        vehicle_id: '',
        description: '',
        estimated_cost: '',
        notes: '',
        fluids: {
          aceite_motor: false,
          aceite_transmision: false,
          liquido_frenos: false,
          liquido_embrague: false,
          refrigerante: false,
          aceite_hidraulico: false,
          limpia_parabrisas: false,
        },
        fuel_level: 'half',
        valuable_items: '',
        will_diagnose: false,
        entry_reason: '',
        procedures: '',
        is_warranty: false,
        authorize_test_drive: false,
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
      fluids: {
        aceite_motor: false,
        aceite_transmision: false,
        liquido_frenos: false,
        liquido_embrague: false,
        refrigerante: false,
        aceite_hidraulico: false,
        limpia_parabrisas: false,
      },
      fuel_level: 'half',
      valuable_items: '',
      will_diagnose: false,
      entry_reason: '',
      procedures: '',
      is_warranty: false,
      authorize_test_drive: false,
    });
    setError(null);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nueva Orden de Trabajo" size="xl">
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* ========== DATOS DEL CLIENTE (Original) ========== */}
        <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
            <User className="w-4 h-4" />
            Datos del Cliente
          </h3>

          {/* Cliente */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
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
        </div>

        {/* ========== DESCRIPCIÓN DEL SERVICIO (Original) ========== */}
        <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-semibold text-purple-400 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Descripción del Trabajo
          </h3>

          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              Servicio requerido *
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
        </div>

        {/* ========== ✅ NUEVO: INSPECCIÓN DEL VEHÍCULO ========== */}
        <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
            <Clipboard className="w-4 h-4" />
            Inspección del Vehículo
          </h3>

          {/* Nivel de combustible */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <Fuel className="w-4 h-4 text-yellow-400" />
              Nivel de combustible
            </label>
            <div className="flex gap-2">
              {[
                { value: 'empty', label: 'Vacío', color: 'bg-red-500' },
                { value: 'quarter', label: '1/4', color: 'bg-orange-500' },
                { value: 'half', label: '1/2', color: 'bg-yellow-500' },
                { value: 'three_quarters', label: '3/4', color: 'bg-lime-500' },
                { value: 'full', label: 'Lleno', color: 'bg-green-500' },
              ].map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, fuel_level: level.value })}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    formData.fuel_level === level.value
                      ? `${level.color} text-white`
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          {/* Checklist de fluidos */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
              <Droplet className="w-4 h-4 text-blue-400" />
              Fluidos verificados
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'aceite_motor', label: 'Aceite de motor' },
                { key: 'aceite_transmision', label: 'Aceite de transmisión' },
                { key: 'liquido_frenos', label: 'Líquido de frenos' },
                { key: 'liquido_embrague', label: 'Líquido de embrague' },
                { key: 'refrigerante', label: 'Refrigerante' },
                { key: 'aceite_hidraulico', label: 'Aceite hidráulico' },
                { key: 'limpia_parabrisas', label: 'Limpia parabrisas' },
              ].map((fluid) => (
                <label
                  key={fluid.key}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={formData.fluids[fluid.key as keyof typeof formData.fluids]}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fluids: { ...formData.fluids, [fluid.key]: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
                  />
                  <span className="text-sm text-slate-300">{fluid.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Objetos de valor */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              Objetos de valor reportados
            </label>
            <textarea
              value={formData.valuable_items}
              onChange={(e) => setFormData({ ...formData, valuable_items: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors resize-none"
              rows={2}
              placeholder="Ej: Estéreo, GPS, herramientas en cajuela..."
            />
          </div>
        </div>

        {/* ========== ✅ NUEVO: MOTIVO DE INGRESO ========== */}
        <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-semibold text-purple-400 flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Motivo de Ingreso
          </h3>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center justify-between px-4 py-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors">
              <span className="text-sm text-slate-300">¿Realizar diagnóstico?</span>
              <input
                type="checkbox"
                checked={formData.will_diagnose}
                onChange={(e) => setFormData({ ...formData, will_diagnose: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
              />
            </label>

            <label className="flex items-center justify-between px-4 py-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors">
              <span className="text-sm text-slate-300">¿Es garantía?</span>
              <input
                type="checkbox"
                checked={formData.is_warranty}
                onChange={(e) => setFormData({ ...formData, is_warranty: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-green-500 focus:ring-green-500 focus:ring-offset-0"
              />
            </label>

            <label className="flex items-center justify-between px-4 py-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors col-span-2">
              <span className="text-sm text-slate-300">¿Autoriza prueba de ruta?</span>
              <input
                type="checkbox"
                checked={formData.authorize_test_drive}
                onChange={(e) => setFormData({ ...formData, authorize_test_drive: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
              />
            </label>
          </div>

          {/* Motivo */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              Motivo de ingreso
            </label>
            <textarea
              value={formData.entry_reason}
              onChange={(e) => setFormData({ ...formData, entry_reason: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors resize-none"
              rows={2}
              placeholder="Ej: Cliente reporta ruido en motor, falla en arranque..."
            />
          </div>

          {/* Procedimientos */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              Procedimientos a realizar
            </label>
            <textarea
              value={formData.procedures}
              onChange={(e) => setFormData({ ...formData, procedures: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors resize-none"
              rows={2}
              placeholder="Ej: Revisión completa de motor, cambio de bujías..."
            />
          </div>
        </div>

        {/* ========== NOTAS (Original) ========== */}
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
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700 sticky bottom-0 bg-slate-800">
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
