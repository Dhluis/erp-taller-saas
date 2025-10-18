'use client';

import { Badge } from '@/components/ui/badge';
import {
  Clock,
  PlayCircle,
  Stethoscope,
  CheckCircle,
  Wrench,
  PackageSearch,
  CheckCheck,
  Truck,
} from 'lucide-react';

type WorkOrderStatus =
  | 'pending'
  | 'in_progress'
  | 'diagnosed'
  | 'approved'
  | 'in_repair'
  | 'waiting_parts'
  | 'completed'
  | 'delivered';

interface WorkOrderStatusBadgeProps {
  status: WorkOrderStatus;
  showIcon?: boolean;
}

const statusConfig = {
  pending: {
    label: 'Pendiente',
    variant: 'secondary' as const,
    className: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: Clock,
  },
  in_progress: {
    label: 'En Progreso',
    variant: 'default' as const,
    className: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: PlayCircle,
  },
  diagnosed: {
    label: 'Diagnosticada',
    variant: 'default' as const,
    className: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: Stethoscope,
  },
  approved: {
    label: 'Aprobada',
    variant: 'default' as const,
    className: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    icon: CheckCircle,
  },
  in_repair: {
    label: 'En Reparación',
    variant: 'default' as const,
    className: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: Wrench,
  },
  waiting_parts: {
    label: 'Esperando Piezas',
    variant: 'default' as const,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: PackageSearch,
  },
  completed: {
    label: 'Completada',
    variant: 'default' as const,
    className: 'bg-green-100 text-green-800 border-green-300',
    icon: CheckCheck,
  },
  delivered: {
    label: 'Entregada',
    variant: 'default' as const,
    className: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: Truck,
  },
};

export function WorkOrderStatusBadge({
  status,
  showIcon = true,
}: WorkOrderStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={config.className}>
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {config.label}
    </Badge>
  );
}

