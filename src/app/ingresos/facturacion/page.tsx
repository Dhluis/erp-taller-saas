'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';
import { useOrganization } from '@/lib/context/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/navigation/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Plus, Search, Eye, DollarSign, XCircle, Loader2, CalendarDays } from 'lucide-react';
import { useInvoices } from '@/hooks/useInvoices';
import { toast } from 'sonner';

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
type StatusFilter = 'all' | 'pending' | 'paid' | 'overdue';

interface Invoice {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  total?: number;
  total_amount?: number;
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  due_date: string;
  paid_date?: string;
  created_at: string;
  notes?: string;
  customer_id?: string;
  vehicle_id?: string;
  customer?: { id: string; name: string; email?: string; phone?: string };
  vehicle?: { id: string; brand: string; model: string; year?: number; license_plate?: string };
  invoice_items?: Array<{
    id: string;
    description?: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
}

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  reference?: string;
  notes?: string;
}

const STATUS_BADGES: Record<InvoiceStatus, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'bg-gray-500/20 text-gray-400 border-gray-500/40' },
  sent: { label: 'Enviada', className: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
  paid: { label: 'Pagada', className: 'bg-green-500/20 text-green-400 border-green-500/40' },
  overdue: { label: 'Vencida', className: 'bg-red-500/20 text-red-400 border-red-500/40' },
  cancelled: { label: 'Cancelada', className: 'bg-gray-500/20 text-gray-400 border-gray-500/40' },
};

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia/SPEI' },
  { value: 'check', label: 'Cheque' },
  { value: 'other', label: 'Otro' },
];

export default function FacturacionPage() {
  const router = useRouter();
  const permissions = usePermissions();
  const { organizationId, ready } = useOrganization();
  const hasLoadedRef = useRef(false);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    pendingInvoices: 0,
    paidInvoices: 0,
    overdueInvoices: 0,
    averageInvoiceValue: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [viewPayments, setViewPayments] = useState<Payment[]>([]);
  const [viewTotalPaid, setViewTotalPaid] = useState(0);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [payInvoiceTotalPaid, setPayInvoiceTotalPaid] = useState(0);
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);

  const statusParam =
    statusFilter === 'all' ? undefined : statusFilter;
  const { invoices, pagination, isLoading, mutate } = useInvoices(
    page,
    pageSize,
    statusParam,
    searchQuery
  );

  const filteredInvoices = invoices;

  useEffect(() => {
    if (!permissions.isAdmin && !permissions.canRead('invoices')) {
      router.push('/dashboard');
    }
  }, [permissions, router]);

  useEffect(() => {
    if (hasLoadedRef.current || !ready || !organizationId) return;
    hasLoadedRef.current = true;

    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const res = await fetch('/api/ingresos/stats', { credentials: 'include' });
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          setStats({
            totalRevenue: d.totalRevenue ?? d.total_cobrado ?? 0,
            monthlyRevenue: d.monthlyRevenue ?? d.ingresos_este_mes ?? 0,
            pendingInvoices: d.pendingInvoices ?? d.facturas_pendientes ?? 0,
            paidInvoices: d.paidInvoices ?? d.facturas_pagadas ?? 0,
            overdueInvoices: d.overdueInvoices ?? d.facturas_vencidas ?? 0,
            averageInvoiceValue: d.averageInvoiceValue ?? 0,
          });
        }
      } catch (e) {
        console.error('Error loading stats:', e);
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();
  }, [organizationId, ready]);

  const canPay = permissions.canPayInvoices();
  const canCreate = permissions.canCreate('invoices');
  const canDelete = permissions.canDelete('invoices');

  if (!permissions.isAdmin && !permissions.canRead('invoices')) {
    return null;
  }

  const getStatusBadge = (status: InvoiceStatus) => {
    const config = STATUS_BADGES[status] ?? { label: status, className: '' };
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const openViewModal = async (invoice: Invoice) => {
    setViewInvoice(invoice);
    setViewPayments([]);
    setViewTotalPaid(0);
    try {
      const [detailRes, paymentsRes] = await Promise.all([
        fetch(`/api/invoices/${invoice.id}`, { credentials: 'include' }),
        fetch(`/api/invoices/${invoice.id}/payments`, { credentials: 'include' }),
      ]);
      const detailJson = await detailRes.json();
      const paymentsJson = await paymentsRes.json();
      if (detailJson.success && detailJson.data) {
        setViewInvoice(detailJson.data);
      }
      if (paymentsJson.success && paymentsJson.data) {
        setViewPayments(paymentsJson.data.payments || []);
        setViewTotalPaid(paymentsJson.data.total_paid || 0);
      }
    } catch (e) {
      console.error('Error loading invoice detail:', e);
    }
  };

  const handleCancelInvoice = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'cancelled' }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Factura cancelada');
        setCancelConfirm(null);
        mutate();
      } else {
        toast.error(json.error || 'Error al cancelar');
      }
    } catch (e) {
      toast.error('Error al cancelar factura');
    }
  };

  const breadcrumbs = [
    { label: 'Ingresos', href: '/ingresos' },
    { label: 'Facturación', href: '/ingresos/facturacion' },
  ];

  return (
    <AppLayout title="Facturación" breadcrumbs={breadcrumbs}>
      <div className="space-y-6 p-6">
        <PageHeader
          title="Facturación"
          description="Administra las facturas y cobros del taller"
          breadcrumbs={breadcrumbs}
          actions={
            canCreate && (
              <Button onClick={() => router.push('/ordenes?filter_status=completed')}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva factura
              </Button>
            )
          }
        />

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            {(['all', 'pending', 'paid', 'overdue'] as const).map((f) => (
              <Button
                key={f}
                variant={statusFilter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setStatusFilter(f);
                  setPage(1);
                }}
              >
                {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : f === 'paid' ? 'Pagadas' : 'Vencidas'}
              </Button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por folio o notas..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-8"
            />
          </div>
        </div>

        {/* Tabla */}
        <Card className="border border-border bg-bg-secondary">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead># Folio</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No hay facturas
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((inv) => {
                    const total = inv.total ?? inv.total_amount ?? 0;
                    const customerName = inv.customer?.name ?? inv.customer_id ?? '-';
                    const vehicleInfo = inv.vehicle
                      ? `${inv.vehicle.brand} ${inv.vehicle.model} ${inv.vehicle.license_plate || ''}`
                      : '-';
                    const showCobrar = canPay && inv.status !== 'paid' && inv.status !== 'cancelled';
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono">{inv.invoice_number}</TableCell>
                        <TableCell>{customerName}</TableCell>
                        <TableCell>{vehicleInfo}</TableCell>
                        <TableCell>${total.toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(inv.status as InvoiceStatus)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            {new Date(inv.due_date || inv.created_at).toLocaleDateString('es')}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openViewModal(inv as Invoice)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {showCobrar && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-500 hover:text-green-400"
                                onClick={() => {
                                  setPayInvoice(inv as Invoice);
                                  setIsPayModalOpen(true);
                                }}
                              >
                                <DollarSign className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && inv.status !== 'paid' && inv.status !== 'cancelled' && (
                              cancelConfirm === inv.id ? (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleCancelInvoice(inv.id)}
                                >
                                  Confirmar
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500"
                                  onClick={() => setCancelConfirm(inv.id)}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {pagination && pagination.totalPages > 1 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPageChange={setPage}
            onPageSizeChange={() => {}}
            loading={isLoading}
            showPageSizeSelector={false}
          />
        )}
      </div>

      {/* Modal Ver Factura */}
      <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border border-border bg-card">
          <DialogHeader>
            <DialogTitle>Factura {viewInvoice?.invoice_number}</DialogTitle>
            <DialogDescription>Detalle y historial de pagos</DialogDescription>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-medium">{viewInvoice.customer?.name ?? viewInvoice.customer_id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vehículo</p>
                  <p className="font-medium">
                    {viewInvoice.vehicle
                      ? `${viewInvoice.vehicle.brand} ${viewInvoice.vehicle.model}`
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fecha</p>
                  <p className="font-medium">
                    {new Date(viewInvoice.created_at).toLocaleDateString('es')}
                  </p>
                </div>
              </div>
              {(viewInvoice.invoice_items && viewInvoice.invoice_items.length > 0) && (
                <div>
                  <p className="text-sm font-medium mb-2">Conceptos</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Cant.</TableHead>
                        <TableHead>P.Unit</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewInvoice.invoice_items.map((it) => (
                        <TableRow key={it.id}>
                          <TableCell>{it.description ?? '-'}</TableCell>
                          <TableCell>{it.quantity}</TableCell>
                          <TableCell>${Number(it.unit_price).toLocaleString()}</TableCell>
                          <TableCell>${Number(it.total).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="border-t pt-4 space-y-1 text-sm">
                <p>
                  Subtotal: $
                  {(viewInvoice.subtotal ?? viewInvoice.total ?? 0).toLocaleString()}
                </p>
                {(viewInvoice.tax_amount ?? 0) > 0 && (
                  <p>Impuestos: ${Number(viewInvoice.tax_amount).toLocaleString()}</p>
                )}
                <p className="font-semibold">
                  Total: $
                  {(viewInvoice.total ?? viewInvoice.total_amount ?? 0).toLocaleString()}
                </p>
              </div>
              {viewPayments.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Historial de pagos</p>
                  <ul className="space-y-2 text-sm">
                    {viewPayments.map((p) => (
                      <li key={p.id} className="flex justify-between">
                        <span>
                          ${p.amount.toLocaleString()} - {p.payment_method} ({p.payment_date})
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 font-medium">
                    Total pagado: ${viewTotalPaid.toLocaleString()}
                  </p>
                </div>
              )}
              {viewInvoice.status !== 'paid' && viewInvoice.status !== 'cancelled' && canPay && (
                <Button
                  onClick={() => {
                    setPayInvoice(viewInvoice);
                    setPayInvoiceTotalPaid(viewTotalPaid);
                    setViewInvoice(null);
                    setIsPayModalOpen(true);
                  }}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Registrar pago
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Registrar Pago */}
      <RegisterPaymentModal
        open={isPayModalOpen}
        onClose={() => {
          setIsPayModalOpen(false);
          setPayInvoice(null);
        }}
        invoice={payInvoice}
        totalPaid={payInvoiceTotalPaid}
        onSuccess={() => {
          mutate();
          setIsPayModalOpen(false);
          setPayInvoice(null);
          toast.success('Pago registrado');
        }}
      />
    </AppLayout>
  );
}

function RegisterPaymentModal({
  open,
  onClose,
  invoice,
  totalPaid,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  totalPaid: number;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const invoiceTotal = invoice ? (invoice.total ?? invoice.total_amount ?? 0) : 0;
  const remaining = Math.max(0, invoiceTotal - totalPaid);

  useEffect(() => {
    if (open && invoice) {
      setAmount(remaining > 0 ? String(remaining) : '0');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setReference('');
      setNotes('');
    }
  }, [open, invoice, remaining]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0 || amt > remaining) {
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: amt,
          payment_method: paymentMethod,
          payment_date: paymentDate,
          reference: reference || undefined,
          notes: notes || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        onSuccess();
      } else {
        toast.error(json.error || 'Error al registrar pago');
      }
    } catch (e) {
      toast.error('Error al registrar pago');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md border border-border bg-card">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>Factura {invoice.invoice_number}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm mb-4">
          <p>Total factura: ${invoiceTotal.toLocaleString()}</p>
          <p>Ya pagado: ${totalPaid.toLocaleString()}</p>
          <p className="font-semibold">Pendiente: ${remaining.toLocaleString()}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Monto a pagar *</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              max={remaining}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Forma de pago *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Referencia (transferencia, últimos 4 tarjeta)</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ej: SPEI 1234"
            />
          </div>
          <div>
            <Label>Fecha de pago *</Label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
