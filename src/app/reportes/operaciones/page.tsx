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
  ClipboardList,
  CheckCircle,
  Clock,
  Download,
  Calendar,
  User,
  Wrench,
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

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  diagnosed: 'Diagnosticado',
  approved: 'Aprobado',
  in_repair: 'En reparación',
  waiting_parts: 'Esperando piezas',
  waiting_approval: 'Esperando aprobación',
  ready: 'Listo',
  completed: 'Completado',
  delivered: 'Entregado',
  archived: 'Archivado',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  diagnosed: 'bg-purple-100 text-purple-800',
  approved: 'bg-indigo-100 text-indigo-800',
  in_repair: 'bg-orange-100 text-orange-800',
  waiting_parts: 'bg-red-100 text-red-800',
  waiting_approval: 'bg-amber-100 text-amber-800',
  ready: 'bg-teal-100 text-teal-800',
  completed: 'bg-green-100 text-green-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  archived: 'bg-gray-100 text-gray-800',
}

export default function ReportesOperacionesPage() {
  const { organizationId, ready } = useOrganization()
  const [report, setReport] = useState({
    summary: {
      total_orders: 0,
      completed_orders: 0,
      completion_rate: 0,
      avg_completion_days: 0,
      pending_orders: 0,
      in_progress_orders: 0,
    },
    by_status: [] as { status: string; count: number; percentage: number }[],
    by_mechanic: [] as { name: string; assigned_orders: number; completed_orders: number; revenue: number }[],
    top_services: [] as { name: string; count: number }[],
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
        `/api/reports/operaciones?start_date=${startDate}&end_date=${endDate}`,
        { credentials: 'include' }
      )
      const json = await res.json()
      if (json.data) setReport(json.data)
    } catch (error) {
      console.error('Error cargando reporte de operaciones:', error)
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
      <title>Reporte de Operaciones - ${periodLabel}</title>
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
      <div class="header"><h1>Reporte de Operaciones</h1><p>Período: ${periodLabel}</p><p>Fecha: ${currentDate}</p></div>
      <div class="metrics">
        <div class="metric-card"><div class="metric-label">Total Órdenes</div><div class="metric-value">${report.summary.total_orders}</div></div>
        <div class="metric-card"><div class="metric-label">Completadas</div><div class="metric-value">${report.summary.completed_orders} (${report.summary.completion_rate.toFixed(0)}%)</div></div>
        <div class="metric-card"><div class="metric-label">Tiempo Promedio</div><div class="metric-value">${report.summary.avg_completion_days.toFixed(1)} días</div></div>
        <div class="metric-card"><div class="metric-label">Pendientes</div><div class="metric-value">${report.summary.pending_orders}</div></div>
      </div>
      <h2>Por Estado</h2>
      <table><thead><tr><th>Estado</th><th>Cantidad</th><th>%</th></tr></thead><tbody>
        ${report.by_status.map(s => `<tr><td>${STATUS_LABELS[s.status] || s.status}</td><td>${s.count}</td><td>${s.percentage.toFixed(1)}%</td></tr>`).join('')}
      </tbody></table>
      <h2>Rendimiento por Mecánico</h2>
      <table><thead><tr><th>Mecánico</th><th>Asignadas</th><th>Completadas</th><th>Ingresos</th></tr></thead><tbody>
        ${report.by_mechanic.map(m => `<tr><td>${m.name}</td><td>${m.assigned_orders}</td><td>${m.completed_orders}</td><td>$${m.revenue.toLocaleString()}</td></tr>`).join('')}
      </tbody></table>
      <h2>Servicios Más Realizados</h2>
      <table><thead><tr><th>#</th><th>Servicio</th><th>Veces</th></tr></thead><tbody>
        ${report.top_services.map((s, i) => `<tr><td>${i + 1}</td><td>${s.name}</td><td>${s.count}</td></tr>`).join('')}
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
            <p className="text-muted-foreground">Generando reporte de operaciones...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <StandardBreadcrumbs
        currentPage="Operaciones"
        parentPages={[{ label: 'Reportes', href: '/reportes' }]}
        className="mb-2"
      />
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Reporte de Operaciones</h2>
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
            <CardTitle className="text-sm font-medium">Total Órdenes</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.summary.total_orders}</div>
            <p className="text-xs text-muted-foreground">Órdenes creadas en el período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{report.summary.completed_orders}</div>
            <p className="text-xs text-muted-foreground">{report.summary.completion_rate.toFixed(1)}% tasa de finalización</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.summary.avg_completion_days.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">días para completar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{report.summary.pending_orders}</div>
            <p className="text-xs text-muted-foreground">{report.summary.in_progress_orders} en progreso</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Por estado */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Órdenes por Estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report.by_status.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No hay órdenes en este período.</p>
            ) : (
              <div className="space-y-3">
                {report.by_status.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-800'}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${Math.min(item.percentage, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Servicios más realizados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Servicios Más Realizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report.top_services.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No hay servicios registrados en este período.</p>
            ) : (
              <div className="space-y-3">
                {report.top_services.map((svc, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">{index + 1}</span>
                      </div>
                      <p className="font-medium text-sm">{svc.name}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">{svc.count}x</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rendimiento por mecánico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Rendimiento por Mecánico
          </CardTitle>
        </CardHeader>
        <CardContent>
          {report.by_mechanic.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay órdenes asignadas en este período.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Mecánico</th>
                    <th className="text-right py-2 px-4 font-medium text-muted-foreground">Asignadas</th>
                    <th className="text-right py-2 px-4 font-medium text-muted-foreground">Completadas</th>
                    <th className="text-right py-2 pl-4 font-medium text-muted-foreground">Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {report.by_mechanic.map((m, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{m.name}</td>
                      <td className="text-right py-2 px-4">{m.assigned_orders}</td>
                      <td className="text-right py-2 px-4 text-green-600 font-medium">{m.completed_orders}</td>
                      <td className="text-right py-2 pl-4 font-semibold">${m.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
