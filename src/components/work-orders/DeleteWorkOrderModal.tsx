'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { WorkOrder } from '@/hooks/useWorkOrders';

interface DeleteWorkOrderModalProps {
  workOrder: WorkOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteWorkOrderModal({
  workOrder,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteWorkOrderModalProps) {
  if (!workOrder) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar orden de trabajo?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Estás a punto de eliminar la orden de trabajo:{' '}
              <span className="font-semibold">
                #{workOrder.id.slice(0, 8).toUpperCase()}
              </span>
            </p>
            <p className="text-sm">
              <strong>Cliente:</strong>{' '}
              {workOrder.customer
                ? `${workOrder.customer.first_name} ${workOrder.customer.last_name}`
                : 'N/A'}
            </p>
            <p className="text-sm">
              <strong>Vehículo:</strong>{' '}
              {workOrder.vehicle
                ? `${workOrder.vehicle.brand} ${workOrder.vehicle.model} ${workOrder.vehicle.year}`
                : 'N/A'}
            </p>
            <p className="text-sm">
              <strong>Total:</strong> ${workOrder.total_amount.toFixed(2)}
            </p>
            <p className="mt-4 text-destructive font-medium">
              Esta acción no se puede deshacer. Se eliminarán también todos los
              items asociados a esta orden.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Eliminando...' : 'Eliminar orden'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

