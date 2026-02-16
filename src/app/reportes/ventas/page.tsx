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
  Star,
  User
} from "lucide-react"
import { useOrganization } from "@/lib/context/SessionContext"
import { StandardBreadcrumbs } from "@/components/ui/breadcrumbs"

/** Mapea período seleccionado a fechas ISO (YYYY-MM-DD) */
function getPeriodDates(period: string): { startDate: string; endDate: string } {
  const now = new Date()
  const endDate = now.toISOString().split('T')[0]
  let startDate: string
  switch (period) {
    case 'today':
      startDate = endDate
      break
    case 'this_week': {
      const weekAgo = new Date(now)
      weekAgo.setDate(now.getDate() - 7)
      startDate = weekAgo.toISOString().split('T')[0]
      break
    }
    case 'this_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      break
    case 'last_month': {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      startDate = d.toISOString().split('T')[0]
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      return { startDate, endDate: end.toISOString().split('T')[0] }
    }
    case 'this_quarter': {
      const quarterStart = new Date(now)
      quarterStart.setMonth(now.getMonth() - 3)
      startDate = quarterStart.toISOString().split('T')[0]
      break
    }
    case 'this_year':
      startDate = `${now.getFullYear()}-01-01`
      break
    case 'last_year':
      startDate = `${now.getFullYear() - 1}-01-01`
      return { startDate, endDate: `${now.getFullYear() - 1}-12-31` }
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  }
  return { startDate, endDate }
}

export default function ReportesVentasPage() {
  const { organizationId, ready } = useOrganization()
  const [report, setReport] = useState({
    summary: {
      total_sales: 0,
      paid_sales: 0,
      pending_sales: 0,
      total_invoices: 0,
      average_ticket: 0
    },
    top_services: [] as { name: string; quantity: number }[],
    top_products: [] as { name: string; quantity: number }[],
    frequent_customers: [] as { name: string; orders: number }[],
    daily_sales: [] as { date: string; amount: number }[]
  })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState("this_month")

  useEffect(() => {
    if (ready && !organizationId) setIsLoading(false)
    if (organizationId) loadReport()
  }, [selectedPeriod, organizationId, ready])

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period)
  }

  const handleExportPDF = () => {
    try {
      // Crear contenido HTML para el PDF
      const periodLabels: Record<string, string> = {
        today: 'Hoy',
        this_week: 'Esta semana',
        this_month: 'Este mes',
        last_month: 'Mes pasado',
        this_quarter: 'Este trimestre',
        this_year: 'Este año',
        last_year: 'Año pasado'
      }

      const periodLabel = periodLabels[selectedPeriod] || 'Este mes'
      const currentDate = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Reporte de Ventas - ${periodLabel}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; }
            }
            body {
              font-family: Arial, sans-serif;
              color: #333;
              padding: 20px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .header p {
              margin: 5px 0;
              color: #666;
            }
            .section {
              margin-bottom: 30px;
            }
            .section h2 {
              background: #f0f0f0;
              padding: 10px;
              margin: 0 0 15px 0;
              border-left: 4px solid #3b82f6;
            }
            .metrics {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            .metric-card {
              border: 1px solid #ddd;
              padding: 15px;
              border-radius: 5px;
              text-align: center;
            }
            .metric-value {
              font-size: 24px;
              font-weight: bold;
              color: #3b82f6;
              margin: 10px 0;
            }
            .metric-label {
              color: #666;
              font-size: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 10px;
              text-align: left;
            }
            th {
              background: #f0f0f0;
              font-weight: bold;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Reporte de Ventas</h1>
            <p>Período: ${periodLabel}</p>
            <p>Fecha de generación: ${currentDate}</p>
          </div>

          <div class="section">
            <div class="metrics">
              <div class="metric-card">
                <div class="metric-label">Ventas Totales</div>
                <div class="metric-value">$${(report.summary?.total_sales || 0).toLocaleString()}</div>
                <div class="metric-label">Total del período</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Total Facturas</div>
                <div class="metric-value">${report.summary?.total_invoices || 0}</div>
                <div class="metric-label">Facturas del período</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Ticket Promedio</div>
                <div class="metric-value">$${(report.summary?.average_ticket || 0).toLocaleString()}</div>
                <div class="metric-label">Por factura</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Cobrado</div>
                <div class="metric-value" style="color: #10b981;">$${(report.summary?.paid_sales || 0).toLocaleString()}</div>
                <div class="metric-label">Facturas pagadas</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Servicios Más Populares</h2>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Servicio</th>
                  <th>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                ${(report.top_services || []).map((service, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${service.name}</td>
                    <td>${service.quantity || 0}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>Clientes Frecuentes</h2>
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Órdenes</th>
                </tr>
              </thead>
              <tbody>
                ${(report.frequent_customers || []).map((c) => `
                  <tr>
                    <td>${c.name || 'N/A'}</td>
                    <td>${c.orders || 0}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>Análisis de Rendimiento</h2>
            <div class="metrics">
              <div class="metric-card">
                <div class="metric-value" style="color: #10b981;">${report.summary?.total_invoices || 0}</div>
                <div class="metric-label">Total Facturas</div>
              </div>
              <div class="metric-card">
                <div class="metric-value" style="color: #3b82f6;">$${(report.summary?.average_ticket || 0).toLocaleString()}</div>
                <div class="metric-label">Ticket Promedio</div>
              </div>
              <div class="metric-card">
                <div class="metric-value" style="color: #8b5cf6;">${(report.top_services || []).length}</div>
                <div class="metric-label">Servicios Activos</div>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>Generado por Eagles System</p>
            <p>${currentDate}</p>
          </div>
        </body>
        </html>
      `

      // Crear ventana para imprimir
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(htmlContent)
        printWindow.document.close()
        
        // Esperar a que cargue el contenido y luego imprimir/guardar como PDF
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print()
          }, 250)
        }
      } else {
        alert('Por favor, permite las ventanas emergentes para exportar el PDF')
      }
    } catch (error) {
      console.error('Error al exportar PDF:', error)
      alert('Error al exportar el reporte. Por favor, intenta de nuevo.')
    }
  }

  const loadReport = async () => {
    if (!organizationId) return
    setIsLoading(true)
    try {
      const { startDate, endDate } = getPeriodDates(selectedPeriod)
      const res = await fetch(
        `/api/reports/sales?start_date=${startDate}&end_date=${endDate}`,
        { credentials: 'include' }
      )
      const json = await res.json()
      if (json.data) setReport(json.data)
    } catch (error) {
      console.error('Error cargando reporte de ventas:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Generando reporte de ventas...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <StandardBreadcrumbs
        currentPage="Reportes de Ventas"
        parentPages={[{ label: 'Reportes', href: '/reportes' }]}
        className="mb-2"
      />
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Reportes de Ventas</h2>
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(report.summary?.total_sales || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total del período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.summary?.total_invoices || 0}</div>
            <p className="text-xs text-muted-foreground">Facturas del período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(report.summary?.average_ticket || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Por factura</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cobrado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${(report.summary?.paid_sales || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Facturas pagadas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Servicios Más Populares
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(report.top_services || []).map((service, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-muted-foreground">{service.quantity ?? 0} unidades</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Clientes Frecuentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(report.frequent_customers || []).map((customer, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">{customer.orders ?? 0} órdenes</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Análisis de Rendimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{report.summary?.total_invoices ?? 0}</div>
                <div className="text-sm text-muted-foreground">Total Facturas</div>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">${(report.summary?.average_ticket ?? 0).toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Ticket Promedio</div>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{(report.top_services || []).length}</div>
                <div className="text-sm text-muted-foreground">Servicios Activos</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
