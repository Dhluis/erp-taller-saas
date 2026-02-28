'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useOrgCurrency } from '@/lib/context/CurrencyContext'
import { Wallet, Plus } from 'lucide-react'
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

export default function ArqueoCajaPage() {
  const { formatMoney } = useOrgCurrency()
  const [list, setList] = useState<CashClosure[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/cash-closures', { credentials: 'include' })
        const json = await res.json()
        if (json.success) setList(json.data || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <AppLayout>
      <PageHeader
        title="Corte de caja/Arqueo de Caja"
        description="Cierres de turno por cuenta de efectivo"
        breadcrumbs={[
          { label: 'Ingresos', href: '/ingresos' },
          { label: 'Corte de caja/Arqueo de Caja', href: '/ingresos/arqueo-caja' }
        ]}
      />
      <div className="space-y-4 p-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Historial de arqueos</CardTitle>
            <Button asChild>
              <Link href="/ingresos/arqueo-caja/nuevo">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo arqueo
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Cargando...</p>
            ) : list.length === 0 ? (
              <p className="text-muted-foreground">No hay arqueos registrados.</p>
            ) : (
              <div className="space-y-2">
                {list.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <Wallet className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{c.cash_account?.name ?? 'Cuenta'} ({c.cash_account?.account_number ?? '-'})</p>
                        <p className="text-sm text-muted-foreground">{new Date(c.closed_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span>Apertura: {formatMoney(c.opening_balance)}</span>
                      <span>Cierre: {formatMoney(c.closing_balance)}</span>
                      <span>Contado: {formatMoney(c.counted_amount)}</span>
                      <span className={c.difference !== 0 ? 'font-semibold text-amber-600' : ''}>Diferencia: {formatMoney(c.difference)}</span>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/ingresos/arqueo-caja/${c.id}`}>Ver</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
