'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Plus } from 'lucide-react'
import Link from 'next/link'

type CreditNoteStatus = 'draft' | 'issued' | 'applied' | 'cancelled'

interface CreditNote {
  id: string
  credit_note_number: string
  status: CreditNoteStatus
  total_amount: number
  created_at: string
  sales_invoice?: { id: string; invoice_number: string; total_amount: number } | null
}

interface Stats {
  total: number
  draft: number
  issued: number
  applied: number
  total_amount: number
}

export default function AjustesDevolucionesPage() {
  const [list, setList] = useState<CreditNote[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/credit-notes', { credentials: 'include' })
        const json = await res.json()
        if (json.success) {
          setList(json.data || [])
          setStats(json.stats ?? null)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const statusLabel: Record<CreditNoteStatus, string> = {
    draft: 'Borrador',
    issued: 'Emitida',
    applied: 'Aplicada',
    cancelled: 'Cancelada'
  }

  return (
    <AppLayout>
      <PageHeader
        title="Ajustes y devoluciones"
        description="Notas de crédito y devoluciones"
        breadcrumbs={[
          { label: 'Ingresos', href: '/ingresos' },
          { label: 'Ajustes y devoluciones', href: '/ingresos/ajustes-devoluciones' }
        ]}
      />
      <div className="space-y-4 p-4">
        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="bg-blue-500/10 border-blue-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-400">Total notas</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold text-blue-400">{stats.total}</span>
              </CardContent>
            </Card>
            <Card className="bg-green-500/10 border-green-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-400">Monto total</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold text-green-400">
                  {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(stats.total_amount)}
                </span>
              </CardContent>
            </Card>
            <Card className="bg-cyan-500/10 border-cyan-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-cyan-400">Emitidas</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold text-cyan-400">{stats.issued}</span>
              </CardContent>
            </Card>
            <Card className="bg-purple-500/10 border-purple-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-400">Aplicadas</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold text-purple-400">{stats.applied}</span>
              </CardContent>
            </Card>
            <Card className="bg-yellow-500/10 border-yellow-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-yellow-400">Borrador</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold text-yellow-400">{stats.draft}</span>
              </CardContent>
            </Card>
          </div>
        )}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Notas de crédito</CardTitle>
            <Link href="/ingresos/ajustes-devoluciones/nueva" className="inline-flex items-center gap-2 h-10 px-4 text-sm bg-primary text-white hover:opacity-90 rounded-md font-medium shadow-sm">
              <Plus className="h-4 w-4" />
              Nueva nota
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Cargando...</p>
            ) : list.length === 0 ? (
              <p className="text-muted-foreground">No hay notas de crédito registradas.</p>
            ) : (
              <div className="space-y-2">
                {list.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{n.credit_note_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {n.sales_invoice?.invoice_number ?? 'Sin factura'} · {new Date(n.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">
                        {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n.total_amount)}
                      </span>
                      <Badge
                        variant={
                          n.status === 'applied' ? 'default' : n.status === 'cancelled' ? 'secondary' : 'outline'
                        }
                      >
                        {statusLabel[n.status]}
                      </Badge>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/ingresos/ajustes-devoluciones/${n.id}`}>Ver</Link>
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
