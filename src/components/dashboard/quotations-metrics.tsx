"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, CheckCircle, ArrowRight, TrendingUp, DollarSign } from "lucide-react"
import { useOrgCurrency } from '@/lib/context/CurrencyContext'

interface QuotationsMetricsProps {
  quotationsMonth: number
  quotationsApproved: number
  quotationsConverted: number
  conversionRate: string
  totalQuotationValue: number
  approvedQuotationValue: number
}

export function QuotationsMetrics({
  quotationsMonth,
  quotationsApproved,
  quotationsConverted,
  conversionRate,
  totalQuotationValue,
  approvedQuotationValue
}: QuotationsMetricsProps) {
  const { currency } = useOrgCurrency();
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency
    }).format(amount)
  }

  const getConversionRateColor = (rate: string) => {
    const numRate = parseFloat(rate)
    if (numRate >= 70) return 'text-green-600'
    if (numRate >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Total de Cotizaciones */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cotizaciones del Mes</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{quotationsMonth}</div>
          <p className="text-xs text-muted-foreground">
            Total de cotizaciones generadas
          </p>
        </CardContent>
      </Card>

      {/* Cotizaciones Aprobadas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{quotationsApproved}</div>
          <p className="text-xs text-muted-foreground">
            {quotationsMonth > 0 ? ((quotationsApproved / quotationsMonth) * 100).toFixed(1) : 0}% del total
          </p>
        </CardContent>
      </Card>

      {/* Cotizaciones Convertidas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Convertidas</CardTitle>
          <ArrowRight className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{quotationsConverted}</div>
          <p className="text-xs text-muted-foreground">
            Convertidas a órdenes de trabajo
          </p>
        </CardContent>
      </Card>

      {/* Tasa de Conversión */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tasa de Conversión</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getConversionRateColor(conversionRate)}`}>
            {conversionRate}%
          </div>
          <p className="text-xs text-muted-foreground">
            Cotizaciones que se convierten en órdenes
          </p>
        </CardContent>
      </Card>

      {/* Valor Total de Cotizaciones */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalQuotationValue)}</div>
          <p className="text-xs text-muted-foreground">
            Valor total de todas las cotizaciones
          </p>
        </CardContent>
      </Card>

      {/* Valor de Cotizaciones Aprobadas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valor Aprobado</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(approvedQuotationValue)}</div>
          <p className="text-xs text-muted-foreground">
            Valor de cotizaciones aprobadas
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

