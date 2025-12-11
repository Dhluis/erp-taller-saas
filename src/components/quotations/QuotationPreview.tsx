'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Printer, Download, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Quotation {
  id: string
  quotation_number: string
  customer_id: string
  vehicle_id: string
  status: string
  valid_until: string
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  terms_and_conditions?: string
  notes?: string
  created_at: string
  customers?: {
    id: string
    name: string
    email?: string
    phone?: string
    address?: string
  }
  vehicles?: {
    id: string
    brand: string
    model: string
    license_plate: string
    year?: number
    color?: string
  }
  quotation_items?: Array<{
    id: string
    item_type: string
    description: string
    quantity: number
    unit_price: number
    discount_percent: number
    discount_amount: number
    tax_percent: number
    subtotal: number
    tax_amount: number
    total: number
  }>
}

interface QuotationPreviewProps {
  quotation: Quotation
  open: boolean
  onOpenChange: (open: boolean) => void
}

const STATUS_COLORS = {
  draft: 'bg-gray-500',
  sent: 'bg-blue-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  expired: 'bg-orange-500',
  converted: 'bg-purple-500',
}

const STATUS_LABELS = {
  draft: 'Borrador',
  sent: 'Enviada',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  expired: 'Vencida',
  converted: 'Convertida',
}

export function QuotationPreview({
  quotation,
  open,
  onOpenChange,
}: QuotationPreviewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: es })
    } catch {
      return dateString
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Vista Previa de Cotización</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            {quotation.quotation_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 print:p-8" id="quotation-preview">
          {/* Header */}
          <div className="border-b pb-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">COTIZACIÓN</h2>
                <p className="text-muted-foreground mt-1">
                  Número: {quotation.quotation_number}
                </p>
              </div>
              <div className="text-right">
                <Badge className={STATUS_COLORS[quotation.status as keyof typeof STATUS_COLORS]}>
                  {STATUS_LABELS[quotation.status as keyof typeof STATUS_LABELS]}
                </Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  Fecha: {formatDate(quotation.created_at)}
                </p>
                {quotation.valid_until && (
                  <p className="text-sm text-muted-foreground">
                    Válida hasta: {formatDate(quotation.valid_until)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Información del Cliente y Vehículo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Cliente</h3>
              {quotation.customers ? (
                <div className="text-sm space-y-1">
                  <p className="font-medium">{quotation.customers.name}</p>
                  {quotation.customers.email && (
                    <p className="text-muted-foreground">{quotation.customers.email}</p>
                  )}
                  {quotation.customers.phone && (
                    <p className="text-muted-foreground">{quotation.customers.phone}</p>
                  )}
                  {quotation.customers.address && (
                    <p className="text-muted-foreground">{quotation.customers.address}</p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">N/A</p>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Vehículo</h3>
              {quotation.vehicles ? (
                <div className="text-sm space-y-1">
                  <p className="font-medium">
                    {quotation.vehicles.brand} {quotation.vehicles.model}
                  </p>
                  <p className="text-muted-foreground">
                    Placa: {quotation.vehicles.license_plate}
                  </p>
                  {quotation.vehicles.year && (
                    <p className="text-muted-foreground">Año: {quotation.vehicles.year}</p>
                  )}
                  {quotation.vehicles.color && (
                    <p className="text-muted-foreground">Color: {quotation.vehicles.color}</p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">N/A</p>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Servicios y Productos</h3>
            {quotation.quotation_items && quotation.quotation_items.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-center">Cantidad</TableHead>
                      <TableHead className="text-right">Precio Unit.</TableHead>
                      <TableHead className="text-right">Descuento</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-right">IVA</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotation.quotation_items.map((item, index) => (
                      <TableRow key={item.id || index}>
                        <TableCell className="font-medium">
                          {item.description}
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unit_price)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.discount_percent > 0
                            ? `${item.discount_percent}% (${formatCurrency(item.discount_amount)})`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.subtotal)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.tax_amount)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(item.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No hay items en esta cotización
              </p>
            )}
          </div>

          {/* Totales */}
          <div className="flex justify-end">
            <div className="w-full max-w-md space-y-2 border rounded-lg p-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">{formatCurrency(quotation.subtotal)}</span>
              </div>
              {quotation.discount_amount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Descuento:</span>
                  <span>-{formatCurrency(quotation.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>IVA (16%):</span>
                <span className="font-medium">{formatCurrency(quotation.tax_amount)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{formatCurrency(quotation.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Términos y Condiciones */}
          {quotation.terms_and_conditions && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Términos y Condiciones</h3>
              <div className="text-sm whitespace-pre-line border rounded-lg p-4 bg-muted/50">
                {quotation.terms_and_conditions}
              </div>
            </div>
          )}

          {/* Notas */}
          {quotation.notes && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Notas</h3>
              <div className="text-sm whitespace-pre-line border rounded-lg p-4 bg-muted/50">
                {quotation.notes}
              </div>
            </div>
          )}

          {/* Firma */}
          <div className="border-t pt-6 mt-6">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="font-semibold mb-4">Cliente</p>
                <div className="border-t pt-2 h-16"></div>
                <p className="text-sm text-muted-foreground mt-2">Firma y Sello</p>
              </div>
              <div>
                <p className="font-semibold mb-4">Taller</p>
                <div className="border-t pt-2 h-16"></div>
                <p className="text-sm text-muted-foreground mt-2">Firma y Sello</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

