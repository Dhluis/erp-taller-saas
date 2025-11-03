"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  Download,
  Calendar
} from "lucide-react"
import { getFinancialReport, FinancialReport } from "@/lib/supabase/reports"

export default function ReportesFinancierosPage() {
  const [report, setReport] = useState<FinancialReport>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    revenueGrowth: 0,
    expenseGrowth: 0,
    profitMargin: 0
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
      console.error('Error loading financial report:', error)
      // Datos de ejemplo en caso de error
      setReport({
        totalRevenue: 250000,
        totalExpenses: 180000,
        netProfit: 70000,
        revenueGrowth: 15.5,
        expenseGrowth: 8.2,
        profitMargin: 28.0
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getPeriodData = (period: string) => {
    switch (period) {
      case "today":
        return {
          totalRevenue: 5000,
          totalExpenses: 3000,
          netProfit: 2000,
          revenueGrowth: 25.0,
          expenseGrowth: 15.0,
          profitMargin: 40.0
        }
      case "this_week":
        return {
          totalRevenue: 25000,
          totalExpenses: 15000,
          netProfit: 10000,
          revenueGrowth: 20.0,
          expenseGrowth: 12.0,
          profitMargin: 40.0
        }
      case "this_month":
        return {
          totalRevenue: 250000,
          totalExpenses: 180000,
          netProfit: 70000,
          revenueGrowth: 15.5,
          expenseGrowth: 8.2,
          profitMargin: 28.0
        }
      case "last_month":
        return {
          totalRevenue: 200000,
          totalExpenses: 150000,
          netProfit: 50000,
          revenueGrowth: 10.0,
          expenseGrowth: 5.0,
          profitMargin: 25.0
        }
      case "this_quarter":
        return {
          totalRevenue: 750000,
          totalExpenses: 540000,
          netProfit: 210000,
          revenueGrowth: 18.0,
          expenseGrowth: 12.0,
          profitMargin: 28.0
        }
      case "this_year":
        return {
          totalRevenue: 3000000,
          totalExpenses: 2100000,
          netProfit: 900000,
          revenueGrowth: 22.0,
          expenseGrowth: 15.0,
          profitMargin: 30.0
        }
      case "last_year":
        return {
          totalRevenue: 2500000,
          totalExpenses: 1800000,
          netProfit: 700000,
          revenueGrowth: 8.0,
          expenseGrowth: 6.0,
          profitMargin: 28.0
        }
      default:
        return {
          totalRevenue: 250000,
          totalExpenses: 180000,
          netProfit: 70000,
          revenueGrowth: 15.5,
          expenseGrowth: 8.2,
          profitMargin: 28.0
        }
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        {/* Breadcrumbs */}
        <StandardBreadcrumbs 
          currentPage="Financieros"
          parentPages={[{ label: 'Reportes', href: '/reportes' }]}
        />
        
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Generando reporte financiero...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Breadcrumbs */}
      <StandardBreadcrumbs 
        currentPage="Financieros"
        parentPages={[{ label: 'Reportes', href: '/reportes' }]}
      />
      
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Reportes Financieros</h2>
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
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(report.totalRevenue || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +{report.revenueGrowth}% del mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(report.totalExpenses || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-red-500" />
              +{report.expenseGrowth}% del mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganancia Neta</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${report.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${(report.netProfit || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Margen de ganancia: {(report.profitMargin || 0).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rentabilidad</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(report.profitMargin || 0).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {report.profitMargin > 20 ? 'Excelente' : report.profitMargin > 10 ? 'Buena' : 'Mejorable'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Resumen de Ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Facturas Pagadas</span>
                <span className="font-medium">${(report.totalRevenue || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Cobros Pendientes</span>
                <span className="font-medium">$0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Proyectado</span>
                <span className="font-medium">${(report.totalRevenue || 0).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen de Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Compras Realizadas</span>
                <span className="font-medium">${(report.totalExpenses || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Gastos Operativos</span>
                <span className="font-medium">$0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Gastos</span>
                <span className="font-medium">${(report.totalExpenses || 0).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Análisis de Rentabilidad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Ingresos</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: '100%' }}
                  ></div>
                </div>
                <span className="text-sm font-medium">100%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Gastos</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full" 
                    style={{ width: `${((report.totalExpenses || 0) / (report.totalRevenue || 1)) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">
                  {((report.totalExpenses || 0) / (report.totalRevenue || 1) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Ganancia Neta</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${report.profitMargin}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{(report.profitMargin || 0).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
