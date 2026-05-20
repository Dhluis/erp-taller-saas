'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Wallet, Plus, CheckCircle2, XCircle, Clock, AlertTriangle, Loader2, User } from 'lucide-react'
import { toast } from 'sonner'
import { useOrgCurrency } from '@/lib/context/CurrencyContext'
import { cn } from '@/lib/utils'

interface CashAdvance {
  id: string
  amount: number
  purpose: string
  status: 'open' | 'closed' | 'cancelled'
  notes: string | null
  created_at: string
  closed_at: string | null
  total_spent: number
  balance: number
  employee: { id: string; name: string; email: string } | null
  created_by_user: { id: string; name: string } | null
  expenses: Array<{ id: string; amount: number; description: string; expense_date: string; receipt_image_url: string | null }>
}

interface User {
  id: string
  name: string
  email: string
}

const STATUS_CONFIG = {
  open: { label: 'Abierto', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: Clock },
  closed: { label: 'Cerrado', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/15 text-red-400 border-red-500/30', icon: XCircle },
}

export default function AnticiposPage() {
  const { formatMoney } = useOrgCurrency()
  const [advances, setAdvances] = useState<CashAdvance[]>([])
  const [employees, setEmployees] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('open')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedAdvance, setSelectedAdvance] = useState<CashAdvance | null>(null)

  // Form state
  const [amount, setAmount] = useState('')
  const [purpose, setPurpose] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = filterStatus !== 'all' ? `?status=${filterStatus}` : ''
      const res = await fetch(`/api/cash-advances${params}`, { credentials: 'include' })
      const json = await res.json()
      if (json.success) setAdvances(json.data || [])
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch('/api/users', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.success) setEmployees(d.data?.users || d.data || []) })
      .catch(() => {})
  }, [])

  const handleCreate = async () => {
    if (!amount || !purpose.trim()) {
      toast.error('Monto y propósito son requeridos')
      return
    }
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('El monto debe ser mayor a 0')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/cash-advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: amountNum,
          purpose: purpose.trim(),
          employee_id: employeeId || null,
          notes: notes.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Anticipo registrado correctamente')
      setShowCreate(false)
      setAmount(''); setPurpose(''); setEmployeeId(''); setNotes('')
      load()
    } catch (e: any) {
      toast.error(e.message || 'Error al crear anticipo')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = async (advance: CashAdvance, statusTo: 'closed' | 'cancelled') => {
    try {
      const res = await fetch(`/api/cash-advances/${advance.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: statusTo }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success(statusTo === 'closed' ? 'Anticipo cerrado' : 'Anticipo cancelado')
      setSelectedAdvance(null)
      load()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const openAdvances = advances.filter(a => a.status === 'open')
  const totalPending = openAdvances.reduce((s, a) => s + a.balance, 0)
  const withDiscrepancy = openAdvances.filter(a => a.total_spent > 0 && a.balance !== 0)

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6">
        <PageHeader
          title="Anticipos de Efectivo"
          description="Controla el dinero entregado a empleados para compras"
          icon={<Wallet className="w-5 h-5" />}
          actions={
            <Button onClick={() => setShowCreate(true)} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Anticipo
            </Button>
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400 mb-1">Anticipos abiertos</p>
              <p className="text-2xl font-bold text-white">{openAdvances.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400 mb-1">Saldo pendiente total</p>
              <p className={cn("text-2xl font-bold", totalPending > 0 ? "text-amber-400" : "text-emerald-400")}>
                {formatMoney(totalPending)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700/50 col-span-2 md:col-span-1">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400 mb-1">Con diferencia pendiente</p>
              <p className={cn("text-2xl font-bold", withDiscrepancy.length > 0 ? "text-red-400" : "text-slate-400")}>
                {withDiscrepancy.length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'open', label: 'Abiertos' },
            { key: 'closed', label: 'Cerrados' },
            { key: 'cancelled', label: 'Cancelados' },
            { key: 'all', label: 'Todos' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                filterStatus === f.key
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-700/50 text-slate-400 hover:text-slate-200'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
          </div>
        ) : advances.length === 0 ? (
          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardContent className="py-12 text-center">
              <Wallet className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No hay anticipos {filterStatus !== 'all' ? `con estado "${filterStatus}"` : ''}</p>
              <Button onClick={() => setShowCreate(true)} className="mt-4 bg-cyan-500 hover:bg-cyan-400 text-slate-900">
                Registrar primer anticipo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {advances.map(adv => {
              const cfg = STATUS_CONFIG[adv.status]
              const StatusIcon = cfg.icon
              const hasDiscrepancy = adv.status === 'open' && adv.total_spent > 0 && adv.balance !== 0
              return (
                <Card
                  key={adv.id}
                  className={cn(
                    "bg-slate-800/60 border-slate-700/50 cursor-pointer hover:border-slate-600 transition-colors",
                    hasDiscrepancy && "border-amber-500/40"
                  )}
                  onClick={() => setSelectedAdvance(adv)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border", cfg.color)}>
                            <StatusIcon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                          {hasDiscrepancy && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              <AlertTriangle className="w-3 h-3" />
                              Diferencia
                            </span>
                          )}
                        </div>
                        <p className="text-white font-medium truncate">{adv.purpose}</p>
                        {adv.employee && (
                          <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3" />
                            {adv.employee.name}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(adv.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-white font-bold">{formatMoney(adv.amount)}</p>
                        {adv.total_spent > 0 && (
                          <p className="text-xs text-slate-400">Gastado: {formatMoney(adv.total_spent)}</p>
                        )}
                        {adv.status === 'open' && (
                          <p className={cn("text-sm font-semibold", adv.balance > 0 ? "text-amber-400" : adv.balance < 0 ? "text-red-400" : "text-emerald-400")}>
                            {adv.balance > 0 ? `Saldo: ${formatMoney(adv.balance)}` : adv.balance < 0 ? `Excedido: ${formatMoney(Math.abs(adv.balance))}` : 'Cuadrado'}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Modal crear anticipo */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-cyan-400" />
                Registrar Anticipo de Efectivo
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-slate-300">Monto entregado *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Propósito / Para qué *</Label>
                <Input
                  placeholder="Ej: Compra de refacciones en AutoPartes García"
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Empleado (opcional)</Label>
                <select
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm"
                >
                  <option value="">Sin asignar</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Notas adicionales</Label>
                <Input
                  placeholder="Observaciones..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="ghost"
                  className="flex-1 text-slate-400"
                  onClick={() => setShowCreate(false)}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold"
                  onClick={handleCreate}
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrar Anticipo'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal detalle anticipo */}
        {selectedAdvance && (
          <Dialog open={!!selectedAdvance} onOpenChange={() => setSelectedAdvance(null)}>
            <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">Detalle del Anticipo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="bg-slate-700/40 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Anticipo entregado</span>
                    <span className="text-white font-bold">{formatMoney(selectedAdvance.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Total gastado</span>
                    <span className="text-white">{formatMoney(selectedAdvance.total_spent)}</span>
                  </div>
                  <div className="border-t border-slate-600 pt-2 flex justify-between">
                    <span className="text-slate-400 text-sm font-medium">Saldo pendiente</span>
                    <span className={cn(
                      "font-bold",
                      selectedAdvance.balance > 0 ? "text-amber-400" :
                      selectedAdvance.balance < 0 ? "text-red-400" : "text-emerald-400"
                    )}>
                      {selectedAdvance.balance > 0 ? `${formatMoney(selectedAdvance.balance)} por devolver` :
                       selectedAdvance.balance < 0 ? `${formatMoney(Math.abs(selectedAdvance.balance))} excedido` :
                       'Cuadrado ✓'}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-slate-400 text-xs mb-1">Propósito</p>
                  <p className="text-white text-sm">{selectedAdvance.purpose}</p>
                </div>

                {selectedAdvance.expenses.length > 0 && (
                  <div>
                    <p className="text-slate-400 text-xs mb-2">Gastos registrados</p>
                    <div className="space-y-2">
                      {selectedAdvance.expenses.map(exp => (
                        <div key={exp.id} className="flex justify-between items-center bg-slate-700/30 rounded-lg p-2.5">
                          <div>
                            <p className="text-white text-sm">{exp.description}</p>
                            <p className="text-slate-500 text-xs">{new Date(exp.expense_date).toLocaleDateString('es-MX')}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-medium text-sm">{formatMoney(exp.amount)}</p>
                            {exp.receipt_image_url && (
                              <a href={exp.receipt_image_url} target="_blank" rel="noopener noreferrer"
                                className="text-cyan-400 text-xs hover:underline">Ver ticket</a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAdvance.status === 'open' && (
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="ghost"
                      className="flex-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => handleClose(selectedAdvance, 'cancelled')}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Cancelar
                    </Button>
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                      onClick={() => handleClose(selectedAdvance, 'closed')}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Cerrar anticipo
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  )
}
