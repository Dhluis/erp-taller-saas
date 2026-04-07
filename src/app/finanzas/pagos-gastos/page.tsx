'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Plus, Search, DollarSign, TrendingDown, CreditCard, Loader2,
  Receipt, Building2, RefreshCw, Filter
} from 'lucide-react'
import { useSuppliers } from '@/hooks/useSuppliers'
import { useOrganization } from '@/lib/context/SessionContext'
import { useOrgCurrency } from '@/lib/context/CurrencyContext'
import { toast } from 'sonner'

type UnifiedPayment = {
  id: string
  type: 'supplier' | 'expense'
  supplier_id?: string
  supplier_name?: string
  category?: string
  amount: number
  payment_date: string
  payment_method: string
  reference?: string | null
  description?: string | null
  notes?: string | null
  status: string
  created_at: string
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'check', label: 'Cheque' },
]

const EXPENSE_CATEGORIES = [
  { value: 'renta', label: 'Renta' },
  { value: 'servicios', label: 'Servicios (Luz, Agua, Internet)' },
  { value: 'nomina', label: 'Nómina' },
  { value: 'herramientas', label: 'Herramientas' },
  { value: 'limpieza', label: 'Limpieza' },
  { value: 'comida', label: 'Comida / Alimentos' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'publicidad', label: 'Publicidad' },
  { value: 'mantenimiento', label: 'Mantenimiento Local' },
  { value: 'otro', label: 'Otro' },
]

export default function PagosGastosPage() {
  const { organizationId, ready } = useOrganization()
  const { formatMoney } = useOrgCurrency()
  const { suppliers, loading: suppliersLoading } = useSuppliers({ pageSize: 500, autoLoad: true })

  const [payments, setPayments] = useState<UnifiedPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTab, setFilterTab] = useState<'all' | 'supplier' | 'expense'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [stats, setStats] = useState({ totalPaid: 0, totalExpenses: 0, totalPending: 0, count: 0 })
  const [cashAccounts, setCashAccounts] = useState<Array<{ id: string; name: string }>>([])

  const [form, setForm] = useState({
    paymentType: 'supplier' as 'supplier' | 'expense',
    supplier_id: '',
    category: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'transfer',
    description: '',
    reference: '',
    notes: '',
    cash_account_id: '',
  })

  const supplierNameById = Object.fromEntries(suppliers.map(s => [s.id, s.name]))

  const loadPayments = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    try {
      // Load both supplier payments and expenses
      const [paymentsRes, expensesRes] = await Promise.all([
        fetch('/api/supplier-payments', { credentials: 'include' }).then(r => r.json()).catch(() => null),
        fetch('/api/expenses', { credentials: 'include' }).then(r => r.json()).catch(() => null),
      ])

      const unified: UnifiedPayment[] = []
      let totalPaid = 0, totalExpenses = 0, totalPending = 0

      // Process supplier payments
      if (paymentsRes?.success && paymentsRes?.data?.items) {
        for (const p of paymentsRes.data.items) {
          unified.push({
            id: p.id,
            type: 'supplier',
            supplier_id: p.supplier_id,
            supplier_name: supplierNameById[p.supplier_id] || 'Proveedor',
            amount: Number(p.amount),
            payment_date: p.payment_date,
            payment_method: p.payment_method || 'transfer',
            reference: p.reference,
            notes: p.notes,
            status: p.status,
            created_at: p.created_at,
          })
          if (p.status === 'completed' || p.status === 'paid') totalPaid += Number(p.amount)
          else totalPending += Number(p.amount)
        }
      }

      // Process expenses
      if (expensesRes?.success && expensesRes?.data) {
        for (const e of expensesRes.data) {
          unified.push({
            id: e.id,
            type: 'expense',
            category: e.category,
            amount: Number(e.amount),
            payment_date: e.expense_date,
            payment_method: e.payment_method || 'cash',
            description: e.description,
            status: 'completed',
            created_at: e.created_at,
          })
          totalExpenses += Number(e.amount)
        }
      }

      // Sort by date desc
      unified.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())

      setPayments(unified)
      setStats({ totalPaid, totalExpenses, totalPending, count: unified.length })
    } catch {
      setPayments([])
    } finally {
      setLoading(false)
    }
  }, [organizationId, supplierNameById])

  useEffect(() => {
    if (ready && organizationId && !suppliersLoading) loadPayments()
  }, [ready, organizationId, suppliersLoading])

  useEffect(() => {
    if (!organizationId) return
    fetch('/api/cash-accounts', { credentials: 'include' })
      .then(r => r.json())
      .then(res => { if (res?.success && res?.data?.items?.length) setCashAccounts(res.data.items.map((a: any) => ({ id: a.id, name: a.name }))) })
      .catch(() => {})
  }, [organizationId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) { toast.error('Monto debe ser mayor a 0'); return }

    setSubmitting(true)
    try {
      let success = false

      if (form.paymentType === 'supplier') {
        if (!form.supplier_id) { toast.error('Selecciona un proveedor'); setSubmitting(false); return }
        const res = await fetch('/api/supplier-payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
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
        success = data?.success
        if (success) {
          // Register in financial_transactions
          const supplierName = supplierNameById[form.supplier_id] || 'Proveedor'
          await fetch('/api/financial-transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              transaction_type: 'expense',
              category: 'pago_proveedor',
              description: `Pago a ${supplierName}${form.notes ? ` — ${form.notes}` : ''}`,
              amount,
              account_id: form.cash_account_id || null,
              reference_type: 'supplier_payment',
              reference_id: data.data?.id || null,
            }),
          }).catch(() => {})
        }
      } else {
        if (!form.category) { toast.error('Selecciona una categoría'); setSubmitting(false); return }
        const res = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            amount,
            category: form.category,
            expense_date: form.payment_date,
            description: form.description || form.notes || '',
            payment_method: form.payment_method,
            cash_account_id: form.cash_account_id || undefined,
          }),
        })
        const data = await res.json()
        success = data?.success
        if (success) {
          const catLabel = EXPENSE_CATEGORIES.find(c => c.value === form.category)?.label || form.category
          await fetch('/api/financial-transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              transaction_type: 'expense',
              category: 'gasto_operativo',
              description: `Gasto: ${catLabel}${form.description ? ` — ${form.description}` : ''}`,
              amount,
              account_id: form.cash_account_id || null,
              reference_type: 'expense',
              reference_id: data.data?.id || null,
            }),
          }).catch(() => {})
        }
      }

      if (success) {
        toast.success(form.paymentType === 'supplier' ? 'Pago a proveedor registrado' : 'Gasto registrado')
        setModalOpen(false)
        setForm({ paymentType: 'supplier', supplier_id: '', category: '', amount: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'transfer', description: '', reference: '', notes: '', cash_account_id: '' })
        loadPayments()
      } else {
        toast.error('Error al registrar')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredPayments = payments.filter(p => {
    if (filterTab === 'supplier' && p.type !== 'supplier') return false
    if (filterTab === 'expense' && p.type !== 'expense') return false
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (p.supplier_name || '').toLowerCase().includes(term) ||
      (p.category || '').toLowerCase().includes(term) ||
      (p.description || '').toLowerCase().includes(term) ||
      (p.reference || '').toLowerCase().includes(term)
  })

  return (
    <AppLayout title="Pagos y Gastos" breadcrumbs={[{ label: 'Finanzas', href: '/finanzas' }, { label: 'Pagos y Gastos' }]}>
      <div className="space-y-6 p-6">
        <StandardBreadcrumbs currentPage="Pagos y Gastos" parentPages={[{ label: 'Finanzas', href: '/finanzas' }]} />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Pagos y Gastos</h1>
            <p className="text-muted-foreground">Todas las salidas de dinero en un solo lugar</p>
          </div>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo pago/gasto
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-rose-500/10 border-rose-500/20 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-rose-400">Pagos a Proveedores</CardTitle>
              <Building2 className="h-4 w-4 text-rose-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-400">{formatMoney(stats.totalPaid)}</div>
              <p className="text-xs text-muted-foreground">Completados</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-500/10 border-orange-500/20 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-400">Gastos Operativos</CardTitle>
              <Receipt className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-400">{formatMoney(stats.totalExpenses)}</div>
              <p className="text-xs text-muted-foreground">Total registrado</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/10 border-amber-500/20 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-400">Pendientes</CardTitle>
              <TrendingDown className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-400">{formatMoney(stats.totalPending)}</div>
              <p className="text-xs text-muted-foreground">Por pagar</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/20 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-400">Registros</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{stats.count}</div>
              <p className="text-xs text-muted-foreground">Total movimientos</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 bg-bg-secondary rounded-lg p-1 border border-border">
            {[
              { key: 'all', label: 'Todos' },
              { key: 'supplier', label: 'Proveedores' },
              { key: 'expense', label: 'Gastos' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key as any)}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${filterTab === tab.key ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-text-primary'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8" />
          </div>
        </div>

        {/* List */}
        <Card className="bg-bg-secondary border border-border rounded-xl">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPayments.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">No hay registros. Crea uno con el botón superior.</p>
            ) : (
              <div className="divide-y divide-border">
                {filteredPayments.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-4 hover:bg-bg-tertiary/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      {p.type === 'supplier' ? (
                        <div className="p-2 rounded-full bg-rose-500/10 shrink-0">
                          <Building2 className="h-4 w-4 text-rose-400" />
                        </div>
                      ) : (
                        <div className="p-2 rounded-full bg-orange-500/10 shrink-0">
                          <Receipt className="h-4 w-4 text-orange-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {p.type === 'supplier' ? p.supplier_name : (p.description || p.category || 'Gasto')}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{new Date(p.payment_date).toLocaleDateString('es-MX')}</span>
                          <span>·</span>
                          <span>{PAYMENT_METHODS.find(m => m.value === p.payment_method)?.label || p.payment_method}</span>
                          {p.reference && <><span>·</span><span>{p.reference}</span></>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {p.status === 'pending' ? (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pendiente</Badge>
                      ) : (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Pagado</Badge>
                      )}
                      <span className="text-sm font-bold text-rose-400">{formatMoney(p.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal nuevo pago/gasto */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar pago o gasto</DialogTitle>
            <DialogDescription>Selecciona el tipo y completa los datos.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo */}
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm(f => ({ ...f, paymentType: 'supplier' }))} className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-colors ${form.paymentType === 'supplier' ? 'bg-rose-500/10 border-rose-500/40 text-rose-400' : 'border-border text-muted-foreground hover:text-text-primary'}`}>
                <Building2 className="h-5 w-5 mx-auto mb-1" />
                Pago a Proveedor
              </button>
              <button type="button" onClick={() => setForm(f => ({ ...f, paymentType: 'expense' }))} className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-colors ${form.paymentType === 'expense' ? 'bg-orange-500/10 border-orange-500/40 text-orange-400' : 'border-border text-muted-foreground hover:text-text-primary'}`}>
                <Receipt className="h-5 w-5 mx-auto mb-1" />
                Gasto Operativo
              </button>
            </div>

            {form.paymentType === 'supplier' ? (
              <div>
                <Label>Proveedor *</Label>
                <Select value={form.supplier_id} onValueChange={v => setForm(f => ({ ...f, supplier_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecciona proveedor" /></SelectTrigger>
                  <SelectContent>
                    {suppliersLoading ? (
                      <SelectItem value="" disabled>Cargando...</SelectItem>
                    ) : suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
                <div>
                  <Label>Categoría *</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Tipo de gasto" /></SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Descripción</Label>
                  <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ej: Recibo de CFE abril" />
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Monto *</Label>
                <Input type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" required />
              </div>
              <div>
                <Label>Fecha *</Label>
                <Input type="date" value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} required />
              </div>
            </div>

            <div>
              <Label>Forma de pago *</Label>
              <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {cashAccounts.length > 0 && (
              <div>
                <Label>¿De qué cuenta sale?</Label>
                <Select value={form.cash_account_id || 'none'} onValueChange={v => setForm(f => ({ ...f, cash_account_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="No descontar de caja" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No descontar de cuenta</SelectItem>
                    {cashAccounts.map(acc => (<SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Si eliges una cuenta, se registrará un retiro automático.</p>
              </div>
            )}

            <div>
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Observaciones" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {form.paymentType === 'supplier' ? 'Registrar Pago' : 'Registrar Gasto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
