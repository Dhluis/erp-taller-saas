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
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="this_week">Esta semana</SelectItem>
              <SelectItem value="this_month">Este mes</SelectItem>
              <SelectItem value="last_month">Mes pasado</SelectItem>
              <SelectItem value="this_quarter">Este trimestre</SelectItem>
              <SelectItem value="this_year">Este año</SelectItem>
              <SelectItem value="last_year">Año pasado</SelectItem>
            </SelectContent>
          </Select>
          <Button>
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
                <div className="text-sm text-muted-foreground">Órdenes Completadas</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">${(report.averageOrderValue || 0).toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Ticket Promedio</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{report.topServices.length}</div>
                <div className="text-sm text-muted-foreground">Servicios Activos</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
