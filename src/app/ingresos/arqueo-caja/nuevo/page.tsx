'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { useOrgCurrency } from '@/lib/context/CurrencyContext'
import { Wallet } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface CashAccount { id: string; name: string; account_number?: string; current_balance?: number }

export default function NuevoArqueoPage() {
  const router = useRouter()
  const { formatMoney } = useOrgCurrency()
  const [accounts, setAccounts] = useState<CashAccount[]>([])
  const [cashAccountId, setCashAccountId] = useState('')
  const [closingBalance, setClosingBalance] = useState('')
  const [countedAmount, setCountedAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/cash-accounts', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => j.success && j.data?.items && setAccounts(j.data.items))
  }, [])

  const selectedAccount = accounts.find((a) => a.id === cashAccountId)
  const valid = cashAccountId && closingBalance !== '' && countedAmount !== ''

  const submit = async () => {
    if (!valid) {
      toast.error('Completa cuenta, saldo de cierre y monto contado.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/cash-closures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          cash_account_id: cashAccountId,
          closing_balance: Number(closingBalance),
          counted_amount: Number(countedAmount),
          notes: notes || null
        })
      })
      const json = await res.json()
      if (json.success && json.data?.id) {
        toast.success('Arqueo registrado')
        router.push(`/ingresos/arqueo-caja/${json.data.id}`)
      } else {
        toast.error(json.error || 'Error al crear')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const options = [{ value: '', label: 'Seleccionar cuenta' }, ...accounts.map((a) => ({ value: a.id, label: `${a.name}${a.account_number ? ` (${a.account_number})` : ''}` }))]

  return (
    <AppLayout>
      <PageHeader
        title="Nuevo corte de caja/arqueo de caja"
        description="Cierre de turno"
        breadcrumbs={[
          { label: 'Ingresos', href: '/ingresos' },
          { label: 'Corte de caja/Arqueo de Caja', href: '/ingresos/arqueo-caja' },
          { label: 'Nuevo', href: '/ingresos/arqueo-caja/nuevo' }
        ]}
      />
      <div className="space-y-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Datos del arqueo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select label="Cuenta de efectivo" required options={options} value={cashAccountId} onChange={(e) => setCashAccountId(e.target.value)} />
            {selectedAccount && typeof selectedAccount.current_balance === 'number' && (
              <p className="text-sm text-muted-foreground">Saldo actual según sistema: {formatMoney(selectedAccount.current_balance)}</p>
            )}
            <Input label="Saldo de cierre (sistema)" type="number" step={0.01} value={closingBalance} onChange={(e) => setClosingBalance(e.target.value)} />
            <Input label="Monto contado (efectivo)" type="number" step={0.01} value={countedAmount} onChange={(e) => setCountedAmount(e.target.value)} />
            <Textarea label="Observaciones" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
            <div className="flex gap-2">
              <Button onClick={submit} disabled={!valid || saving}>{saving ? 'Guardando...' : 'Registrar arqueo'}</Button>
              <Button variant="outline" asChild><Link href="/ingresos/arqueo-caja">Cancelar</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
