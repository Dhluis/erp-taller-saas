'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
  Plus, Search, DollarSign, TrendingDown, TrendingUp, CreditCard, Loader2,
  Receipt, Building2, RefreshCw, ArrowDownCircle, ArrowUpCircle, Clock
} from 'lucide-react'
import { useSuppliers } from '@/hooks/useSuppliers'
import { useOrganization } from '@/lib/context/SessionContext'
import { useOrgCurrency } from '@/lib/context/CurrencyContext'
import { getCollections, Collection } from '@/lib/supabase/collections'
import { toast } from 'sonner'

type UnifiedEntry = {
  id: string
  type: 'cobro' | 'supplier' | 'expense'
  // cobro fields
  customer_id?: string
  customer_name?: string
  reference_number?: string | null
  // supplier fields
  supplier_id?: string
  supplier_name?: string
  // expense fields
  category?: string
  description?: string | null
  // common
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

export default function EntradasSalidasPage() {
  const { organizationId, ready } = useOrganization()
  const { formatMoney } = useOrgCurrency()
  const { suppliers, loading: suppliersLoading } = useSuppliers({ pageSize: 500, autoLoad: true })

  const [entries, setEntries] = useState<UnifiedEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTab, setFilterTab] = useState<'all' | 'cobro' | 'gastos'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmingSubmit, setConfirmingSubmit] = useState(false)
  const [stats, setStats] = useState({ totalCobrado: 0, totalEgresos: 0, pendingCobros: 0, count: 0 })
  const [cashAccounts, setCashAccounts] = useState<Array<{ id: string; name: string }>>([])

  // Customers for cobro
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; phone?: string | null }>>([])
  const [customerSearch, setCustomerSearch] = useState('')

  // Mark cobro as paid
  const [cobroToPay, setCobroToPay] = useState<UnifiedEntry | null>(null)
  const [cobroPayOpen, setCobroPayOpen] = useState(false)
  const [cobroPayForm, setCobroPayForm] = useState({ payment_method: 'transfer', cash_account_id: '' })

  const [form, setForm] = useState({
    paymentType: 'cobro' as 'cobro' | 'supplier' | 'expense',
    // cobro
    customer_id: '',
    cobro_status: 'pending',
    // supplier
    supplier_id: '',
    // expense
    category: '',
    // common
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'transfer',
    description: '',
    reference: '',
    notes: '',
    cash_account_id: '',
  })

  const supplierNameById = Object.fromEntries(suppliers.map(s => [s.id, s.name]))

  const customerNameById = useMemo(
    () => Object.fromEntries(customers.map(c => [c.id, c.name])),
    [customers]
  )

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 20)
    const t = customerSearch.toLowerCase()
    return customers.filter(c =>
      c.name.toLowerCase().includes(t) || (c.phone || '').includes(t)
    ).slice(0, 20)
  }, [customers, customerSearch])

  // Load customers once
  useEffect(() => {
    if (!organizationId) return
    fetch('/api/customers?limit=500', { credentials: 'include' })
      .then(r => r.json())
      .then(res => {
        if (res.data?.items) setCustomers(res.data.items)
        else if (Array.isArray(res.data)) setCustomers(res.data)
      })
      .catch(() => {})
  }, [organizationId])

  // Load cash accounts
  useEffect(() => {
    if (!organizationId) return
    fetch('/api/cash-accounts', { credentials: 'include' })
      .then(r => r.json())
      .then(res => { if (res?.success && res?.data?.items?.length) setCashAccounts(res.data.items.map((a: any) => ({ id: a.id, name: a.name }))) })
      .catch(() => {})
  }, [organizationId])

  const loadEntries = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    try {
      const [paymentsRes, expensesRes, collectionsData] = await Promise.all([
        fetch('/api/supplier-payments', { credentials: 'include' }).then(r => r.json()).catch(() => null),
        fetch('/api/expenses', { credentials: 'include' }).then(r => r.json()).catch(() => null),
        getCollections(organizationId).catch(() => [] as Collection[]),
      ])

      const unified: UnifiedEntry[] = []
      let totalCobrado = 0, totalEgresos = 0, pendingCobros = 0

      // Cobros (entradas de clientes)
      for (const c of (collectionsData || [])) {
        unified.push({
          id: c.id,
          type: 'cobro',
          customer_id: c.customer_id,
          customer_name: '',
          reference_number: c.reference_number,
          amount: Number(c.amount || 0),
          payment_date: c.due_date,
          payment_method: c.payment_method || 'transfer',
          status: c.status,
          created_at: c.created_at || c.due_date,
        })
        if (c.status === 'paid') totalCobrado += Number(c.amount || 0)
        else if (c.status === 'pending') pendingCobros += Number(c.amount || 0)
      }

      // Supplier payments
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
          if (p.status === 'completed' || p.status === 'paid') totalEgresos += Number(p.amount)
        }
      }

      // Expenses
      if (expensesRes?.success && expensesRes?.data) {
        for (const e of expensesRes.data) {
          unified.push({
            id: e.id,
            type: 'expense',
            category: e.category,
            description: e.description,
            amount: Number(e.amount),
            payment_date: e.expense_date,
            payment_method: e.payment_method || 'cash',
            status: 'completed',
            created_at: e.created_at,
          })
          totalEgresos += Number(e.amount)
        }
      }

      unified.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())

      setEntries(unified)
      setStats({ totalCobrado, totalEgresos, pendingCobros, count: unified.length })
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [organizationId, supplierNameById])

  useEffect(() => {
    if (ready && organizationId && !suppliersLoading) loadEntries()
  }, [ready, organizationId, suppliersLoading])

  // Resolve customer names after both customers and entries are loaded
  useEffect(() => {
    if (customers.length === 0) return
    setEntries(prev => prev.map(e =>
      e.type === 'cobro' ? { ...e, customer_name: customerNameById[e.customer_id || ''] || e.customer_id || '' } : e
    ))
  }, [customers, customerNameById])

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) { toast.error('Monto debe ser mayor a 0'); return }
    if (form.paymentType === 'cobro' && !form.customer_id) { toast.error('Selecciona un cliente'); return }
    if (form.paymentType === 'supplier' && !form.supplier_id) { toast.error('Selecciona un proveedor'); return }
    if (form.paymentType === 'expense' && !form.category) { toast.error('Selecciona una categoría'); return }
    setConfirmingSubmit(true)
  }

  const handleSubmit = async () => {
    const amount = parseFloat(form.amount)
    setSubmitting(true)
    try {
      let success = false

      if (form.paymentType === 'cobro') {
        const res = await fetch('/api/collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            customer_id: form.customer_id,
            amount,
            due_date: form.payment_date,
            payment_method: form.payment_method,
            reference_number: form.reference || undefined,
            notes: form.notes || undefined,
            status: form.cobro_status,
            cash_account_id: form.cobro_status === 'paid' && form.cash_account_id ? form.cash_account_id : undefined,
          }),
        })
        const data = await res.json()
        success = data?.success
        if (success && form.cobro_status === 'paid') {
          const customerName = customerNameById[form.customer_id] || 'Cliente'
          await fetch('/api/financial-transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              transaction_type: 'income',
              category: 'cobro_factura',
              description: `Cobro de ${customerName}${form.notes ? ` — ${form.notes}` : ''}`,
              amount,
              account_id: form.cash_account_id || null,
              reference_type: 'collection',
              reference_id: data.data?.id || null,
            }),
          }).catch(() => {})
        }
      } else if (form.paymentType === 'supplier') {
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
        const labels = { cobro: 'Cobro registrado', supplier: 'Pago a proveedor registrado', expense: 'Gasto registrado' }
        toast.success(labels[form.paymentType])
        setConfirmingSubmit(false)
        setModalOpen(false)
        setForm({ paymentType: 'cobro', customer_id: '', cobro_status: 'pending', supplier_id: '', category: '', amount: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'transfer', description: '', reference: '', notes: '', cash_account_id: '' })
        loadEntries()
      } else {
        toast.error('Error al registrar')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkCobroAsPaid = async () => {
    if (!cobroToPay) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/collections/${cobroToPay.id}/pay`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          payment_method: cobroPayForm.payment_method,
          cash_account_id: cobroPayForm.cash_account_id || undefined,
        }),
      })
      const data = await res.json()
      if (data?.success) {
        const customerName = cobroToPay.customer_name || 'Cliente'
        await fetch('/api/financial-transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            transaction_type: 'income',
            category: 'cobro_factura',
            description: `Cobro de ${customerName} (marcado como pagado)`,
            amount: cobroToPay.amount,
            account_id: cobroPayForm.cash_account_id || null,
            reference_type: 'collection',
            reference_id: cobroToPay.id,
          }),
        }).catch(() => {})
        toast.success('Cobro marcado como pagado')
        setCobroPayOpen(false)
        setCobroToPay(null)
        loadEntries()
      } else {
        toast.error(data?.error || 'Error')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredEntries = entries.filter(e => {
    if (filterTab === 'cobro' && e.type !== 'cobro') return false
    if (filterTab === 'gastos' && e.type === 'cobro') return false
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (e.customer_name || '').toLowerCase().includes(term) ||
      (e.supplier_name || '').toLowerCase().includes(term) ||
      (e.category || '').toLowerCase().includes(term) ||
      (e.description || '').toLowerCase().includes(term) ||
      (e.reference || '').toLowerCase().includes(term) ||
      (e.reference_number || '').toLowerCase().includes(term)
  })

  const getStatusBadge = (entry: UnifiedEntry) => {
    if (entry.type === 'cobro') {
      if (entry.status === 'paid') return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Pagado</Badge>
      if (entry.status === 'overdue') return <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30">Vencido</Badge>
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pendiente</Badge>
    }
    if (entry.status === 'pending') return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pendiente</Badge>
    return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Pagado</Badge>
  }

  return (
    <AppLayout title="Entradas y Salidas" breadcrumbs={[{ label: 'Finanzas', href: '/finanzas' }, { label: 'Entradas y Salidas' }]}>
      <div className="space-y-6 p-6">
        <StandardBreadcrumbs currentPage="Entradas y Salidas" parentPages={[{ label: 'Finanzas', href: '/finanzas' }]} />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Entradas y Salidas</h1>
            <p className="text-muted-foreground">Cobros de clientes, pagos a proveedores y gastos</p>
          </div>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo registro
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-emerald-500/10 border-emerald-500/20 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-400">Total Cobrado</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">{formatMoney(stats.totalCobrado)}</div>
              <p className="text-xs text-muted-foreground">Cobros pagados</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/10 border-amber-500/20 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-400">Cobros Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-400">{formatMoney(stats.pendingCobros)}</div>
              <p className="text-xs text-muted-foreground">Por cobrar</p>
            </CardContent>
          </Card>
          <Card className="bg-rose-500/10 border-rose-500/20 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-rose-400">Total Egresos</CardTitle>
              <TrendingDown className="h-4 w-4 text-rose-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-400">{formatMoney(stats.totalEgresos)}</div>
              <p className="text-xs text-muted-foreground">Pagos y gastos</p>
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
              { key: 'cobro', label: 'Cobros' },
              { key: 'gastos', label: 'Gastos' },
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
            ) : filteredEntries.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">No hay registros. Crea uno con el botón superior.</p>
            ) : (
              <div className="divide-y divide-border">
                {filteredEntries.map(e => (
                  <div key={`${e.type}-${e.id}`} className="flex items-center justify-between p-4 hover:bg-bg-tertiary/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-full shrink-0 ${
                        e.type === 'cobro' ? 'bg-emerald-500/10' :
                        e.type === 'supplier' ? 'bg-rose-500/10' : 'bg-orange-500/10'
                      }`}>
                        {e.type === 'cobro'
                          ? <ArrowDownCircle className="h-4 w-4 text-emerald-400" />
                          : e.type === 'supplier'
                          ? <Building2 className="h-4 w-4 text-rose-400" />
                          : <Receipt className="h-4 w-4 text-orange-400" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {e.type === 'cobro'
                            ? (e.customer_name || e.customer_id || 'Cliente')
                            : e.type === 'supplier'
                            ? e.supplier_name
                            : (e.description || e.category || 'Gasto')}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className={`font-medium ${e.type === 'cobro' ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {e.type === 'cobro' ? '↓ Cobro' : e.type === 'supplier' ? '↑ Proveedor' : '↑ Gasto'}
                          </span>
                          <span>·</span>
                          <span>{new Date(e.payment_date).toLocaleDateString('es-MX')}</span>
                          <span>·</span>
                          <span>{PAYMENT_METHODS.find(m => m.value === e.payment_method)?.label || e.payment_method}</span>
                          {(e.reference || e.reference_number) && <><span>·</span><span>{e.reference || e.reference_number}</span></>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {getStatusBadge(e)}
                      <span className={`text-sm font-bold ${e.type === 'cobro' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatMoney(e.amount)}
                      </span>
                      {e.type === 'cobro' && e.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                          onClick={() => { setCobroToPay(e); setCobroPayOpen(true); setCobroPayForm({ payment_method: 'transfer', cash_account_id: '' }) }}
                        >
                          Cobrar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Modal nuevo registro ── */}
      <Dialog open={modalOpen} onOpenChange={(o) => { if (!o) { setModalOpen(false); setConfirmingSubmit(false) } }}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white">

          {/* Paso 1: Formulario */}
          {!confirmingSubmit && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white">Registrar entrada o salida</DialogTitle>
                <DialogDescription className="text-slate-400">Selecciona el tipo y completa los datos.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* Type selector */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, paymentType: 'cobro' }))}
                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${form.paymentType === 'cobro' ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'border-slate-700 text-slate-400 hover:text-white'}`}
                  >
                    <ArrowDownCircle className="h-5 w-5 mx-auto mb-1" />
                    Cobro
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, paymentType: 'supplier' }))}
                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${form.paymentType === 'supplier' ? 'bg-rose-500/10 border-rose-500/40 text-rose-400' : 'border-slate-700 text-slate-400 hover:text-white'}`}
                  >
                    <Building2 className="h-5 w-5 mx-auto mb-1" />
                    Proveedor
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, paymentType: 'expense' }))}
                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${form.paymentType === 'expense' ? 'bg-orange-500/10 border-orange-500/40 text-orange-400' : 'border-slate-700 text-slate-400 hover:text-white'}`}
                  >
                    <Receipt className="h-5 w-5 mx-auto mb-1" />
                    Gasto
                  </button>
                </div>

                {/* Cobro fields */}
                {form.paymentType === 'cobro' && (
                  <>
                    <div>
                      <Label className="text-slate-300">Cliente *</Label>
                      <Select value={form.customer_id} onValueChange={v => setForm(f => ({ ...f, customer_id: v }))}>
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue placeholder="Selecciona un cliente" /></SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <div className="p-2">
                            <Input placeholder="Buscar cliente..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} className="h-8 bg-slate-700 border-slate-600 text-white" />
                          </div>
                          {filteredCustomers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}{c.phone ? ` (${c.phone})` : ''}</SelectItem>)}
                          {filteredCustomers.length === 0 && <p className="text-xs text-slate-400 p-2">Sin resultados</p>}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-300">Estado</Label>
                      <Select value={form.cobro_status} onValueChange={v => setForm(f => ({ ...f, cobro_status: v }))}>
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="pending">Pendiente</SelectItem>
                          <SelectItem value="paid">Pagado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* Supplier fields */}
                {form.paymentType === 'supplier' && (
                  <div>
                    <Label className="text-slate-300">Proveedor *</Label>
                    <Select value={form.supplier_id} onValueChange={v => setForm(f => ({ ...f, supplier_id: v }))}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue placeholder="Selecciona proveedor" /></SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {suppliersLoading ? <SelectItem value="" disabled>Cargando...</SelectItem> : suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Expense fields */}
                {form.paymentType === 'expense' && (
                  <>
                    <div>
                      <Label className="text-slate-300">Categoría *</Label>
                      <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue placeholder="Tipo de gasto" /></SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {EXPENSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-300">Descripción</Label>
                      <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ej: Recibo de CFE abril" className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500" />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-300">Monto *</Label>
                    <Input type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" required className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500" />
                  </div>
                  <div>
                    <Label className="text-slate-300">Fecha *</Label>
                    <Input type="date" value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} required className="bg-slate-800 border-slate-600 text-white" />
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300">Forma de pago *</Label>
                  <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {cashAccounts.length > 0 && (
                  <div>
                    <Label className="text-slate-300">
                      {form.paymentType === 'cobro' && form.cobro_status === 'paid' ? '¿A qué cuenta entra?' : '¿De qué cuenta sale?'}
                    </Label>
                    <Select value={form.cash_account_id || 'none'} onValueChange={v => setForm(f => ({ ...f, cash_account_id: v === 'none' ? '' : v }))}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue placeholder="No registrar en cuenta" /></SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="none">No registrar en cuenta</SelectItem>
                        {cashAccounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {form.paymentType !== 'expense' && (
                  <div>
                    <Label className="text-slate-300">Referencia</Label>
                    <Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Ej: REF-001" className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500" />
                  </div>
                )}

                <div>
                  <Label className="text-slate-300">Notas</Label>
                  <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Observaciones" className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500" />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="border-slate-600 text-slate-300 hover:bg-slate-800">Cancelar</Button>
                  <Button
                    type="submit"
                    className={
                      form.paymentType === 'cobro' ? 'bg-emerald-600 hover:bg-emerald-700' :
                      form.paymentType === 'supplier' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-orange-600 hover:bg-orange-700'
                    }
                  >
                    {{ cobro: 'Registrar Cobro', supplier: 'Registrar Pago', expense: 'Registrar Gasto' }[form.paymentType]}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}

          {/* Paso 2: Confirmación */}
          {confirmingSubmit && (
            <>
              <DialogHeader>
                <DialogTitle className={
                  form.paymentType === 'cobro' ? 'text-emerald-400' :
                  form.paymentType === 'supplier' ? 'text-rose-400' : 'text-orange-400'
                }>
                  {{ cobro: '¿Confirmar cobro de cliente?', supplier: '¿Confirmar pago a proveedor?', expense: '¿Confirmar gasto operativo?' }[form.paymentType]}
                </DialogTitle>
                <DialogDescription className="text-slate-400">Verifica los datos — este registro es permanente.</DialogDescription>
              </DialogHeader>

              <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-3 text-sm">
                {form.paymentType === 'cobro' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Cliente</span>
                      <span className="text-white font-medium">{customerNameById[form.customer_id] || form.customer_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Estado</span>
                      <span className="text-white">{form.cobro_status === 'paid' ? 'Pagado' : 'Pendiente'}</span>
                    </div>
                  </>
                )}
                {form.paymentType === 'supplier' && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Proveedor</span>
                    <span className="text-white font-medium">{supplierNameById[form.supplier_id] || form.supplier_id}</span>
                  </div>
                )}
                {form.paymentType === 'expense' && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Categoría</span>
                    <span className="text-white font-medium">{EXPENSE_CATEGORIES.find(c => c.value === form.category)?.label || form.category}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Monto</span>
                  <span className={`font-bold text-base ${form.paymentType === 'cobro' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${parseFloat(form.amount || '0').toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Fecha</span>
                  <span className="text-white">{form.payment_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Forma de pago</span>
                  <span className="text-white">{PAYMENT_METHODS.find(m => m.value === form.payment_method)?.label}</span>
                </div>
                {form.cash_account_id && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cuenta</span>
                    <span className="text-white">{cashAccounts.find(a => a.id === form.cash_account_id)?.name}</span>
                  </div>
                )}
                {form.reference && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Referencia</span>
                    <span className="text-white">{form.reference}</span>
                  </div>
                )}
                {form.description && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Descripción</span>
                    <span className="text-white">{form.description}</span>
                  </div>
                )}
                {form.notes && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Notas</span>
                    <span className="text-white">{form.notes}</span>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmingSubmit(false)} className="border-slate-600 text-slate-300 hover:bg-slate-800" disabled={submitting}>
                  ← Revisar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={
                    form.paymentType === 'cobro' ? 'bg-emerald-600 hover:bg-emerald-700' :
                    form.paymentType === 'supplier' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-orange-600 hover:bg-orange-700'
                  }
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {submitting ? 'Registrando...' : 'Sí, registrar'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal cobrar pendiente ── */}
      <Dialog open={cobroPayOpen} onOpenChange={o => { if (!o) { setCobroPayOpen(false); setCobroToPay(null) } }}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-emerald-400">Cobrar</DialogTitle>
            <DialogDescription className="text-slate-400">
              {cobroToPay && `${cobroToPay.customer_name || 'Cliente'} — ${formatMoney(cobroToPay.amount)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Método de cobro</Label>
              <Select value={cobroPayForm.payment_method} onValueChange={v => setCobroPayForm(f => ({ ...f, payment_method: v }))}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {cashAccounts.length > 0 && (
              <div>
                <Label className="text-slate-300">¿A qué cuenta entra?</Label>
                <Select value={cobroPayForm.cash_account_id || 'none'} onValueChange={v => setCobroPayForm(f => ({ ...f, cash_account_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue placeholder="No registrar en cuenta" /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="none">No registrar en cuenta</SelectItem>
                    {cashAccounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCobroPayOpen(false)} disabled={submitting} className="border-slate-600 text-slate-300 hover:bg-slate-800">Cancelar</Button>
            <Button onClick={handleMarkCobroAsPaid} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar cobro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
