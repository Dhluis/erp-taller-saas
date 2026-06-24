"use client"

import { useState, useEffect, useCallback } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { StandardBreadcrumbs } from "@/components/ui/breadcrumbs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Search, DollarSign, CreditCard, Loader2, TrendingDown } from "lucide-react"
import { useSuppliers } from "@/hooks/useSuppliers"
import { useOrganization } from "@/lib/context/SessionContext"
import { useOrgCurrency } from "@/lib/context/CurrencyContext"
import { toast } from "sonner"

type SupplierPayment = {
  id: string
  supplier_id: string
  amount: number
  payment_date: string
  payment_method: string
  reference?: string | null
  notes?: string | null
  status: string
  created_at: string
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'bank_transfer', label: 'Transferencia bancaria' },
  { value: 'credit_card', label: 'Tarjeta de crédito' },
  { value: 'check', label: 'Cheque' },
  { value: 'other', label: 'Otro' },
]

export default function PagosPage() {
  const { organizationId, ready } = useOrganization()
  const { formatMoney } = useOrgCurrency()
  const { suppliers, loading: suppliersLoading } = useSuppliers({ pageSize: 500, autoLoad: true })

  const [payments, setPayments] = useState<SupplierPayment[]>([])
  const [stats, setStats] = useState({ total: 0, totalPaid: 0, totalPending: 0 })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [supplierFilter, setSupplierFilter] = useState<string>("all")
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [draggedPayment, setDraggedPayment] = useState<SupplierPayment | null>(null);
  const [confirmPaymentModal, setConfirmPaymentModal] = useState<SupplierPayment | null>(null);
  const [confirmCashAccountId, setConfirmCashAccountId] = useState<string>("none");
  const [form, setForm] = useState({
    supplier_id: "",
    amount: "",
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "transfer",
    reference: "",
    notes: "",
    cash_account_id: "",
  })
  const [cashAccounts, setCashAccounts] = useState<Array<{ id: string; name: string }>>([])
  const [supplierFreeText, setSupplierFreeText] = useState('')
  const [registerNewSupplier, setRegisterNewSupplier] = useState(true)

  const loadPayments = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (supplierFilter && supplierFilter !== "all") params.set("supplier_id", supplierFilter)
      const res = await fetch(`/api/supplier-payments?${params.toString()}`, { credentials: "include" })
      if (!res.ok) {
        const errorText = await res.text();
        console.error("API Error 500 Body:", errorText);
        toast.error("Error cargando pagos: " + errorText.substring(0, 50));
      }
      const data = await res.json().catch(() => null);
      if (data?.success && data?.data) {
        setPayments(data.data.items || [])
        setStats(data.data.stats || { total: 0, totalPaid: 0, totalPending: 0 })
      } else {
        setPayments([])
        setStats({ total: 0, totalPaid: 0, totalPending: 0 })
      }
    } catch {
      setPayments([])
      setStats({ total: 0, totalPaid: 0, totalPending: 0 })
    } finally {
      setLoading(false)
    }
  }, [organizationId, supplierFilter])

  useEffect(() => {
    if (ready && organizationId) loadPayments()
  }, [ready, organizationId, loadPayments])

  useEffect(() => {
    if (!organizationId) return
    fetch("/api/cash-accounts", { credentials: "include" })
      .then((r) => r.json())
      .then((res) => {
        if (res?.success && res?.data?.items?.length) {
          setCashAccounts(res.data.items.map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })))
        } else {
          setCashAccounts([])
        }
      })
      .catch(() => setCashAccounts([]))
  }, [organizationId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.supplier_id && !supplierFreeText.trim()) {
      toast.error("Selecciona o ingresa el nombre del proveedor")
      return
    }
    if (!form.amount) {
      toast.error("El monto es requerido")
      return
    }
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Monto debe ser mayor a 0")
      return
    }
    setSubmitting(true)
    try {
      let resolvedSupplierId = form.supplier_id

      if (!resolvedSupplierId && supplierFreeText.trim()) {
        const createRes = await fetch('/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name: supplierFreeText.trim() }),
        })
        const createData = await createRes.json()
        if (!createData?.success) {
          toast.error('No se pudo registrar el proveedor, intenta de nuevo')
          setSubmitting(false)
          return
        }
        resolvedSupplierId = createData.data.id
      }

      const res = await fetch("/api/supplier-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          supplier_id: resolvedSupplierId,
          amount,
          payment_date: form.payment_date,
          payment_method: form.payment_method,
          reference: form.reference || undefined,
          notes: form.notes || undefined,
          cash_account_id: form.cash_account_id || undefined,
        }),
      })
      const data = await res.json()
      if (data?.success) {
        const extra = !form.supplier_id && supplierFreeText.trim() && registerNewSupplier
          ? ` · ${supplierFreeText.trim()} guardado como proveedor` : ''
        toast.success((form.cash_account_id ? "Pago registrado y retiro en cuenta de efectivo." : "Pago registrado.") + extra)
        setModalOpen(false)
        setForm({
          supplier_id: "",
          amount: "",
          payment_date: new Date().toISOString().split("T")[0],
          payment_method: "transfer",
          reference: "",
          notes: "",
          cash_account_id: "",
        })
        setSupplierFreeText(''); setRegisterNewSupplier(true)
        loadPayments()
      } else {
        toast.error(data?.error || "Error al registrar pago")
      }
    } catch {
      toast.error("Error al registrar pago")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: 'pending' | 'completed') => {
    e.preventDefault();
    if (!draggedPayment) return;
    
    const currentStatus = draggedPayment.status === 'completed' || draggedPayment.status === 'paid' ? 'completed' : 'pending';
    if (currentStatus === targetStatus) {
      setDraggedPayment(null);
      return;
    }

    if (targetStatus === 'completed') {
      setConfirmPaymentModal(draggedPayment);
    } else {
      try {
        const res = await fetch(`/api/supplier-payments/${draggedPayment.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'pending' })
        });
        if (res.ok) {
          toast.success('Regresado a pendiente');
          loadPayments();
        }
      } catch (err) {
        toast.error('Error al actualizar estado');
      }
    }
    setDraggedPayment(null);
  };

  const submitStatusChange = async () => {
    if (!confirmPaymentModal) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/supplier-payments/${confirmPaymentModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'completed',
          cash_account_id: confirmCashAccountId === "none" ? null : confirmCashAccountId
        })
      });
      const data = await res.json();
      if (data?.success) {
        toast.success(confirmCashAccountId !== "none" ? 'Pago completado y descontado' : 'Pago marcado como completado');
        setConfirmPaymentModal(null);
        setConfirmCashAccountId("none");
        loadPayments();
      } else {
        toast.error(data?.error || 'Error al actualizar');
      }
    } catch (err) {
      toast.error('Error de red');
    } finally {
      setSubmitting(false);
    }
  };

  const supplierNameById = Object.fromEntries(suppliers.map((s) => [s.id, s.name]))

  const filteredPayments = payments.filter((p) => {
    const name = (supplierNameById[p.supplier_id] || "").toLowerCase()
    const ref = (p.reference || "").toLowerCase()
    const term = searchTerm.toLowerCase()
    return !term || name.includes(term) || ref.includes(term) || p.id.toLowerCase().includes(term)
  })

  const getStatusBadge = (status: string) => {
    if (status === "completed" || status === "paid") return <span className="rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-400 border border-green-500/40">Completado</span>
    if (status === "pending") return <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400 border border-amber-500/40">Pendiente</span>
    return <span className="rounded bg-slate-500/20 px-2 py-0.5 text-xs text-slate-400">{status}</span>
  }

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-6">
        <StandardBreadcrumbs
          currentPage="Pagos a proveedores"
          parentPages={[{ label: "Compras", href: "/compras" }]}
        />

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gestión de Pagos</h1>
            <p className="text-muted-foreground">Registra y consulta pagos a proveedores</p>
          </div>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar pago
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-green-500/10 border-green-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-400">Total pagado</CardTitle>
              <DollarSign className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{formatMoney(stats.totalPaid)}</div>
              <p className="text-xs text-muted-foreground">Pagos completados</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-500/10 border-yellow-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-400">Pendiente</CardTitle>
              <TrendingDown className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">{formatMoney(stats.totalPending)}</div>
              <p className="text-xs text-muted-foreground">Pagos pendientes</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-400">Registros</CardTitle>
              <CreditCard className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Pagos en el listado</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Historial de pagos</CardTitle>
            <div className="mt-2 flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por proveedor o referencia..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Todos los proveedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los proveedores</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPayments.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No hay pagos registrados. Registra el primero con el botón superior.</p>
            ) : (
              (() => {
                const today = new Date();
                today.setHours(0,0,0,0);
                const todayStr = today.toISOString().split('T')[0];

                const pendingPayments = filteredPayments.filter(p => (p.status === 'pending' || (p.status !== 'completed' && p.status !== 'paid')) && p.payment_date >= todayStr);
                const overduePayments = filteredPayments.filter(p => (p.status === 'pending' || (p.status !== 'completed' && p.status !== 'paid')) && p.payment_date < todayStr);
                const completedPayments = filteredPayments.filter(p => p.status === 'completed' || p.status === 'paid');

                const PaymentCard = ({ pago }: { pago: SupplierPayment }) => (
                  <div 
                    draggable
                    onDragStart={() => setDraggedPayment(pago)}
                    className="p-4 bg-slate-800/80 border border-slate-700 hover:border-slate-500 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all flex flex-col gap-2"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-slate-100">{supplierNameById[pago.supplier_id] || 'Desconocido'}</span>
                      <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">{PAYMENT_METHODS.find(m => m.value === pago.payment_method)?.label || pago.payment_method}</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-100 font-mono">
                      {formatMoney(Number(pago.amount))}
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-400 mt-2 border-t border-slate-700/50 pt-2">
                      <span className="flex items-center">
                        <span className="mr-1">📅</span> {new Date(pago.payment_date).toLocaleDateString()}
                      </span>
                      {pago.reference && <span className="bg-slate-700/30 px-1.5 py-0.5 rounded truncate max-w-[100px]">{pago.reference}</span>}
                    </div>
                  </div>
                );

                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Vencidas */}
                    <div 
                      className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex flex-col gap-3 min-h-[400px]"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, 'pending')}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-red-500/20">
                        <h3 className="font-medium text-red-400 flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-red-500"></span>
                          Vencidas
                        </h3>
                        <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full">{overduePayments.length}</span>
                      </div>
                      <div className="flex flex-col gap-3 overflow-y-auto max-h-[600px] custom-scrollbar flex-1">
                        {overduePayments.length === 0 && <div className="text-sm text-center text-slate-500 mt-4 italic border-2 border-dashed border-slate-800/50 p-6 rounded-lg">Cero deudas atrasadas</div>}
                        {overduePayments.map(p => <PaymentCard key={p.id} pago={p} />)}
                      </div>
                    </div>

                    {/* Pendientes */}
                    <div 
                      className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 flex flex-col gap-3 min-h-[400px]"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, 'pending')}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-yellow-500/20">
                        <h3 className="font-medium text-yellow-400 flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                          Al Corriente
                        </h3>
                        <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full">{pendingPayments.length}</span>
                      </div>
                      <div className="flex flex-col gap-3 overflow-y-auto max-h-[600px] custom-scrollbar flex-1">
                        {pendingPayments.length === 0 && <div className="text-sm text-center text-slate-500 mt-4 italic border-2 border-dashed border-slate-800/50 p-6 rounded-lg flex flex-col items-center justify-center gap-2">Arrastra cuentas aquí</div>}
                        {pendingPayments.map(p => <PaymentCard key={p.id} pago={p} />)}
                      </div>
                    </div>

                    {/* Pagadas */}
                    <div 
                      className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 flex flex-col gap-3 min-h-[400px]"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, 'completed')}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-green-500/20">
                        <h3 className="font-medium text-green-400 flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-green-500"></span>
                          Pagadas
                        </h3>
                        <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">{completedPayments.length}</span>
                      </div>
                      <div className="flex flex-col gap-3 overflow-y-auto max-h-[600px] custom-scrollbar flex-1">
                        {completedPayments.length === 0 && <div className="text-sm text-center text-slate-500 mt-4 italic border-2 border-dashed border-slate-800/50 p-6 rounded-lg flex flex-col items-center justify-center gap-2">Arrastra facturas para pagar</div>}
                        {completedPayments.map(p => <PaymentCard key={p.id} pago={p} />)}
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={(o) => { setModalOpen(o); if (!o) { setSupplierFreeText(''); setRegisterNewSupplier(true) } }}>
        <DialogContent className="max-w-md border border-border bg-card">
          <DialogHeader>
            <DialogTitle>Registrar pago a proveedor</DialogTitle>
            <DialogDescription>El pago quedará registrado y, si eliges una cuenta, se descontará de Cuentas de efectivo.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Proveedor *</Label>
              <Select
                value={form.supplier_id}
                onValueChange={(v) => { setForm((f) => ({ ...f, supplier_id: v })); setSupplierFreeText('') }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Buscar proveedor registrado..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliersLoading ? (
                    <SelectItem value="" disabled>Cargando...</SelectItem>
                  ) : (
                    suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {!form.supplier_id && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">o ingresa el nombre</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <Input
                    value={supplierFreeText}
                    onChange={e => setSupplierFreeText(e.target.value)}
                    placeholder="Nombre del proveedor (sin registrar)"
                  />
                  {supplierFreeText.trim() && (
                    <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={registerNewSupplier}
                          onChange={e => setRegisterNewSupplier(e.target.checked)}
                          className="w-4 h-4 rounded accent-rose-500"
                        />
                        <span className="text-sm text-rose-500 font-medium">¿Registrarlo como proveedor?</span>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <Label>Monto *</Label>
              <Input
                type="number"
                step="0.01"
                min={0.01}
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <Label>Fecha de pago *</Label>
              <Input
                type="date"
                value={form.payment_date}
                onChange={(e) => setForm((f) => ({ ...f, payment_date: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label>Forma de pago *</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm((f) => ({ ...f, payment_method: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Referencia</Label>
              <Input
                value={form.reference}
                onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                placeholder="Ej: Transferencia, cheque nº"
              />
            </div>
            {cashAccounts.length > 0 && (
              <div>
                <Label>Cuenta de efectivo (opcional)</Label>
                <Select value={form.cash_account_id || "none"} onValueChange={(v) => setForm((f) => ({ ...f, cash_account_id: v === "none" ? "" : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="No descontar de caja" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No descontar de caja</SelectItem>
                    {cashAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Si eliges una cuenta, se registrará un retiro en Cuentas de efectivo.</p>
              </div>
            )}
            <div>
              <Label>Notas</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Observaciones"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar pago
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmPaymentModal} onOpenChange={(v) => !v && setConfirmPaymentModal(null)}>
        <DialogContent className="max-w-sm border border-slate-700 bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-slate-100 flex items-center gap-2">
              <span className="text-green-500 text-xl">✓</span>
              Confirmar Pago a Proveedor
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Estás marcando como pagado <strong>{formatMoney(Number(confirmPaymentModal?.amount || 0))}</strong> a <strong>{supplierNameById[confirmPaymentModal?.supplier_id || ''] || 'Desconocido'}</strong>. 
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {cashAccounts.length > 0 && (
              <div className="space-y-2">
                <Label className="text-slate-300">¿Descontar de alguna cuenta de efectivo?</Label>
                <Select value={confirmCashAccountId} onValueChange={setConfirmCashAccountId}>
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue placeholder="No descontar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Solo registrar pago, no descontar saldo</SelectItem>
                    {cashAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Si seleccionas una cuenta, se agregará un retiro para restar este monto de tu saldo real.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setConfirmPaymentModal(null)} disabled={submitting} className="hover:bg-slate-800 text-slate-300">
              Cancelar
            </Button>
            <Button onClick={submitStatusChange} disabled={submitting} className="bg-green-600 hover:bg-green-700 text-white">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AppLayout>
  )
}
