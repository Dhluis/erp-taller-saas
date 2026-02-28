'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useOrgCurrency } from '@/lib/context/CurrencyContext'
import { Wallet } from 'lucide-react'
import Link from 'next/link'

interface CashClosure {
  id: string
  closed_at: string
  opening_balance: number
  closing_balance: number
  counted_amount: number
  difference: number
  notes: string | null
  cash_account?: { name: string; account_number: string } | null
}

export default function DetalleArqueoPage() {
  const params = useParams()
  const id = params?.id as string
  const { formatMoney } = useOrgCurrency()
  const [closure, setClosure] = useState<CashClosure | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetch(`/api/cash-closures/${id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => j.success && j.data && setClosure(j.data))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <AppLayout><div className="p-4">Cargando...</div></AppLayout>
  if (!closure) return <AppLayout><div className="p-4">No encontrado.</div></AppLayout>

  return (
    <AppLayout>
      <PageHeader
        title="Corte de caja"
        description={new Date(closure.closed_at).toLocaleString()}
        breadcrumbs={[
          { label: 'Ingresos', href: '/ingresos' },
          { label: 'Corte de caja', href: '/ingresos/arqueo-caja' },
          { label: 'Detalle', href: `/ingresos/arqueo-caja/${id}` }
        ]}
      />
      <div className="space-y-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              {closure.cash_account?.name ?? 'Cuenta'} {closure.cash_account?.account_number && `(${closure.cash_account.account_number})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <p><span className="text-muted-foreground">Fecha y hora:</span> {new Date(closure.closed_at).toLocaleString()}</p>
              <p><span className="text-muted-foreground">Saldo apertura:</span> {formatMoney(closure.opening_balance)}</p>
              <p><span className="text-muted-foreground">Saldo cierre (sistema):</span> {formatMoney(closure.closing_balance)}</p>
              <p><span className="text-muted-foreground">Monto contado:</span> {formatMoney(closure.counted_amount)}</p>
              <p className={closure.difference !== 0 ? 'font-semibold text-amber-600' : ''}>
                <span className="text-muted-foreground">Diferencia:</span> {formatMoney(closure.difference)}
              </p>
            </div>
            {closure.notes && <p><span className="text-muted-foreground">Observaciones:</span> {closure.notes}</p>}
            <Button variant="outline" asChild><Link href="/ingresos/arqueo-caja">Volver al listado</Link></Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
