'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { FileText, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

type ItemType = 'service' | 'part'
interface ItemRow {
  item_type: ItemType
  item_name: string
  description: string
  quantity: number
  unit_price: number
}

export default function NuevaNotaCreditoPage() {
  const router = useRouter()
  const [nextNumber, setNextNumber] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<ItemRow[]>([{ item_type: 'service', item_name: '', description: '', quantity: 1, unit_price: 0 }])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/credit-notes/next-number', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => j.success && j.data?.credit_note_number && setNextNumber(j.data.credit_note_number))
  }, [])

  const addRow = () => setItems((p) => [...p, { item_type: 'service', item_name: '', description: '', quantity: 1, unit_price: 0 }])
  const removeRow = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i))
  const updateRow = (i: number, field: keyof ItemRow, value: string | number) => {
    setItems((p) => {
      const next = [...p]
      next[i] = { ...next[i], [field]: value }
      if (field === 'quantity' || field === 'unit_price') {
        next[i].quantity = Number(next[i].quantity) || 0
        next[i].unit_price = Number(next[i].unit_price) || 0
      }
      return next
    })
  }

  const total = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0)
  const valid = nextNumber && items.every((i) => i.item_name.trim() && i.quantity > 0 && i.unit_price >= 0)

  const submit = async () => {
    if (!valid) {
      toast.error('Completa número y al menos un ítem con nombre, cantidad y precio.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/credit-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          credit_note_number: nextNumber,
          reason: reason || null,
          notes: notes || null,
          items: items.map((i) => ({
            item_type: i.item_type,
            item_name: i.item_name.trim(),
            description: i.description.trim() || undefined,
            quantity: Number(i.quantity),
            unit_price: Number(i.unit_price)
          }))
        })
      })
      const json = await res.json()
      if (json.success && json.data?.id) {
        toast.success('Nota de crédito creada')
        router.push(`/ingresos/ajustes-devoluciones/${json.data.id}`)
      } else {
        toast.error(json.error || 'Error al crear')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout>
      <PageHeader
        title="Nueva nota de crédito"
        description="Ajustes y devoluciones"
        breadcrumbs={[
          { label: 'Ingresos', href: '/ingresos' },
          { label: 'Ajustes y devoluciones', href: '/ingresos/ajustes-devoluciones' },
          { label: 'Nueva nota', href: '/ingresos/ajustes-devoluciones/nueva' }
        ]}
      />
      <div className="space-y-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Datos de la nota
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Número" value={nextNumber} readOnly disabled />
              <Input label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Opcional" />
            </div>
            <Textarea label="Observaciones" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Ítems</span>
                <Button type="button" variant="outline" size="sm" onClick={addRow}>
                  <Plus className="mr-1 h-4 w-4" />
                  Agregar
                </Button>
              </div>
              <div className="space-y-3">
                {items.map((row, i) => (
                  <div key={i} className="flex flex-wrap items-end gap-2 rounded border p-3">
                    <Select
                      label="Tipo"
                      options={[{ value: 'service', label: 'Servicio' }, { value: 'part', label: 'Repuesto' }]}
                      value={row.item_type}
                      onChange={(e) => updateRow(i, 'item_type', e.target.value as ItemType)}
                    />
                    <Input label="Nombre" value={row.item_name} onChange={(e) => updateRow(i, 'item_name', e.target.value)} placeholder="Descripción" className="min-w-[180px]" />
                    <Input label="Cant." type="number" min={1} value={row.quantity} onChange={(e) => updateRow(i, 'quantity', e.target.value)} className="w-20" />
                    <Input label="P. unit." type="number" min={0} step={0.01} value={row.unit_price || ''} onChange={(e) => updateRow(i, 'unit_price', e.target.value)} className="w-28" />
                    <Input label="Detalle" value={row.description} onChange={(e) => updateRow(i, 'description', e.target.value)} placeholder="Opcional" className="min-w-[120px]" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(i)} disabled={items.length <= 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-right text-sm font-semibold">Total: {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(total)}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={submit} disabled={!valid || saving}>{saving ? 'Guardando...' : 'Crear nota de crédito'}</Button>
              <Button variant="outline" asChild><Link href="/ingresos/ajustes-devoluciones">Cancelar</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
