'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Package, Plus } from 'lucide-react'
import Link from 'next/link'

type DeliveryStatus = 'pending' | 'delivered' | 'cancelled'

interface DeliveryNote {
  id: string
  delivery_number: string
  status: DeliveryStatus
  delivered_at: string | null
  created_at: string
  customer?: { name: string } | null
}

export default function EntregasPage() {
  const [list, setList] = useState<DeliveryNote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/delivery-notes', { credentials: 'include' })
        const json = await res.json()
        if (json.success) setList(json.data || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const statusLabel: Record<DeliveryStatus, string> = {
    pending: 'Pendiente',
    delivered: 'Entregado',
    cancelled: 'Cancelado'
  }

  return (
    <AppLayout>
      <PageHeader
        title="Entregas"
        description="Comprobantes de entrega y remisiones"
        breadcrumbs={[
          { label: 'Ingresos', href: '/ingresos' },
          { label: 'Entregas', href: '/ingresos/entregas' }
        ]}
      />
      <div className="space-y-4 p-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Comprobantes de entrega</CardTitle>
            <Link href="/ingresos/entregas/nueva" className="inline-flex items-center gap-2 h-10 px-4 text-sm bg-primary text-white hover:opacity-90 rounded-md font-medium shadow-sm">
              <Plus className="h-4 w-4" />
              Nueva entrega
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Cargando...</p>
            ) : list.length === 0 ? (
              <p className="text-muted-foreground">No hay entregas registradas.</p>
            ) : (
              <div className="space-y-2">
                {list.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{n.delivery_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {n.customer?.name ?? 'Sin cliente'} · {new Date(n.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={n.status === 'delivered' ? 'default' : n.status === 'cancelled' ? 'secondary' : 'outline'}>
                        {statusLabel[n.status]}
                      </Badge>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/ingresos/entregas/${n.id}`}>Ver</Link>
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
