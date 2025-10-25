'use client';

import { useState, useEffect } from 'react';
import type { WorkOrder, KanbanColumn as KanbanColumnType } from '@/types/orders';

interface KanbanBoardDebugProps {
  organizationId: string;
}

const KANBAN_COLUMNS = [
  { id: 'reception', title: 'Recepción', color: 'text-slate-400' },
  { id: 'diagnosis', title: 'Diagnóstico', color: 'text-purple-400' },
  { id: 'initial_quote', title: 'Cotización', color: 'text-blue-400' },
  { id: 'waiting_approval', title: 'Esperando Aprobación', color: 'text-yellow-400' },
  { id: 'completed', title: 'Completado', color: 'text-emerald-400' },
];

export function KanbanBoardDebug({ organizationId }: KanbanBoardDebugProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔄 [KanbanBoardDebug] Montando componente...');
    console.log('🔄 [KanbanBoardDebug] organizationId:', organizationId);
    
    // Simular carga
    setTimeout(() => {
      console.log('✅ [KanbanBoardDebug] Carga simulada completada');
      setLoading(false);
    }, 2000);
  }, [organizationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando órdenes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <p className="text-red-400 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
      {KANBAN_COLUMNS.map((column) => (
        <div key={column.id} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className={`text-sm font-semibold mb-3 ${column.color}`}>
            {column.title}
          </div>
          <div className="text-center text-slate-500 py-8">
            Sin órdenes
          </div>
        </div>
      ))}
    </div>
  );
}













