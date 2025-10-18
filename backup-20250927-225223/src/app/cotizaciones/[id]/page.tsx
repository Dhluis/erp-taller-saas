"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowLeft, 
  Download, 
  Mail, 
  Edit, 
  ArrowRight,
  FileText,
  Calendar,
  Clock,
  User,
  Car,
  Building,
  Phone,
  MapPin,
  DollarSign
} from "lucide-react"

interface Quotation {
  id: string
  quotation_number: string
  client_id: string
  vehicle_id: string
  status: string
  valid_until: string
  payment_terms: string
  delivery_time: string
  subtotal: number
  discount_amount: number
  tax_amount: number
  total: number
  terms_conditions: string
  notes: string
  created_at: string
  updated_at: string
  // Relaciones
  customers?: {
    name: string
    email: string
    phone: string
    address: string
  }
  vehicles?: {
    brand: string
    model: string
    year: number
    license_plate: string
    vin: string
    color: string
  }
  quotation_items?: QuotationItem[]
}

interface QuotationItem {
  id: string
  service_id?: string
  inventory_id?: string
  item_type: 'service' | 'product'
  description: string
  quantity: number
  unit_price: number
  discount_percent: number
  discount_amount: number
  tax_percent: number
  subtotal: number
  tax_amount: number
  total: number
}

const STATUS_CONFIG = {
  draft: { label: "Borrador", color: "bg-gray-100 text-gray-800" },
  sent: { label: "Enviada", color: "bg-blue-100 text-blue-800" },
  approved: { label: "Aprobada", color: "bg-green-100 text-green-800" },
  rejected: { label: "Rechazada", color: "bg-red-100 text-red-800" },
  expired: { label: "Vencida", color: "bg-orange-100 text-orange-800" },
  converted: { label: "Convertida", color: "bg-purple-100 text-purple-800" }
}

export default function CotizacionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const quotationId = params.id as string

  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (quotationId) {
      loadQuotationDetails()
    }
  }, [quotationId])

  const loadQuotationDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/quotations/${quotationId}`)
      if (!response.ok) throw new Error('Error al cargar cotización')
      
      const data = await response.json()
      setQuotation(data)
    } catch (error) {
      console.error('Error loading quotation:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/quotations/${quotationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) throw new Error('Error al actualizar estado')

      loadQuotationDetails()
    } catch (error) {
      console.error('Error updating quotation status:', error)
    }
  }

  const handleConvertToOrder = async () => {
    try {
      const response = await fetch(`/api/quotations/${quotationId}/convert`, {
        method: 'POST'
      })

      if (!response.ok) throw new Error('Error al convertir cotización')

      const data = await response.json()
      alert(`Cotización convertida a orden: ${data.order_id}`)
      router.push(`/ordenes/${data.order_id}`)
    } catch (error) {
      console.error('Error converting quotation:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const isExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date()
  }

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft
    return <Badge variant="outline" className={config.color}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!quotation) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/cotizaciones">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Cotización no encontrada</h2>
              <p className="text-muted-foreground">La cotización solicitada no existe</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isQuotationExpired = isExpired(quotation.valid_until)
  const currentStatus = isQuotationExpired && quotation.status === 'sent' ? 'expired' : quotation.status

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/cotizaciones">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {quotation.quotation_number}
            </h2>
            <p className="text-muted-foreground">
              {quotation.customers?.name} - {quotation.vehicles?.brand} {quotation.vehicles?.model} {quotation.vehicles?.year}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(currentStatus)}
          <div className="flex gap-2">
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Mail className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Cotización Estilo Factura */}
      <div className="bg-white border rounded-lg p-8 shadow-sm">
        {/* Header de la Empresa */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">TALLER AUTOMOTRIZ</h1>
            <p className="text-gray-600">Especialistas en Servicios Automotrices</p>
            <div className="mt-4 space-y-1 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Av. Principal 123, Ciudad, Estado</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>+52 (55) 1234-5678</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>info@tallerautomotriz.com</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-gray-900">COTIZACIÓN</h2>
            <p className="text-lg font-semibold text-blue-600">{quotation.quotation_number}</p>
            <div className="mt-4 space-y-1 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Fecha: {formatDate(quotation.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Válida hasta: {formatDate(quotation.valid_until)}</span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Información del Cliente */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cotizar para:</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{quotation.customers?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <span>{quotation.customers?.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <span>{quotation.customers?.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span>{quotation.customers?.address}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehículo:</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-gray-500" />
                <span className="font-medium">
                  {quotation.vehicles?.brand} {quotation.vehicles?.model} {quotation.vehicles?.year}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span>Placas: {quotation.vehicles?.license_plate}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span>VIN: {quotation.vehicles?.vin}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span>Color: {quotation.vehicles?.color}</span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Tabla de Items */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Descripción de Servicios</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Descripción</th>
                  <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900">Cant.</th>
                  <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-900">P. Unit.</th>
                  <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-900">Desc.</th>
                  <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-900">Subtotal</th>
                  <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-900">IVA</th>
                  <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-900">Total</th>
                </tr>
              </thead>
              <tbody>
                {quotation.quotation_items?.map((item, index) => (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {item.item_type === 'service' ? 'Servicio' : 'Producto'}
                        </Badge>
                        <span>{item.description}</span>
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center">{item.quantity}</td>
                    <td className="border border-gray-300 px-4 py-3 text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="border border-gray-300 px-4 py-3 text-right">
                      {item.discount_percent > 0 ? `${item.discount_percent}%` : '-'}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-right">{formatCurrency(item.subtotal)}</td>
                    <td className="border border-gray-300 px-4 py-3 text-right">{formatCurrency(item.tax_amount)}</td>
                    <td className="border border-gray-300 px-4 py-3 text-right font-semibold">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totales */}
        <div className="flex justify-end mb-8">
          <div className="w-80 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(quotation.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Descuentos:</span>
              <span className="text-red-600">-{formatCurrency(quotation.discount_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span>IVA (16%):</span>
              <span>{formatCurrency(quotation.tax_amount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>{formatCurrency(quotation.total)}</span>
            </div>
          </div>
        </div>

        {/* Condiciones */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Condiciones de Pago:</h4>
            <p className="text-gray-700">{quotation.payment_terms}</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Tiempo de Entrega:</h4>
            <p className="text-gray-700">{quotation.delivery_time}</p>
          </div>
        </div>

        {/* Términos y Condiciones */}
        {quotation.terms_conditions && (
          <div className="mb-8">
            <h4 className="font-semibold text-gray-900 mb-2">Términos y Condiciones:</h4>
            <div className="text-gray-700 whitespace-pre-wrap">{quotation.terms_conditions}</div>
          </div>
        )}

        {/* Notas */}
        {quotation.notes && (
          <div className="mb-8">
            <h4 className="font-semibold text-gray-900 mb-2">Notas Adicionales:</h4>
            <div className="text-gray-700 whitespace-pre-wrap">{quotation.notes}</div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-8 border-t">
          <div className="text-center text-sm text-gray-600">
            <p>Esta cotización es válida hasta el {formatDate(quotation.valid_until)}</p>
            <p className="mt-2">Para cualquier consulta, no dude en contactarnos</p>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {currentStatus === 'sent' && (
            <>
              <Button onClick={() => handleStatusChange('approved')}>
                <FileText className="h-4 w-4 mr-2" />
                Aprobar
              </Button>
              <Button variant="outline" onClick={() => handleStatusChange('rejected')}>
                Rechazar
              </Button>
            </>
          )}
          {currentStatus === 'approved' && (
            <Button onClick={handleConvertToOrder}>
              <ArrowRight className="h-4 w-4 mr-2" />
              Convertir a Orden
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Descargar PDF
          </Button>
          <Button variant="outline">
            <Mail className="h-4 w-4 mr-2" />
            Enviar por Email
          </Button>
        </div>
      </div>
    </div>
  )
}

