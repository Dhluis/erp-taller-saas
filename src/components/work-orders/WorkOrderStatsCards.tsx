'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Clock,
  PlayCircle,
  Wrench,
  CheckCheck,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { WorkOrderStats } from '@/hooks/useWorkOrders';

interface WorkOrderStatsCardsProps {
  stats: WorkOrderStats | null;
  loading: boolean;
}

export function WorkOrderStatsCards({ stats, loading }: WorkOrderStatsCardsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-8 w-8 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded mb-1" />
              <div className="h-3 w-32 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      title: 'Total Órdenes',
      value: stats.total,
      icon: Clock,
      description: 'Órdenes totales',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Pendientes',
      value: stats.pending,
      icon: Clock,
      description: 'Esperando atención',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
    {
      title: 'En Progreso',
      value: stats.in_progress + stats.diagnosed + stats.approved,
      icon: PlayCircle,
      description: 'En proceso activo',
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100',
    },
    {
      title: 'En Reparación',
      value: stats.in_repair + stats.waiting_parts,
      icon: Wrench,
      description: 'Siendo reparadas',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Completadas',
      value: stats.completed + stats.delivered,
      icon: CheckCheck,
      description: 'Finalizadas',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Ingresos Totales',
      value: `$${stats.total_revenue.toFixed(2)}`,
      icon: DollarSign,
      description: `Promedio: $${stats.average_order_value.toFixed(2)}`,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

