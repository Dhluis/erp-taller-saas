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
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CreatePaymentData, SalesInvoice } from '@/hooks/useBilling';
import { CreditCard, Save, X, DollarSign, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentFormProps {
  invoice: SalesInvoice | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePaymentData) => Promise<void>;
  isSubmitting: boolean;
}

export function PaymentForm({
  invoice,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: PaymentFormProps) {
  // Form state
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<CreatePaymentData['payment_method']>('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState('');

  // Cargar datos iniciales
  useEffect(() => {
    if (isOpen && invoice) {
      // Fecha por defecto: hoy
      setPaymentDate(new Date().toISOString().split('T')[0]);
      // Monto sugerido: saldo pendiente
      setAmount(invoice.balance.toString());
    }
  }, [isOpen, invoice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invoice) return;

    // Validaciones
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Error de validación', {
        description: 'El monto debe ser mayor a cero',
      });
      return;
    }

    if (parseFloat(amount) > invoice.balance) {
      toast.error('Error de validación', {
        description: 'El monto no puede ser mayor al saldo pendiente',
      });
      return;
    }

    if (!paymentDate) {
      toast.error('Error de validación', {
        description: 'Debes seleccionar una fecha de pago',
      });
      return;
    }

    const formData: CreatePaymentData = {
      invoice_id: invoice.id,
      amount: parseFloat(amount),
      payment_method: paymentMethod,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
      payment_date: paymentDate,
    };

    await onSubmit(formData);
    handleClose();
  };

  const handleClose = () => {
    // Limpiar formulario
    setAmount('');
    setPaymentMethod('cash');
    setReference('');
    setNotes('');
    setPaymentDate('');
    onClose();
  };

  if (!invoice) return null;

  const paymentMethodOptions = [
    { value: 'cash', label: '💵 Efectivo' },
    { value: 'card', label: '💳 Tarjeta' },
    { value: 'transfer', label: '🏦 Transferencia' },
    { value: 'check', label: '📝 Cheque' },
    { value: 'other', label: '📋 Otro' },
  ];

  const isPartialPayment = parseFloat(amount) < invoice.balance;
  const isFullPayment = parseFloat(amount) === invoice.balance;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Registrar Pago
          </DialogTitle>
          <DialogDescription>
            Registra un pago para la nota de venta {invoice.invoice_number}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información de la nota */}
          <Card className="border-cyan-200 bg-cyan-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Información de la Nota de Venta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-medium">
                  {invoice.customer
                    ? `${invoice.customer.first_name} ${invoice.customer.last_name}`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total de la nota:</span>
                <span className="font-semibold">
                  ${invoice.total_amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pagado hasta ahora:</span>
                <span className="font-semibold text-green-600">
                  ${invoice.paid_amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-lg border-t pt-2">
                <span className="font-semibold">Saldo pendiente:</span>
                <span className="font-bold text-orange-600">
                  ${invoice.balance.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Formulario de pago */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Detalles del Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Monto */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Monto del pago <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    min="0.01"
                    max={invoice.balance}
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Máximo: ${invoice.balance.toFixed(2)}
                </p>
              </div>

              {/* Método de pago */}
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">
                  Método de pago <span className="text-destructive">*</span>
                </Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="paymentMethod">
                    <SelectValue placeholder="Selecciona un método" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethodOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Referencia */}
              <div className="space-y-2">
                <Label htmlFor="reference">Referencia (opcional)</Label>
                <Input
                  id="reference"
                  placeholder="Ej: Transferencia #12345, Cheque #67890..."
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Número de referencia, comprobante o folio del pago
                </p>
              </div>

              {/* Notas */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notas adicionales (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Observaciones sobre el pago..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Fecha de pago */}
              <div className="space-y-2">
                <Label htmlFor="paymentDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fecha del pago <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Fecha en que se realizó el pago
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Resumen del pago */}
          {amount && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Monto del pago:</span>
                    <span className="font-semibold">${parseFloat(amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Saldo después del pago:</span>
                    <span className="font-semibold">
                      ${(invoice.balance - parseFloat(amount)).toFixed(2)}
                    </span>
                  </div>
                  {isFullPayment && (
                    <div className="text-center text-green-700 font-semibold">
                      ✅ ¡Pago completo! La nota quedará como "Pagada"
                    </div>
                  )}
                  {isPartialPayment && (
                    <div className="text-center text-orange-700 font-semibold">
                      ⚠️ Pago parcial. La nota quedará como "Pago Parcial"
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Advertencia sobre pagos */}
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                <div className="text-xs text-orange-900">
                  <p className="font-semibold">⚠️ IMPORTANTE:</p>
                  <p>
                    Una vez registrado el pago, no podrás modificarlo. 
                    Si necesitas hacer cambios, deberás eliminar el pago y crear uno nuevo.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

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
            <Button type="submit" disabled={isSubmitting || !amount || !paymentDate}>
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Registrando...' : 'Registrar Pago'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
















