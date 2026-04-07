'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Plus, Search, DollarSign, TrendingUp, CheckCircle, Clock, CreditCard, Loader2
} from 'lucide-react'
import { getCollections, getCollectionStats, Collection } from '@/lib/supabase/collections'
import { useOrgCurrency } from '@/lib/context/CurrencyContext'
import { useSession } from '@/lib/context/SessionContext'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from 'sonner'

interface Customer {
  id: string
  name: string
  phone?: string | null
  email?: string | null
}

export default function CobrosPage() {
  const router = useRouter()
  const permissions = usePermissions()
  const { formatMoney } = useOrgCurrency()
  const { organizationId } = useSession()
  
  useEffect(() => {
    if (!permissions.isAdmin && !permissions.canPayInvoices()) router.push('/dashboard')
  }, [permissions, router])
  
  if (!permissions.isAdmin && !permissions.canPayInvoices()) return null

  const [searchTerm, setSearchTerm] = useState('')
  const [collections, setCollections] = useState<Collection[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stats, setStats] = useState({ totalCollections: 0, completedCollections: 0, pendingCollections: 0, totalCollected: 0, pendingAmount: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [collectionToPay, setCollectionToPay] = useState<Collection | null>(null)
  const [cashAccounts, setCashAccounts] = useState<Array<{ id: string; name: string }>>([])
  const [payForm, setPayForm] = useState({ payment_method: 'transfer', cash_account_id: '' })
  const [customerSearch, setCustomerSearch] = useState('')

  const [formData, setFormData] = useState({
    customer_id: '',
    amount: 0,
    due_date: new Date().toISOString().split('T')[0],
    payment_method: 'transfer',
    reference_number: '',
    status: 'pending',
    notes: '',
    cash_account_id: ''
  })

  // Load customers for dropdown
  useEffect(() => {
    if (!organizationId) return
    fetch('/api/customers?limit=500', { credentials: 'include' })
      .then(r => r.json())
      .then(res => {
        if (res.customers) setCustomers(res.customers)
        else if (res.data) setCustomers(res.data)
      })
      .catch(() => {})
  }, [organizationId])

  // Load collections
  useEffect(() => {
    loadData()
  }, [organizationId])

  // Load cash accounts
  useEffect(() => {
    if (!organizationId) return
    fetch('/api/cash-accounts', { credentials: 'include' })
      .then(r => r.json())
      .then(res => { if (res?.success && res?.data?.items?.length) setCashAccounts(res.data.items.map((a: any) => ({ id: a.id, name: a.name }))) })
      .catch(() => {})
  }, [organizationId])

  const loadData = async () => {
    if (!organizationId) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const [collectionsData, statsData] = await Promise.all([
        getCollections(organizationId),
        getCollectionStats(organizationId)
      ])
      setCollections(collectionsData || [])
      setStats({
        totalCollections: statsData.total,
        completedCollections: statsData.paid,
        pendingCollections: statsData.pending,
        totalCollected: statsData.totalPaid,
        pendingAmount: statsData.totalPending
      })
    } catch {
      setCollections([])
    } finally {
      setIsLoading(false)
    }
  }

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 20)
    const term = customerSearch.toLowerCase()
    return customers.filter(c =>
      c.name.toLowerCase().includes(term) ||
      (c.phone || '').includes(term) ||
      (c.email || '').toLowerCase().includes(term)
    ).slice(0, 20)
  }, [customers, customerSearch])

  const customerNameById = useMemo(() => {
    return Object.fromEntries(customers.map(c => [c.id, c.name]))
  }, [customers])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationId) { toast.error('Error de organización'); return }
    if (!formData.customer_id) { toast.error('Selecciona un cliente'); return }
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customer_id: formData.customer_id,
          amount: formData.amount,
          due_date: formData.due_date,
          notes: formData.notes || undefined,
          reference_number: formData.reference_number || undefined,
          payment_method: formData.payment_method,
          status: formData.status,
          cash_account_id: formData.status === 'paid' && formData.cash_account_id ? formData.cash_account_id : undefined
        })
      })
      const data = await res.json()
      if (data?.success) {
        // Register in financial_transactions if paid
        if (formData.status === 'paid') {
          const customerName = customerNameById[formData.customer_id] || 'Cliente'
          await fetch('/api/financial-transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              transaction_type: 'income',
              category: 'cobro_factura',
              description: `Cobro de ${customerName}${formData.notes ? ` — ${formData.notes}` : ''}`,
              amount: formData.amount,
              account_id: formData.cash_account_id || null,
              reference_type: 'collection',
              reference_id: data.data?.id || null,
            }),
          }).catch(() => {})
        }

        await loadData()
        setIsDialogOpen(false)
        setFormData({ customer_id: '', amount: 0, due_date: new Date().toISOString().split('T')[0], payment_method: 'transfer', reference_number: '', status: 'pending', notes: '', cash_account_id: '' })
        toast.success('Cobro registrado')
      } else {
        toast.error(data?.error || 'Error')
      }
    } catch {
      toast.error('Error al registrar cobro')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMarkAsPaid = async () => {
    if (!collectionToPay) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/collections/${collectionToPay.id}/pay`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          payment_method: payForm.payment_method,
          cash_account_id: payForm.cash_account_id || undefined
        })
      })
      const data = await res.json()
      if (data?.success) {
        // Register in financial_transactions
        const customerName = customerNameById[collectionToPay.customer_id] || 'Cliente'
        await fetch('/api/financial-transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            transaction_type: 'income',
            category: 'cobro_factura',
            description: `Cobro de ${customerName} (marcado como pagado)`,
            amount: collectionToPay.amount || 0,
            account_id: payForm.cash_account_id || null,
            reference_type: 'collection',
            reference_id: collectionToPay.id,
          }),
        }).catch(() => {})

        await loadData()
        setPayModalOpen(false)
        setCollectionToPay(null)
        toast.success('Cobro marcado como pagado')
      } else {
        toast.error(data?.error || 'Error')
      }
    } catch {
      toast.error('Error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Pagado</Badge>
      case 'pending': return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pendiente</Badge>
      case 'overdue': return <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30">Vencido</Badge>
      case 'cancelled': return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">Cancelado</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  const filteredCollections = collections.filter(c =>
    (customerNameById[c.customer_id] || c.customer_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.reference_number || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) {
    return (
      <AppLayout title="Cobros" breadcrumbs={[{ label: 'Finanzas', href: '/finanzas' }, { label: 'Cobros' }]}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Cobros" breadcrumbs={[{ label: 'Finanzas', href: '/finanzas' }, { label: 'Cobros' }]}>
      <div className="space-y-6 p-6">
        <StandardBreadcrumbs currentPage="Cobros" parentPages={[{ label: 'Finanzas', href: '/finanzas' }]} />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Cobros</h1>
            <p className="text-muted-foreground">Registra y gestiona cobros a clientes</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Cobro
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-emerald-500/10 border-emerald-500/20 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-400">Total Cobrado</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">{formatMoney(stats.totalCollected)}</div>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/10 border-amber-500/20 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-400">Pendiente</CardTitle>
              <Clock className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-400">{formatMoney(stats.pendingAmount)}</div>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/20 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-400">Total Cobros</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{stats.totalCollections}</div>
            </CardContent>
          </Card>
          <Card className="bg-cyan-500/10 border-cyan-500/20 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-cyan-400">Completados</CardTitle>
              <CheckCircle className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-400">{stats.completedCollections}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search + List */}
        <div className="relative max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente o referencia..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8" />
        </div>

        <Card className="bg-bg-secondary border border-border rounded-xl">
          <CardContent className="p-0">
            {filteredCollections.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">No hay cobros registrados.</p>
            ) : (
              <div className="divide-y divide-border">
                {filteredCollections.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-4 hover:bg-bg-tertiary/30 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary">{customerNameById[c.customer_id] || c.customer_id}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{new Date(c.due_date).toLocaleDateString('es-MX')}</span>
                        {c.payment_method && <><span>·</span><span>{c.payment_method}</span></>}
                        {c.reference_number && <><span>·</span><span>{c.reference_number}</span></>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(c.status)}
                      <span className="text-sm font-bold text-text-primary">{formatMoney(c.amount || 0)}</span>
                      {c.status === 'pending' && (
                        <Button variant="outline" size="sm" onClick={() => { setCollectionToPay(c); setPayModalOpen(true); setPayForm({ payment_method: 'transfer', cash_account_id: '' }) }}>
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

      {/* Modal nuevo cobro */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Cobro</DialogTitle>
            <DialogDescription>Registra un cobro a un cliente.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Cliente *</Label>
              <Select value={formData.customer_id} onValueChange={v => setFormData(f => ({ ...f, customer_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecciona un cliente" /></SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input placeholder="Buscar cliente..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} className="h-8" />
                  </div>
                  {filteredCustomers.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </SelectItem>
                  ))}
                  {filteredCustomers.length === 0 && <p className="text-xs text-muted-foreground p-2">No se encontraron clientes</p>}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Monto *</Label>
                <Input type="number" step="0.01" value={formData.amount || ''} onChange={e => setFormData(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} required />
              </div>
              <div>
                <Label>Fecha *</Label>
                <Input type="date" value={formData.due_date} onChange={e => setFormData(f => ({ ...f, due_date: e.target.value }))} required />
              </div>
            </div>
            <div>
              <Label>Método de pago</Label>
              <Select value={formData.payment_method} onValueChange={v => setFormData(f => ({ ...f, payment_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                  <SelectItem value="card">Tarjeta</SelectItem>
                  <SelectItem value="check">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={formData.status} onValueChange={v => setFormData(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="paid">Pagado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.status === 'paid' && cashAccounts.length > 0 && (
              <div>
                <Label>Cuenta donde se registra</Label>
                <Select value={formData.cash_account_id || 'none'} onValueChange={v => setFormData(f => ({ ...f, cash_account_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="No registrar en cuenta" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No registrar en cuenta</SelectItem>
                    {cashAccounts.map(acc => (<SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Referencia</Label>
              <Input value={formData.reference_number} onChange={e => setFormData(f => ({ ...f, reference_number: e.target.value }))} placeholder="Ej: REF-001" />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar Cobro
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal marcar como pagado */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cobrar</DialogTitle>
            <DialogDescription>
              {collectionToPay && `Monto: ${formatMoney(collectionToPay.amount || 0)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Método</Label>
              <Select value={payForm.payment_method} onValueChange={v => setPayForm(f => ({ ...f, payment_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                  <SelectItem value="card">Tarjeta</SelectItem>
                  <SelectItem value="check">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {cashAccounts.length > 0 && (
              <div>
                <Label>Cuenta</Label>
                <Select value={payForm.cash_account_id || 'none'} onValueChange={v => setPayForm(f => ({ ...f, cash_account_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No registrar</SelectItem>
                    {cashAccounts.map(acc => (<SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPayModalOpen(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button onClick={handleMarkAsPaid} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Cobro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
