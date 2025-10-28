'use client';

import { Plus, Search, Filter, RefreshCw, Home, ChevronRight, Wrench } from 'lucide-react';
import { KanbanBoard } from '@/components/ordenes/KanbanBoard';
import { NewOrderModal } from '@/components/ordenes/NewOrderModal';
import { useState } from 'react';

export default function OrdenesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);

  // TODO: Obtener organizationId del usuario autenticado
  const organizationId = '00000000-0000-0000-0000-000000000001';

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleNewOrder = () => {
    setIsNewOrderModalOpen(true);
  };

  const handleNewOrderSuccess = () => {
    setRefreshKey(prev => prev + 1); // Refrescar el Kanban
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-[1920px] mx-auto">
        {/* Migas de Pan */}
        <nav className="flex items-center gap-2 mb-6 text-sm">
          <a 
            href="/dashboard" 
            className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors rounded-lg px-3 py-2 hover:bg-slate-800/50 group"
          >
            <Home className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Dashboard</span>
          </a>
          <ChevronRight className="w-4 h-4 text-slate-600" />
          <div className="flex items-center gap-2 text-white font-medium bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg px-4 py-2 border border-cyan-500/20 shadow-lg shadow-cyan-500/5">
            <Wrench className="w-4 h-4 text-cyan-400" />
            <span>Órdenes de Trabajo</span>
          </div>
        </nav>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Órdenes de Trabajo</h1>
              <p className="text-slate-400">Gestiona el flujo de trabajo de tus órdenes</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Botón Refresh */}
              <button
                onClick={handleRefresh}
                className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors group"
                title="Actualizar"
              >
                <RefreshCw className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 group-hover:rotate-180 transition-all duration-300" />
              </button>

              {/* Botón Nueva Orden */}
              <button
                onClick={handleNewOrder}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                <span>Nueva Orden</span>
              </button>
            </div>
          </div>

          {/* Filtros y búsqueda */}
          <div className="flex items-center gap-3">
            {/* Búsqueda */}
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por cliente, vehículo o placa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Botón Filtros */}
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors text-slate-300">
              <Filter className="w-5 h-5" />
              <span>Filtros</span>
            </button>
          </div>
        </div>

        {/* Kanban Board */}
        <KanbanBoard 
          key={refreshKey} 
          organizationId={organizationId}
          searchQuery={searchQuery}
        />
      </div>

      {/* Modal nueva orden */}
      <NewOrderModal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        organizationId={organizationId}
        onSuccess={handleNewOrderSuccess}
      />
    </div>
  );
}