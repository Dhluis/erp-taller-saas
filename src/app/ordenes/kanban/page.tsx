'use client';

import { useState } from 'react';
import { KanbanBoard } from '@/components/ordenes/KanbanBoard';
import { useOrganization } from '@/lib/context/SessionContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Search, RefreshCw, Plus } from 'lucide-react';
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs';
import { OrdersViewTabs } from '@/components/ordenes/OrdersViewTabs';
import CreateWorkOrderModal from '@/components/ordenes/CreateWorkOrderModal';
import { Button } from '@/components/ui/button';

export default function KanbanPage() {
  const { organizationId, loading: orgLoading, ready } = useOrganization();
  const permissions = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // ✅ FIX: Esperar a que organizationId esté ready y estable
  if (!organizationId || orgLoading || !ready) {
    return (
      <div className="flex items-center justify-center h-64">
          <p className="text-slate-400">Cargando organización...</p>
          {organizationId && !ready && (
            <p className="text-xs text-slate-500 mt-2">Estabilizando organización...</p>
          )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <StandardBreadcrumbs
        currentPage="Kanban"
        parentPages={[{ label: 'Órdenes', href: '/ordenes' }]}
        className="mb-4"
      />
      
      {/* Tabs de vista */}
      <OrdersViewTabs />

      {/* Header con búsqueda */}
      <div className="mb-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Kanban</h1>
          <div className="flex gap-3">
            {/* ✅ Solo mostrar botón de crear orden si el usuario tiene permisos */}
            {permissions.canCreate('work_orders') && (
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="gap-2 bg-cyan-500 hover:bg-cyan-600"
              >
                <Plus className="w-4 h-4" />
                Nueva Orden
              </Button>
            )}
          <Button
              onClick={() => {
                console.log('🔄 [KanbanPage] Botón Actualizar clickeado');
                setRefreshKey(prev => {
                  const newKey = prev + 1;
                  console.log('🔄 [KanbanPage] refreshKey actualizado:', newKey);
                  return newKey;
                });
              }}
            variant="outline"
            size="sm"
              className="flex items-center gap-2"
          >
              <RefreshCw className="w-4 h-4" />
            Actualizar
          </Button>
        </div>
      </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por cliente, vehículo, placa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
              </div>
            </div>

      {/* ✅ Pasamos organizationId, searchQuery, refreshKey, onCreateOrder y canCreate */}
      <KanbanBoard 
        organizationId={organizationId} 
        searchQuery={searchQuery}
        refreshKey={refreshKey}
        onCreateOrder={() => setIsCreateModalOpen(true)}
        canCreate={permissions.canCreate('work_orders')}
      />

      {/* Modal de crear orden */}
      <CreateWorkOrderModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={() => {
          console.log('✅ [KanbanPage] Orden creada exitosamente, actualizando...');
          setRefreshKey(prev => {
            const newKey = prev + 1;
            console.log('🔄 [KanbanPage] refreshKey actualizado después de crear orden:', newKey);
            return newKey;
          });
        }}
      />
    </div>
  );
}