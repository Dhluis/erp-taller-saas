'use client';

import { useState } from 'react';
import type { WorkOrder, KanbanColumn as KanbanColumnType } from '@/types/orders';
import { KanbanColumn } from './KanbanColumn';
import { OrderCard } from './OrderCard';

interface KanbanBoardSimpleProps {
  organizationId: string;
}

// Datos de prueba estáticos
const MOCK_ORDERS: WorkOrder[] = [
  {
    id: '1',
    status: 'reception',
    description: 'Cambio de aceite y filtro',
    entry_date: '2024-01-15',
    created_at: '2024-01-15T10:00:00Z',
    total_amount: 850,
    customer: {
      id: '1',
      name: 'Carlos Martínez Ruiz',
      phone: '4491234569',
      email: 'carlos@email.com'
    },
    vehicle: {
      id: '1',
      brand: 'Honda',
      model: 'Civic',
      year: 2019,
      license_plate: 'ABC-123-A'
    }
  },
  {
    id: '2',
    status: 'diagnosis',
    description: 'Revisión de frenos',
    entry_date: '2024-01-14',
    created_at: '2024-01-14T14:30:00Z',
    total_amount: 1200,
    customer: {
      id: '2',
      name: 'María González López',
      phone: '4491234568',
      email: 'maria@email.com'
    },
    vehicle: {
      id: '2',
      brand: 'Toyota',
      model: 'Corolla',
      year: 2020,
      license_plate: 'DEF-456-B'
    }
  },
  {
    id: '3',
    status: 'completed',
    description: 'Afinación mayor',
    entry_date: '2024-01-13',
    created_at: '2024-01-13T09:15:00Z',
    total_amount: 2500,
    customer: {
      id: '3',
      name: 'Roberto Vargas Silva',
      phone: '4491234575',
      email: 'roberto@email.com'
    },
    vehicle: {
      id: '3',
      brand: 'Ford',
      model: 'Focus',
      year: 2018,
      license_plate: 'GHI-789-C'
    }
  }
];

// Definición de columnas del Kanban
const KANBAN_COLUMNS: Omit<KanbanColumnType, 'orders'>[] = [
  { id: 'reception', title: 'Recepción', color: 'text-slate-400', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/30' },
  { id: 'diagnosis', title: 'Diagnóstico', color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30' },
  { id: 'initial_quote', title: 'Cotización', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  { id: 'waiting_approval', title: 'Esperando Aprobación', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30' },
  { id: 'disassembly', title: 'Desarmado', color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
  { id: 'waiting_parts', title: 'Esperando Piezas', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' },
  { id: 'assembly', title: 'Armado', color: 'text-indigo-400', bgColor: 'bg-indigo-500/10', borderColor: 'border-indigo-500/30' },
  { id: 'testing', title: 'Pruebas', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/30' },
  { id: 'ready', title: 'Listo', color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30' },
  { id: 'completed', title: 'Completado', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
];

export function KanbanBoardSimple({ organizationId }: KanbanBoardSimpleProps) {
  const [columns, setColumns] = useState<KanbanColumnType[]>([]);

  // Inicializar columnas con datos de prueba
  useState(() => {
    console.log('🔄 [KanbanBoardSimple] Inicializando con datos de prueba...');
    const columnsWithOrders = KANBAN_COLUMNS.map(column => ({
      ...column,
      orders: MOCK_ORDERS.filter(order => order.status === column.id)
    }));
    setColumns(columnsWithOrders);
    console.log('✅ [KanbanBoardSimple] Columnas inicializadas:', columnsWithOrders.length);
  });

  // Manejar click en orden
  function handleOrderClick(orderId: string) {
    console.log('📋 Click en orden:', orderId);
    alert(`Click en orden: ${orderId}`);
  }

  // Empty state
  const totalOrders = columns.reduce((sum, col) => sum + col.orders.length, 0);
  if (totalOrders === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-white mb-2">Sin órdenes de trabajo</h3>
          <p className="text-slate-400 mb-6">
            Aún no hay órdenes de trabajo registradas.
          </p>
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











