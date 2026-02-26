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

  const loadPayments = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (supplierFilter && supplierFilter !== "all") params.set("supplier_id", supplierFilter)
      const res = await fetch(`/api/supplier-payments?${params.toString()}`, { credentials: "include" })
      const data = await res.json()
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
    if (!form.supplier_id || !form.amount) {
      toast.error("Proveedor y monto son requeridos")
      return
    }
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Monto debe ser mayor a 0")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/supplier-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          supplier_id: form.supplier_id,
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
        toast.success(form.cash_account_id ? "Pago registrado y retiro en cuenta de efectivo." : "Pago registrado.")
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total pagado</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{formatMoney(stats.totalPaid)}</div>
              <p className="text-xs text-muted-foreground">Pagos completados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendiente</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">{formatMoney(stats.totalPending)}</div>
              <p className="text-xs text-muted-foreground">Pagos pendientes</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Registros</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
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
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-10 px-4 font-medium">Proveedor</th>
                      <th className="h-10 px-4 font-medium">Monto</th>
                      <th className="h-10 px-4 font-medium">Fecha</th>
                      <th className="h-10 px-4 font-medium">Método</th>
                      <th className="h-10 px-4 font-medium">Referencia</th>
                      <th className="h-10 px-4 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((p) => (
                      <tr key={p.id} className="border-b">
                        <td className="p-4 font-medium">{supplierNameById[p.supplier_id] ?? "—"}</td>
                        <td className="p-4">{formatMoney(Number(p.amount))}</td>
                        <td className="p-4">{new Date(p.payment_date).toLocaleDateString()}</td>
                        <td className="p-4">{PAYMENT_METHODS.find((m) => m.value === p.payment_method)?.label ?? p.payment_method}</td>
                        <td className="p-4 text-muted-foreground">{p.reference ?? "—"}</td>
                        <td className="p-4">{getStatusBadge(p.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md border border-border bg-card">
          <DialogHeader>
            <DialogTitle>Registrar pago a proveedor</DialogTitle>
            <DialogDescription>El pago quedará registrado y, si eliges una cuenta, se descontará de Cuentas de efectivo.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Proveedor *</Label>
              <Select value={form.supplier_id} onValueChange={(v) => setForm((f) => ({ ...f, supplier_id: v }))} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona proveedor" />
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
    </AppLayout>
  )
}
