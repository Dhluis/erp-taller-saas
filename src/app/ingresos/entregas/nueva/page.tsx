'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Package, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Customer { id: string; name: string }
interface ItemRow { item_name: string; quantity: number; unit: string; notes: string }

export default function NuevaEntregaPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [nextNumber, setNextNumber] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<ItemRow[]>([{ item_name: '', quantity: 1, unit: 'un', notes: '' }])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/delivery-notes/next-number', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => j.success && j.data?.delivery_number && setNextNumber(j.data.delivery_number))
  }, [])
  useEffect(() => {
    fetch('/api/customers?pageSize=500', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => j.success && j.data?.items && setCustomers(j.data.items))
  }, [])

  const addRow = () => setItems((p) => [...p, { item_name: '', quantity: 1, unit: 'un', notes: '' }])
  const removeRow = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i))
  const updateRow = (i: number, field: keyof ItemRow, value: string | number) => {
    setItems((p) => {
      const next = [...p]
      next[i] = { ...next[i], [field]: value }
      if (field === 'quantity') next[i].quantity = Number(next[i].quantity) || 0
      return next
    })
  }

  const valid = nextNumber && customerId && items.every((i) => i.item_name.trim() && i.quantity > 0)

  const submit = async () => {
    if (!valid) {
      toast.error('Selecciona cliente y completa al menos un ítem.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/delivery-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          delivery_number: nextNumber,
          customer_id: customerId,
          notes: notes || null,
          items: items.map((i) => ({ item_name: i.item_name.trim(), quantity: Number(i.quantity), unit: i.unit || 'un', notes: i.notes || undefined }))
        })
      })
      const json = await res.json()
      if (json.success && json.data?.id) {
        toast.success('Entrega creada')
        router.push(`/ingresos/entregas/${json.data.id}`)
      } else {
        toast.error(json.error || 'Error al crear')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const customerOptions = [{ value: '', label: 'Seleccionar cliente' }, ...customers.map((c) => ({ value: c.id, label: c.name }))]

  return (
    <AppLayout>
      <PageHeader
        title="Nueva entrega"
        description="Comprobante de entrega"
        breadcrumbs={[
          { label: 'Ingresos', href: '/ingresos' },
          { label: 'Entregas', href: '/ingresos/entregas' },
          { label: 'Nueva', href: '/ingresos/entregas/nueva' }
        ]}
      />
      <div className="space-y-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Datos de la entrega
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Número" value={nextNumber} readOnly disabled />
              <Select label="Cliente" required options={customerOptions} value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
            </div>
            <Textarea label="Observaciones" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Ítems a entregar</span>
                <Button type="button" variant="outline" size="sm" onClick={addRow}>
                  <Plus className="mr-1 h-4 w-4" />
                  Agregar
                </Button>
              </div>
              <div className="space-y-3">
                {items.map((row, i) => (
                  <div key={i} className="flex flex-wrap items-end gap-2 rounded border p-3">
                    <Input label="Descripción" value={row.item_name} onChange={(e) => updateRow(i, 'item_name', e.target.value)} placeholder="Nombre del ítem" className="min-w-[200px]" />
                    <Input label="Cantidad" type="number" min={1} value={row.quantity} onChange={(e) => updateRow(i, 'quantity', e.target.value)} className="w-24" />
                    <Input label="Unidad" value={row.unit} onChange={(e) => updateRow(i, 'unit', e.target.value)} placeholder="un" className="w-20" />
                    <Input label="Notas" value={row.notes} onChange={(e) => updateRow(i, 'notes', e.target.value)} placeholder="Opcional" className="min-w-[120px]" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(i)} disabled={items.length <= 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={submit} disabled={!valid || saving}>{saving ? 'Guardando...' : 'Crear entrega'}</Button>
              <Button variant="outline" asChild><Link href="/ingresos/entregas">Cancelar</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
