'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WorkOrder } from '@/hooks/useWorkOrders';
import { WorkOrderStatusBadge } from './WorkOrderStatusBadge';
import { Eye, Edit, Trash2, Calendar, User, Car } from 'lucide-react';

interface WorkOrderCardProps {
  workOrder: WorkOrder;
  onView: (workOrder: WorkOrder) => void;
  onEdit: (workOrder: WorkOrder) => void;
  onDelete: (workOrder: WorkOrder) => void;
}

export function WorkOrderCard({
  workOrder,
  onView,
  onEdit,
  onDelete,
}: WorkOrderCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-sm font-medium">
              #{workOrder.id.slice(0, 8).toUpperCase()}
            </CardTitle>
            <WorkOrderStatusBadge status={workOrder.status} />
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-cyan-600">
              ${workOrder.total_amount.toFixed(2)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Cliente */}
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {workOrder.customer
                ? `${workOrder.customer.first_name} ${workOrder.customer.last_name}`
                : 'Cliente no encontrado'}
            </span>
          </div>

          {/* Vehículo */}
          <div className="flex items-center gap-2 text-sm">
            <Car className="h-4 w-4 text-muted-foreground" />
            <span>
              {workOrder.vehicle
                ? `${workOrder.vehicle.brand} ${workOrder.vehicle.model} ${workOrder.vehicle.year}`
                : 'Vehículo no encontrado'}
            </span>
          </div>

          {/* Descripción */}
          <div className="text-sm">
            <p className="text-muted-foreground line-clamp-2">
              {workOrder.description}
            </p>
          </div>

          {/* Fecha estimada */}
          {workOrder.estimated_completion && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(workOrder.estimated_completion).toLocaleDateString('es-MX')}
              </span>
            </div>
          )}

          {/* Asignado a */}
          {workOrder.assigned_to && (
            <div className="text-sm">
              <span className="text-muted-foreground">Asignado a: </span>
              <span className="font-medium">{workOrder.assigned_to}</span>
            </div>
          )}

          {/* Items count */}
          {workOrder.items && workOrder.items.length > 0 && (
            <div className="text-sm">
              <span className="text-muted-foreground">
                {workOrder.items.length} item{workOrder.items.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-1 pt-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onView(workOrder)}
              className="flex-1"
            >
              <Eye className="h-3 w-3 mr-1" />
              Ver
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(workOrder)}
              className="flex-1"
            >
              <Edit className="h-3 w-3 mr-1" />
              Editar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(workOrder)}
              className="flex-1 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Eliminar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

