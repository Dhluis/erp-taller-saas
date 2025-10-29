'use client';

import { KanbanBoard } from '@/components/ordenes/KanbanBoard';
import { useAuth } from '@/contexts/AuthContext';

export default function OrdenesPage() {
  const { organization } = useAuth();
  const organizationId = organization?.organization_id || null;

  if (!organizationId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Cargando organización...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <KanbanBoard />
    </div>
  );
}