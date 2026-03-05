'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useOrgCurrency } from '@/lib/context/CurrencyContext'
import { Receipt, Plus } from 'lucide-react'
import Link from 'next/link'

interface Expense {
  id: string
  amount: number
  category: string
  expense_date: string
  description: string | null
  payment_method: string
  created_at: string
}

export default function GastosPage() {
  const { formatMoney } = useOrgCurrency()
  const [list, setList] = useState<Expense[]>([])
  const [stats, setStats] = useState<{ total: number; count: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/expenses', { credentials: 'include' })
        const json = await res.json()
        if (json.success) {
          setList(json.data || [])
          setStats(json.stats || null)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <AppLayout>
      <PageHeader
        title="Gastos"
        description="Egresos operativos (no ligados a órdenes de compra)"
        breadcrumbs={[
          { label: 'Compras', href: '/compras' },
          { label: 'Gastos', href: '/compras/gastos' }
        ]}
      />
      <div className="space-y-4 p-4">
        {stats && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-rose-500/10 border-rose-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-rose-400">Total gastos</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold text-rose-400">{formatMoney(stats.total)}</span>
              </CardContent>
            </Card>
            <Card className="bg-blue-500/10 border-blue-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-400">Registros</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold text-blue-400">{stats.count}</span>
              </CardContent>
            </Card>
          </div>
        )}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Listado de gastos</CardTitle>
            <Link href="/compras/gastos/nuevo" className="inline-flex items-center gap-2 h-10 px-4 text-sm bg-primary text-white hover:opacity-90 rounded-md font-medium shadow-sm">
              <Plus className="h-4 w-4" />
              Nuevo gasto
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Cargando...</p>
            ) : list.length === 0 ? (
              <p className="text-muted-foreground">No hay gastos registrados.</p>
            ) : (
              <div className="space-y-2">
                {list.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Receipt className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{e.category}</p>
                        <p className="text-sm text-muted-foreground">
                          {e.description || 'Sin descripción'} · {new Date(e.expense_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{formatMoney(e.amount)}</span>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/compras/gastos/${e.id}`}>Ver</Link>
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
