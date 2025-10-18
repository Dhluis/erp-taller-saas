'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { WorkOrder, CreateWorkOrderData } from '@/hooks/useWorkOrders';
import { useCustomers } from '@/hooks/useCustomers';
import { useVehicles } from '@/hooks/useVehicles';
import { Plus, Trash2, User, Car, Calendar, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface WorkOrderFormProps {
  workOrder?: WorkOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateWorkOrderData) => Promise<void>;
  isSubmitting: boolean;
}

export function WorkOrderForm({
  workOrder,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: WorkOrderFormProps) {
  const { customers, fetchCustomers } = useCustomers();
  const { vehicles, fetchVehiclesByCustomer } = useVehicles();

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [description, setDescription] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [estimatedCompletion, setEstimatedCompletion] = useState('');

  // Cargar datos iniciales
  useEffect(() => {
    if (isOpen) {
      fetchCustomers();

      if (workOrder) {
        setCustomerId(workOrder.customer_id);
        setVehicleId(workOrder.vehicle_id);
        setDescription(workOrder.description);
        setDiagnosis(workOrder.diagnosis || '');
        setAssignedTo(workOrder.assigned_to || '');
        setEstimatedCompletion(
          workOrder.estimated_completion
            ? new Date(workOrder.estimated_completion).toISOString().split('T')[0]
            : ''
        );

        // Cargar vehículos del cliente
        if (workOrder.customer_id) {
          fetchVehiclesByCustomer(workOrder.customer_id);
        }
      }
    }
  }, [isOpen, workOrder]);

  // Cargar vehículos cuando cambia el cliente
  useEffect(() => {
    if (customerId) {
      fetchVehiclesByCustomer(customerId);
      // Limpiar vehículo seleccionado si cambia el cliente
      if (!workOrder) {
        setVehicleId('');
      }
    }
  }, [customerId, fetchVehiclesByCustomer, workOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!customerId) {
      toast.error('Error de validación', {
        description: 'Debes seleccionar un cliente',
      });
      return;
    }

    if (!vehicleId) {
      toast.error('Error de validación', {
        description: 'Debes seleccionar un vehículo',
      });
      return;
    }

    if (!description.trim()) {
      toast.error('Error de validación', {
        description: 'Debes ingresar una descripción',
      });
      return;
    }

    const formData: CreateWorkOrderData = {
      customer_id: customerId,
      vehicle_id: vehicleId,
      description: description.trim(),
      diagnosis: diagnosis.trim() || undefined,
      assigned_to: assignedTo.trim() || undefined,
      estimated_completion: estimatedCompletion || undefined,
    };

    await onSubmit(formData);
    handleClose();
  };

  const handleClose = () => {
    // Limpiar formulario
    setCustomerId('');
    setVehicleId('');
    setDescription('');
    setDiagnosis('');
    setAssignedTo('');
    setEstimatedCompletion('');
    onClose();
  };

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {workOrder ? 'Editar Orden de Trabajo' : 'Nueva Orden de Trabajo'}
          </DialogTitle>
          <DialogDescription>
            {workOrder
              ? 'Modifica los detalles de la orden de trabajo'
              : 'Crea una nueva orden de trabajo para un cliente y vehículo'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sección: Cliente y Vehículo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Cliente y Vehículo
              </CardTitle>
              <CardDescription>
                Selecciona el cliente y el vehículo para esta orden
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cliente */}
              <div className="space-y-2">
                <Label htmlFor="customer">
                  Cliente <span className="text-destructive">*</span>
                </Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger id="customer">
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.first_name} {customer.last_name}
                        {customer.email && ` - ${customer.email}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCustomer && (
                  <p className="text-sm text-muted-foreground">
                    📞 {selectedCustomer.phone || 'Sin teléfono'}
                  </p>
                )}
              </div>

              {/* Vehículo */}
              <div className="space-y-2">
                <Label htmlFor="vehicle">
                  Vehículo <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={vehicleId}
                  onValueChange={setVehicleId}
                  disabled={!customerId}
                >
                  <SelectTrigger id="vehicle">
                    <SelectValue
                      placeholder={
                        customerId
                          ? 'Selecciona un vehículo'
                          : 'Primero selecciona un cliente'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.length === 0 && customerId ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Este cliente no tiene vehículos registrados
                      </div>
                    ) : (
                      vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.brand} {vehicle.model} {vehicle.year} -{' '}
                          {vehicle.license_plate}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedVehicle && (
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>🚗 {selectedVehicle.color || 'Color no especificado'}</p>
                    {selectedVehicle.vin && <p>VIN: {selectedVehicle.vin}</p>}
                    {selectedVehicle.mileage && (
                      <p>Kilometraje: {selectedVehicle.mileage.toLocaleString()} km</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sección: Detalles del Trabajo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Car className="h-5 w-5" />
                Detalles del Trabajo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Descripción */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Descripción del trabajo <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Ej: Cambio de aceite y filtro, revisión de frenos..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  required
                />
              </div>

              {/* Diagnóstico */}
              <div className="space-y-2">
                <Label htmlFor="diagnosis">Diagnóstico (opcional)</Label>
                <Textarea
                  id="diagnosis"
                  placeholder="Diagnóstico detallado del problema..."
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Asignado a */}
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Asignado a (opcional)</Label>
                <Input
                  id="assignedTo"
                  placeholder="Nombre del técnico o mecánico"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                />
              </div>

              {/* Fecha estimada de finalización */}
              <div className="space-y-2">
                <Label htmlFor="estimatedCompletion" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fecha estimada de finalización (opcional)
                </Label>
                <Input
                  id="estimatedCompletion"
                  type="date"
                  value={estimatedCompletion}
                  onChange={(e) => setEstimatedCompletion(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </CardContent>
          </Card>

          {/* Nota informativa sobre items */}
          {!workOrder && (
            <Card className="border-cyan-200 bg-cyan-50">
              <CardContent className="pt-6">
                <p className="text-sm text-cyan-900">
                  ℹ️ <strong>Nota:</strong> Después de crear la orden, podrás agregar
                  servicios y partes desde el detalle de la orden.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Botones de acción */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting
                ? 'Guardando...'
                : workOrder
                ? 'Actualizar Orden'
                : 'Crear Orden'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

