"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  TrendingUp,
  DollarSign,
  Download,
  Calendar,
  Package,
  ShoppingCart,
} from "lucide-react"
import { useOrganization } from "@/lib/context/SessionContext"
import { StandardBreadcrumbs } from "@/components/ui/breadcrumbs"

function getPeriodDates(period: string): { startDate: string; endDate: string } {
  const now = new Date()
  const endDate = now.toISOString().split('T')[0]
  let startDate: string
  switch (period) {
    case 'today':
      startDate = endDate
      break
    case 'this_week': {
      const d = new Date(now)
      d.setDate(now.getDate() - 7)
      startDate = d.toISOString().split('T')[0]
      break
    }
    case 'this_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      break
    case 'last_month': {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      startDate = d.toISOString().split('T')[0]
      return { startDate, endDate: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0] }
    }
    case 'this_quarter': {
      const d = new Date(now)
      d.setMonth(now.getMonth() - 3)
      startDate = d.toISOString().split('T')[0]
      break
    }
    case 'this_year':
      startDate = `${now.getFullYear()}-01-01`
      break
    case 'last_year':
      return { startDate: `${now.getFullYear() - 1}-01-01`, endDate: `${now.getFullYear() - 1}-12-31` }
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  }
  return { startDate, endDate }
}

const TYPE_LABELS: Record<string, string> = {
  package: 'Paquete',
  free_service: 'Servicio libre',
  loose_product: 'Producto',
}

export default function VentasPorItemsPage() {
  const { organizationId, ready } = useOrganization()
  const [report, setReport] = useState({
    summary: { total_items_sold: 0, total_units: 0, total_revenue: 0, average_price: 0 },
    by_revenue: [] as { name: string; line_type: string; quantity: number; total_revenue: number }[],
    by_quantity: [] as { name: string; line_type: string; quantity: number; total_revenue: number }[],
    by_type: [] as { type: string; count: number; revenue: number }[],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState("this_month")

  useEffect(() => {
    if (ready && !organizationId) setIsLoading(false)
    if (organizationId) loadReport()
  }, [selectedPeriod, organizationId, ready])

  const loadReport = async () => {
    if (!organizationId) return
    setIsLoading(true)
    try {
      const { startDate, endDate } = getPeriodDates(selectedPeriod)
      const res = await fetch(
        `/api/reports/ventas-por-items?start_date=${startDate}&end_date=${endDate}`,
        { credentials: 'include' }
      )
      const json = await res.json()
      if (json.data) setReport(json.data)
    } catch (error) {
      console.error('Error cargando reporte de ventas por ítems:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportPDF = () => {
    const periodLabels: Record<string, string> = {
      today: 'Hoy', this_week: 'Esta semana', this_month: 'Este mes',
      last_month: 'Mes pasado', this_quarter: 'Este trimestre',
      this_year: 'Este año', last_year: 'Año pasado',
    }
    const periodLabel = periodLabels[selectedPeriod] || 'Este mes'
    const currentDate = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })

    const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Ventas Por Ítems - ${periodLabel}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #333; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 5px 0; color: #666; }
        .metrics { display: grid; grid-template-columns: repeat(4,1fr); gap: 15px; margin-bottom: 30px; }
        .metric-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; text-align: center; }
        .metric-value { font-size: 22px; font-weight: bold; color: #3b82f6; margin: 8px 0; }
        .metric-label { color: #666; font-size: 12px; }
        h2 { background: #f0f0f0; padding: 10px; margin: 20px 0 10px; border-left: 4px solid #3b82f6; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f0f0f0; font-weight: bold; }
        .footer { margin-top: 40px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px; padding-top: 20px; }
      </style></head><body>
      <div class="header"><h1>Ventas Por Ítems</h1><p>Período: ${periodLabel}</p><p>Fecha: ${currentDate}</p></div>
      <div class="metrics">
        <div class="metric-card"><div class="metric-label">Ítems Únicos</div><div class="metric-value">${report.summary.total_items_sold}</div></div>
        <div class="metric-card"><div class="metric-label">Total Unidades</div><div class="metric-value">${report.summary.total_units.toFixed(0)}</div></div>
        <div class="metric-card"><div class="metric-label">Ingresos por Ítems</div><div class="metric-value">$${report.summary.total_revenue.toLocaleString()}</div></div>
        <div class="metric-card"><div class="metric-label">Precio Promedio</div><div class="metric-value">$${report.summary.average_price.toLocaleString()}</div></div>
      </div>
      <h2>Top por Ingresos</h2>
      <table><thead><tr><th>#</th><th>Ítem</th><th>Tipo</th><th>Unidades</th><th>Ingresos</th></tr></thead><tbody>
        ${report.by_revenue.map((item, i) => `<tr><td>${i + 1}</td><td>${item.name}</td><td>${TYPE_LABELS[item.line_type] || item.line_type}</td><td>${item.quantity.toFixed(0)}</td><td>$${item.total_revenue.toLocaleString()}</td></tr>`).join('')}
      </tbody></table>
      <h2>Desglose por Tipo</h2>
      <table><thead><tr><th>Tipo</th><th>Líneas</th><th>Ingresos</th></tr></thead><tbody>
        ${report.by_type.map(t => `<tr><td>${TYPE_LABELS[t.type] || t.type}</td><td>${t.count}</td><td>$${t.revenue.toLocaleString()}</td></tr>`).join('')}
      </tbody></table>
      <div class="footer"><p>Generado por Eagles System — ${currentDate}</p></div>
      </body></html>`

    const w = window.open('', '_blank')
    if (w) { w.document.write(htmlContent); w.document.close(); w.onload = () => setTimeout(() => w.print(), 250) }
    else alert('Permite las ventanas emergentes para exportar el PDF')
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Generando reporte de ventas por ítems...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <StandardBreadcrumbs
        currentPage="Ventas Por Ítems"
        parentPages={[{ label: 'Reportes', href: '/reportes' }]}
        className="mb-2"
      />
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Ventas Por Ítems</h2>
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[200px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700 text-white">
              <SelectItem value="today" className="text-white hover:bg-slate-800 focus:bg-slate-800">Hoy</SelectItem>
              <SelectItem value="this_week" className="text-white hover:bg-slate-800 focus:bg-slate-800">Esta semana</SelectItem>
              <SelectItem value="this_month" className="text-white hover:bg-slate-800 focus:bg-slate-800">Este mes</SelectItem>
              <SelectItem value="last_month" className="text-white hover:bg-slate-800 focus:bg-slate-800">Mes pasado</SelectItem>
              <SelectItem value="this_quarter" className="text-white hover:bg-slate-800 focus:bg-slate-800">Este trimestre</SelectItem>
              <SelectItem value="this_year" className="text-white hover:bg-slate-800 focus:bg-slate-800">Este año</SelectItem>
              <SelectItem value="last_year" className="text-white hover:bg-slate-800 focus:bg-slate-800">Año pasado</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" /> Exportar PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ítems Únicos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.summary.total_items_sold}</div>
            <p className="text-xs text-muted-foreground">Tipos de servicios/productos vendidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Unidades</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.summary.total_units.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Unidades/horas vendidas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos por Ítems</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${report.summary.total_revenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total del período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Precio Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${report.summary.average_price.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Por ítem único</p>
          </CardContent>
        </Card>
      </div>

      {/* Top por Ingresos y Top por Cantidad */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Top por Ingresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report.by_revenue.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No hay ítems en este período.</p>
            ) : (
              <div className="space-y-3">
                {report.by_revenue.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{TYPE_LABELS[item.line_type] || item.line_type} · {item.quantity.toFixed(0)} unid.</p>
                      </div>
                    </div>
                    <span className="font-semibold text-green-600 text-sm">${item.total_revenue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Top por Cantidad
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report.by_quantity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No hay ítems en este período.</p>
            ) : (
              <div className="space-y-3">
                {report.by_quantity.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{TYPE_LABELS[item.line_type] || item.line_type}</p>
                      </div>
                    </div>
                    <span className="font-semibold text-blue-600 text-sm">{item.quantity.toFixed(0)} unid.</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Desglose por tipo */}
      <Card>
        <CardHeader>
          <CardTitle>Desglose por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          {report.by_type.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay datos en este período.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {report.by_type.map((t, i) => (
                <div key={i} className="text-center p-4 bg-muted/40 rounded-lg">
                  <div className="text-2xl font-bold">{t.count}</div>
                  <div className="text-sm font-medium mt-1">{TYPE_LABELS[t.type] || t.type}</div>
                  <div className="text-xs text-muted-foreground mt-1">${t.revenue.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
