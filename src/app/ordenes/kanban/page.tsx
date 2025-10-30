'use client';

import { useState } from 'react';
import { KanbanBoard } from '@/components/ordenes/KanbanBoard';
import { useAuth } from '@/contexts/AuthContext';
import { Search, RefreshCw } from 'lucide-react';
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';

export default function KanbanPage() {
  const { organization } = useAuth();
  const organizationId = organization?.organization_id || null;
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  if (!organizationId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Cargando organización...</p>
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
      {/* Header con búsqueda */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Kanban</h1>
          <Button
            onClick={() => setRefreshKey(prev => prev + 1)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </Button>
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

      {/* ✅ Pasamos organizationId, searchQuery y refreshKey */}
      <KanbanBoard 
        organizationId={organizationId} 
        searchQuery={searchQuery}
        refreshKey={refreshKey}
      />
    </div>
  );
}