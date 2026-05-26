'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, ScanLine, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useBilling } from '@/hooks/useBilling'

interface ExtractedPart {
  description: string
  quantity: number
  unit_price: number
  total: number
  selected: boolean
}

interface ReceiptAnalyzerProps {
  workOrderId: string
  onPartsAdded: () => void
}

export function ReceiptAnalyzer({ workOrderId, onPartsAdded }: ReceiptAnalyzerProps) {
  const { canUseAI, isLoading: billingLoading } = useBilling()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isUploading, setIsUploading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [supplier, setSupplier] = useState<string | null>(null)
  const [date, setDate] = useState<string | null>(null)
  const [parts, setParts] = useState<ExtractedPart[]>([])

  if (billingLoading || !canUseAI) return null

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset input para permitir re-selección del mismo archivo
    e.target.value = ''

    setIsUploading(true)
    setAiError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/work-orders/${workOrderId}/analyze-receipt`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        if (response.status === 403) {
          toast.error('Función exclusiva del plan Premium. Actualiza tu plan para usarla.')
        } else {
          toast.error(result.error || 'Error al analizar el ticket')
        }
        return
      }

      setSupplier(result.supplier ?? null)
      setDate(result.date ?? null)

      const extractedParts: ExtractedPart[] = (result.parts ?? []).map((p: any) => ({
        description: p.description ?? '',
        quantity: Number(p.quantity) || 1,
        unit_price: Number(p.unit_price) || 0,
        total: Number(p.total) || 0,
        selected: true,
      }))
      setParts(extractedParts)

      if (result.ai_error) {
        setAiError(result.ai_error)
        toast.warning('Ticket guardado en la OT. No se pudo extraer texto automáticamente.')
      }

      setIsDialogOpen(true)
    } catch {
      toast.error('Error de conexión al analizar el ticket')
    } finally {
      setIsUploading(false)
    }
  }

  function updatePart(index: number, field: keyof Omit<ExtractedPart, 'selected'>, value: string) {
    setParts(prev => prev.map((p, i) => {
      if (i !== index) return p
      const updated = { ...p, [field]: field === 'description' ? value : Number(value) || 0 }
      if (field === 'quantity' || field === 'unit_price') {
        updated.total = parseFloat((updated.quantity * updated.unit_price).toFixed(2))
      }
      return updated
    }))
  }

  function togglePart(index: number) {
    setParts(prev => prev.map((p, i) => i === index ? { ...p, selected: !p.selected } : p))
  }

  async function handleConfirm() {
    const selected = parts.filter(p => p.selected && p.description.trim())
    if (selected.length === 0) {
      toast.error('Selecciona al menos una parte para agregar')
      return
    }

    setIsSaving(true)
    let successes = 0
    let failures = 0

    for (const part of selected) {
      try {
        const response = await fetch(`/api/orders/${workOrderId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_type: 'product',
            description: part.description,
            quantity: part.quantity,
            unit_price: part.unit_price,
          }),
        })
        if (response.ok) {
          successes++
        } else {
          failures++
        }
      } catch {
        failures++
      }
    }

    setIsSaving(false)
    setIsDialogOpen(false)
    setParts([])

    if (failures === 0) {
      toast.success(`${successes} parte${successes !== 1 ? 's' : ''} agregada${successes !== 1 ? 's' : ''} a la orden`)
    } else if (successes > 0) {
      toast.warning(`${successes} parte${successes !== 1 ? 's' : ''} agregada${successes !== 1 ? 's' : ''}. ${failures} fallaron.`)
    } else {
      toast.error('No se pudo agregar ninguna parte')
    }

    onPartsAdded()
  }

  const selectedCount = parts.filter(p => p.selected).length

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {isUploading
          ? <Loader2 className="animate-spin h-4 w-4 mr-2" />
          : <ScanLine className="h-4 w-4 mr-2" />
        }
        {isUploading ? 'Analizando...' : 'Escanear Ticket'}
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,application/pdf"
        onChange={handleFileChange}
      />

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open && !isSaving) setIsDialogOpen(false) }}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-400">
              <ScanLine className="h-5 w-5" />
              Partes extraídas del ticket
            </DialogTitle>
            {(supplier || date) && (
              <p className="text-sm text-slate-400">
                {supplier && <span className="mr-3">Proveedor: <span className="text-white">{supplier}</span></span>}
                {date && <span>Fecha: <span className="text-white">{date}</span></span>}
              </p>
            )}
          </DialogHeader>

          {aiError && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-950/50 border border-amber-700/50 text-amber-300 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{aiError}</span>
            </div>
          )}

          {parts.length === 0 && !aiError && (
            <p className="text-center text-slate-400 py-6">No se detectaron partes en el ticket.</p>
          )}

          {parts.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="py-2 pr-3 w-8"></th>
                    <th className="py-2 pr-3 text-left">Descripción</th>
                    <th className="py-2 pr-3 text-right w-24">Cantidad</th>
                    <th className="py-2 pr-3 text-right w-28">Precio unit.</th>
                    <th className="py-2 text-right w-24">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {parts.map((part, i) => (
                    <tr key={i} className="border-b border-slate-800">
                      <td className="py-2 pr-3">
                        <Checkbox
                          checked={part.selected}
                          onCheckedChange={() => togglePart(i)}
                          className="border-slate-500"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <Input
                          value={part.description}
                          onChange={e => updatePart(i, 'description', e.target.value)}
                          className="h-8 bg-slate-800 border-slate-600 text-white text-sm"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={part.quantity}
                          onChange={e => updatePart(i, 'quantity', e.target.value)}
                          className="h-8 bg-slate-800 border-slate-600 text-white text-sm text-right"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={part.unit_price}
                          onChange={e => updatePart(i, 'unit_price', e.target.value)}
                          className="h-8 bg-slate-800 border-slate-600 text-white text-sm text-right"
                        />
                      </td>
                      <td className="py-2 text-right text-slate-300">
                        ${part.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
              className="text-slate-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={isSaving || selectedCount === 0}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isSaving
                ? <><Loader2 className="animate-spin h-4 w-4 mr-2" />Agregando...</>
                : `Agregar seleccionadas (${selectedCount})`
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
