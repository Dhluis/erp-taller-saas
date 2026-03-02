'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { WorkOrder, KanbanColumn as KanbanColumnType } from '@/types/orders';
import { KanbanColumn } from './KanbanColumn';

interface KanbanBoardSimpleProps {
  organizationId: string;
}

const KANBAN_COLUMNS: Omit<KanbanColumnType, 'orders'>[] = [
  { id: 'reception',        title: 'Recepción',             color: 'text-slate-400',   bgColor: 'bg-slate-500/10',   borderColor: 'border-slate-500/30' },
  { id: 'diagnosis',        title: 'Diagnóstico',           color: 'text-purple-400',  bgColor: 'bg-purple-500/10',  borderColor: 'border-purple-500/30' },
  { id: 'initial_quote',    title: 'Cotización',            color: 'text-blue-400',    bgColor: 'bg-blue-500/10',    borderColor: 'border-blue-500/30' },
  { id: 'waiting_approval', title: 'Esperando Aprobación',  color: 'text-yellow-400',  bgColor: 'bg-yellow-500/10',  borderColor: 'border-yellow-500/30' },
  { id: 'disassembly',      title: 'Desarmado',             color: 'text-orange-400',  bgColor: 'bg-orange-500/10',  borderColor: 'border-orange-500/30' },
  { id: 'waiting_parts',    title: 'Esperando Piezas',      color: 'text-amber-400',   bgColor: 'bg-amber-500/10',   borderColor: 'border-amber-500/30' },
  { id: 'assembly',         title: 'Armado',                color: 'text-indigo-400',  bgColor: 'bg-indigo-500/10',  borderColor: 'border-indigo-500/30' },
  { id: 'testing',          title: 'Pruebas',               color: 'text-cyan-400',    bgColor: 'bg-cyan-500/10',    borderColor: 'border-cyan-500/30' },
  { id: 'ready',            title: 'Listo',                 color: 'text-green-400',   bgColor: 'bg-green-500/10',   borderColor: 'border-green-500/30' },
  { id: 'completed',        title: 'Completado',            color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
];

export function KanbanBoardSimple({ organizationId }: KanbanBoardSimpleProps) {
  const router = useRouter();
  const [columns, setColumns] = useState<KanbanColumnType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchOrders() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch('/api/work-orders?limit=200', { credentials: 'include' });
        if (!res.ok) throw new Error(`Error ${res.status} al cargar órdenes`);

        const json = await res.json();
        const orders: WorkOrder[] = json.orders ?? json.data ?? json ?? [];

        if (!cancelled) {
          const columnsWithOrders = KANBAN_COLUMNS.map((col) => ({
            ...col,
            orders: orders.filter((o) => o.status === col.id),
          }));
          setColumns(columnsWithOrders);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Error desconocido');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchOrders();
    return () => { cancelled = true; };
  }, [organizationId]);

  function handleOrderClick(orderId: string) {
    router.push(`/ordenes/${orderId}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 text-sm animate-pulse">Cargando órdenes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  const totalOrders = columns.reduce((sum, col) => sum + col.orders.length, 0);
  if (totalOrders === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-white mb-2">Sin órdenes de trabajo</h3>
          <p className="text-slate-400 mb-6">Aún no hay órdenes de trabajo registradas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
      {columns.map((column) => (
        <KanbanColumn
          key={column.id}
          column={column}
          onOrderClick={handleOrderClick}
        />
      ))}
    </div>
  );
}
