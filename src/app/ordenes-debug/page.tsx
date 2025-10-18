'use client';

import { KanbanBoardDebug } from '@/components/ordenes/KanbanBoardDebug';

export default function OrdenesDebugPage() {
  const organizationId = '00000000-0000-0000-0000-000000000001';

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-[1920px] mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Órdenes Debug</h1>
        <p className="text-slate-400 mb-6">Versión simplificada para debug</p>
        
        <KanbanBoardDebug organizationId={organizationId} />
      </div>
    </div>
  );
}






