'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Package } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface DeliveryNote {
  id: string
  delivery_number: string
  status: string
  delivered_at: string | null
  notes: string | null
  created_at: string
  customer?: { name: string; phone: string | null } | null
  items?: Array<{ item_name: string; quantity: number; unit: string }>
}

const statusLabel: Record<string, string> = { pending: 'Pendiente', delivered: 'Entregado', cancelled: 'Cancelado' }

export default function DetalleEntregaPage() {
  const params = useParams()
  const id = params?.id as string
  const [note, setNote] = useState<DeliveryNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/delivery-notes/${id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => j.success && j.data && setNote(j.data))
      .finally(() => setLoading(false))
  }, [id])

  const markDelivered = async () => {
    if (!note || note.status !== 'pending') return
    setUpdating(true)
    try {
      const res = await fetch(`/api/delivery-notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({})
      })
      const json = await res.json()
      if (json.success && json.data) {
        setNote(json.data)
        toast.success('Marcada como entregada')
      } else {
        toast.error(json.error || 'Error')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <AppLayout><div className="p-4">Cargando...</div></AppLayout>
  if (!note) return <AppLayout><div className="p-4">No encontrado.</div></AppLayout>

  return (
    <AppLayout>
      <PageHeader
        title={note.delivery_number}
        description="Detalle de comprobante de entrega"
        breadcrumbs={[
          { label: 'Ingresos', href: '/ingresos' },
          { label: 'Entregas', href: '/ingresos/entregas' },
          { label: note.delivery_number, href: `/ingresos/entregas/${id}` }
        ]}
      />
      <div className="space-y-4 p-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {note.delivery_number}
            </CardTitle>
            <Badge variant={note.status === 'delivered' ? 'default' : note.status === 'cancelled' ? 'secondary' : 'outline'}>
              {statusLabel[note.status] ?? note.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <p><span className="text-muted-foreground">Cliente:</span> {note.customer?.name ?? '—'}</p>
              <p><span className="text-muted-foreground">Fecha:</span> {new Date(note.created_at).toLocaleString()}</p>
              {note.delivered_at && <p><span className="text-muted-foreground">Entregado:</span> {new Date(note.delivered_at).toLocaleString()}</p>}
            </div>
            {note.notes && <p><span className="text-muted-foreground">Observaciones:</span> {note.notes}</p>}
            {note.items && note.items.length > 0 && (
              <div>
                <p className="mb-2 font-medium">Ítems</p>
                <ul className="space-y-1 text-sm">
                  {note.items.map((i, idx) => (
                    <li key={idx}>{i.item_name} — {i.quantity} {i.unit}</li>
                  ))}
                </ul>
              </div>
            )}
            {note.status === 'pending' && (
              <Button onClick={markDelivered} disabled={updating}>{updating ? 'Actualizando...' : 'Marcar como entregado'}</Button>
            )}
            <Button variant="outline" asChild><Link href="/ingresos/entregas">Volver al listado</Link></Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
