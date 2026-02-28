'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Select } from '@/components/ui/input'
import { FileText } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

type Status = 'draft' | 'issued' | 'applied' | 'cancelled'

interface CreditNote {
  id: string
  credit_note_number: string
  status: Status
  total_amount: number
  reason: string | null
  notes: string | null
  issued_at: string | null
  created_at: string
  sales_invoice?: { invoice_number: string; total_amount: number } | null
  items?: Array<{ item_type: string; item_name: string; quantity: number; unit_price: number; total_price: number }>
}

const statusLabels: Record<Status, string> = {
  draft: 'Borrador',
  issued: 'Emitida',
  applied: 'Aplicada',
  cancelled: 'Cancelada'
}

export default function DetalleNotaCreditoPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const [note, setNote] = useState<CreditNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [newStatus, setNewStatus] = useState<Status | ''>('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/credit-notes/${id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data) setNote(j.data)
      })
      .finally(() => setLoading(false))
  }, [id])

  const changeStatus = async () => {
    if (!newStatus || !note) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/credit-notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      })
      const json = await res.json()
      if (json.success && json.data) {
        setNote(json.data)
        setNewStatus('')
        toast.success('Estado actualizado')
      } else {
        toast.error(json.error || 'Error al actualizar')
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
        title={note.credit_note_number}
        description="Detalle de nota de crédito"
        breadcrumbs={[
          { label: 'Ingresos', href: '/ingresos' },
          { label: 'Ajustes y devoluciones', href: '/ingresos/ajustes-devoluciones' },
          { label: note.credit_note_number, href: `/ingresos/ajustes-devoluciones/${id}` }
        ]}
      />
      <div className="space-y-4 p-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {note.credit_note_number}
            </CardTitle>
            <Badge variant={note.status === 'applied' ? 'default' : note.status === 'cancelled' ? 'secondary' : 'outline'}>
              {statusLabels[note.status]}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <p><span className="text-muted-foreground">Factura asociada:</span> {note.sales_invoice?.invoice_number ?? '—'}</p>
              <p><span className="text-muted-foreground">Fecha creación:</span> {new Date(note.created_at).toLocaleString()}</p>
              {note.issued_at && <p><span className="text-muted-foreground">Fecha emisión:</span> {new Date(note.issued_at).toLocaleString()}</p>}
              <p><span className="text-muted-foreground">Monto total:</span> {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(note.total_amount)}</p>
            </div>
            {note.reason && <p><span className="text-muted-foreground">Motivo:</span> {note.reason}</p>}
            {note.notes && <p><span className="text-muted-foreground">Observaciones:</span> {note.notes}</p>}
            {note.items && note.items.length > 0 && (
              <div>
                <p className="mb-2 font-medium">Ítems</p>
                <ul className="space-y-1 text-sm">
                  {note.items.map((i) => (
                    <li key={i.item_name + i.quantity}>
                      {i.item_name} — {i.quantity} × {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(i.unit_price)} = {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(i.total_price)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {note.status !== 'cancelled' && (
              <div className="flex flex-wrap items-end gap-2 border-t pt-4">
                <Select
                  label="Cambiar estado"
                  options={[
                    { value: '', label: 'Seleccionar...' },
                    { value: 'draft', label: 'Borrador' },
                    { value: 'issued', label: 'Emitida' },
                    { value: 'applied', label: 'Aplicada' },
                    { value: 'cancelled', label: 'Cancelada' }
                  ]}
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as Status)}
                />
                <Button onClick={changeStatus} disabled={!newStatus || updating}>
                  {updating ? 'Actualizando...' : 'Aplicar'}
                </Button>
              </div>
            )}
            <Button variant="outline" asChild>
              <Link href="/ingresos/ajustes-devoluciones">Volver al listado</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
