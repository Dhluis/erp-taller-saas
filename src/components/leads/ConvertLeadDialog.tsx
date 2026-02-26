'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { INPUT_LIMITS } from '@/lib/utils/input-sanitizers'
import type { CRMLead } from './types'

interface ConvertLeadDialogProps {
  lead: CRMLead | null
  onClose: () => void
  onSuccess?: (updatedLead: CRMLead) => void
}

export function ConvertLeadDialog({ lead, onClose, onSuccess }: ConvertLeadDialogProps) {
  const [vehicle, setVehicle] = useState({ add: false, brand: '', model: '', year: '', plate: '', vin: '' })
  const [submitting, setSubmitting] = useState(false)

  const setV = (field: string, value: string | boolean) =>
    setVehicle((v) => ({ ...v, [field]: value }))

  const handleSubmit = async () => {
    if (!lead) return
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = { additional_notes: 'Convertido desde CRM Pipeline' }

      if (vehicle.add) {
        const y = parseInt(vehicle.year, 10)
        if (Number.isNaN(y) || y < INPUT_LIMITS.YEAR_MIN || y > INPUT_LIMITS.YEAR_MAX) {
          toast.error(`El año debe estar entre ${INPUT_LIMITS.YEAR_MIN} y ${INPUT_LIMITS.YEAR_MAX}`)
          setSubmitting(false)
          return
        }
        if (!vehicle.brand.trim() || !vehicle.model.trim() || !vehicle.plate.trim()) {
          toast.error('Marca, modelo y placa son requeridos para agregar un vehículo')
          setSubmitting(false)
          return
        }
        if (vehicle.vin && vehicle.vin.length !== 17) {
          toast.error(`El VIN debe tener 17 caracteres (tiene ${vehicle.vin.length})`)
          setSubmitting(false)
          return
        }
        body.vehicle = {
          brand: vehicle.brand.trim(),
          model: vehicle.model.trim(),
          year: y,
          plate: vehicle.plate.trim(),
          ...(vehicle.vin ? { vin: vehicle.vin.trim() } : {}),
        }
      }

      const res = await fetch(`/api/leads/${lead.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Error al convertir')

      toast.success('Lead convertido a cliente exitosamente')
      onSuccess?.({ ...lead, status: 'won', customer_id: data.data?.customer_id })
      onClose()
      setVehicle({ add: false, brand: '', model: '', year: '', plate: '', vin: '' })
    } catch (err: any) {
      toast.error(err.message || 'Error al convertir lead')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={!!lead} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg bg-slate-800 border-green-500/50 border-2 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Convertir a Cliente</DialogTitle>
          <DialogDescription className="text-slate-400">
            Se creará un cliente a partir de <strong className="text-white">{lead?.name}</strong>.
            Opcionalmente puedes registrar un vehículo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
            <Checkbox
              id="addVehicle"
              checked={vehicle.add}
              onCheckedChange={(v) => setV('add', !!v)}
            />
            <Label htmlFor="addVehicle" className="text-slate-200 cursor-pointer">
              Registrar vehículo del cliente
            </Label>
          </div>

          {vehicle.add && (
            <div className="grid gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-300 text-sm">Marca *</Label>
                  <Input value={vehicle.brand} onChange={(e) => setV('brand', e.target.value)} className="bg-slate-800 border-slate-600 text-white mt-1" placeholder="Toyota" />
                </div>
                <div>
                  <Label className="text-slate-300 text-sm">Modelo *</Label>
                  <Input value={vehicle.model} onChange={(e) => setV('model', e.target.value)} className="bg-slate-800 border-slate-600 text-white mt-1" placeholder="Corolla" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-300 text-sm">Año *</Label>
                  <Input value={vehicle.year} onChange={(e) => setV('year', e.target.value)} className="bg-slate-800 border-slate-600 text-white mt-1" placeholder="2020" type="number" />
                </div>
                <div>
                  <Label className="text-slate-300 text-sm">Placas *</Label>
                  <Input value={vehicle.plate} onChange={(e) => setV('plate', e.target.value)} className="bg-slate-800 border-slate-600 text-white mt-1" placeholder="ABC-123" />
                </div>
              </div>
              <div>
                <Label className="text-slate-300 text-sm">VIN (opcional, 17 caracteres)</Label>
                <Input value={vehicle.vin} onChange={(e) => setV('vin', e.target.value.toUpperCase())} className="bg-slate-800 border-slate-600 text-white mt-1 font-mono" placeholder="1HGBH41JXMN109186" maxLength={17} />
                {vehicle.vin && <p className="text-xs text-slate-500 mt-1">{vehicle.vin.length}/17 caracteres</p>}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-700">
          <Button variant="ghost" onClick={onClose} className="text-slate-400" disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {submitting ? 'Convirtiendo...' : 'Convertir a Cliente'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
