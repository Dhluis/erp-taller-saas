'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  CreditCard,
  Receipt,
  Building2,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  Printer,
  Clock,
  Banknote,
  Landmark
} from 'lucide-react'
import { useSession } from '@/lib/context/SessionContext'
import { useOrgCurrency } from '@/lib/context/CurrencyContext'
import { toast } from 'sonner'

interface Transaction {
  id: string
  transaction_type: 'income' | 'expense'
  category: string
  description: string
  amount: number
  account_id: string | null
  reference_type: string | null
  reference_id: string | null
  transaction_date: string
  created_at: string
}

interface DailySummary {
  date: string
  totalIncome: number
  totalExpense: number
  balance: number
  transactionCount: number
  byCategory: Record<string, { income: number; expense: number; count: number }>
  byAccount: Record<string, { income: number; expense: number; count: number }>
  transactions: Transaction[]
}

interface CashAccount {
  id: string
  name: string
  account_type: string
  current_balance: number
  bank_name?: string
  last_four_digits?: string
  card_brand?: string
}

const CATEGORY_LABELS: Record<string, string> = {
  cobro_factura: 'Cobro de Factura',
  pago_proveedor: 'Pago a Proveedor',
  gasto_operativo: 'Gasto Operativo',
  deposito_caja: 'Depósito en Caja',
  retiro_caja: 'Retiro de Caja',
  ajuste: 'Ajuste',
  nota_credito: 'Nota de Crédito',
  otro: 'Otro'
}

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  cobro_factura: FileText,
  pago_proveedor: Building2,
  gasto_operativo: Receipt,
  deposito_caja: ArrowUpCircle,
  retiro_caja: ArrowDownCircle,
  ajuste: RefreshCw,
  nota_credito: CreditCard,
  otro: Wallet
}

export default function FinanzasPage() {
  const { organizationId } = useSession()
  const { formatMoney } = useOrgCurrency()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [accounts, setAccounts] = useState<CashAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')

  const loadData = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    try {
      const [summaryRes, accountsRes] = await Promise.all([
        fetch(`/api/financial-transactions?summary=daily&date=${date}`, { credentials: 'include' }),
        fetch('/api/cash-accounts', { credentials: 'include' })
      ])
      
      const summaryData = await summaryRes.json()
      const accountsData = await accountsRes.json()

      if (summaryData.success) setSummary(summaryData.data)
      if (accountsData.success && accountsData.data?.items) setAccounts(accountsData.data.items)
    } catch (e) {
      console.error('Error loading financial data:', e)
      toast.error('Error al cargar datos financieros')
    } finally {
      setLoading(false)
    }
  }, [organizationId, date])

  useEffect(() => { loadData() }, [loadData])

  const changeDate = (direction: number) => {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() + direction)
    setDate(d.toISOString().split('T')[0])
  }

  const isToday = date === new Date().toISOString().split('T')[0]

  const filteredTransactions = (summary?.transactions || []).filter(t => {
    if (filterType === 'all') return true
    return t.transaction_type === filterType
  })

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  }

  const getAccountIcon = (type: string) => {
    if (type === 'bank') return <Landmark className="h-4 w-4 text-blue-400" />
    if (type === 'card') return <CreditCard className="h-4 w-4 text-purple-400" />
    return <Banknote className="h-4 w-4 text-emerald-400" />
  }

  const getAccountLabel = (type: string) => {
    if (type === 'bank') return 'Banco'
    if (type === 'card') return 'Tarjeta'
    return 'Efectivo'
  }

  return (
    <AppLayout
      title="Finanzas"
      breadcrumbs={[{ label: 'Finanzas', href: '/finanzas' }]}
    >
      <div className="space-y-6 p-6">
        {/* Header con selector de fecha */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Movimientos del Día</h1>
            <p className="text-text-secondary text-sm">
              {isToday ? 'Hoy' : new Date(date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => changeDate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-[160px] text-center"
            />
            <Button variant="outline" size="sm" onClick={() => changeDate(1)} disabled={isToday}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isToday && (
              <Button variant="outline" size="sm" onClick={() => setDate(new Date().toISOString().split('T')[0])}>
                Hoy
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Resumen superior - 3 cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-emerald-500/10 border-emerald-500/20 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-400">Entradas</CardTitle>
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-400">
                {formatMoney(summary?.totalIncome || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {(summary?.transactions || []).filter(t => t.transaction_type === 'income').length} movimientos
              </p>
            </CardContent>
          </Card>

          <Card className="bg-rose-500/10 border-rose-500/20 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-rose-400">Salidas</CardTitle>
              <TrendingDown className="h-5 w-5 text-rose-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-rose-400">
                {formatMoney(summary?.totalExpense || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {(summary?.transactions || []).filter(t => t.transaction_type === 'expense').length} movimientos
              </p>
            </CardContent>
          </Card>

          <Card className={`rounded-xl ${(summary?.balance || 0) >= 0 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${(summary?.balance || 0) >= 0 ? 'text-blue-400' : 'text-amber-400'}`}>Balance del Día</CardTitle>
              <Wallet className={`h-5 w-5 ${(summary?.balance || 0) >= 0 ? 'text-blue-400' : 'text-amber-400'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${(summary?.balance || 0) >= 0 ? 'text-blue-400' : 'text-amber-400'}`}>
                {formatMoney(summary?.balance || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary?.transactionCount || 0} operaciones totales
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Saldo por cuenta */}
        {accounts.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {accounts.map((acc) => (
              <Card key={acc.id} className="bg-bg-secondary border border-border rounded-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {getAccountIcon(acc.account_type)}
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">{getAccountLabel(acc.account_type)}</span>
                  </div>
                  <p className="text-sm font-medium text-text-primary truncate">{acc.name}</p>
                  {acc.last_four_digits && (
                    <p className="text-xs text-muted-foreground">****{acc.last_four_digits}</p>
                  )}
                  <p className="text-lg font-bold text-text-primary mt-1">{formatMoney(Number(acc.current_balance))}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Filtro y timeline */}
        <Card className="bg-bg-secondary border border-border rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <Clock className="h-5 w-5 text-cyan-400" />
              Timeline
            </CardTitle>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Solo entradas</SelectItem>
                <SelectItem value="expense">Solo salidas</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">Sin movimientos</p>
                <p className="text-sm">No hay transacciones registradas para esta fecha</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredTransactions.map((t, idx) => {
                  const Icon = CATEGORY_ICONS[t.category] || Wallet
                  const isIncome = t.transaction_type === 'income'
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-bg-tertiary/50 transition-colors group"
                    >
                      {/* Hora */}
                      <span className="text-xs text-muted-foreground w-12 shrink-0 font-mono">
                        {formatTime(t.created_at)}
                      </span>

                      {/* Icono con línea */}
                      <div className="relative flex flex-col items-center">
                        <div className={`p-2 rounded-full ${isIncome ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                          <Icon className={`h-4 w-4 ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`} />
                        </div>
                        {idx < filteredTransactions.length - 1 && (
                          <div className="w-px h-6 bg-border absolute top-10" />
                        )}
                      </div>

                      {/* Descripción */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{t.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {CATEGORY_LABELS[t.category] || t.category}
                        </p>
                      </div>

                      {/* Monto */}
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isIncome ? '+' : '-'}{formatMoney(Number(t.amount))}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
