'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useOrgCurrency } from '@/lib/context/CurrencyContext'
import { Receipt } from 'lucide-react'
import Link from 'next/link'

interface Expense {
  id: string
  amount: number
  category: string
  expense_date: string
  description: string | null
  payment_method: string
  created_at: string
  cash_account?: { name: string } | null
}

const paymentLabel: Record<string, string> = { cash: 'Efectivo', transfer: 'Transferencia', card: 'Tarjeta', other: 'Otro' }

export default function DetalleGastoPage() {
  const params = useParams()
  const id = params?.id as string
  const { formatMoney } = useOrgCurrency()
  const [expense, setExpense] = useState<Expense | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetch(`/api/expenses/${id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => j.success && j.data && setExpense(j.data))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <AppLayout><div className="p-4">Cargando...</div></AppLayout>
  if (!expense) return <AppLayout><div className="p-4">No encontrado.</div></AppLayout>

  return (
    <AppLayout>
      <PageHeader
        title={expense.category}
        description={formatMoney(expense.amount)}
        breadcrumbs={[
          { label: 'Compras', href: '/compras' },
          { label: 'Gastos', href: '/compras/gastos' },
          { label: 'Detalle', href: `/compras/gastos/${id}` }
        ]}
      />
      <div className="space-y-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              {expense.category}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <p><span className="text-muted-foreground">Monto:</span> {formatMoney(expense.amount)}</p>
              <p><span className="text-muted-foreground">Fecha:</span> {new Date(expense.expense_date).toLocaleDateString()}</p>
              <p><span className="text-muted-foreground">Medio de pago:</span> {paymentLabel[expense.payment_method] ?? expense.payment_method}</p>
              {expense.cash_account && <p><span className="text-muted-foreground">Cuenta:</span> {expense.cash_account.name}</p>}
              <p><span className="text-muted-foreground">Registrado:</span> {new Date(expense.created_at).toLocaleString()}</p>
            </div>
            {expense.description && <p><span className="text-muted-foreground">Descripción:</span> {expense.description}</p>}
            <Button variant="outline" asChild><Link href="/compras/gastos">Volver al listado</Link></Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
