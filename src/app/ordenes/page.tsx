'use client';

import { Plus, Search, Filter, RefreshCw, Home, ChevronRight, Wrench, Eye, Edit, MoreHorizontal } from 'lucide-react';
import { NewOrderModal } from '@/components/ordenes/NewOrderModal';
import { OrderDetailModal } from '@/components/ordenes/OrderDetailModal';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs';
import type { WorkOrder } from '@/types/orders';

interface WorkOrderWithMechanic extends WorkOrder {
  assigned_mechanic?: {
    name: string;
    role: string;
  };
}

export default function OrdenesPage() {
  const { organization } = useAuth();
  const [orders, setOrders] = useState<WorkOrderWithMechanic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrderWithMechanic | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const organizationId = organization?.organization_id || null;

  useEffect(() => {
    if (organizationId) {
      loadOrders();
    }
  }, [organizationId]);

  const loadOrders = async () => {
    if (!organizationId) return;
    
    try {
      setLoading(true);
      const client = createClient();
      const { data, error } = await client
        .from('work_orders')
        .select(`
          id,
          organization_id,
          customer_id,
          vehicle_id,
          description,
          status,
          estimated_cost,
          entry_date,
          created_at,
          updated_at,
          customer:customers(name, phone, email),
          vehicle:vehicles(brand, model, year, license_plate),
          assigned_mechanic:employees!assigned_to(name, role)
        `)
        .eq('organization_id', organizationId)
        .order('entry_date', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error cargando órdenes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadOrders();
  };

  const handleNewOrder = () => {
    setIsNewOrderModalOpen(true);
  };

  const handleNewOrderSuccess = () => {
    loadOrders();
    setIsNewOrderModalOpen(false);
  };

  const handleViewOrder = (order: WorkOrderWithMechanic) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      reception: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      diagnosis: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      initial_quote: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      waiting_approval: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      disassembly: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
      waiting_parts: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      assembly: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      testing: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      ready: 'bg-green-500/10 text-green-400 border-green-500/20',
      completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    };
    return colors[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      reception: 'Recepción',
      diagnosis: 'Diagnóstico',
      initial_quote: 'Cotización',
      waiting_approval: 'Esperando Aprobación',
      disassembly: 'Desarmado',
      waiting_parts: 'Esperando Piezas',
      assembly: 'Armado',
      testing: 'Pruebas',
      ready: 'Listo',
      completed: 'Completado',
    };
    return labels[status] || status;
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.vehicle?.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.vehicle?.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (!organizationId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-400">Cargando organización...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Breadcrumbs */}
      <StandardBreadcrumbs currentPage="Lista de Órdenes" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Lista de Órdenes</h1>
          <p className="text-slate-400 mt-1">Vista completa con filtros avanzados</p>
        </div>
        <button
          onClick={handleNewOrder}
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nueva Orden
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por cliente, vehículo o descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
        >
          <option value="all">Todos los estados</option>
          <option value="reception">Recepción</option>
          <option value="diagnosis">Diagnóstico</option>
          <option value="initial_quote">Cotización</option>
          <option value="waiting_approval">Esperando Aprobación</option>
          <option value="disassembly">Desarmado</option>
          <option value="waiting_parts">Esperando Piezas</option>
          <option value="assembly">Armado</option>
          <option value="testing">Pruebas</option>
          <option value="ready">Listo</option>
          <option value="completed">Completado</option>
        </select>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
          Actualizar
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Wrench className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No se encontraron órdenes</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Cliente</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Vehículo</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Descripción</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Estado</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Mecánico</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Costo</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Fecha</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-slate-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-white">{order.customer?.name || 'Sin cliente'}</div>
                        {order.customer?.phone && (
                          <div className="text-sm text-slate-400">{order.customer.phone}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-white">
                          {order.vehicle?.brand} {order.vehicle?.model}
                        </div>
                        <div className="text-sm text-slate-400">
                          {order.vehicle?.year} {order.vehicle?.license_plate && `• ${order.vehicle.license_plate}`}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs truncate text-slate-300">
                        {order.description || 'Sin descripción'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-300">
                        {order.assigned_mechanic?.name || 'Sin asignar'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-300">
                        {order.estimated_cost ? `$${order.estimated_cost.toLocaleString()}` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-300">
                        {new Date(order.entry_date).toLocaleDateString('es-MX')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewOrder(order)}
                          className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Más opciones"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modales */}
      <NewOrderModal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        onSuccess={handleNewOrderSuccess}
        organizationId={organizationId}
      />

      <OrderDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        onUpdate={loadOrders}
      />
    </div>
  );
}