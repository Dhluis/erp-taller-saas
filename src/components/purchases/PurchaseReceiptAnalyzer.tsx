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
import { Badge } from '@/components/ui/badge'
import { Loader2, ScanLine, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useBilling } from '@/hooks/useBilling'

interface OrderItem {
  id: string
  product_name: string
  quantity: number
  quantity_received: number
  unit_cost: number
}

interface ExtractedPart {
  description: string
  quantity: number
  unit_price: number
  total: number
}

interface MatchResult {
  extracted: ExtractedPart
  orderItem: OrderItem | null
  priceDiff: number | null   // porcentaje de diferencia de precio
  inOrder: boolean
}

interface PurchaseReceiptAnalyzerProps {
  orderId: string
  orderItems: OrderItem[]
  onQuantitiesDetected: (quantities: Record<string, number>) => void
}

function matchPartsToOrder(parts: ExtractedPart[], orderItems: OrderItem[]): MatchResult[] {
  return parts.map(part => {
    const partWords = part.description.toLowerCase().split(/\s+/).filter(w => w.length > 3)

    const matched = orderItems.find(oi => {
      const nameWords = oi.product_name.toLowerCase()
      return partWords.some(w => nameWords.includes(w))
    }) ?? null

    let priceDiff: number | null = null
    if (matched && matched.unit_cost > 0 && part.unit_price > 0) {
      priceDiff = ((part.unit_price - matched.unit_cost) / matched.unit_cost) * 100
    }

    return {
      extracted: part,
      orderItem: matched,
      priceDiff,
      inOrder: !!matched,
    }
  })
}

export function PurchaseReceiptAnalyzer({
  orderId,
  orderItems,
  onQuantitiesDetected,
}: PurchaseReceiptAnalyzerProps) {
  const { canUseAI, isLoading: billingLoading } = useBilling()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isUploading, setIsUploading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [supplier, setSupplier] = useState<string | null>(null)
  const [date, setDate] = useState<string | null>(null)
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)

  if (billingLoading) return null

  if (!canUseAI) {
    return (
      <Button type="button" variant="outline" disabled className="gap-2 opacity-60" title="Requiere plan Premium">
        <ScanLine className="h-4 w-4" />
        Escanear Factura (Premium)
      </Button>
    )
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setIsUploading(true)
    setAiError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/purchase-orders/${orderId}/analyze-receipt`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        if (response.status === 403) {
          toast.error('Función exclusiva del plan Premium.')
        } else {
          toast.error(result.error || 'Error al analizar el documento')
        }
        return
      }

      setSupplier(result.supplier ?? null)
      setDate(result.date ?? null)
      setDocumentUrl(result.document_url ?? null)

      if (result.ai_error) {
        setAiError(result.ai_error)
        toast.warning('Documento guardado. No se pudo extraer texto automáticamente.')
      }

      const computed = matchPartsToOrder(result.parts ?? [], orderItems)
      setMatches(computed)
      setIsDialogOpen(true)
    } catch {
      toast.error('Error de conexión al analizar el documento')
    } finally {
      setIsUploading(false)
    }
  }

  function handleConfirm() {
    // Pre-llenar cantidades basándose en los matches
    const newQuantities: Record<string, number> = {}

    for (const match of matches) {
      if (match.orderItem && match.inOrder) {
        const pending = match.orderItem.quantity - match.orderItem.quantity_received
        const toReceive = Math.min(Math.round(match.extracted.quantity), pending)
        if (toReceive > 0) {
          newQuantities[match.orderItem.id] = toReceive
        }
      }
    }

    onQuantitiesDetected(newQuantities)
    setIsDialogOpen(false)

    const filled = Object.keys(newQuantities).length
    if (filled > 0) {
      toast.success(`Se pre-llenaron ${filled} cantidades. Revisa y confirma la recepción.`)
    } else {
      toast.warning('No se pudieron mapear partes de la factura con los ítems de la orden.')
    }
  }

  const discrepancies = matches.filter(m => m.priceDiff !== null && Math.abs(m.priceDiff) > 5)
  const notInOrder = matches.filter(m => !m.inOrder)
  const hasAlerts = discrepancies.length > 0 || notInOrder.length > 0

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
        className="gap-2"
      >
        {isUploading
          ? <Loader2 className="animate-spin h-4 w-4" />
          : <ScanLine className="h-4 w-4" />
        }
        {isUploading ? 'Analizando...' : 'Escanear Factura'}
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,application/pdf"
        onChange={handleFileChange}
      />

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => { if (!open) setIsDialogOpen(false) }}
      >
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-400">
              <ScanLine className="h-5 w-5" />
              Verificación de Factura
            </DialogTitle>
            {(supplier || date) && (
              <p className="text-sm text-slate-400">
                {supplier && <span className="mr-3">Proveedor en factura: <span className="text-white">{supplier}</span></span>}
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

          {/* Alertas antifraude */}
          {hasAlerts && (
            <div className="space-y-2">
              {discrepancies.length > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-red-950/50 border border-red-700/50 text-red-300 text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Alerta: diferencias de precio detectadas</p>
                    <ul className="mt-1 space-y-0.5">
                      {discrepancies.map((m, i) => (
                        <li key={i}>
                          <span className="text-white">{m.extracted.description}</span>
                          {' — '} Factura: <span className="text-white">${m.extracted.unit_price.toFixed(2)}</span>
                          {' vs '} Orden: <span className="text-white">${m.orderItem?.unit_cost.toFixed(2)}</span>
                          <Badge
                            className={`ml-2 text-xs ${(m.priceDiff ?? 0) > 0 ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'}`}
                          >
                            {(m.priceDiff ?? 0) > 0 ? '+' : ''}{m.priceDiff?.toFixed(1)}%
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              {notInOrder.length > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-amber-950/50 border border-amber-700/50 text-amber-300 text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Partes en factura no encontradas en la orden:</p>
                    <p className="mt-0.5">{notInOrder.map(m => m.extracted.description).join(', ')}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tabla de comparación */}
          {matches.length > 0 && (
            <div className="overflow-x-auto">
              <p className="text-xs text-slate-400 mb-2">Comparación factura vs orden de compra</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="py-2 pr-3 text-left">Parte en factura</th>
                    <th className="py-2 pr-3 text-right w-20">Cant.</th>
                    <th className="py-2 pr-3 text-right w-28">Precio fact.</th>
                    <th className="py-2 pr-3 text-right w-28">Precio OC</th>
                    <th className="py-2 text-center w-28">Coincide</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m, i) => (
                    <tr key={i} className="border-b border-slate-800">
                      <td className="py-2 pr-3">
                        <p className="text-white">{m.extracted.description}</p>
                        {m.orderItem && (
                          <p className="text-xs text-slate-400">→ {m.orderItem.product_name}</p>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right text-slate-300">{m.extracted.quantity}</td>
                      <td className="py-2 pr-3 text-right text-slate-300">
                        ${m.extracted.unit_price.toFixed(2)}
                      </td>
                      <td className="py-2 pr-3 text-right text-slate-300">
                        {m.orderItem ? `$${m.orderItem.unit_cost.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-2 text-center">
                        {!m.inOrder ? (
                          <XCircle className="h-4 w-4 text-amber-400 mx-auto" />
                        ) : m.priceDiff !== null && Math.abs(m.priceDiff) > 5 ? (
                          <AlertTriangle className="h-4 w-4 text-red-400 mx-auto" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-400 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {matches.length === 0 && !aiError && (
            <p className="text-center text-slate-400 py-6">
              No se detectaron partes en el documento.
            </p>
          )}

          {documentUrl && (
            <p className="text-xs text-slate-500">
              Documento guardado.{' '}
              <a href={documentUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                Ver archivo
              </a>
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsDialogOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Pre-llenar cantidades y continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
