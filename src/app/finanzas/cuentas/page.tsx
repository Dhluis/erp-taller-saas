'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, IconButton } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Plus, Search, ArrowDownCircle, ArrowUpCircle, Pencil, RefreshCw,
  Banknote, Landmark, CreditCard, Wallet, Clock, ChevronDown, ChevronRight
} from 'lucide-react'
import { useSession } from '@/lib/context/SessionContext'
import { useOrgCurrency } from '@/lib/context/CurrencyContext'
import { toast } from 'sonner'

interface CashAccount {
  id: string
  name: string
  account_number: string
  account_type: 'cash' | 'bank' | 'card'
  initial_balance: number
  current_balance: number
  bank_name?: string | null
  last_four_digits?: string | null
  card_brand?: string | null
  notes?: string | null
  is_active: boolean
}

interface Movement {
  id: string
  cash_account_id: string
  movement_type: 'deposit' | 'withdrawal' | 'adjustment'
  amount: number
  notes: string | null
  reference_type: string | null
  created_at: string
}

export default function CuentasPage() {
  const { organizationId } = useSession()
  const { formatMoney } = useOrgCurrency()
  const [accounts, setAccounts] = useState<CashAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<CashAccount | null>(null)
  const [movements, setMovements] = useState<Movement[]>([])
  const [movementsLoading, setMovementsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmingMove, setConfirmingMove] = useState(false)
  
  const [createForm, setCreateForm] = useState({
    name: '',
    account_number: '',
    account_type: 'cash' as 'cash' | 'bank' | 'card',
    initial_balance: 0,
    bank_name: '',
    last_four_digits: '',
    card_brand: '',
    notes: '',
  })

  const [moveForm, setMoveForm] = useState({
    movement_type: 'deposit' as 'deposit' | 'withdrawal',
    amount: '',
    notes: ''
  })

  const [editForm, setEditForm] = useState({
    name: '',
    account_number: '',
    account_type: 'cash' as 'cash' | 'bank' | 'card',
    bank_name: '',
    last_four_digits: '',
    card_brand: '',
    notes: ''
  })

  const loadAccounts = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    try {
      const res = await fetch('/api/cash-accounts', { credentials: 'include' })
      const json = await res.json()
      if (json.success && json.data?.items) setAccounts(json.data.items)
      else setAccounts([])
    } catch {
      toast.error('Error al cargar cuentas')
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => { loadAccounts() }, [loadAccounts])

  const loadMovements = async (accountId: string) => {
    setMovementsLoading(true)
    try {
      const res = await fetch(`/api/cash-accounts/${accountId}/movements?limit=50`, { credentials: 'include' })
      const json = await res.json()
      if (json.success) setMovements(json.data || [])
      else setMovements([])
    } catch {
      setMovements([])
    } finally {
      setMovementsLoading(false)
    }
  }

  const filtered = accounts.filter(a =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.account_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.bank_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalBalance = accounts.reduce((s, a) => s + Number(a.current_balance), 0)
  const cashTotal = accounts.filter(a => a.account_type === 'cash').reduce((s, a) => s + Number(a.current_balance), 0)
  const bankTotal = accounts.filter(a => a.account_type === 'bank').reduce((s, a) => s + Number(a.current_balance), 0)
  const cardTotal = accounts.filter(a => a.account_type === 'card').reduce((s, a) => s + Number(a.current_balance), 0)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/cash-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: createForm.name,
          account_number: createForm.account_number || null,
          account_type: createForm.account_type,
          initial_balance: Number(createForm.initial_balance) || 0,
          notes: createForm.notes || null,
          bank_name: createForm.bank_name || null,
          last_four_digits: createForm.last_four_digits || null,
          card_brand: createForm.card_brand || null,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`Cuenta "${createForm.name}" creada`)
        setCreateOpen(false)
        setCreateForm({ name: '', account_number: '', account_type: 'cash', initial_balance: 0, bank_name: '', last_four_digits: '', card_brand: '', notes: '' })
        loadAccounts()
      } else toast.error(json.error || 'Error al crear')
    } catch {
      toast.error('Error al crear cuenta')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMoveConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(moveForm.amount)
    if (!amount || amount <= 0) { toast.error('Monto debe ser mayor a 0'); return }
    if (!moveForm.notes.trim()) { toast.error('El concepto es obligatorio'); return }
    setConfirmingMove(true)
  }

  const handleMove = async () => {
    if (!selectedAccount) return
    const amount = parseFloat(moveForm.amount)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/cash-accounts/${selectedAccount.id}/movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          movement_type: moveForm.movement_type,
          amount,
          notes: moveForm.notes || undefined,
        }),
      })
      const json = await res.json()
      if (json.success) {
        // Also register in financial_transactions
        await fetch('/api/financial-transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            transaction_type: moveForm.movement_type === 'deposit' ? 'income' : 'expense',
            category: moveForm.movement_type === 'deposit' ? 'deposito_caja' : 'retiro_caja',
            description: `${moveForm.movement_type === 'deposit' ? 'Depósito en' : 'Retiro de'} ${selectedAccount.name}${moveForm.notes ? ` — ${moveForm.notes}` : ''}`,
            amount,
            account_id: selectedAccount.id,
            reference_type: 'cash_movement',
            reference_id: json.data?.id || null,
          }),
        }).catch(() => {}) // Non-blocking

        toast.success(moveForm.movement_type === 'deposit' ? 'Ingreso registrado' : 'Retiro registrado')
        setConfirmingMove(false)
        setMoveOpen(false)
        setSelectedAccount(null)
        setMoveForm({ movement_type: 'deposit', amount: '', notes: '' })
        loadAccounts()
      } else toast.error(json.error || 'Error')
    } catch {
      toast.error('Error al registrar movimiento')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAccount) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/cash-accounts/${selectedAccount.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editForm),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Cuenta actualizada')
        setEditOpen(false)
        setSelectedAccount(null)
        loadAccounts()
      } else toast.error(json.error || 'Error al actualizar')
    } catch {
      toast.error('Error al actualizar')
    } finally {
      setSubmitting(false)
    }
  }

  const getTypeIcon = (type: string) => {
    if (type === 'bank') return <Landmark className="h-5 w-5 text-blue-400" />
    if (type === 'card') return <CreditCard className="h-5 w-5 text-purple-400" />
    return <Banknote className="h-5 w-5 text-emerald-400" />
  }

  const getTypeLabel = (type: string) => {
    if (type === 'bank') return 'Banco'
    if (type === 'card') return 'Tarjeta'
    return 'Efectivo'
  }

  const getTypeBadge = (type: string) => {
    if (type === 'bank') return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Banco</Badge>
    if (type === 'card') return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Tarjeta</Badge>
    return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Efectivo</Badge>
  }

  return (
    <AppLayout
      title="Cuentas"
      breadcrumbs={[
        { label: 'Finanzas', href: '/finanzas' },
        { label: 'Cuentas', href: '/finanzas/cuentas' },
      ]}
    >
      <div className="space-y-6 p-6">
        <StandardBreadcrumbs
          currentPage="Cuentas"
          parentPages={[{ label: 'Finanzas', href: '/finanzas' }]}
        />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Cuentas</h1>
            <p className="text-text-secondary">Efectivo, bancos y tarjetas</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadAccounts} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva cuenta
            </Button>
          </div>
        </div>

        {/* Totales por tipo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-bg-secondary border border-border rounded-xl">
            <CardContent className="p-4 flex items-center gap-3">
              <Wallet className="h-6 w-6 text-cyan-400" />
              <div>
                <p className="text-xs text-muted-foreground">Saldo Total</p>
                <p className="text-xl font-bold text-text-primary">{formatMoney(totalBalance)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-emerald-500/5 border-emerald-500/20 rounded-xl">
            <CardContent className="p-4 flex items-center gap-3">
              <Banknote className="h-6 w-6 text-emerald-400" />
              <div>
                <p className="text-xs text-muted-foreground">Efectivo</p>
                <p className="text-lg font-bold text-emerald-400">{formatMoney(cashTotal)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/5 border-blue-500/20 rounded-xl">
            <CardContent className="p-4 flex items-center gap-3">
              <Landmark className="h-6 w-6 text-blue-400" />
              <div>
                <p className="text-xs text-muted-foreground">Bancos</p>
                <p className="text-lg font-bold text-blue-400">{formatMoney(bankTotal)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/5 border-purple-500/20 rounded-xl">
            <CardContent className="p-4 flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-purple-400" />
              <div>
                <p className="text-xs text-muted-foreground">Tarjetas</p>
                <p className="text-lg font-bold text-purple-400">{formatMoney(cardTotal)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cuenta..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8" />
        </div>

        {/* Lista de cuentas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No hay cuentas. Crea una con "Nueva cuenta".</p>
            </div>
          ) : (
            filtered.map((acc) => (
              <Card key={acc.id} className="bg-bg-secondary border border-border rounded-xl hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2 flex flex-row items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(acc.account_type)}
                    <div>
                      <CardTitle className="text-base">{acc.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {getTypeBadge(acc.account_type)}
                        {acc.bank_name && <span className="text-xs text-muted-foreground">{acc.bank_name}</span>}
                        {acc.last_four_digits && <span className="text-xs text-muted-foreground">****{acc.last_four_digits}</span>}
                        {acc.card_brand && <span className="text-xs text-muted-foreground capitalize">{acc.card_brand}</span>}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-text-primary mb-3">{formatMoney(Number(acc.current_balance))}</p>
                  <div className="flex gap-1">
                    <IconButton variant="ghost" size="md" title="Ingresar" onClick={() => { setSelectedAccount(acc); setMoveForm({ movement_type: 'deposit', amount: '', notes: '' }); setMoveOpen(true) }} icon={<ArrowUpCircle className="h-5 w-5 text-emerald-500" />} />
                    <IconButton variant="ghost" size="md" title="Retirar" onClick={() => { setSelectedAccount(acc); setMoveForm({ movement_type: 'withdrawal', amount: '', notes: '' }); setMoveOpen(true) }} icon={<ArrowDownCircle className="h-5 w-5 text-rose-500" />} />
                    <IconButton variant="ghost" size="md" title="Historial" onClick={() => { setSelectedAccount(acc); setHistoryOpen(true); loadMovements(acc.id) }} icon={<Clock className="h-5 w-5 text-blue-400" />} />
                    <IconButton variant="ghost" size="md" title="Editar" onClick={() => { setSelectedAccount(acc); setEditForm({ name: acc.name, account_number: acc.account_number, account_type: acc.account_type, bank_name: acc.bank_name || '', last_four_digits: acc.last_four_digits || '', card_brand: acc.card_brand || '', notes: acc.notes || '' }); setEditOpen(true) }} icon={<Pencil className="h-5 w-5 text-text-secondary" />} />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Modal crear cuenta */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva cuenta</DialogTitle>
            <DialogDescription>Agrega efectivo, banco o tarjeta.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label>Tipo de cuenta *</Label>
              <Select value={createForm.account_type} onValueChange={(v: 'cash' | 'bank' | 'card') => setCreateForm(f => ({ ...f, account_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">💵 Efectivo</SelectItem>
                  <SelectItem value="bank">🏦 Banco</SelectItem>
                  <SelectItem value="card">💳 Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nombre *</Label>
              <Input value={createForm.name} onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder={createForm.account_type === 'cash' ? 'Caja Principal' : createForm.account_type === 'bank' ? 'BBVA Empresa' : 'Visa Débito'} required />
            </div>
            {(createForm.account_type === 'bank' || createForm.account_type === 'card') && (
              <>
                <div>
                  <Label>{createForm.account_type === 'bank' ? 'Banco' : 'Marca (Visa, Mastercard...)'}</Label>
                  <Input value={createForm.account_type === 'bank' ? createForm.bank_name : createForm.card_brand} onChange={(e) => setCreateForm(f => createForm.account_type === 'bank' ? { ...f, bank_name: e.target.value } : { ...f, card_brand: e.target.value })} placeholder={createForm.account_type === 'bank' ? 'BBVA' : 'Visa'} />
                </div>
                <div>
                  <Label>Últimos 4 dígitos</Label>
                  <Input maxLength={4} value={createForm.last_four_digits} onChange={(e) => setCreateForm(f => ({ ...f, last_four_digits: e.target.value.replace(/\D/g, '').slice(0, 4) }))} placeholder="1234" />
                </div>
              </>
            )}
            <div>
              <Label>Número de cuenta</Label>
              <Input value={createForm.account_number} onChange={(e) => setCreateForm(f => ({ ...f, account_number: e.target.value }))} placeholder="001" />
            </div>
            <div>
              <Label>Saldo inicial</Label>
              <Input type="number" step="0.01" value={createForm.initial_balance || ''} onChange={(e) => setCreateForm(f => ({ ...f, initial_balance: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={createForm.notes} onChange={(e) => setCreateForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Guardando...' : 'Crear cuenta'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal ingreso/retiro */}
      <Dialog open={moveOpen} onOpenChange={(o) => { setMoveOpen(o); if (!o) setSelectedAccount(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{moveForm.movement_type === 'deposit' ? 'Ingresar a' : 'Retirar de'} — {selectedAccount?.name}</DialogTitle>
            <DialogDescription>Registra el movimiento con concepto.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMoveConfirm} className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select value={moveForm.movement_type} onValueChange={(v: 'deposit' | 'withdrawal') => setMoveForm(f => ({ ...f, movement_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">✅ Ingreso</SelectItem>
                  <SelectItem value="withdrawal">🔴 Retiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Monto *</Label>
              <Input type="number" step="0.01" min="0.01" value={moveForm.amount} onChange={(e) => setMoveForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" required />
            </div>
            <div>
              <Label>Concepto / Notas *</Label>
              <Textarea value={moveForm.notes} onChange={(e) => setMoveForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Ej: Cobro de factura F-032, Pago de luz, etc." required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMoveOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Guardando...' : moveForm.movement_type === 'deposit' ? 'Registrar ingreso' : 'Registrar retiro'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal editar */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setSelectedAccount(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cuenta</DialogTitle>
            <DialogDescription>Modifica los datos de la cuenta.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <Label>Nombre *</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={editForm.account_type} onValueChange={(v: 'cash' | 'bank' | 'card') => setEditForm(f => ({ ...f, account_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">💵 Efectivo</SelectItem>
                  <SelectItem value="bank">🏦 Banco</SelectItem>
                  <SelectItem value="card">💳 Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(editForm.account_type === 'bank' || editForm.account_type === 'card') && (
              <>
                <div>
                  <Label>{editForm.account_type === 'bank' ? 'Banco' : 'Marca'}</Label>
                  <Input value={editForm.account_type === 'bank' ? editForm.bank_name : editForm.card_brand} onChange={(e) => setEditForm(f => editForm.account_type === 'bank' ? { ...f, bank_name: e.target.value } : { ...f, card_brand: e.target.value })} />
                </div>
                <div>
                  <Label>Últimos 4 dígitos</Label>
                  <Input maxLength={4} value={editForm.last_four_digits} onChange={(e) => setEditForm(f => ({ ...f, last_four_digits: e.target.value.replace(/\D/g, '').slice(0, 4) }))} />
                </div>
              </>
            )}
            <div>
              <Label>Notas</Label>
              <Textarea value={editForm.notes} onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Guardando...' : 'Guardar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmación ingreso/retiro */}
      <AlertDialog open={confirmingMove} onOpenChange={(o) => !o && setConfirmingMove(false)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className={moveForm.movement_type === 'deposit' ? 'text-emerald-400' : 'text-rose-400'}>
              {moveForm.movement_type === 'deposit' ? '¿Confirmar ingreso?' : '¿Confirmar retiro?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300 space-y-2">
              <span>Estás a punto de registrar un movimiento financiero permanente.</span>
              <span className="block mt-2 space-y-1 text-sm">
                <span className="block">Cuenta: <strong className="text-white">{selectedAccount?.name}</strong></span>
                <span className="block">
                  {moveForm.movement_type === 'deposit' ? 'Ingreso' : 'Retiro'}:{' '}
                  <strong className={moveForm.movement_type === 'deposit' ? 'text-emerald-400' : 'text-rose-400'}>
                    ${parseFloat(moveForm.amount || '0').toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </strong>
                </span>
                {moveForm.notes && <span className="block">Concepto: <strong className="text-white">{moveForm.notes}</strong></span>}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-800" onClick={() => setConfirmingMove(false)}>
              Revisar
            </AlertDialogCancel>
            <AlertDialogAction
              className={moveForm.movement_type === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'}
              onClick={handleMove}
              disabled={submitting}
            >
              {submitting ? 'Registrando...' : moveForm.movement_type === 'deposit' ? 'Sí, registrar ingreso' : 'Sí, registrar retiro'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal historial de movimientos */}
      <Dialog open={historyOpen} onOpenChange={(o) => { setHistoryOpen(o); if (!o) { setSelectedAccount(null); setMovements([]) } }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-cyan-400" />
              Historial — {selectedAccount?.name}
            </DialogTitle>
            <DialogDescription>Últimos 50 movimientos de esta cuenta.</DialogDescription>
          </DialogHeader>
          {movementsLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : movements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Sin movimientos registrados.</p>
          ) : (
            <div className="space-y-2">
              {movements.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-bg-tertiary/30">
                  <div className="flex items-center gap-3">
                    {m.movement_type === 'deposit' ? (
                      <ArrowUpCircle className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <ArrowDownCircle className="h-5 w-5 text-rose-400" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {m.notes || (m.movement_type === 'deposit' ? 'Ingreso' : m.movement_type === 'withdrawal' ? 'Retiro' : 'Ajuste')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(m.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                        {m.reference_type && <span> · {m.reference_type}</span>}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${m.movement_type === 'deposit' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {m.movement_type === 'deposit' ? '+' : '-'}{formatMoney(Number(m.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
