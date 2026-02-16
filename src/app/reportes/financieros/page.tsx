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
import { getFinancialReport } from "@/lib/supabase/reports"
import { useOrganization } from "@/lib/context/SessionContext"

/** Mapea período seleccionado a fechas ISO (YYYY-MM-DD) */
function getPeriodDates(period: string): { startDate: string; endDate: string } {
  const now = new Date()
  const endDate = now.toISOString().split('T')[0]
  let startDate: string

  switch (period) {
    case "today":
      startDate = endDate
      break
    case "this_week": {
      const d = new Date(now)
      d.setDate(d.getDate() - 7)
      startDate = d.toISOString().split('T')[0]
      break
    }
    case "this_month": {
      const d = new Date(now.getFullYear(), now.getMonth(), 1)
      startDate = d.toISOString().split('T')[0]
      break
    }
    case "last_month": {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      startDate = d.toISOString().split('T')[0]
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      return { startDate, endDate: end.toISOString().split('T')[0] }
    }
    case "this_quarter": {
      const q = Math.floor(now.getMonth() / 3) + 1
      const d = new Date(now.getFullYear(), (q - 1) * 3, 1)
      startDate = d.toISOString().split('T')[0]
      break
    }
    case "this_year": {
      startDate = `${now.getFullYear()}-01-01`
      break
    }
    case "last_year": {
      startDate = `${now.getFullYear() - 1}-01-01`
      return { startDate, endDate: `${now.getFullYear() - 1}-12-31` }
    }
    default:
      startDate = `${now.getFullYear()}-01-01`
  }
  return { startDate, endDate }
}

type ReportDisplay = {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  revenueGrowth: number
  expenseGrowth: number
  profitMargin: number
}

export default function ReportesFinancierosPage() {
  const { organizationId, ready } = useOrganization()
  const [report, setReport] = useState<ReportDisplay>({
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
    if (!ready || !organizationId) {
      if (ready && !organizationId) setIsLoading(false)
      return
    }
    loadReport()
  }, [ready, organizationId, selectedPeriod])

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period)
  }

  const loadReport = async () => {
    if (!organizationId) return
    setIsLoading(true)
    try {
      const { startDate, endDate } = getPeriodDates(selectedPeriod)
      const data = await getFinancialReport(organizationId, startDate, endDate)
      const profitMargin = data.totalRevenue > 0
        ? (data.netProfit / data.totalRevenue) * 100
        : 0
      setReport({
        totalRevenue: data.totalRevenue,
        totalExpenses: data.totalExpenses,
        netProfit: data.netProfit,
        revenueGrowth: 0,
        expenseGrowth: 0,
        profitMargin
      })
    } catch (error) {
      console.error('Error loading financial report:', error)
      setReport(prev => ({ ...prev, totalRevenue: 0, totalExpenses: 0, netProfit: 0, profitMargin: 0 }))
    } finally {
      setIsLoading(false)
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
        <Card className="bg-green-500/10 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-400">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">${(report.totalRevenue || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +{report.revenueGrowth}% del mes anterior
            </p>
          </CardContent>
        </Card>

        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-400">Gastos Totales</CardTitle>
            <TrendingDown className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">${(report.totalExpenses || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-red-500" />
              +{report.expenseGrowth}% del mes anterior
            </p>
          </CardContent>
        </Card>

        <Card className="bg-green-500/10 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-400">Ganancia Neta</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              ${(report.netProfit || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Margen de ganancia: {(report.profitMargin || 0).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-400">Rentabilidad</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">{(report.profitMargin || 0).toFixed(1)}%</div>
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
