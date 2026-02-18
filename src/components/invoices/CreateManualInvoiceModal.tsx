'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCustomers } from '@/hooks/useCustomers';
import { useOrganization } from '@/lib/context/SessionContext';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface CreateManualInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia/SPEI' },
  { value: 'check', label: 'Cheque' },
  { value: 'other', label: 'Otro' },
];

export function CreateManualInvoiceModal({ open, onOpenChange, onSuccess }: CreateManualInvoiceModalProps) {
  const { organizationId } = useOrganization();
  const { customers } = useCustomers();
  const supabase = createClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [vehicleId, setVehicleId] = useState<string>('');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  });
  const [applyTax, setApplyTax] = useState(true);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', quantity: 1, unit_price: 0, total: 0 }
  ]);

  // Load vehicles when customer changes
  useEffect(() => {
    if (!customerId) {
      setVehicles([]);
      setVehicleId('');
      return;
    }

    const loadVehicles = async () => {
      setLoadingVehicles(true);
      try {
        const { data, error } = await supabase
          .from('vehicles')
          .select('id, brand, model, year, license_plate')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setVehicles(data || []);
      } catch (error) {
        console.error('Error loading vehicles:', error);
        toast.error('Error al cargar vehículos');
      } finally {
        setLoadingVehicles(false);
      }
    };

    loadVehicles();
  }, [customerId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setCustomerId('');
      setVehicleId('');
      setNotes('');
      setPaymentMethod('cash');
      setApplyTax(true);
      setDiscountAmount(0);
      setItems([{ id: '1', description: '', quantity: 1, unit_price: 0, total: 0 }]);
      const date = new Date();
      date.setDate(date.getDate() + 30);
      setDueDate(date.toISOString().split('T')[0]);
    }
  }, [open]);

  const addItem = () => {
    const newId = String(Date.now());
    setItems([...items, { id: newId, description: '', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) {
      toast.error('Debe haber al menos un concepto');
      return;
    }
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;

      const updated = { ...item, [field]: value };

      // Recalculate total when quantity or unit_price changes
      if (field === 'quantity' || field === 'unit_price') {
        updated.total = updated.quantity * updated.unit_price;
      }

      return updated;
    }));
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = applyTax ? subtotal * 0.16 : 0;
  const total = subtotal + taxAmount - discountAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      toast.error('Selecciona un cliente');
      return;
    }

    const validItems = items.filter(item => item.description.trim() && item.quantity > 0 && item.unit_price > 0);

    if (validItems.length === 0) {
      toast.error('Agrega al menos un concepto válido');
      return;
    }

    if (total <= 0) {
      toast.error('El total debe ser mayor a cero');
      return;
    }

    setIsSubmitting(true);

    try {
      const invoiceData = {
        source: 'manual',
        organization_id: organizationId,
        customer_id: customerId,
        vehicle_id: vehicleId || null,
        status: 'draft',
        subtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: total,
        due_date: dueDate,
        notes: notes || null,
        payment_method: paymentMethod,
        invoice_items: validItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
        })),
      };

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(invoiceData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al crear factura');
      }

      toast.success('Factura creada exitosamente');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast.error(error.message || 'Error al crear factura');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Factura Manual</DialogTitle>
          <DialogDescription>
            Factura sin orden de trabajo asociada
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cliente y Vehículo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cliente *</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Vehículo (opcional)</Label>
              <Select
                value={vehicleId}
                onValueChange={setVehicleId}
                disabled={!customerId || loadingVehicles}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !customerId ? "Primero selecciona cliente" :
                      loadingVehicles ? "Cargando..." :
                        vehicles.length === 0 ? "Sin vehículos" :
                          "Seleccionar vehículo..."
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Ninguno</SelectItem>
                  {vehicles.map(vehicle => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.brand} {vehicle.model} - {vehicle.license_plate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Conceptos *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar concepto
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-start p-3 border rounded-lg">
                  <div className="col-span-5">
                    <Input
                      placeholder="Descripción del servicio/producto"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      placeholder="Cant."
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="P. Unit"
                      value={item.unit_price}
                      onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      value={`$${item.total.toFixed(2)}`}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totales */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={applyTax}
                  onChange={(e) => setApplyTax(e.target.checked)}
                  className="rounded"
                />
                IVA (16%):
              </label>
              <span className="font-medium text-sm">${taxAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center">
              <Label className="text-sm">Descuento:</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                max={subtotal}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                className="w-32 text-right"
              />
            </div>

            <div className="flex justify-between text-lg font-bold border-t pt-3">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Otros detalles */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Método de pago</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(method => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Fecha de vencimiento</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label>Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Información adicional sobre la factura..."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear factura'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
