'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { useOrgCurrency } from '@/lib/context/CurrencyContext'
import { Receipt } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface CashAccount { id: string; name: string }

const CATEGORIES = ['Mantenimiento', 'Servicios', 'Suministros', 'Combustible', 'Otros']
const PAYMENT_METHODS = [{ value: 'cash', label: 'Efectivo' }, { value: 'transfer', label: 'Transferencia' }, { value: 'card', label: 'Tarjeta' }, { value: 'other', label: 'Otro' }]

function NuevoGastoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { formatMoney } = useOrgCurrency()
  const [accounts, setAccounts] = useState<CashAccount[]>([])
  
  // Pre-fill fields from AI Magic Create query parameters
  const [amount, setAmount] = useState(searchParams.get('amount') || '')
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [expenseDate, setExpenseDate] = useState(new Date().toLocaleDateString('sv'))
  const [description, setDescription] = useState(searchParams.get('description') || '')
  const [paymentMethod, setPaymentMethod] = useState(searchParams.get('payment_method') || 'cash')
  const [cashAccountId, setCashAccountId] = useState(searchParams.get('cash_account_id') || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/cash-accounts', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => j.success && j.data?.items && setAccounts(j.data.items))
  }, [])

  const valid = amount !== '' && Number(amount) > 0 && category.trim() !== ''

  const submit = async () => {
    if (!valid) {
      toast.error('Indica monto y categoría.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: Number(amount),
          category: category.trim(),
          expense_date: expenseDate,
          description: description.trim() || null,
          payment_method: paymentMethod,
          cash_account_id: cashAccountId || null
        })
      })
      const json = await res.json()
      if (json.success && json.data?.id) {
        toast.success('Gasto registrado')
        router.push(`/compras/gastos/${json.data.id}`)
      } else {
        toast.error(json.error || 'Error al crear')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const categoryOptions = [{ value: '', label: 'Seleccionar categoría' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]
  const accountOptions = [{ value: '', label: 'Sin cuenta' }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]

  return (
    <AppLayout>
      <PageHeader
        title="Nuevo gasto"
        description="Egreso operativo"
        breadcrumbs={[
          { label: 'Compras', href: '/compras' },
          { label: 'Gastos', href: '/compras/gastos' },
          { label: 'Nuevo', href: '/compras/gastos/nuevo' }
        ]}
      />
      <div className="space-y-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Datos del gasto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Monto" type="number" step={0.01} min={0.01} required value={amount} onChange={(e) => setAmount(e.target.value)} />
              <Input label="Fecha" type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
              <Select label="Categoría" required options={categoryOptions} value={category} onChange={(e) => setCategory(e.target.value)} />
              <Select label="Medio de pago" options={PAYMENT_METHODS} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} />
              <Select label="Cuenta de efectivo (opcional)" options={accountOptions} value={cashAccountId} onChange={(e) => setCashAccountId(e.target.value)} />
            </div>
            <Textarea label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
            <div className="flex gap-2">
              <Button onClick={submit} disabled={!valid || saving}>{saving ? 'Guardando...' : 'Registrar gasto'}</Button>
              <Button variant="outline" asChild><Link href="/compras/gastos">Cancelar</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

export default function NuevoGastoPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Cargando...</div>}>
      <NuevoGastoContent />
    </Suspense>
  )
}
