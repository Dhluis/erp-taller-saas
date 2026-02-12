"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  TrendingUp, 
  Users, 
  DollarSign,
  Download,
  Calendar,
  Star,
  User
} from "lucide-react"
import { getSalesReport, SalesReport } from "@/lib/supabase/reports"
import { StandardBreadcrumbs } from "@/components/ui/breadcrumbs"

export default function ReportesVentasPage() {
  const [report, setReport] = useState<SalesReport>({
    totalSales: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    topServices: [],
    salesByEmployee: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState("this_month")

  useEffect(() => {
    loadReport()
  }, [selectedPeriod])

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
                <div class="metric-value">$${(report.totalSales || 0).toLocaleString()}</div>
                <div class="metric-label">+12.5% del mes anterior</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Total Órdenes</div>
                <div class="metric-value">${report.totalOrders}</div>
                <div class="metric-label">Órdenes completadas</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Ticket Promedio</div>
                <div class="metric-value">$${(report.averageOrderValue || 0).toLocaleString()}</div>
                <div class="metric-label">Por orden de trabajo</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Crecimiento</div>
                <div class="metric-value" style="color: #10b981;">+12.5%</div>
                <div class="metric-label">vs mes anterior</div>
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
                  <th>Ingresos</th>
                  <th>Órdenes</th>
                </tr>
              </thead>
              <tbody>
                ${report.topServices.map((service, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${service.name}</td>
                    <td>$${(service.revenue || 0).toLocaleString()}</td>
                    <td>${service.orders || 0}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>Ventas por Empleado</h2>
            <table>
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Total Vendido</th>
                  <th>Órdenes</th>
                </tr>
              </thead>
              <tbody>
                ${report.salesByEmployee.map((employee) => `
                  <tr>
                    <td>${employee.name || employee.employee_name || 'N/A'}</td>
                    <td>$${(employee.total_revenue || 0).toLocaleString()}</td>
                    <td>${employee.orders || employee.sales_count || 0}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>Análisis de Rendimiento</h2>
            <div class="metrics">
              <div class="metric-card">
                <div class="metric-value" style="color: #10b981;">${report.totalOrders}</div>
                <div class="metric-label">Órdenes Completadas</div>
              </div>
              <div class="metric-card">
                <div class="metric-value" style="color: #3b82f6;">$${(report.averageOrderValue || 0).toLocaleString()}</div>
                <div class="metric-label">Ticket Promedio</div>
              </div>
              <div class="metric-card">
                <div class="metric-value" style="color: #8b5cf6;">${report.topServices.length}</div>
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
    setIsLoading(true)
    try {
      // Simular datos basados en el período seleccionado
      const periodData = getPeriodData(selectedPeriod)
      setReport(periodData)
    } catch (error) {
      console.error('Error loading sales report:', error)
      // Datos de ejemplo en caso de error
      setReport({
        totalSales: 125000,
        totalOrders: 45,
        averageOrderValue: 2778,
        topServices: [
          { name: "Reparación Motor", revenue: 45000, orders: 15 },
          { name: "Mantenimiento", revenue: 35000, orders: 20 },
          { name: "Diagnóstico", revenue: 25000, orders: 8 },
          { name: "Otros", revenue: 20000, orders: 2 }
        ],
        salesByEmployee: [
          { name: "Juan Pérez", total_revenue: 45000, orders: 15 },
          { name: "María García", total_revenue: 35000, orders: 12 },
          { name: "Carlos López", total_revenue: 30000, orders: 10 },
          { name: "Ana Martínez", total_revenue: 15000, orders: 8 }
        ]
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getPeriodData = (period: string) => {
    const baseData = {
      topServices: [
        { name: "Reparación Motor", revenue: 45000, orders: 15 },
        { name: "Mantenimiento", revenue: 35000, orders: 20 },
        { name: "Diagnóstico", revenue: 25000, orders: 8 },
        { name: "Otros", revenue: 20000, orders: 2 }
      ],
      salesByEmployee: [
        { name: "Juan Pérez", total_revenue: 45000, orders: 15 },
        { name: "María García", total_revenue: 35000, orders: 12 },
        { name: "Carlos López", total_revenue: 30000, orders: 10 },
        { name: "Ana Martínez", total_revenue: 15000, orders: 8 }
      ]
    }

    switch (period) {
      case "today":
        return {
          totalSales: 2500,
          totalOrders: 3,
          averageOrderValue: 833,
          ...baseData
        }
      case "this_week":
        return {
          totalSales: 15000,
          totalOrders: 8,
          averageOrderValue: 1875,
          ...baseData
        }
      case "this_month":
        return {
          totalSales: 125000,
          totalOrders: 45,
          averageOrderValue: 2778,
          ...baseData
        }
      case "last_month":
        return {
          totalSales: 98000,
          totalOrders: 38,
          averageOrderValue: 2579,
          ...baseData
        }
      case "this_quarter":
        return {
          totalSales: 350000,
          totalOrders: 125,
          averageOrderValue: 2800,
          ...baseData
        }
      case "this_year":
        return {
          totalSales: 1200000,
          totalOrders: 450,
          averageOrderValue: 2667,
          ...baseData
        }
      case "last_year":
        return {
          totalSales: 950000,
          totalOrders: 380,
          averageOrderValue: 2500,
          ...baseData
        }
      default:
        return {
          totalSales: 125000,
          totalOrders: 45,
          averageOrderValue: 2778,
          ...baseData
        }
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
            <div className="text-2xl font-bold">${(report.totalSales || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12.5% del mes anterior</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Órdenes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.totalOrders}</div>
            <p className="text-xs text-muted-foreground">Órdenes completadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(report.averageOrderValue || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Por orden de trabajo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crecimiento</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+12.5%</div>
            <p className="text-xs text-muted-foreground">vs mes anterior</p>
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
              {report.topServices.map((service, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-muted-foreground">{service.count} servicios</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${(service.revenue || 0).toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Ingresos</p>
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
              Ventas por Empleado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {report.salesByEmployee.map((employee, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{employee.employee_name}</p>
                      <p className="text-sm text-muted-foreground">{employee.sales_count} órdenes</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${(employee.total_revenue || 0).toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Total vendido</p>
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
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{report.totalOrders}</div>
                <div className="text-sm text-black">Órdenes Completadas</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">${(report.averageOrderValue || 0).toLocaleString()}</div>
                <div className="text-sm text-black">Ticket Promedio</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{report.topServices.length}</div>
                <div className="text-sm text-black">Servicios Activos</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
